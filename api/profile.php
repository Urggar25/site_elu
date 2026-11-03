<?php
declare(strict_types=1);
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['ok' => false, 'error' => 'Methode non autorisee.'], 405);
}

$user = require_user();
ensure_database_schema();
$data = request_json();
$categories = clean_list($data['categories'] ?? [], 40);
$frequency = clean_string($data['frequency'] ?? 'Hebdomadaire', 40);
if (!in_array($frequency, ['Immediate', 'Hebdomadaire', 'Mensuelle'], true)) {
    $frequency = 'Hebdomadaire';
}

$stmt = db()->prepare(
    'UPDATE users
     SET first_name = ?, last_name = ?, city = ?, phone = ?, categories_json = ?, newsletter_frequency = ?, updated_at = NOW()
     WHERE id = ?'
);
$stmt->execute([
    clean_string($data['firstName'] ?? '', 120),
    clean_string($data['lastName'] ?? '', 120),
    clean_string($data['city'] ?? '', 120),
    clean_string($data['phone'] ?? '', 60),
    json_encode($categories, JSON_UNESCAPED_UNICODE),
    $frequency,
    $user['id'],
]);

$stmt = db()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
$stmt->execute([$user['id']]);
json_response(['ok' => true, 'user' => public_user($stmt->fetch())]);
