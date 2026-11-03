<?php
declare(strict_types=1);
require __DIR__ . '/config.php';

function support_replies_from_row(array $row): array
{
    if (empty($row['replies_json'])) {
        return [];
    }
    $decoded = json_decode($row['replies_json'], true);
    if (!is_array($decoded)) {
        return [];
    }
    $replies = [];
    foreach ($decoded as $reply) {
        if (!is_array($reply)) {
            continue;
        }
        $clean = [
            'id' => clean_string($reply['id'] ?? '', 80),
            'authorId' => clean_string($reply['authorId'] ?? '', 80),
            'authorName' => clean_string($reply['authorName'] ?? 'Equipe', 180),
            'authorRole' => in_array(($reply['authorRole'] ?? ''), ['founder', 'super-admin', 'admin', 'collaborator', 'moderator', 'user'], true) ? $reply['authorRole'] : 'user',
            'message' => clean_string($reply['message'] ?? '', 1800),
            'createdAt' => clean_string($reply['createdAt'] ?? '', 40),
        ];
        if ($clean['message'] !== '') {
            $replies[] = $clean;
        }
    }
    return $replies;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (($_GET['action'] ?? '') === 'version') {
        json_response(['ok' => true, 'version' => state_version('site_state')], 200, ['Cache-Control' => 'no-store']);
    }
    $user = current_user();

    if (!$user) {
        $cachedState = read_public_state_cache();
        if ($cachedState !== null) {
            json_response(
                ['ok' => true, 'state' => $cachedState, 'user' => null, 'version' => state_version('site_state')],
                200,
                ['Cache-Control' => 'public, max-age=60, stale-while-revalidate=240']
            );
        }
    }

    $state = read_state();
    if (!$user) {
        write_public_state_cache($state);
    }

    if ($user) {
        if (can_moderate($user)) {
            $users = db()->query('SELECT * FROM users ORDER BY created_at DESC')->fetchAll();
            $state['users'] = array_map('public_user', $users);
            $leads = db()->query('SELECT * FROM newsletter_leads ORDER BY consent_at DESC')->fetchAll();
            $state['newsletterLeads'] = array_map(static fn(array $row): array => [
                'id' => $row['id'],
                'email' => $row['email'],
                'city' => $row['city'],
                'categories' => json_decode($row['categories_json'] ?: '[]', true) ?: [],
                'frequency' => $row['frequency'],
                'emailVerified' => !empty($row['email_verified']),
                'consentAt' => $row['consent_at'],
            ], $leads);
            $stmt = db()->query('SELECT * FROM support_requests ORDER BY created_at DESC');
            $state['supportRequests'] = array_map(static fn(array $row): array => [
                'id' => $row['id'],
                'userId' => $row['user_id'],
                'userName' => $row['user_name'],
                'userEmail' => $row['user_email'],
                'type' => $row['type'],
                'title' => $row['title'],
                'message' => $row['message'],
                'replies' => support_replies_from_row($row),
                'status' => $row['status'],
                'folder' => $row['folder'] ?? 'A traiter',
                'createdAt' => $row['created_at'],
                'updatedAt' => $row['updated_at'],
            ], $stmt->fetchAll());
        } else {
            $state['users'] = [public_user($user)];
            $stmt = db()->prepare('SELECT * FROM support_requests WHERE user_id = ? ORDER BY created_at DESC');
            $stmt->execute([$user['id']]);
            $state['supportRequests'] = array_map(static fn(array $row): array => [
                'id' => $row['id'],
                'userId' => $row['user_id'],
                'userName' => $row['user_name'],
                'userEmail' => $row['user_email'],
                'type' => $row['type'],
                'title' => $row['title'],
                'message' => $row['message'],
                'replies' => support_replies_from_row($row),
                'status' => $row['status'],
                'folder' => $row['folder'] ?? 'A traiter',
                'createdAt' => $row['created_at'],
                'updatedAt' => $row['updated_at'],
            ], $stmt->fetchAll());
        }
    }

    json_response(
        ['ok' => true, 'state' => $state, 'user' => $user ? public_user($user) : null, 'version' => state_version('site_state')],
        200,
        $user ? [] : ['Cache-Control' => 'public, max-age=60, stale-while-revalidate=240']
    );
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (($_GET['action'] ?? '') === 'visit') {
        ensure_database_schema();
        db()->exec('UPDATE site_state SET visits = visits + 1 WHERE id = 1');
        $visits = (int) db()->query('SELECT visits FROM site_state WHERE id = 1')->fetchColumn();
        json_response(['ok' => true, 'visits' => $visits]);
    }

    require_moderator();
    $data = request_json();
    $state = $data['state'] ?? [];
    $changes = $data['changes'] ?? null;
    if (is_array($changes)) {
        write_public_state_changes($changes);
        json_response(['ok' => true, 'saved' => true, 'partial' => true, 'version' => state_version('site_state')]);
    }
    if (!is_array($state)) {
        json_response(['ok' => false, 'error' => 'Etat invalide.'], 400);
    }
    write_state($state);
    json_response(['ok' => true, 'saved' => true, 'version' => state_version('site_state')]);
}

json_response(['ok' => false, 'error' => 'Methode non autorisee.'], 405);
