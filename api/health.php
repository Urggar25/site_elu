<?php
declare(strict_types=1);
require __DIR__ . '/config.php';

try {
    ensure_database_schema();
    $pdo = db();
    $tables = [];
    foreach (['users', 'site_state', 'admin_state', 'support_requests', 'newsletter_leads'] as $table) {
        $stmt = $pdo->prepare(
            'SELECT COUNT(*)
             FROM information_schema.tables
             WHERE table_schema = ? AND table_name = ?'
        );
        $stmt->execute([DB_NAME, $table]);
        $tables[$table] = (bool) $stmt->fetchColumn();
    }

    $userCount = 0;
    if ($tables['users']) {
        $userCount = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    }

    json_response([
        'ok' => true,
        'php' => PHP_VERSION,
        'tables' => $tables,
        'allDataTablesReady' => !in_array(false, $tables, true),
        'userCount' => $userCount,
        'sessionActive' => session_status() === PHP_SESSION_ACTIVE,
    ]);
} catch (Throwable $error) {
    error_log($error->getMessage());
    json_response([
        'ok' => false,
        'error' => 'Verification de la base indisponible.',
    ], 500);
}
