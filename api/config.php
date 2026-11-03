<?php
declare(strict_types=1);

@ini_set('memory_limit', '2048M');
@set_time_limit(300);

require_once __DIR__ . '/db.php';

function db()
{
    static $pdo = null;
    if ($pdo) {
        return $pdo;
    }

    if (!class_exists('PDO')) {
        throw new RuntimeException("Extension PHP PDO indisponible.");
    }

    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', DB_HOST, DB_PORT, DB_NAME);
    $pdo = new PDO($dsn, DB_USER, DB_PASSWORD, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

const PUBLIC_STATE_CACHE_TTL = 300;
const SITE_SESSION_LIFETIME = 43200;

@ini_set('session.gc_maxlifetime', (string) SITE_SESSION_LIFETIME);
@ini_set('session.use_strict_mode', '1');
session_name(SITE_SESSION_NAME);
session_set_cookie_params([
    'lifetime' => SITE_SESSION_LIFETIME,
    'path' => '/',
    'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();


function default_public_state_seed(): array
{
    return [
        'categories' => ['Sante', 'Securite', 'Travail', 'Local', 'Education', "Pouvoir d'achat"],
        'contentTypes' => ['Amendement', 'Question ecrite', 'Question orale', 'Proposition de loi', 'Communique', 'Intervention', 'Visite', 'Divers'],
        'homepage' => [
            'browserTitle' => 'Emeric Salmon - Espace parlementaire',
            'brandEyebrow' => 'Espace parlementaire',
            'brandName' => 'Emeric Salmon',
            'navHome' => 'Accueil',
            'navNewsletter' => 'Recevoir les informations',
            'navSupport' => 'Support',
            'heroEyebrow' => 'Député de la 2e circonscription de la Haute-Saône',
            'heroTitle' => 'À vos côtés, sur le terrain comme à l’Assemblée.',
            'heroBody' => "Emeric Salmon porte la voix des habitants de Haute-Saône, accompagne les projets locaux et défend les enjeux du territoire dans le travail parlementaire.",
            'searchPlaceholder' => 'Rechercher une commune, une actualité...',
            'searchButton' => 'Rechercher',
            'portraitName' => 'Emeric Salmon',
            'portraitSubtitle' => 'Haute-Saône',
            'heroImage' => 'assets/emeric-salmon-portrait.jpg',
            'heroImageAlt' => 'Portrait officiel d’Emeric Salmon',
            'overviewEyebrow' => 'Découvrir le mandat',
            'overviewTitle' => 'Un engagement suivi, à l’Assemblée et en Haute-Saône',
            'overviewIntro' => 'Les accès essentiels et les chiffres du mandat réunis en un seul endroit.',
            'victoriesLabel' => 'Victoires',
            'victoriesMeta' => 'résultats obtenus',
            'agendaLabel' => 'Rendez-vous circos',
            'agendaMeta' => 'rendez-vous',
            'legislativeLabel' => 'Travail législatif',
            'legislativeMeta' => 'contenus',
            'period30' => '1 mois',
            'period90' => '3 mois',
            'period365' => '1 an',
            'periodAll' => 'Depuis le début',
            'footerLegal' => 'Mentions légales et confidentialité',
            'footerSignature' => 'Emeric Salmon · Député de la Haute-Saône',
            'adminAccess' => 'Administration',
        ],
        'socialLinks' => [
            'assembly' => '',
            'twitter' => '',
            'facebook' => '',
            'instagram' => '',
            'threads' => '',
            'tiktok' => '',
        ],
        'visits' => 0,
        'victories' => [],
        'agenda' => [],
        'legislative' => [],
        'photoLibrary' => ['folders' => [], 'photos' => []],
        'terrainGeojson' => null,
        'terrainGeojsonFileName' => '',
        'sections' => [],
    ];
}

function default_admin_state_seed(): array
{
    $now = gmdate('c');
    return [
        'citizenRequests' => [],
        'news' => [],
        'documents' => [],
        'documentFolders' => [],
        'templates' => [],
        'parliamentWork' => [],
        'localContacts' => [],
        'savedContactSearches' => [],
        'mailTemplates' => [],
        'trombinoscopeCategories' => [],
        'trombinoscopePeople' => [],
        'permanenceRequests' => [],
        'localFolders' => [
            ['id' => 'local-folder-general', 'name' => 'Dossiers citoyens', 'parentId' => '', 'createdAt' => $now, 'updatedAt' => $now],
        ],
        'permanenceKeywords' => [['id' => 'commune', 'label' => 'commune', 'color' => '#2d6fb6']],
        'teamTasks' => [],
        'calendarEvents' => [],
        'campaignEvents' => [],
        'calendarEventCategories' => [],
        'teamFolders' => [
            ['id' => 'team-folder-general', 'name' => 'Suivi general', 'description' => "Dossiers et actions suivis par l'equipe.", 'createdAt' => $now, 'updatedAt' => $now],
        ],
        'contactFields' => [],
        'contactKeywords' => [
            ['id' => 'institutionnel', 'label' => 'institutionnel', 'color' => '#2d6fb6'],
            ['id' => 'urgent', 'label' => 'urgent', 'color' => '#b2303d'],
            ['id' => 'deces', 'label' => 'deces', 'color' => '#343a46'],
        ],
        'deathCases' => [],
        'specialLetters' => [],
        'deathLetterTemplate' => "{{date_du_jour}}\n\n{{civilite_proche}} {{prenom_proche}} {{nom_proche}}\n{{adresse_proche}}\n\nObjet : condoleances suite au deces de {{prenom_defunt}} {{nom_defunt}}\n\n{{civilite_proche}},\n\nJ'ai appris avec tristesse le deces de {{prenom_defunt}} {{nom_defunt}}, survenu le {{date_deces}}.\n\nJe tiens a vous adresser mes sinceres condoleances, ainsi qu'a l'ensemble de votre famille et de vos proches.\n\nCordialement,\nEmeric Salmon",
        'addons' => [
            ['id' => 'contacts-import-export', 'name' => 'Import / export de contacts', 'description' => 'CSV, JSON et sauvegarde des contacts locaux.', 'enabled' => true, 'locked' => true],
            ['id' => 'death-management', 'name' => 'Gestion des deces', 'description' => 'Dossiers de deces, proches, courriers Word et emails.', 'enabled' => true, 'locked' => true],
            ['id' => 'database-sync', 'name' => 'Synchronisation base de donnees', 'description' => "Sauvegarde de l'administration via api/admin.php lorsque l'API est disponible.", 'enabled' => true, 'locked' => true],
            ['id' => 'editorial-workflow', 'name' => 'Validation editoriale', 'description' => 'Suivi des actualites et contenus a publier.', 'enabled' => true, 'locked' => false],
        ],
        'notifications' => [],
        'activityLog' => [],
        'campaign' => ['geojson' => null, 'fileName' => '', 'assignments' => [], 'importedAt' => ''],
        'photoLibrary' => ['folders' => [], 'photos' => []],
        'mobileAdminMenu' => ['dashboard', 'contacts', 'trombinoscope', 'calendar', 'permanence', 'death', 'special-letters', 'documents', 'mail-templates', 'mail-campaigns', 'homepage', 'content', 'photo-library', 'campaign-terrain', 'mobile-menu', 'map-settings'],
        'filters' => [],
    ];
}

function ensure_database_schema(): void
{
    static $done = false;
    $sessionKey = 'database_schema_ready_20260925';
    if ($done || !empty($_SESSION[$sessionKey])) {
        return;
    }

    db()->exec(
        "CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(64) PRIMARY KEY,
            login VARCHAR(120) NOT NULL UNIQUE,
            email VARCHAR(180) NOT NULL UNIQUE,
            email_verified TINYINT(1) NOT NULL DEFAULT 0,
            email_verification_token VARCHAR(120) NULL,
            email_verification_sent_at DATETIME NULL,
            password_hash VARCHAR(255) NOT NULL,
            password_reset_token VARCHAR(120) NULL,
            password_reset_sent_at DATETIME NULL,
            role VARCHAR(30) NOT NULL DEFAULT 'user',
            first_name VARCHAR(120) NOT NULL DEFAULT '',
            last_name VARCHAR(120) NOT NULL DEFAULT '',
            city VARCHAR(120) NOT NULL DEFAULT '',
            phone VARCHAR(60) NOT NULL DEFAULT '',
            categories_json LONGTEXT NULL,
            newsletter_frequency VARCHAR(40) NOT NULL DEFAULT 'Hebdomadaire',
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );
    ensure_user_email_columns();

    db()->exec(
        "CREATE TABLE IF NOT EXISTS site_state (
            id TINYINT PRIMARY KEY,
            state_json LONGTEXT NOT NULL,
            visits INT UNSIGNED NOT NULL DEFAULT 0,
            updated_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );

    db()->exec(
        "CREATE TABLE IF NOT EXISTS support_requests (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL,
            user_name VARCHAR(180) NOT NULL DEFAULT '',
            user_email VARCHAR(180) NOT NULL DEFAULT '',
            type VARCHAR(40) NOT NULL DEFAULT 'Proposition',
            title VARCHAR(180) NOT NULL DEFAULT '',
            message TEXT NOT NULL,
            replies_json LONGTEXT NULL,
            status VARCHAR(40) NOT NULL DEFAULT 'A traiter',
            folder VARCHAR(80) NOT NULL DEFAULT 'A traiter',
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            INDEX support_user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );

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

    db()->exec(
        "CREATE TABLE IF NOT EXISTS admin_state (
            id TINYINT PRIMARY KEY,
            state_json LONGTEXT NOT NULL,
            updated_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );

    seed_initial_database_data();
    $done = true;
    $_SESSION[$sessionKey] = true;
}

function seed_initial_database_data(): void
{
    $stmt = db()->prepare('SELECT COUNT(*) FROM users WHERE id = ? OR login = ? OR email = ?');
    $stmt->execute(['admin-default', FOUNDER_LOGIN, FOUNDER_EMAIL]);
    if ((int) $stmt->fetchColumn() === 0) {
        $stmt = db()->prepare(
            'INSERT INTO users
             (id, login, email, email_verified, password_hash, role, first_name, last_name, city, phone, categories_json, newsletter_frequency, created_at, updated_at)
             VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())'
        );
        $stmt->execute([
            'admin-default',
            FOUNDER_LOGIN,
            FOUNDER_EMAIL,
            password_hash(FOUNDER_PASSWORD, PASSWORD_DEFAULT),
            'founder',
            'Fondateur',
            'Site',
            '',
            '',
            '[]',
            'Hebdomadaire',
        ]);
    }

    $stmt = db()->query('SELECT COUNT(*) FROM site_state WHERE id = 1');
    if ((int) $stmt->fetchColumn() === 0) {
        $state = default_public_state_seed();
        $json = json_encode($state, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | (defined('JSON_INVALID_UTF8_SUBSTITUTE') ? JSON_INVALID_UTF8_SUBSTITUTE : 0));
        $stmt = db()->prepare('INSERT INTO site_state (id, state_json, visits, updated_at) VALUES (1, ?, 0, NOW())');
        $stmt->execute([$json]);
    }

    $stmt = db()->query('SELECT COUNT(*) FROM admin_state WHERE id = 1');
    if ((int) $stmt->fetchColumn() === 0) {
        $json = json_encode(default_admin_state_seed(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | (defined('JSON_INVALID_UTF8_SUBSTITUTE') ? JSON_INVALID_UTF8_SUBSTITUTE : 0));
        $stmt = db()->prepare('INSERT INTO admin_state (id, state_json, updated_at) VALUES (1, ?, NOW())');
        $stmt->execute([$json]);
    }
}

function json_response(array $payload, int $status = 200, array $headers = []): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    foreach ($headers as $name => $value) {
        header($name . ': ' . $value);
    }
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | (defined('JSON_INVALID_UTF8_SUBSTITUTE') ? JSON_INVALID_UTF8_SUBSTITUTE : 0));
    if ($json === false) {
        $json = '{"ok":false,"error":"Reponse JSON invalide."}';
        http_response_code(500);
    }
    echo $json;
    exit;
}

function request_json(): array
{
    $raw = file_get_contents('php://input') ?: '';
    if ($raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    unset($raw);
    if (!is_array($data)) {
        json_response(['ok' => false, 'error' => 'JSON invalide.'], 400);
    }
    return $data;
}

function clean_string($value, int $max = 255): string
{
    $value = trim((string) $value);
    return function_exists('mb_substr') ? mb_substr($value, 0, $max) : substr($value, 0, $max);
}

function clean_list($value, int $maxItems = 40): array
{
    if (!is_array($value)) {
        return [];
    }
    $items = [];
    foreach ($value as $item) {
        $clean = clean_string($item, 80);
        if ($clean !== '' && !in_array($clean, $items, true)) {
            $items[] = $clean;
        }
        if (count($items) >= $maxItems) {
            break;
        }
    }
    return $items;
}

function public_user(array $user): array
{
    return [
        'id' => (string) ($user['id'] ?? ''),
        'login' => (string) ($user['login'] ?? ''),
        'role' => (string) ($user['role'] ?? 'user'),
        'firstName' => (string) ($user['first_name'] ?? ''),
        'lastName' => (string) ($user['last_name'] ?? ''),
        'city' => (string) ($user['city'] ?? ''),
        'email' => (string) ($user['email'] ?? ''),
        'phone' => (string) ($user['phone'] ?? ''),
        'categories' => json_decode((string) ($user['categories_json'] ?? '[]'), true) ?: [],
        'emailVerified' => !empty($user['email_verified']),
        'newsletterFrequency' => $user['newsletter_frequency'] ?? 'Hebdomadaire',
        'createdAt' => (string) ($user['created_at'] ?? ''),
    ];
}

function ensure_user_email_columns(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $columns = [
        'email_verified' => "ALTER TABLE users ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0",
        'email_verification_token' => "ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(120) NULL",
        'email_verification_sent_at' => "ALTER TABLE users ADD COLUMN email_verification_sent_at DATETIME NULL",
        'password_reset_token' => "ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(120) NULL",
        'password_reset_sent_at' => "ALTER TABLE users ADD COLUMN password_reset_sent_at DATETIME NULL",
        'first_name' => "ALTER TABLE users ADD COLUMN first_name VARCHAR(120) NOT NULL DEFAULT ''",
        'last_name' => "ALTER TABLE users ADD COLUMN last_name VARCHAR(120) NOT NULL DEFAULT ''",
        'city' => "ALTER TABLE users ADD COLUMN city VARCHAR(120) NOT NULL DEFAULT ''",
        'phone' => "ALTER TABLE users ADD COLUMN phone VARCHAR(60) NOT NULL DEFAULT ''",
        'categories_json' => "ALTER TABLE users ADD COLUMN categories_json LONGTEXT NULL",
        'newsletter_frequency' => "ALTER TABLE users ADD COLUMN newsletter_frequency VARCHAR(40) NOT NULL DEFAULT 'Hebdomadaire'",
        'created_at' => "ALTER TABLE users ADD COLUMN created_at DATETIME NULL",
        'updated_at' => "ALTER TABLE users ADD COLUMN updated_at DATETIME NULL",
    ];
    foreach ($columns as $name => $sql) {
        $stmt = db()->query("SHOW COLUMNS FROM users LIKE " . db()->quote($name));
        if (!$stmt->fetch()) {
            db()->exec($sql);
        }
    }
    $done = true;
}

function site_base_url(): string
{
    if (SITE_PUBLIC_URL !== '') {
        return rtrim(SITE_PUBLIC_URL, '/');
    }
    $https = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on';
    $scheme = $https ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $path = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
    $root = preg_replace('#/api$#', '', $path);
    return $scheme . '://' . $host . ($root === '' ? '' : $root);
}

function send_site_email(string $to, string $subject, string $message): bool
{
    $headers = [
        'From: ' . SITE_MAIL_FROM,
        'Content-Type: text/plain; charset=UTF-8',
    ];
    return function_exists('mail') && @mail($to, $subject, $message, implode("\r\n", $headers));
}

function current_user(): ?array
{
    ensure_database_schema();
    if (empty($_SESSION['user_id'])) {
        return null;
    }
    $stmt = db()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();
    return $user ?: null;
}

function require_user(): array
{
    $user = current_user();
    if (!$user) {
        json_response(['ok' => false, 'error' => 'Connexion requise.'], 401);
    }
    return $user;
}

function can_moderate(array $user): bool
{
    return role_rank($user['role'] ?? 'user') >= role_rank('moderator');
}

function role_rank(string $role): int
{
    return [
        'user' => 0,
        'visitor' => 0,
        'moderator' => 10,
        'collaborator' => 20,
        'admin' => 30,
        'founder' => 40,
        'super-admin' => 40,
    ][$role] ?? 0;
}

function can_collaborate(array $user): bool
{
    return role_rank($user['role'] ?? 'user') >= role_rank('collaborator');
}

function can_administer(array $user): bool
{
    return role_rank($user['role'] ?? 'user') >= role_rank('admin');
}

function require_moderator(): array
{
    $user = require_user();
    if (!can_moderate($user)) {
        json_response(['ok' => false, 'error' => 'Acces refuse.'], 403);
    }
    return $user;
}

function default_public_state(): array
{
    return array_merge(default_public_state_seed(), [
        'users' => [],
        'supportRequests' => [],
        'newsletterLeads' => [],
    ]);
}

function strip_legacy_public_seed_records(array $state): array
{
    $seedIds = [
        'victories' => ['seed-victory-services-publics', 'seed-victory-securite-quotidien'],
        'agenda' => ['seed-agenda-permanence-vesoul', 'seed-agenda-elus-lure'],
        'legislative' => ['seed-law-acces-soins', 'seed-law-police-municipale'],
    ];
    foreach ($seedIds as $collection => $ids) {
        if (!is_array($state[$collection] ?? null)) {
            continue;
        }
        $state[$collection] = array_values(array_filter(
            $state[$collection],
            static fn($item): bool => !is_array($item) || !in_array($item['id'] ?? '', $ids, true)
        ));
    }
    return $state;
}

function compact_photo_library_payload(array $state): array
{
    if (!is_array($state['photoLibrary']['photos'] ?? null)) {
        return $state;
    }
    foreach ($state['photoLibrary']['photos'] as &$photo) {
        if (is_array($photo) && isset($photo['thumbnail'], $photo['src']) && $photo['thumbnail'] === $photo['src']) {
            $photo['thumbnail'] = '';
        }
    }
    unset($photo);
    return $state;
}

function read_state(): array
{
    ensure_database_schema();
    $stmt = db()->query('SELECT state_json, visits FROM site_state WHERE id = 1');
    $row = $stmt->fetch();
    if (!$row) {
        return default_public_state();
    }
    $state = json_decode($row['state_json'] ?: '{}', true);
    if (!is_array($state)) {
        $state = default_public_state();
    }
    $cleanedState = strip_legacy_public_seed_records($state);
    if ($cleanedState !== $state) {
        $cleanedState['visits'] = (int) $row['visits'];
        write_state($cleanedState);
    }
    $state = $cleanedState;
    $state['visits'] = (int) $row['visits'];
    return compact_photo_library_payload(array_intersect_key(array_merge(default_public_state(), $state), default_public_state()));
}

function public_state_cache_path(): string
{
    return __DIR__ . '/cache/public-state.json';
}

function read_public_state_cache(int $ttl = PUBLIC_STATE_CACHE_TTL): ?array
{
    $path = public_state_cache_path();
    if (!is_file($path) || filemtime($path) + $ttl < time()) {
        return null;
    }
    $payload = json_decode((string) file_get_contents($path), true);
    if (!is_array($payload) || !isset($payload['state']) || !is_array($payload['state'])) {
        return null;
    }
    return compact_photo_library_payload(array_intersect_key(array_merge(default_public_state(), $payload['state']), default_public_state()));
}

function write_public_state_cache(array $state): void
{
    $directory = dirname(public_state_cache_path());
    if (!is_dir($directory)) {
        @mkdir($directory, 0755, true);
    }
    if (!is_dir($directory) || !is_writable($directory)) {
        return;
    }
    $path = public_state_cache_path();
    $temporary = $path . '.' . bin2hex(random_bytes(6)) . '.tmp';
    $payload = json_encode(['cachedAt' => gmdate('c'), 'state' => $state], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | (defined('JSON_INVALID_UTF8_SUBSTITUTE') ? JSON_INVALID_UTF8_SUBSTITUTE : 0));
    if ($payload === false) {
        return;
    }
    if (@file_put_contents($temporary, $payload, LOCK_EX) !== false) {
        @rename($temporary, $path);
    }
}

function write_state(array $state): void
{
    ensure_database_schema();
    unset(
        $state['users'],
        $state['supportRequests'],
        $state['newsletterLeads'],
        $state['citizenRequests'],
        $state['news'],
        $state['documents'],
        $state['templates'],
        $state['parliamentWork'],
        $state['localContacts'],
        $state['notifications'],
        $state['activityLog'],
        $state['filters']
    );
    $visits = max(0, (int) ($state['visits'] ?? 0));
    $json = json_encode($state, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | (defined('JSON_INVALID_UTF8_SUBSTITUTE') ? JSON_INVALID_UTF8_SUBSTITUTE : 0));
    $stmt = db()->prepare(
        'INSERT INTO site_state (id, state_json, visits, updated_at)
         VALUES (1, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE state_json = VALUES(state_json), visits = VALUES(visits), updated_at = NOW()'
    );
    $stmt->execute([$json, $visits]);
    write_public_state_cache(array_intersect_key(array_merge(default_public_state(), $state), default_public_state()));
}

function state_version(string $table): string
{
    if (!in_array($table, ['site_state', 'admin_state'], true)) {
        return '';
    }
    ensure_database_schema();
    return (string) (db()->query("SELECT UNIX_TIMESTAMP(updated_at) FROM {$table} WHERE id = 1")->fetchColumn() ?: '');
}

function public_state_change_paths(): array
{
    return ['categories', 'contentTypes', 'homepage', 'socialLinks', 'victories', 'agenda', 'legislative', 'photoLibrary', 'terrainGeojson', 'terrainGeojsonFileName', 'sections'];
}

function write_public_state_changes(array $changes): void
{
    ensure_database_schema();
    $allowed = array_fill_keys(public_state_change_paths(), true);
    $assignments = [];
    $params = [];
    foreach ($changes as $key => $value) {
        if (!isset($allowed[$key])) {
            continue;
        }
        $encoded = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | (defined('JSON_INVALID_UTF8_SUBSTITUTE') ? JSON_INVALID_UTF8_SUBSTITUTE : 0));
        if ($encoded === false) {
            json_response(['ok' => false, 'error' => 'Etat non serialisable : ' . json_last_error_msg()], 400);
        }
        $assignments[] = "'$." . $key . "'";
        $assignments[] = 'JSON_EXTRACT(?, "$")';
        $params[] = $encoded;
    }
    if (!$assignments) {
        return;
    }
    $sql = 'UPDATE site_state SET state_json = JSON_SET(state_json, ' . implode(', ', $assignments) . '), updated_at = NOW() WHERE id = 1';
    db()->prepare($sql)->execute($params);
    $state = read_state();
    write_public_state_cache($state);
}
