<?php
declare(strict_types=1);
require __DIR__ . '/config.php';

ensure_database_schema();

function ensure_newsletter_table(): void
{
    db()->exec(
        "CREATE TABLE IF NOT EXISTS newsletter_leads (
            id VARCHAR(64) PRIMARY KEY,
            email VARCHAR(180) NOT NULL UNIQUE,
            city VARCHAR(180) NOT NULL DEFAULT '',
            categories_json LONGTEXT NULL,
            frequency VARCHAR(40) NOT NULL DEFAULT 'Hebdomadaire',
            email_verified TINYINT(1) NOT NULL DEFAULT 0,
            verification_token VARCHAR(120) NULL,
            verification_sent_at DATETIME NULL,
            consent_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );
}

function clean_frequency($value): string
{
    $frequency = clean_string($value ?? 'Hebdomadaire', 40);
    return in_array($frequency, ['Immediate', 'Hebdomadaire', 'Mensuelle'], true) ? $frequency : 'Hebdomadaire';
}

function send_verification_link(string $email, string $token): array
{
    $url = site_base_url() . '/?verify_email=' . urlencode($token);
    $sent = send_site_email(
        $email,
        'Verification de votre email',
        "Bonjour,\n\nCliquez sur ce lien pour confirmer votre email :\n" . $url . "\n\nSi vous n'etes pas a l'origine de cette demande, ignorez ce message."
    );
    return ['sent' => $sent, 'url' => $sent ? null : $url];
}

ensure_newsletter_table();
$action = $_GET['action'] ?? 'subscribe';
$data = request_json();

if ($action === 'subscribe') {
    $email = strtolower(clean_string($data['email'] ?? '', 180));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_response(['ok' => false, 'error' => 'Email invalide.'], 400);
    }
    $categories = clean_list($data['categories'] ?? [], 40);
    $frequency = clean_frequency($data['frequency'] ?? 'Hebdomadaire');
    $token = bin2hex(random_bytes(32));
    $id = bin2hex(random_bytes(16));

    $user = current_user();
    if ($user && strtolower($user['email']) === $email) {
        $stmt = db()->prepare(
            'UPDATE users SET categories_json = ?, newsletter_frequency = ?, updated_at = NOW() WHERE id = ?'
        );
        $stmt->execute([json_encode($categories, JSON_UNESCAPED_UNICODE), $frequency, $user['id']]);
        $stmt = db()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$user['id']]);
        json_response(['ok' => true, 'user' => public_user($stmt->fetch()), 'message' => 'Preferences newsletter enregistrees.']);
    }

    $stmt = db()->prepare(
        'INSERT INTO newsletter_leads
         (id, email, city, categories_json, frequency, email_verified, verification_token, verification_sent_at, consent_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, NOW(), NOW(), NOW())
         ON DUPLICATE KEY UPDATE city = VALUES(city), categories_json = VALUES(categories_json),
            frequency = VALUES(frequency), verification_token = VALUES(verification_token),
            verification_sent_at = NOW(), updated_at = NOW()'
    );
    $stmt->execute([
        $id,
        $email,
        clean_string($data['city'] ?? '', 180),
        json_encode($categories, JSON_UNESCAPED_UNICODE),
        $frequency,
        $token,
    ]);

    $delivery = send_verification_link($email, $token);
    json_response([
        'ok' => true,
        'message' => $delivery['sent'] ? 'Inscription enregistree. Email de verification envoye.' : 'Inscription enregistree. Email non envoye par le serveur.',
        'verificationSent' => $delivery['sent'],
        'verificationUrl' => $delivery['url'],
    ]);
}

if ($action === 'request-verification') {
    $user = require_user();
    $token = bin2hex(random_bytes(32));
    $stmt = db()->prepare('UPDATE users SET email_verification_token = ?, email_verification_sent_at = NOW(), updated_at = NOW() WHERE id = ?');
    $stmt->execute([$token, $user['id']]);
    $delivery = send_verification_link($user['email'], $token);
    json_response([
        'ok' => true,
        'message' => $delivery['sent'] ? 'Email de verification envoye.' : 'Email non envoye par le serveur.',
        'verificationSent' => $delivery['sent'],
        'verificationUrl' => $delivery['url'],
    ]);
}

