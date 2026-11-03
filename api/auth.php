<?php
declare(strict_types=1);
require __DIR__ . '/config.php';

$action = $_GET['action'] ?? '';
ensure_database_schema();

if ($action === 'me') {
    $user = current_user();
    json_response(['ok' => true, 'user' => $user ? public_user($user) : null]);
}

if ($action === 'logout') {
    $_SESSION = [];
    session_destroy();
    json_response(['ok' => true]);
}

$data = request_json();

if ($action === 'login') {
    $login = clean_string($data['login'] ?? '', 180);
    $password = (string) ($data['password'] ?? '');
    $stmt = db()->prepare('SELECT * FROM users WHERE login = ? OR email = ? LIMIT 1');
    $stmt->execute([$login, $login]);
    $user = $stmt->fetch();
    if (!$user) {
        json_response(['ok' => false, 'error' => 'Identifiant inconnu.'], 404);
    }
    if (!password_verify($password, $user['password_hash'])) {
        json_response(['ok' => false, 'error' => 'Mot de passe errone.'], 401);
    }
    $_SESSION['user_id'] = $user['id'];
    // L'etat public est deja charge par state.php au demarrage. Ne pas le
    // renvoyer ici evite de dupliquer une reponse potentiellement tres lourde
    // et garde l'authentification independante du volume des contenus du site.
    json_response(['ok' => true, 'user' => public_user($user)]);
}

if ($action === 'register') {
    $login = clean_string($data['login'] ?? '', 120);
    $email = clean_string($data['email'] ?? '', 180);
    $password = (string) ($data['password'] ?? '');

    if ($login === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8) {
        json_response(['ok' => false, 'error' => 'Login, email ou mot de passe invalide.'], 400);
    }

    $stmt = db()->prepare('SELECT COUNT(*) FROM users WHERE login = ? OR email = ?');
    $stmt->execute([$login, $email]);
    if ((int) $stmt->fetchColumn() > 0) {
        json_response(['ok' => false, 'error' => 'Ce login ou cet email existe deja.'], 409);
    }

    $id = bin2hex(random_bytes(16));
    $verificationToken = bin2hex(random_bytes(32));
    $stmt = db()->prepare(
        'INSERT INTO users
         (id, login, email, email_verified, email_verification_token, email_verification_sent_at, password_hash, role, first_name, last_name, city, phone, categories_json, newsletter_frequency, created_at, updated_at)
         VALUES (?, ?, ?, 0, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())'
    );
    $stmt->execute([
        $id,
        $login,
        $email,
        $verificationToken,
        password_hash($password, PASSWORD_DEFAULT),
        'user',
        clean_string($data['firstName'] ?? '', 120),
        clean_string($data['lastName'] ?? '', 120),
        clean_string($data['city'] ?? '', 120),
        clean_string($data['phone'] ?? '', 60),
        '[]',
        'Hebdomadaire',
    ]);

    $verifyUrl = site_base_url() . '/?verify_email=' . urlencode($verificationToken);
    $sent = send_site_email(
        $email,
        'Verification de votre email',
        "Bonjour,\n\nCliquez sur ce lien pour verifier votre email :\n" . $verifyUrl . "\n\nSi vous n'etes pas a l'origine de cette demande, ignorez ce message."
    );

    $stmt = db()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $user = $stmt->fetch();
    $_SESSION['user_id'] = $id;
    json_response(['ok' => true, 'user' => public_user($user), 'verificationSent' => $sent, 'verificationUrl' => $sent ? null : $verifyUrl]);
}

json_response(['ok' => false, 'error' => 'Action inconnue.'], 404);
