<?php
declare(strict_types=1);
require __DIR__ . '/config.php';

function support_replies_enabled(): bool
{
    ensure_database_schema();
    static $enabled = null;
    if ($enabled !== null) {
        return $enabled;
    }
    try {
        $stmt = db()->query("SHOW COLUMNS FROM support_requests LIKE 'replies_json'");
        if (!$stmt->fetch()) {
            db()->exec("ALTER TABLE support_requests ADD COLUMN replies_json LONGTEXT NULL AFTER message");
        }
        $stmt = db()->query("SHOW COLUMNS FROM support_requests LIKE 'folder'");
        if (!$stmt->fetch()) {
            db()->exec("ALTER TABLE support_requests ADD COLUMN folder VARCHAR(80) NOT NULL DEFAULT 'A traiter' AFTER status");
        }
        $enabled = true;
    } catch (Throwable) {
        $enabled = false;
    }
    return $enabled;
}

function clean_reply(array $reply): array
{
    return [
        'id' => clean_string($reply['id'] ?? bin2hex(random_bytes(8)), 80),
        'authorId' => clean_string($reply['authorId'] ?? '', 80),
        'authorName' => clean_string($reply['authorName'] ?? 'Equipe', 180),
        'authorRole' => in_array(($reply['authorRole'] ?? ''), ['founder', 'super-admin', 'admin', 'collaborator', 'moderator', 'user'], true) ? $reply['authorRole'] : 'user',
        'message' => clean_string($reply['message'] ?? '', 1800),
        'createdAt' => clean_string($reply['createdAt'] ?? gmdate('c'), 40),
    ];
}

function support_row(array $row): array
{
    $replies = [];
    if (isset($row['replies_json']) && $row['replies_json']) {
        $decoded = json_decode($row['replies_json'], true);
        if (is_array($decoded)) {
            foreach ($decoded as $reply) {
                if (!is_array($reply)) {
                    continue;
                }
                $clean = clean_reply($reply);
                if ($clean['message'] !== '') {
                    $replies[] = $clean;
                }
            }
        }
    }
    return [
        'id' => $row['id'],
        'userId' => $row['user_id'],
        'userName' => $row['user_name'],
        'userEmail' => $row['user_email'],
        'type' => $row['type'],
        'title' => $row['title'],
        'message' => $row['message'],
        'replies' => $replies,
        'status' => $row['status'],
        'folder' => $row['folder'] ?? 'A traiter',
        'createdAt' => $row['created_at'],
        'updatedAt' => $row['updated_at'],
    ];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    support_replies_enabled();
    $user = require_user();
    if (can_moderate($user)) {
        $rows = db()->query('SELECT * FROM support_requests ORDER BY created_at DESC')->fetchAll();
    } else {
        $stmt = db()->prepare('SELECT * FROM support_requests WHERE user_id = ? ORDER BY created_at DESC');
        $stmt->execute([$user['id']]);
        $rows = $stmt->fetchAll();
    }
    json_response(['ok' => true, 'requests' => array_map('support_row', $rows)]);
}

$data = request_json();

if ($_SERVER['REQUEST_METHOD'] === 'POST' && in_array(($_GET['action'] ?? ''), ['status', 'update'], true)) {
    require_moderator();
    support_replies_enabled();
    $id = clean_string($data['id'] ?? '', 80);
    $updates = [];
    $params = [];
    if (array_key_exists('status', $data)) {
        $status = clean_string($data['status'] ?? '', 40);
        if (!in_array($status, ['A traiter', 'En cours', 'Cloturee', 'Refusee'], true)) {
            json_response(['ok' => false, 'error' => 'Statut invalide.'], 400);
        }
        $updates[] = 'status = ?';
        $params[] = $status;
    }
    if (array_key_exists('folder', $data)) {
        $folder = clean_string($data['folder'] ?? '', 80);
        if (!in_array($folder, ['A traiter', 'En cours', 'Traitees', 'Archives'], true)) {
            json_response(['ok' => false, 'error' => 'Dossier invalide.'], 400);
        }
        $updates[] = 'folder = ?';
        $params[] = $folder;
    }
    if (!$updates) {
        json_response(['ok' => false, 'error' => 'Aucune modification.'], 400);
    }
    $params[] = $id;
    $stmt = db()->prepare('UPDATE support_requests SET ' . implode(', ', $updates) . ', updated_at = NOW() WHERE id = ?');
    $stmt->execute($params);
    json_response(['ok' => true]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_GET['action'] ?? '') === 'delete') {
    require_moderator();
    $id = clean_string($data['id'] ?? '', 80);
    $stmt = db()->prepare('DELETE FROM support_requests WHERE id = ?');
    $stmt->execute([$id]);
    json_response(['ok' => true]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_GET['action'] ?? '') === 'reply') {
    $user = require_user();
    if (!support_replies_enabled()) {
        json_response(['ok' => false, 'error' => 'La discussion support necessite la mise a jour de la table support_requests.'], 500);
    }
    $id = clean_string($data['id'] ?? '', 80);
    $stmt = db()->prepare('SELECT * FROM support_requests WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        json_response(['ok' => false, 'error' => 'Demande introuvable.'], 404);
    }
    if (!can_moderate($user) && $row['user_id'] !== $user['id']) {
        json_response(['ok' => false, 'error' => 'Acces refuse.'], 403);
    }
    $current = support_row($row);
    $reply = clean_reply([
        'id' => bin2hex(random_bytes(16)),
        'authorId' => $user['id'],
        'authorName' => trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? '')) ?: $user['login'],
        'authorRole' => $user['role'],
        'message' => $data['message'] ?? '',
        'createdAt' => gmdate('c'),
    ]);
    if ($reply['message'] === '') {
        json_response(['ok' => false, 'error' => 'Message vide.'], 400);
    }
    $replies = array_merge($current['replies'], [$reply]);
    $stmt = db()->prepare('UPDATE support_requests SET replies_json = ?, updated_at = NOW() WHERE id = ?');
    $stmt->execute([json_encode($replies, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $id]);
    $stmt = db()->prepare('SELECT * FROM support_requests WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    json_response(['ok' => true, 'request' => support_row($stmt->fetch())]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    support_replies_enabled();
    $user = require_user();
    $id = bin2hex(random_bytes(16));
    $type = clean_string($data['type'] ?? 'Proposition', 40);
    if (!in_array($type, ['Support', 'Proposition'], true)) {
        $type = 'Proposition';
    }
    $stmt = db()->prepare(
        'INSERT INTO support_requests
         (id, user_id, user_name, user_email, type, title, message, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())'
    );
    $stmt->execute([
        $id,
        $user['id'],
        trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? '')) ?: $user['login'],
        $user['email'],
        $type,
        clean_string($data['title'] ?? '', 140),
        clean_string($data['message'] ?? '', 2500),
        'A traiter',
    ]);

    $stmt = db()->prepare('SELECT * FROM support_requests WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    json_response(['ok' => true, 'request' => support_row($stmt->fetch())]);
}

json_response(['ok' => false, 'error' => 'Methode non autorisee.'], 405);