if ($action === 'verify') {
    $token = clean_string($data['token'] ?? ($_GET['token'] ?? ''), 120);
    if ($token === '') {
        json_response(['ok' => false, 'error' => 'Token manquant.'], 400);
    }

    $stmt = db()->prepare('SELECT * FROM users WHERE email_verification_token = ? LIMIT 1');
    $stmt->execute([$token]);
    $user = $stmt->fetch();
    if ($user) {
        $stmt = db()->prepare('UPDATE users SET email_verified = 1, email_verification_token = NULL, updated_at = NOW() WHERE id = ?');
        $stmt->execute([$user['id']]);
        if (!empty($_SESSION['user_id']) && $_SESSION['user_id'] === $user['id']) {
            $stmt = db()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
            $stmt->execute([$user['id']]);
            json_response(['ok' => true, 'message' => 'Email verifie.', 'user' => public_user($stmt->fetch())]);
        }
        json_response(['ok' => true, 'message' => 'Email verifie.']);
    }

    $stmt = db()->prepare('SELECT * FROM newsletter_leads WHERE verification_token = ? LIMIT 1');
    $stmt->execute([$token]);
    $lead = $stmt->fetch();
    if (!$lead) {
        json_response(['ok' => false, 'error' => 'Lien de verification invalide ou deja utilise.'], 404);
    }
    $stmt = db()->prepare('UPDATE newsletter_leads SET email_verified = 1, verification_token = NULL, updated_at = NOW() WHERE id = ?');
    $stmt->execute([$lead['id']]);
    json_response(['ok' => true, 'message' => 'Email newsletter verifie.']);
}

if ($action === 'password-reset-request') {
    $email = strtolower(clean_string($data['email'] ?? '', 180));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_response(['ok' => false, 'error' => 'Email invalide.'], 400);
    }
    $stmt = db()->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    if ($user) {
        $token = bin2hex(random_bytes(32));
        $stmt = db()->prepare('UPDATE users SET password_reset_token = ?, password_reset_sent_at = NOW(), updated_at = NOW() WHERE id = ?');
        $stmt->execute([$token, $user['id']]);
        $url = site_base_url() . '/?reset_password=' . urlencode($token);
        $sent = send_site_email(
            $email,
            'Reinitialisation de votre mot de passe',
            "Bonjour,\n\nCliquez sur ce lien pour choisir un nouveau mot de passe :\n" . $url . "\n\nSi vous n'avez pas fait cette demande, ignorez ce message."
        );
        json_response(['ok' => true, 'message' => $sent ? 'Lien de reinitialisation envoye.' : 'Lien genere, mais email non envoye par le serveur.', 'resetUrl' => $sent ? null : $url]);
    }
    json_response(['ok' => false, 'error' => 'Aucun compte associe a cet email.'], 404);
}

if ($action === 'password-reset-confirm') {
    $token = clean_string($data['token'] ?? '', 120);
    $password = (string) ($data['password'] ?? '');
    if ($token === '' || strlen($password) < 8) {
        json_response(['ok' => false, 'error' => 'Lien ou mot de passe invalide.'], 400);
    }
    $stmt = db()->prepare('SELECT * FROM users WHERE password_reset_token = ? LIMIT 1');
    $stmt->execute([$token]);
    $user = $stmt->fetch();
    if (!$user) {
        json_response(['ok' => false, 'error' => 'Lien de reinitialisation invalide ou deja utilise.'], 404);
    }
    $stmt = db()->prepare('UPDATE users SET password_hash = ?, password_reset_token = NULL, updated_at = NOW() WHERE id = ?');
    $stmt->execute([password_hash($password, PASSWORD_DEFAULT), $user['id']]);
    json_response(['ok' => true, 'message' => 'Mot de passe mis a jour.']);
}

json_response(['ok' => false, 'error' => 'Action inconnue.'], 404);
