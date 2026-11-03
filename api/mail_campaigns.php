<?php
declare(strict_types=1);
require __DIR__ . '/config.php';

// Envois transactionnels en masse via Brevo. Clé API et adresse expéditrice UNIQUEMENT côté serveur.
function mailer_db(): PDO { ensure_database_schema(); return db(); }
function mailer_setup(): void {
    $db = mailer_db();
    $db->exec("CREATE TABLE IF NOT EXISTS mail_campaigns (
        id VARCHAR(64) PRIMARY KEY, title VARCHAR(180) NOT NULL, template_id VARCHAR(64) NOT NULL,
        search_id VARCHAR(64) NOT NULL, created_by VARCHAR(64) NOT NULL,
        sender_email VARCHAR(180) NOT NULL, status VARCHAR(24) NOT NULL DEFAULT 'prepared',
        created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $db->exec("CREATE TABLE IF NOT EXISTS mail_campaign_recipients (
        id VARCHAR(64) PRIMARY KEY, campaign_id VARCHAR(64) NOT NULL,
        email VARCHAR(180) NOT NULL, first_name VARCHAR(180) NOT NULL DEFAULT '',
        last_name VARCHAR(180) NOT NULL DEFAULT '', city VARCHAR(180) NOT NULL DEFAULT '',
        subject TEXT NOT NULL, body MEDIUMTEXT NOT NULL,
        unsubscribe_token VARCHAR(64) NOT NULL UNIQUE,
        status VARCHAR(24) NOT NULL DEFAULT 'pending', error_message VARCHAR(300) NOT NULL DEFAULT '',
        processed_at DATETIME NULL, UNIQUE KEY campaign_recipient_email (campaign_id, email),
        INDEX campaign_recipient_queue (campaign_id,status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $db->exec("CREATE TABLE IF NOT EXISTS mail_suppressions (
        email VARCHAR(180) PRIMARY KEY, created_at DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}
function mailer_configured(): bool {
    return defined('BREVO_API_KEY') && trim((string) BREVO_API_KEY) !== ''
        && defined('CAMPAIGN_FROM_EMAIL') && filter_var(CAMPAIGN_FROM_EMAIL, FILTER_VALIDATE_EMAIL);
}
function mailer_origin_check(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '') {
        $base = site_base_url();
        if (parse_url($origin, PHP_URL_HOST) !== parse_url($base, PHP_URL_HOST)
            || parse_url($origin, PHP_URL_SCHEME) !== parse_url($base, PHP_URL_SCHEME)) {
            json_response(['ok' => false, 'error' => 'Origine de requête non autorisée.'], 403);
        }
    }
}
function mailer_admin_state(): array {
    $stmt = mailer_db()->query('SELECT state_json FROM admin_state WHERE id=1');
    $state = json_decode((string) ($stmt->fetchColumn() ?: '{}'), true);
    return is_array($state) ? $state : [];
}
function mailer_text($value): string {
    $value = trim((string) $value);
    $clean = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
    return strtolower($clean !== false ? $clean : $value);
}
function mailer_match(array $contact, array $filters, array $fields): bool {
    $q = trim((string)($filters['q'] ?? ''));
    if ($q !== '') {
        $haystack = mailer_text(implode(' ', array_map(static function ($v) {
            return is_scalar($v) ? (string) $v : (is_array($v) ? implode(' ', array_filter($v, 'is_scalar')) : '');
        }, array_values($contact))));
        if (!str_contains($haystack, mailer_text($q))) return false;
    }
    foreach ($filters as $key => $raw) {
        if (!str_starts_with((string)$key, 'field_')) continue;
        $fieldId = substr($key, 6);
        if (!isset($fields[$fieldId])) continue;
        $value = trim((string)$raw);
        if ($value === '') continue;
        $actual = $contact[$fieldId] ?? '';
        if ($fieldId === 'birthDate' && preg_match('/^\\d+\\s*-\\s*\\d+$/', $value)) {
            $date = DateTimeImmutable::createFromFormat('!Y-m-d', substr((string)$actual, 0, 10));
            if (!$date) return false;
            [$min, $max] = array_map('intval', explode('-', preg_replace('/\\s+/', '', $value)));
            $age = (int) $date->diff(new DateTimeImmutable('today'))->y;
            if ($age < min($min, $max) || $age > max($min, $max)) return false;
            continue;
        }
        if ($fieldId === 'birthDate' && ctype_digit($value)) {
            $date = DateTimeImmutable::createFromFormat('!Y-m-d', substr((string)$actual, 0, 10));
            if (!$date || (int)$date->diff(new DateTimeImmutable('today'))->y !== (int)$value) return false;
            continue;
        }
        if (($fields[$fieldId]['type'] ?? '') === 'boolean') {
            if ($value !== 'all' && ((bool)$actual !== ($value === 'true'))) return false;
            continue;
        }
        if (is_array($actual)) {
            if (!array_filter($actual, static fn($v) => str_contains(mailer_text($v), mailer_text($value)))) return false;
        } elseif (!str_contains(mailer_text($actual), mailer_text($value))) return false;
    }
    return true;
}
function mailer_opted_in(array $contact): bool {
    // Jamais d'envoi sur la seule présence d'une adresse : consentement explicite dans la fiche contact.
    return in_array(mailer_text($contact['emailCampaignStatus'] ?? ''), [
        'oui', 'inscrit', 'inscrite', 'consentement', 'consenti', 'consentie',
        'opt-in', 'optin', 'autorise', 'autorisee', 'accepte', 'acceptee'
    ], true);
}
function mailer_recipients(array $state, array $search): array {
    $filters = is_array($search['filters'] ?? null) ? $search['filters'] : [];
    $fields = [];
    foreach (($state['contactFields'] ?? []) as $field) {
        if (is_array($field) && isset($field['id'])) $fields[(string)$field['id']] = $field;
    }
    // Les champs système existent même lorsqu'aucun champ personnalisé n'a encore été sauvegardé.
    foreach (['firstName','lastName','city','email','emailCampaignStatus','category','organization','role','profession','keywords','birthDate'] as $id) {
        if (!isset($fields[$id])) $fields[$id] = ['type' => 'text'];
    }
    $suppressed = mailer_db()->query('SELECT email FROM mail_suppressions')->fetchAll(PDO::FETCH_COLUMN);
    $blocked = array_fill_keys(array_map('strtolower', $suppressed), true);
    $seen = [];
    $out = [];
    foreach (($state['localContacts'] ?? []) as $contact) {
        if (!is_array($contact) || !mailer_match($contact, $filters, $fields)) continue;
        $email = strtolower(trim((string)($contact['email'] ?? '')));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || isset($seen[$email]) || isset($blocked[$email])) continue;
        if (!mailer_opted_in($contact)) continue;
        $seen[$email] = true;
        $out[] = ['email' => $email, 'firstName' => (string)($contact['firstName'] ?? ''), 'lastName' => (string)($contact['lastName'] ?? ''), 'city' => (string)($contact['city'] ?? '')];
    }
    return $out;
}
function mailer_render(string $value, array $contact): string {
    $keys = ['{{prenom}}' => $contact['firstName'], '{{nom}}' => $contact['lastName'], '{{commune}}' => $contact['city']];
    return strtr($value, $keys);
}
function mailer_summary(string $id): array {
    $stmt = mailer_db()->prepare('SELECT c.*, COUNT(r.id) AS total,
        SUM(CASE WHEN r.status="pending" THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN r.status="sent" THEN 1 ELSE 0 END) AS sent,
        SUM(CASE WHEN r.status="failed" THEN 1 ELSE 0 END) AS failed
        FROM mail_campaigns c LEFT JOIN mail_campaign_recipients r ON r.campaign_id=c.id
        WHERE c.id=? GROUP BY c.id');
    $stmt->execute([$id]); return $stmt->fetch() ?: [];
}
function mailer_send_brevo(string $email, string $subject, string $body): array {
    if (!mailer_configured()) return [false, 'Expéditeur non configuré.'];
    if (!function_exists('curl_init')) return [false, 'Extension cURL manquante.'];
    $payload = [
        'sender' => ['name' => defined('CAMPAIGN_FROM_NAME') ? (string)CAMPAIGN_FROM_NAME : 'Permanence parlementaire', 'email' => (string) CAMPAIGN_FROM_EMAIL],
        'to' => [['email' => $email]], 'subject' => $subject, 'textContent' => $body
    ];
    $ch = curl_init('https://api.brevo.com/v3/smtp/email');
    curl_setopt_array($ch, [
        CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 8, CURLOPT_TIMEOUT => 18,
        CURLOPT_HTTPHEADER => ['api-key: '.(string) BREVO_API_KEY, 'Content-Type: application/json', 'Accept: application/json'],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    ]);
    $reply = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($code >= 200 && $code < 300) return [true, ''];
    return [false, substr($err ?: ('Prestataire email HTTP ' . $code), 0, 250)];
}
function mailer_unsubscribe(): void {
    $token = (string)($_GET['token'] ?? '');
    if (!preg_match('/^[a-f0-9]{48}$/', $token)) { http_response_code(404); exit('Lien invalide.'); }
    $stmt = mailer_db()->prepare('SELECT email FROM mail_campaign_recipients WHERE unsubscribe_token=? LIMIT 1');
    $stmt->execute([$token]); $email = $stmt->fetchColumn();
    if (!$email) { http_response_code(404); exit('Lien invalide.'); }
    $stmt = mailer_db()->prepare('INSERT IGNORE INTO mail_suppressions (email, created_at) VALUES (?, NOW())');
    $stmt->execute([$email]);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    echo '<!doctype html><html lang="fr"><meta charset="utf-8"><title>Désinscription</title><body><h1>Désinscription enregistrée</h1><p>Vous ne recevrez plus d’envois depuis cet outil.</p></body></html>';
    exit;
}
mailer_setup();
$action = (string)($_GET['action'] ?? 'status');
if ($action === 'unsubscribe' && $_SERVER['REQUEST_METHOD'] === 'GET') mailer_unsubscribe();
$user = require_user();
if (!can_collaborate($user)) json_response(['ok' => false, 'error' => 'Accès réservé aux collaborateurs.'], 403);
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'status') json_response([
        'ok' => true, 'configured' => mailer_configured(),
        'senderEmail' => mailer_configured() ? (string)CAMPAIGN_FROM_EMAIL : '',
        'senderName' => mailer_configured() && defined('CAMPAIGN_FROM_NAME') ? (string)CAMPAIGN_FROM_NAME : '',
    ]);
    if ($action === 'history') {
        $rows = mailer_db()->query('SELECT id FROM mail_campaigns ORDER BY created_at DESC LIMIT 30')->fetchAll(PDO::FETCH_COLUMN);
        json_response(['ok' => true, 'campaigns' => array_map('mailer_summary', $rows)]);
    }
    if ($action === 'progress') {
        $id = (string)($_GET['id'] ?? '');
        json_response(['ok' => true, 'campaign' => mailer_summary($id)]);
    }
    json_response(['ok' => false, 'error' => 'Action inconnue.'], 404);
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(['ok' => false, 'error' => 'Méthode non autorisée.'], 405);
mailer_origin_check();
$data = request_json();
if ($action === 'preview' || $action === 'prepare') {
    $state = mailer_admin_state();
    $searchId = (string)($data['searchId'] ?? '');
    $templateId = (string)($data['templateId'] ?? '');
    $search = null; $template = null;
    foreach (($state['savedContactSearches'] ?? []) as $item) if (($item['id'] ?? '') === $searchId) $search = $item;
    foreach (($state['mailTemplates'] ?? []) as $item) if (($item['id'] ?? '') === $templateId) $template = $item;
    if (!$search || !$template || !trim((string)($template['subject'] ?? '')) || !trim((string)($template['body'] ?? ''))) {
        json_response(['ok' => false, 'error' => 'Recherche ou modèle invalide.'], 400);
    }
    $recipients = mailer_recipients($state, $search);
    if ($action === 'preview') json_response(['ok' => true, 'total' => count($recipients),
        'sample' => array_slice($recipients, 0, 5),
        'excludedNotice' => 'Seuls les contacts avec un statut de consentement explicite et non désinscrits sont retenus.'
    ]);
    if (!mailer_configured()) json_response(['ok' => false, 'error' => 'Configurer BREVO_API_KEY et CAMPAIGN_FROM_EMAIL côté serveur.'], 400);
    if (($data['consentConfirmed'] ?? false) !== true) json_response(['ok' => false, 'error' => 'Confirmez les droits de contact des destinataires.'], 400);
    if (!$recipients || count($recipients) > 250) json_response(['ok' => false, 'error' => 'La campagne doit contenir entre 1 et 250 destinataires admissibles.'], 400);
    // Limiter les envois quotidiens pour éviter une émission massive par erreur.
    $daily = mailer_db();
    $countStmt = $daily->prepare('SELECT COUNT(*) FROM mail_campaign_recipients r JOIN mail_campaigns c ON c.id=r.campaign_id WHERE c.created_by=? AND c.created_at >= CURDATE()');
    $countStmt->execute([$user['id']]);
    if ((int)$countStmt->fetchColumn() + count($recipients) > 1000) {
        json_response(['ok' => false, 'error' => 'Limite de 1 000 destinataires préparés par jour et par compte atteinte.'], 429);
    }
    $id = bin2hex(random_bytes(16));
    $pdo = mailer_db();
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('INSERT INTO mail_campaigns (id,title,template_id,search_id,created_by,sender_email,status,created_at,updated_at) VALUES (?,?,?,?,?,?,"prepared",NOW(),NOW())');
        $stmt->execute([$id, (string)($template['title'] ?? 'Campagne'), $templateId, $searchId, $user['id'], (string)CAMPAIGN_FROM_EMAIL]);
        $stmt = $pdo->prepare('INSERT INTO mail_campaign_recipients (id,campaign_id,email,first_name,last_name,city,subject,body,unsubscribe_token,status) VALUES (?,?,?,?,?,?,?,?,?,"pending")');
        foreach ($recipients as $contact) {
            $token = bin2hex(random_bytes(24));
            $unsubscribe = site_base_url() . '/api/mail_campaigns.php?action=unsubscribe&token=' . $token;
            $body = mailer_render((string)$template['body'], $contact) . "\n\nPour ne plus recevoir ces messages : " . $unsubscribe;
            $stmt->execute([bin2hex(random_bytes(16)), $id, $contact['email'], $contact['firstName'], $contact['lastName'], $contact['city'], mailer_render((string)$template['subject'], $contact), $body, $token]);
        }
        $pdo->commit();
    } catch (Throwable $error) { $pdo->rollBack(); throw $error; }
    json_response(['ok' => true, 'campaign' => mailer_summary($id)]);
}
if ($action === 'dispatch') {
    $id = (string)($data['id'] ?? '');
    $campaign = mailer_summary($id);
    if (!$campaign) json_response(['ok' => false, 'error' => 'Campagne introuvable.'], 404);
    // Interdire de relancer une campagne terminée ou celle d'un autre compte (hors administrateur).
    if ($campaign['created_by'] !== $user['id'] && !can_administer($user)) json_response(['ok' => false, 'error' => 'Accès refusé.'], 403);
    if ($campaign['status'] === 'cancelled') json_response(['ok' => false, 'error' => 'Campagne annulée.'], 409);
    $db = mailer_db();
    for ($i = 0; $i < 5; $i++) {
        $db->beginTransaction();
        $stmt = $db->prepare('SELECT * FROM mail_campaign_recipients WHERE campaign_id=? AND status="pending" ORDER BY id LIMIT 1 FOR UPDATE');
        $stmt->execute([$id]); $recipient = $stmt->fetch();
        if (!$recipient) { $db->commit(); break; }
        $stmt = $db->prepare('UPDATE mail_campaign_recipients SET status="processing" WHERE id=?');
        $stmt->execute([$recipient['id']]);
        $db->commit();
        // Une requête interrompue pendant l'appel prestataire ne doit pas renvoyer un doublon.
        $stmt = $db->prepare('SELECT 1 FROM mail_suppressions WHERE email=? LIMIT 1');
        $stmt->execute([$recipient['email']]);
        if ($stmt->fetchColumn()) [$sent, $error] = [false, 'Destinataire désinscrit.'];
        else [$sent, $error] = mailer_send_brevo($recipient['email'], $recipient['subject'], $recipient['body']);
        $stmt = $db->prepare('UPDATE mail_campaign_recipients SET status=?,error_message=?,processed_at=NOW() WHERE id=? AND status="processing"');
        $stmt->execute([$sent ? 'sent' : 'failed', $error, $recipient['id']]);
    }
    $campaign = mailer_summary($id);
    if ((int)$campaign['pending'] === 0) {
        $stmt = $db->prepare('UPDATE mail_campaigns SET status="finished", updated_at=NOW() WHERE id=?');
        $stmt->execute([$id]);
    }
    json_response(['ok' => true, 'campaign' => mailer_summary($id)]);
}
if ($action === 'cancel') {
    $id = (string)($data['id'] ?? '');
    $campaign = mailer_summary($id);
    if (!$campaign || ($campaign['created_by'] !== $user['id'] && !can_administer($user))) json_response(['ok' => false, 'error' => 'Campagne introuvable.'], 404);
    $stmt = mailer_db()->prepare('UPDATE mail_campaigns SET status="cancelled", updated_at=NOW() WHERE id=?');
    $stmt->execute([$id]); json_response(['ok' => true]);
}
json_response(['ok' => false, 'error' => 'Action inconnue.'], 404);
