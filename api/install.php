<?php
declare(strict_types=1);
require __DIR__ . '/config.php';

try {
    ensure_database_schema();
    json_response([
        'ok' => true,
        'message' => 'Base de donnees initialisee.',
        'tables' => [
            'users',
            'site_state',
            'admin_state',
            'support_requests',
            'newsletter_leads',
        ],
    ]);
} catch (Throwable $error) {
    error_log($error->getMessage());
    json_response([
        'ok' => false,
        'error' => 'Initialisation de la base impossible.',
    ], 500);
}
