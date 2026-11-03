<?php
declare(strict_types=1);
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'list') {
    require_moderator();
    $stmt = db()->query('SELECT * FROM users ORDER BY created_at DESC, login ASC');
    $users = [];
    foreach ($stmt->fetchAll() as $user) {
        $users[] = public_user($user);
    }
    json_response(['ok' => true, 'users' => $users]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['ok' => false, 'error' => 'Methode non autorisee.'], 405);
}

$admin = require_moderator();
if (!can_administer($admin)) {
    json_response(['ok' => false, 'error' => 'Acces refuse.'], 403);
}

$data = request_json();
$id = clean_string($data['id'] ?? '', 80);
$action = $_GET['action'] ?? '';

if ($action === 'role') {
    $role = clean_string($data['role'] ?? 'user', 30);
    if (!in_array($role, ['user', 'moderator', 'collaborator', 'admin', 'founder', 'super-admin'], true)) {
        json_response(['ok' => false, 'error' => 'Role invalide.'], 400);
    }
    if ($id === 'admin-default' && $admin['id'] !== 'admin-default') {
        json_response(['ok' => false, 'error' => 'Compte fondateur protege.'], 403);
    }
    $stmt = db()->prepare('UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?');
    $stmt->execute([$role, $id]);
    json_response(['ok' => true]);
}

if ($action === 'password') {
    $password = (string) ($data['password'] ?? '');
    if (strlen($password) < 8) {
        json_response(['ok' => false, 'error' => 'Mot de passe trop court.'], 400);
    }
    $stmt = db()->prepare('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?');
    $stmt->execute([password_hash($password, PASSWORD_DEFAULT), $id]);
    json_response(['ok' => true]);
}

json_response(['ok' => false, 'error' => 'Action inconnue.'], 404);
