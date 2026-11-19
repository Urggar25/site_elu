<?php
declare(strict_types=1);

function admin_error_response($error, int $status = 500): void
{
    if (!headers_sent()) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('X-Content-Type-Options: nosniff');
    }
    $message = $error instanceof Throwable ? $error->getMessage() : $error;
    echo json_encode([
        'ok' => false,
        'error' => $message !== '' ? $message : 'Erreur serveur administration.',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | (defined('JSON_INVALID_UTF8_SUBSTITUTE') ? JSON_INVALID_UTF8_SUBSTITUTE : 0));
    exit;
}

set_exception_handler(static function (Throwable $error): void {
    admin_error_response($error);
});

register_shutdown_function(static function (): void {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        admin_error_response($error['message'] ?? 'Erreur fatale PHP.');
    }
});

try {
    require __DIR__ . '/config.php';
} catch (Throwable $error) {
    admin_error_response($error);
}

function ensure_admin_state_table(): void
{
    ensure_database_schema();
}

function default_admin_state(): array
{
    return default_admin_state_seed();
}

function strip_legacy_admin_seed_records(array $state): array
{
    $seedIds = [
        'localContacts' => ['DURAND_JEAN_12_03_1971'],
        'permanenceRequests' => ['seed-permanence-dossier-communal'],
        'teamTasks' => ['seed-task-qualifier-demandes'],
        'templates' => ['seed-template-accuse-reception', 'seed-template-relance-administration'],
        'notifications' => ['seed-notification-urgent'],
        'activityLog' => ['seed-activity-initialisation'],
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

function read_admin_state(): array
{
    ensure_admin_state_table();
    $stmt = db()->query('SELECT state_json FROM admin_state WHERE id = 1');
    $row = $stmt->fetch();
    if (!$row) {
        return default_admin_state();
    }
    $json = $row['state_json'] ?: '{}';
    unset($row, $stmt);
    $state = json_decode($json, true);
    unset($json);
    if (!is_array($state)) {
        return default_admin_state();
    }
    $merged = strip_file_placeholders(array_merge(default_admin_state(), $state));
    $cleaned = strip_legacy_admin_seed_records($merged);
    if ($cleaned !== $merged) {
        write_admin_state($cleaned);
    }
    return compact_photo_library_payload($cleaned);
}

function strip_file_placeholders(array $state): array
{
    if (!is_array($state['deathEmailTemplates'] ?? null)) {
        return $state;
    }
    foreach ($state['deathEmailTemplates'] as &$template) {
        if (is_array($template) && ($template['fileData'] ?? '') === '__KEEP_EXISTING_FILE_DATA__') {
            $template['fileData'] = '';
        }
    }
    unset($template);
    return $state;
}

function write_admin_state(array $state): void
{
    ensure_admin_state_table();
    $json = json_encode($state, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | (defined('JSON_INVALID_UTF8_SUBSTITUTE') ? JSON_INVALID_UTF8_SUBSTITUTE : 0));
    if ($json === false) {
        json_response(['ok' => false, 'error' => 'Etat administration non serialisable : ' . json_last_error_msg()], 400);
    }
    $stmt = db()->prepare(
        'INSERT INTO admin_state (id, state_json, updated_at)
         VALUES (1, ?, NOW())
         ON DUPLICATE KEY UPDATE state_json = VALUES(state_json), updated_at = NOW()'
    );
    $stmt->execute([$json]);
}

function admin_json_encode($value): string
{
    $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | (defined('JSON_INVALID_UTF8_SUBSTITUTE') ? JSON_INVALID_UTF8_SUBSTITUTE : 0));
    if ($json === false) {
        json_response(['ok' => false, 'error' => 'Etat administration non serialisable : ' . json_last_error_msg()], 400);
    }
    return $json;
}

function read_admin_json_path(string $path)
{
    ensure_admin_state_table();
    $stmt = db()->prepare('SELECT JSON_EXTRACT(state_json, ?) AS value_json FROM admin_state WHERE id = 1');
    $stmt->execute([$path]);
    $raw = $stmt->fetchColumn();
    if (!is_string($raw) || $raw === '') {
        return null;
    }
    $decoded = json_decode($raw, true);
    return json_last_error() === JSON_ERROR_NONE ? $decoded : null;
}

function admin_partial_update_paths(): array
{
    return [
        'citizenRequests',
        'news',
        'documents',
        'documentFolders',
        'localFolders',
        'teamFolders',
        'templates',
        'parliamentWork',
        'permanenceRequests',
        'permanenceKeywords',
        'teamTasks',
        'calendarEvents',
        'campaignEvents',
        'calendarEventCategories',
        'contactFields',
        'savedContactSearches',
        'institutions',
        'mailTemplates',
        'deletedContactFields',
        'contactKeywords',
        'trombinoscopeCategories',
        'trombinoscopePeople',
        'deathCases',
        'specialLetters',
        'deathRelationOptions',
        'deathLetterTemplate',
        'deathEmailTemplates',
        'addons',
        'notifications',
        'activityLog',
        'campaign',
        'photoLibrary',
        'mobileAdminMenu',
        'filters',
    ];
}

function admin_change_paths(): array
{
    return array_values(array_unique(array_merge(admin_partial_update_paths(), ['localContacts'])));
}

function merge_preserved_death_template_files_from_database(array $templates): array
{
    $previousTemplates = [];
    $previous = read_admin_json_path('$.deathEmailTemplates');
    foreach ((is_array($previous) ? $previous : []) as $template) {
        if (!empty($template['id'])) {
            $previousTemplates[$template['id']] = $template;
        }
    }
    foreach ($templates as &$template) {
        if (!is_array($template)) {
            continue;
        }
        $id = $template['id'] ?? '';
        if (($template['fileData'] ?? '') === '__KEEP_EXISTING_FILE_DATA__') {
            $template['fileData'] = $previousTemplates[$id]['fileData'] ?? '';
        }
        unset($template['fileDataDirty']);
    }
    unset($template);
    return $templates;
}

function write_admin_state_partial(array $state, array $user, string $operation, string $target, string $detail): void
{
    ensure_admin_state_table();
    $activity = [
        'id' => bin2hex(random_bytes(12)),
        'userId' => $user['id'],
        'userName' => trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? '')) ?: $user['login'],
        'action' => clean_string($operation ?: 'mise a jour', 120),
        'target' => clean_string($target, 160),
        'detail' => clean_string($detail, 500),
        'createdAt' => gmdate('c'),
    ];
    $state['activityLog'] = array_slice(array_merge([$activity], is_array($state['activityLog'] ?? null) ? $state['activityLog'] : []), 0, 1000);
    if (is_array($state['deathEmailTemplates'] ?? null)) {
        $state['deathEmailTemplates'] = merge_preserved_death_template_files_from_database($state['deathEmailTemplates']);
    }

    $assignments = [];
    $params = [];
    foreach (admin_partial_update_paths() as $key) {
        if (!array_key_exists($key, $state)) {
            continue;
        }
        $assignments[] = "'" . '$.' . $key . "'";
        $assignments[] = 'JSON_EXTRACT(?, "$")';
        $params[] = admin_json_encode($state[$key]);
    }
    if (!$assignments) {
        return;
    }
    $sql = 'UPDATE admin_state SET state_json = JSON_SET(state_json, ' . implode(', ', $assignments) . '), updated_at = NOW() WHERE id = 1';
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
}

function write_admin_changes(array $changes, array $user, string $operation, string $target, string $detail): void
{
    ensure_admin_state_table();
    $allowed = array_fill_keys(admin_change_paths(), true);
    $cleanChanges = [];
    foreach ($changes as $key => $value) {
        if (isset($allowed[$key])) {
            $cleanChanges[$key] = $value;
        }
    }
    if (is_array($cleanChanges['deathEmailTemplates'] ?? null)) {
        $cleanChanges['deathEmailTemplates'] = merge_preserved_death_template_files_from_database($cleanChanges['deathEmailTemplates']);
    }

    $activity = [
        'id' => bin2hex(random_bytes(12)),
        'userId' => $user['id'],
        'userName' => trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? '')) ?: $user['login'],
        'action' => clean_string($operation ?: 'mise a jour', 120),
        'target' => clean_string($target, 160),
        'detail' => clean_string($detail, 500),
        'createdAt' => gmdate('c'),
    ];

    $assignments = [];
    $params = [];
    foreach ($cleanChanges as $key => $value) {
        $assignments[] = "'$." . $key . "'";
        $assignments[] = 'JSON_EXTRACT(?, "$")';
        $params[] = admin_json_encode($value);
    }
    $assignments[] = "'$.activityLog'";
    $assignments[] = 'JSON_ARRAY_INSERT(COALESCE(JSON_EXTRACT(state_json, "$.activityLog"), JSON_ARRAY()), "$[0]", JSON_EXTRACT(?, "$"))';
    $params[] = admin_json_encode($activity);

    $sql = 'UPDATE admin_state SET state_json = JSON_SET(state_json, ' . implode(', ', $assignments) . '), updated_at = NOW() WHERE id = 1';
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
}

function contact_import_clean_text(string $value): string
{
    $value = preg_replace('/^\xEF\xBB\xBF/', '', $value) ?? $value;
    if ($value === '') {
        return '';
    }
    if (@preg_match('//u', $value) !== 1) {
        $converted = @iconv('Windows-1252', 'UTF-8//IGNORE', $value);
        if ($converted === false) {
            $converted = @iconv('ISO-8859-1', 'UTF-8//IGNORE', $value);
        }
        if ($converted !== false) {
            $value = $converted;
        } else {
            $value = @iconv('UTF-8', 'UTF-8//IGNORE', $value) ?: $value;
        }
    }
    $value = str_replace("\0", '', $value);
    return trim($value);
}

function contact_import_slug(string $value): string
{
    $value = contact_import_clean_text($value);
    $value = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value) ?: $value;
    $value = strtolower($value);
    $value = preg_replace('/[^a-z0-9]+/', '', $value) ?: '';
    return $value;
}

function contact_identity_value(array $contact, array $keys): string
{
    foreach ($keys as $key) {
        $value = trim((string) ($contact[$key] ?? ''));
        if ($value !== '') {
            return $value;
        }
    }
    return '';
}

function contact_date_part(string $value): string
{
    $value = trim($value);
    if ($value === '') {
        return '';
    }
    if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value, $match)) {
        return $match[3] . '_' . $match[2] . '_' . $match[1];
    }
    if (preg_match('/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/', $value, $match)) {
        $year = strlen($match[3]) === 2 ? '19' . $match[3] : $match[3];
        return str_pad($match[1], 2, '0', STR_PAD_LEFT) . '_' . str_pad($match[2], 2, '0', STR_PAD_LEFT) . '_' . $year;
    }
    return preg_replace('/[^0-9]+/', '_', $value) ?: '';
}

function contact_date_iso(string $value): string
{
    $value = trim($value);
    if ($value === '') {
        return '';
    }
    if (preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})/', $value, $match)) {
        return str_pad($match[1], 4, '0', STR_PAD_LEFT) . '-' . str_pad($match[2], 2, '0', STR_PAD_LEFT) . '-' . str_pad($match[3], 2, '0', STR_PAD_LEFT);
    }
    if (preg_match('/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/', $value, $match)) {
        $year = strlen($match[3]) === 2 ? '19' . $match[3] : str_pad($match[3], 4, '0', STR_PAD_LEFT);
        return $year . '-' . str_pad($match[2], 2, '0', STR_PAD_LEFT) . '-' . str_pad($match[1], 2, '0', STR_PAD_LEFT);
    }
    return $value;
}

function contact_base_id(array $contact): string
{
    $lastName = contact_identity_value($contact, ['usageName', 'lastName', 'nomDusage', 'nom', 'birthName', 'nomDeNaissance']);
    $firstName = contact_identity_value($contact, ['firstName', 'prenom']);
    $date = contact_identity_value($contact, ['birthDate', 'dateNaissance', 'dateDeNaissance']);
    $base = implode('_', [$lastName !== '' ? $lastName : 'nom', $firstName !== '' ? $firstName : 'prenom', contact_date_part($date)]);
    $base = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $base) ?: $base;
    $base = strtoupper((string) preg_replace('/[^A-Za-z0-9_]+/', '_', $base));
    $base = trim((string) preg_replace('/_+/', '_', $base), '_');
    return $base !== '' ? $base : 'CONTACT';
}

function normalize_import_contact(array $contact, array &$usedIds): ?array
{
    $now = gmdate('c');
    $contact = array_merge([
        'id' => '',
        'keywords' => [],
        'comments' => [],
        'createdAt' => $now,
        'updatedAt' => $now,
    ], $contact);

    $firstName = contact_identity_value($contact, ['firstName', 'prenom']);
    $lastName = contact_identity_value($contact, ['lastName', 'nom', 'usageName', 'nomDusage', 'birthName', 'nomDeNaissance']);
    $usageName = contact_identity_value($contact, ['usageName', 'nomDusage', 'lastName', 'nom']);
    $birthName = contact_identity_value($contact, ['birthName', 'nomDeNaissance']);
    $birthDate = contact_identity_value($contact, ['birthDate', 'dateNaissance', 'dateDeNaissance']);

    if ($firstName !== '') {
        $contact['firstName'] = $firstName;
    }
    if ($lastName !== '') {
        $contact['lastName'] = $lastName;
    }
    if ($usageName !== '' || $lastName !== '') {
        $contact['usageName'] = $usageName !== '' ? $usageName : $lastName;
    }
    if ($birthName !== '') {
        $contact['birthName'] = $birthName;
    }
    if ($birthDate !== '') {
        $contact['birthDate'] = contact_date_iso($birthDate);
    }
    if (empty($contact['category'])) {
        $contact['category'] = 'autre';
    }
    if (!is_array($contact['keywords'])) {
        $contact['keywords'] = preg_split('/[,;]/', (string) $contact['keywords']) ?: [];
    }
    $contact['keywords'] = array_values(array_filter(array_map(static fn($item): string => trim((string) $item), $contact['keywords'])));

    if (trim((string) ($contact['firstName'] ?? '')) === '' && trim((string) ($contact['lastName'] ?? '')) === '' && trim((string) ($contact['email'] ?? '')) === '' && trim((string) ($contact['organization'] ?? '')) === '') {
        return null;
    }

    $baseId = contact_base_id($contact);
    $id = $baseId;
    $suffix = 2;
    while (isset($usedIds[$id])) {
        $id = $baseId . '_' . $suffix;
        $suffix++;
    }
    $contact['id'] = $id;
    $usedIds[$id] = true;
    return $contact;
}

function contact_import_aliases(array $state): array
{
    $fields = [];
    foreach (($state['contactFields'] ?? []) as $field) {
        if (!empty($field['id'])) {
            $fields[(string) $field['id']] = (string) ($field['label'] ?? $field['id']);
        }
    }
    $aliases = [
        'id' => 'id',
        'prenom' => 'firstName',
        'firstname' => 'firstName',
        'nom' => 'lastName',
        'lastname' => 'lastName',
        'nomusage' => 'usageName',
        'nomdusage' => 'usageName',
        'usagename' => 'usageName',
        'nomnaissance' => 'birthName',
        'nomdenaissance' => 'birthName',
        'birthname' => 'birthName',
        'email' => 'email',
        'mail' => 'email',
        'mobile' => 'mobile',
        'telephone' => 'phone',
        'phone' => 'phone',
        'ville' => 'city',
        'city' => 'city',
        'codepostal' => 'postalCode',
        'postalcode' => 'postalCode',
        'numero' => 'streetNumber',
        'rue' => 'streetName',
        'categorie' => 'category',
        'category' => 'category',
        'organisation' => 'organization',
        'organization' => 'organization',
        'role' => 'role',
        'fonction' => 'role',
        'profession' => 'profession',
        'genre' => 'gender',
        'sexe' => 'gender',
        'datenaissance' => 'birthDate',
        'datedenaissance' => 'birthDate',
        'birthdate' => 'birthDate',
        'datedeces' => 'deathDateApprox',
        'deathdateapprox' => 'deathDateApprox',
        'tags' => 'keywords',
        'tag' => 'keywords',
        'motscles' => 'keywords',
        'motsclefs' => 'keywords',
        'keywords' => 'keywords',
        'notes' => 'notes',
    ];
    foreach ($fields as $id => $label) {
        $aliases[contact_import_slug($id)] = $id;
        $aliases[contact_import_slug($label)] = $id;
    }
    return $aliases;
}

function contact_import_allowed_fields(array $state): array
{
    $fields = [
        'id' => true,
        'title' => true,
        'firstName' => true,
        'lastName' => true,
        'usageName' => true,
        'birthName' => true,
        'email' => true,
        'mobile' => true,
        'phone' => true,
        'city' => true,
        'postalCode' => true,
        'streetNumber' => true,
        'streetName' => true,
        'streetNameFull' => true,
        'category' => true,
        'organization' => true,
        'role' => true,
        'profession' => true,
        'gender' => true,
        'birthDate' => true,
        'deathDateApprox' => true,
        'emailCampaignStatus' => true,
        'keywords' => true,
        'notes' => true,
    ];
    foreach (($state['contactFields'] ?? []) as $field) {
        if (!empty($field['id'])) {
            $fields[(string) $field['id']] = true;
        }
    }
    return $fields;
}

function clean_contact_import_mapping(array $mapping, array $state): array
{
    $allowed = contact_import_allowed_fields($state);
    return array_map(static function ($fieldId) use ($allowed): string {
        $fieldId = trim((string) $fieldId);
        return isset($allowed[$fieldId]) ? $fieldId : '';
    }, $mapping);
}

function import_contacts_from_csv(string $path, array &$state, array $submittedMapping = []): int
{
    $handle = fopen($path, 'rb');
    if (!$handle) {
        json_response(['ok' => false, 'error' => 'Fichier CSV illisible.'], 400);
    }
    $headers = fgetcsv($handle, 0, ';');
    if ($headers === false || !is_array($headers)) {
        fclose($handle);
        json_response(['ok' => false, 'error' => 'CSV vide.'], 400);
    }
    if (count($headers) === 1 && strpos((string) $headers[0], ',') !== false) {
        rewind($handle);
        $headers = fgetcsv($handle, 0, ',');
        $delimiter = ',';
    } else {
        $delimiter = ';';
    }
    $aliases = contact_import_aliases($state);
    $headers = array_map(static fn($header): string => contact_import_clean_text((string) $header), $headers ?: []);
    $mapping = $submittedMapping
        ? array_slice(clean_contact_import_mapping($submittedMapping, $state), 0, count($headers))
        : array_map(static fn($header): string => $aliases[contact_import_slug((string) $header)] ?? '', $headers);
    if (count($mapping) < count($headers)) {
        $mapping = array_pad($mapping, count($headers), '');
    }
    $existing = [];
    foreach (($state['localContacts'] ?? []) as $contact) {
        if (!empty($contact['id'])) {
            $existing[(string) $contact['id']] = $contact;
        }
    }
    $usedIds = array_fill_keys(array_keys($existing), true);
    $count = 0;
    while (($row = fgetcsv($handle, 0, $delimiter)) !== false) {
        $contact = [];
        foreach ($mapping as $index => $fieldId) {
            if ($fieldId === '') {
                continue;
            }
            $value = contact_import_clean_text((string) ($row[$index] ?? ''));
            if ($value === '') {
                continue;
            }
            $contact[$fieldId] = $fieldId === 'keywords' ? preg_split('/[,;]/', $value) : $value;
        }
        $previousId = trim((string) ($contact['id'] ?? ''));
        if ($previousId !== '' && isset($existing[$previousId])) {
            unset($usedIds[$previousId]);
        }
        $normalized = normalize_import_contact($contact, $usedIds);
        if ($normalized === null) {
            continue;
        }
        $existing[$normalized['id']] = array_merge($existing[$normalized['id']] ?? [], $normalized, ['updatedAt' => gmdate('c')]);
        $count++;
    }
    fclose($handle);
    $state['localContacts'] = array_values($existing);
    return $count;
}

function merge_preserved_admin_files(array $state, array $previous): array
{
    $previousTemplates = [];
    foreach (($previous['deathEmailTemplates'] ?? []) as $template) {
        if (!empty($template['id'])) {
            $previousTemplates[$template['id']] = $template;
        }
    }

    foreach (($state['deathEmailTemplates'] ?? []) as &$template) {
        $id = $template['id'] ?? '';
        if (($template['fileData'] ?? '') === '__KEEP_EXISTING_FILE_DATA__') {
            $template['fileData'] = $previousTemplates[$id]['fileData'] ?? '';
        }
        unset($template['fileDataDirty']);
    }
    unset($template);

    return $state;
}

function append_activity(array &$state, array $user, string $action, string $target, string $detail = ''): void
{
    if (!is_array($state['activityLog'] ?? null)) {
        $state['activityLog'] = [];
    }
    array_unshift($state['activityLog'], [
        'id' => bin2hex(random_bytes(12)),
        'userId' => $user['id'],
        'userName' => trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? '')) ?: $user['login'],
        'action' => clean_string($action, 120),
        'target' => clean_string($target, 160),
        'detail' => clean_string($detail, 500),
        'createdAt' => gmdate('c'),
    ]);
    $state['activityLog'] = array_slice($state['activityLog'], 0, 1000);
}

function write_admin_entity_updates(array $updates, array $user, string $operation, string $target, string $detail): void
{
    $allowedCollections = ['localContacts', 'specialLetters', 'deathCases'];
    if (!$updates || count($updates) > 6) {
        json_response(['ok' => false, 'error' => 'Mise a jour ciblee invalide.'], 400);
    }

    ensure_admin_state_table();
    $database = db();
    $database->beginTransaction();
    try {
        $lock = $database->query('SELECT id FROM admin_state WHERE id = 1 FOR UPDATE');
        if (!$lock->fetchColumn()) {
            throw new RuntimeException('Etat administration introuvable.');
        }

        $assignments = [];
        $params = [];
        $inserts = [];
        foreach ($updates as $update) {
            $collection = (string) ($update['collection'] ?? '');
            $id = clean_string($update['id'] ?? '', 160);
            $lookupId = clean_string($update['lookupId'] ?? $id, 160);
            $insertIfMissing = !empty($update['insertIfMissing']);
            $value = $update['value'] ?? null;
            if (!in_array($collection, $allowedCollections, true) || $id === '' || !is_array($value) || (string) ($value['id'] ?? '') !== $id) {
                throw new InvalidArgumentException('Enregistrement cible invalide.');
            }

            $searchPath = '$.' . $collection . '[*].id';
            $find = $database->prepare("SELECT JSON_UNQUOTE(JSON_SEARCH(state_json, 'one', ?, NULL, ?)) FROM admin_state WHERE id = 1");
            $find->execute([$lookupId, $searchPath]);
            $idPath = $find->fetchColumn();
            if (!is_string($idPath) || substr($idPath, -3) !== '.id') {
                if ($insertIfMissing) {
                    $inserts[] = ['collection' => $collection, 'value' => $value];
                    continue;
                }
                throw new RuntimeException('Enregistrement cible introuvable ou desynchronise : ' . $collection . '.');
            }

            $assignments[] = '?';
            $assignments[] = 'JSON_EXTRACT(?, "$")';
            $params[] = substr($idPath, 0, -3);
            $params[] = admin_json_encode($value);
        }

        $activity = [
            'id' => bin2hex(random_bytes(12)),
            'userId' => $user['id'],
            'userName' => trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? '')) ?: $user['login'],
            'action' => clean_string($operation ?: 'mise a jour', 120),
            'target' => clean_string($target, 160),
            'detail' => clean_string($detail, 500),
            'createdAt' => gmdate('c'),
        ];
        if ($assignments) {
            $params[] = admin_json_encode($activity);
            $sql = 'UPDATE admin_state SET state_json = JSON_ARRAY_INSERT(JSON_SET(state_json, ' . implode(', ', $assignments) . '), "$.activityLog[0]", JSON_EXTRACT(?, "$")), updated_at = NOW() WHERE id = 1';
            $statement = $database->prepare($sql);
            $statement->execute($params);
        } else {
            $statement = $database->prepare('UPDATE admin_state SET state_json = JSON_ARRAY_INSERT(state_json, "$.activityLog[0]", JSON_EXTRACT(?, "$")), updated_at = NOW() WHERE id = 1');
            $statement->execute([admin_json_encode($activity)]);
        }
        foreach ($inserts as $insert) {
            $path = '$.' . $insert['collection'] . '[0]';
            $statement = $database->prepare('UPDATE admin_state SET state_json = JSON_ARRAY_INSERT(state_json, ?, JSON_EXTRACT(?, "$")), updated_at = NOW() WHERE id = 1');
            $statement->execute([$path, admin_json_encode($insert['value'])]);
        }
        $database->commit();
    } catch (Throwable $error) {
        if ($database->inTransaction()) {
            $database->rollBack();
        }
        throw $error;
    }
}

/**
 * Suppression par identifiants exécutée sur l'état courant, dans une transaction.
 * Contrairement à une sauvegarde complète de localContacts depuis le navigateur,
 * cette action ne peut pas réintroduire des contacts par un instantané périmé.
 */
/**
 * Réparation ciblée de champs texte : chaque remplacement exige la valeur source
 * exacte encore présente en base. Les identifiants et références ne sont jamais mutés.
 */
/**
 * Correction collective de valeurs textuelles identiques : chaque lot est atomique.
 * Le nombre d'occurrences attendu doit correspondre exactement à l'état actuel.
 * On ne corrige jamais les identifiants, e-mails, mots-clés ni les liens.
 */
function repair_admin_contact_groups(array $groups,array $user): array
{
    if(!can_administer($user))json_response(['ok'=>false,'error'=>'Action réservée aux administrateurs.'],403);
    if(!$groups||count($groups)>15)json_response(['ok'=>false,'error'=>'Un lot de groupes doit contenir de 1 à 15 valeurs.'],400);
    $denied=array_fill_keys(['id','keywords','tags','email','mobile','phone','telephone','birthDate','createdAt','updatedAt','gender','deathDateApprox','institutionId','contactId','externalId'],true);
    $normalized=[];
    foreach($groups as $group){
        if(!is_array($group))json_response(['ok'=>false,'error'=>'Groupe invalide.'],400);
        $field=$group['field']??null;$from=$group['from']??null;$to=$group['to']??null;$expected=$group['expected']??null;
        if(!is_string($field)||!preg_match('/^[A-Za-z][A-Za-z0-9_]{0,63}$/D',$field)||isset($denied[$field])||
           !is_string($from)||!is_string($to)||$to===''||$to===$from||
           strlen($from)>1500||strlen($to)>1500||strpos($to,"\xEF\xBF\xBD")!==false||
           !is_int($expected)||$expected<1||$expected>300000){
           json_response(['ok'=>false,'error'=>'Champ ou valeur de groupe invalide.'],400);
        }
        $key=$field."\0".$from;
        if(isset($normalized[$key]))json_response(['ok'=>false,'error'=>'Groupe dupliqué dans le lot.'],400);
        $normalized[$key]=['field'=>$field,'from'=>$from,'to'=>$to,'expected'=>$expected,'actual'=>0];
    }
    ensure_admin_state_table();
    $db=db();$db->beginTransaction();
    try{
        $query=$db->query('SELECT state_json FROM admin_state WHERE id = 1 FOR UPDATE');
        $json=$query->fetchColumn();
        if(!is_string($json))throw new RuntimeException('Base administrative introuvable.');
        $state=json_decode($json,true,512,JSON_THROW_ON_ERROR);unset($json,$query);
        if(!is_array($state['localContacts']??null))throw new RuntimeException('Contacts invalides.');
        $fields=[];
        foreach($normalized as $group)$fields[$group['field']]=true;
        foreach($state['localContacts'] as &$contact){
            if(!is_array($contact)||($contact['entityType']??'')==='institution')continue;
            foreach($fields as $field=>$_){
                $value=$contact[$field]??null;
                if(!is_string($value))continue;
                $key=$field."\0".$value;
                if(!isset($normalized[$key]))continue;
                $contact[$field]=$normalized[$key]['to'];
                $normalized[$key]['actual']++;
            }
        }
        unset($contact);
        $count=0;
        foreach($normalized as $group){
            if($group['expected']!==$group['actual']){
                throw new RuntimeException('Des fiches ont changé depuis le diagnostic ('.$group['field'].'). Actualisez le diagnostic avant de réessayer.');
            }
            $count+=$group['actual'];
        }
        append_activity($state,$user,'réparation','contacts',$count.' champ(s) corrigé(s) par groupes');
        $save=$db->prepare('UPDATE admin_state SET state_json = ?, updated_at = NOW() WHERE id = 1');
        $save->execute([admin_json_encode($state)]);
        $db->commit();
        return ['repaired'=>$count];
    }catch(Throwable $error){
        if($db->inTransaction())$db->rollBack();
        throw $error;
    }
}

function repair_admin_contact_fields(array $changes, array $user): array
{
    if (!can_administer($user)) json_response(['ok' => false, 'error' => 'Action réservée aux administrateurs.'], 403);
    if (!$changes || count($changes) > 100) {
        json_response(['ok' => false, 'error' => 'Un lot doit contenir entre 1 et 100 corrections.'], 400);
    }
    $denied = array_fill_keys(['id','keywords','tags','email','mobile','phone','telephone','birthDate','createdAt','updatedAt','gender','deathDateApprox','institutionId','contactId','externalId'], true);
    $clean = [];
    foreach ($changes as $change) {
        if (!is_array($change)) json_response(['ok' => false, 'error' => 'Correction invalide.'], 400);
        $id = $change['id'] ?? null;
        $field = $change['field'] ?? null;
        $from = $change['from'] ?? null;
        $to = $change['to'] ?? null;
        if (!is_string($id) || strlen($id) < 1 || strlen($id) > 160 ||
            !is_string($field) || !preg_match('/^[A-Za-z][A-Za-z0-9_]{0,63}$/D', $field) || isset($denied[$field]) ||
            !is_string($from) || !is_string($to) || $to === '' || $from === $to ||
            strlen($from) > 1500 || strlen($to) > 1500 ||
            strpos($to, "\xEF\xBF\xBD") !== false) {
            json_response(['ok' => false, 'error' => 'Champ, identifiant ou valeur de correction non autorisé.'], 400);
        }
        $key = $id . "\0" . $field;
        if (isset($clean[$key])) json_response(['ok' => false, 'error' => 'Correction dupliquée dans le lot.'], 400);
        $clean[$key] = ['id'=>$id,'field'=>$field,'from'=>$from,'to'=>$to];
    }
    ensure_admin_state_table();
    $database = db();
    $database->beginTransaction();
    try {
        $query = $database->query('SELECT state_json FROM admin_state WHERE id = 1 FOR UPDATE');
        $json = $query->fetchColumn();
        if (!is_string($json)) throw new RuntimeException('Base administrative introuvable.');
        $state = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        unset($json,$query);
        if (!is_array($state['localContacts'] ?? null)) throw new RuntimeException('Contacts invalides.');
        $indexes = [];
        foreach ($state['localContacts'] as $index => $contact) {
            if (is_array($contact) && is_string($contact['id'] ?? null)) $indexes[$contact['id']] = $index;
        }
        foreach ($clean as $change) {
            if (!array_key_exists($change['id'], $indexes)) throw new RuntimeException('Contact introuvable : correction annulée.');
            $contactIndex = $indexes[$change['id']];
            $contact = &$state['localContacts'][$contactIndex];
            if (($contact['entityType'] ?? '') === 'institution' ||
                !is_string($contact[$change['field']] ?? null) ||
                $contact[$change['field']] !== $change['from']) {
                throw new RuntimeException('La valeur du contact a changé : correction annulée.');
            }
            $contact[$change['field']] = $change['to'];
            unset($contact);
        }
        append_activity($state,$user,'réparation','contacts',count($clean).' champ(s) encodage corrigé(s)');
        $stateJson = admin_json_encode($state);
        unset($state);
        $save = $database->prepare('UPDATE admin_state SET state_json = ?, updated_at = NOW() WHERE id = 1');
        $save->execute([$stateJson]);
        unset($stateJson);
        $database->commit();
        return ['repaired'=>count($clean)];
    } catch (Throwable $error) {
        if ($database->inTransaction()) $database->rollBack();
        throw $error;
    }
}

function delete_admin_contacts_by_ids(array $submittedIds, array $user): array
{
    if (!can_administer($user)) {
        json_response(['ok' => false, 'error' => 'Suppression réservée aux administrateurs.'], 403);
    }
    if (!$submittedIds || count($submittedIds) > 300000) {
        json_response(['ok' => false, 'error' => 'Sélection vide ou trop importante.'], 400);
    }
    $ids = [];
    foreach ($submittedIds as $id) {
        if (!is_string($id) || $id === '' || strlen($id) > 160) {
            json_response(['ok' => false, 'error' => 'Identifiant de contact invalide.'], 400);
        }
        $ids[$id] = true;
    }
    if (count($ids) !== count($submittedIds)) {
        json_response(['ok' => false, 'error' => 'Sélection contenant des identifiants en double.'], 400);
    }
    ensure_admin_state_table();
    $database = db();
    $database->beginTransaction();
    try {
        $statement = $database->query('SELECT state_json FROM admin_state WHERE id = 1 FOR UPDATE');
        $raw = $statement->fetchColumn();
        if (!is_string($raw)) {
            throw new RuntimeException('Base de contacts introuvable.');
        }
        $state = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        unset($raw, $statement);
        if (!is_array($state) || !is_array($state['localContacts'] ?? null)) {
            throw new RuntimeException('Format de la base de contacts invalide.');
        }
        $found = [];
        $remaining = [];
        foreach ($state['localContacts'] as $contact) {
            $id = is_array($contact) ? ($contact['id'] ?? '') : '';
            if (is_string($id) && isset($ids[$id])) {
                if (($contact['entityType'] ?? '') === 'institution') {
                    throw new RuntimeException('La sélection contient une fiche institutionnelle.');
                }
                $found[$id] = true;
            } else {
                $remaining[] = $contact;
            }
        }
        if (count($found) !== count($ids)) {
            throw new RuntimeException('La sélection n’est plus à jour : ' . (count($ids) - count($found)) . ' contact(s) absent(s). Actualisez la recherche puis recommencez.');
        }
        $state['localContacts'] = $remaining;
        unset($remaining);
        foreach (['institutions', 'permanenceRequests', 'teamTasks', 'calendarEvents', 'campaignEvents', 'savedContactSearches', 'deathCases'] as $collection) {
            if (!is_array($state[$collection] ?? null)) $state[$collection] = [];
        }
        foreach ($state['institutions'] as &$item) {
            if (isset($ids[$item['mayorContactId'] ?? ''])) $item['mayorContactId'] = '';
            if (isset($ids[$item['legacyContactId'] ?? ''])) $item['legacyContactId'] = '';
            $item['deputyContactIds'] = array_values(array_filter($item['deputyContactIds'] ?? [], static fn($id) => !isset($ids[$id])));
        }
        unset($item);
        foreach ($state['permanenceRequests'] as &$item) {
            if (isset($ids[$item['contactId'] ?? ''])) $item['contactId'] = '';
        }
        unset($item);
        foreach ($state['teamTasks'] as &$item) {
            if (isset($ids[$item['linkedContactId'] ?? ''])) $item['linkedContactId'] = '';
        }
        unset($item);
        foreach ($state['calendarEvents'] as &$item) {
            $item['contactIds'] = array_values(array_filter($item['contactIds'] ?? [], static fn($id) => !isset($ids[$id])));
            foreach (($item['attendanceByDate'] ?? []) as $day => $rows) {
                $item['attendanceByDate'][$day] = array_values(array_filter(is_array($rows) ? $rows : [], static fn($row) => !isset($ids[$row['contactId'] ?? ''])));
            }
        }
        unset($item);
        foreach ($state['campaignEvents'] as &$item) {
            $item['participants'] = array_values(array_filter($item['participants'] ?? [], static fn($row) => !isset($ids[$row['contactId'] ?? ''])));
        }
        unset($item);
        foreach ($state['savedContactSearches'] as &$item) {
            foreach (['includeIds', 'excludeIds', 'snapshotIds'] as $field) {
                if (is_array($item[$field] ?? null)) {
                    $item[$field] = array_values(array_filter($item[$field], static fn($id) => !isset($ids[$id])));
                }
            }
        }
        unset($item);
        foreach ($state['deathCases'] as &$item) {
            if (isset($ids[$item['deceasedId'] ?? ''])) $item['deceasedId'] = '';
            $item['relatives'] = array_values(array_filter($item['relatives'] ?? [], static fn($row) => !isset($ids[$row['contactId'] ?? ''])));
        }
        unset($item);
        append_activity($state, $user, 'suppression', 'contacts', count($ids) . ' contact(s) supprimé(s) en base');
        $expectedRemaining = count($state['localContacts']);
        $json = admin_json_encode($state);
        unset($state);
        $save = $database->prepare('UPDATE admin_state SET state_json = ?, updated_at = NOW() WHERE id = 1');
        $save->execute([$json]);
        unset($json);
        $check = $database->query('SELECT JSON_LENGTH(JSON_EXTRACT(state_json, "$.localContacts")) FROM admin_state WHERE id = 1');
        if ((int)$check->fetchColumn() !== $expectedRemaining) {
            throw new RuntimeException('Vérification de suppression échouée : transaction annulée.');
        }
        $database->commit();
        return ['deleted' => count($ids), 'remaining' => $expectedRemaining];
    } catch (Throwable $error) {
        if ($database->inTransaction()) $database->rollBack();
        throw $error;
    }
}

$user = require_moderator();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (($_GET['action'] ?? '') === 'version') {
        json_response(['ok' => true, 'version' => state_version('admin_state')], 200, ['Cache-Control' => 'no-store']);
    }
    $state = read_admin_state();
    json_response([
        'ok' => true,
        'state' => $state,
        'version' => state_version('admin_state'),
        'permissions' => [
            'moderate' => can_moderate($user),
            'publish' => can_collaborate($user),
            'admin' => can_administer($user),
        ],
    ]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['ok' => false, 'error' => 'Methode non autorisee.'], 405);
}

if (($_GET['action'] ?? '') === 'import-contacts') {
    if (empty($_FILES['file']['tmp_name']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
        json_response(['ok' => false, 'error' => 'Aucun fichier recu.'], 400);
    }
    $state = read_admin_state();
    $mapping = [];
    if (isset($_POST['mapping'])) {
        $decodedMapping = json_decode((string) $_POST['mapping'], true);
        if (is_array($decodedMapping)) {
            $mapping = $decodedMapping;
        }
    }
    $imported = import_contacts_from_csv($_FILES['file']['tmp_name'], $state, $mapping);
    append_activity($state, $user, 'import', 'contacts', $imported . ' contact(s) importe(s)');
    write_admin_state($state);
    json_response([
        'ok' => true,
        'imported' => $imported,
        'totalContacts' => count($state['localContacts'] ?? []),
    ]);
}

$data = request_json();
$operation = clean_string($data['operation'] ?? '', 80);
$target = clean_string($data['target'] ?? 'administration', 120);
$detail = clean_string($data['detail'] ?? '', 500);
$repairContactGroups = $data['repairContactGroups'] ?? null;
$repairContactFields = $data['repairContactFields'] ?? null;
$deleteContactIds = $data['deleteContactIds'] ?? null;
$entityUpdates = $data['entityUpdates'] ?? null;
$changes = $data['changes'] ?? null;
$state = $data['state'] ?? null;
unset($data);

if ($repairContactGroups !== null) {
    if (!is_array($repairContactGroups)) json_response(['ok'=>false,'error'=>'Groupes de réparation invalides.'],400);
    $result=repair_admin_contact_groups($repairContactGroups,$user);
    json_response(['ok'=>true,'verified'=>true,'repaired'=>$result['repaired'],'version'=>state_version('admin_state')]);
}

if ($repairContactFields !== null) {
    if (!is_array($repairContactFields)) json_response(['ok' => false, 'error' => 'Lot de corrections invalide.'], 400);
    $result = repair_admin_contact_fields($repairContactFields,$user);
    json_response(['ok' => true, 'verified' => true, 'repaired' => $result['repaired'], 'version' => state_version('admin_state')]);
}

if ($deleteContactIds !== null) {
    if (!is_array($deleteContactIds)) {
        json_response(['ok' => false, 'error' => 'La sélection doit être une liste.'], 400);
    }
    $result = delete_admin_contacts_by_ids($deleteContactIds, $user);
    json_response(['ok' => true, 'verified' => true, 'deleted' => $result['deleted'], 'remaining' => $result['remaining'], 'version' => state_version('admin_state')]);
}

if (is_array($entityUpdates)) {
    write_admin_entity_updates($entityUpdates, $user, $operation, $target, $detail);
    json_response(['ok' => true, 'partial' => true, 'version' => state_version('admin_state')]);
}

if (is_array($changes)) {
    write_admin_changes($changes, $user, $operation, $target, $detail);
    json_response(['ok' => true, 'partial' => true, 'version' => state_version('admin_state')]);
}

if (!is_array($state)) {
    json_response(['ok' => false, 'error' => 'Etat administration invalide.'], 400);
}

$adminOnly = ['delete', 'user-role', 'user-disable', 'user-reset-password'];
$publisherOnly = ['publish', 'unpublish', 'validate'];
if (in_array($operation, $adminOnly, true) && !can_administer($user)) {
    json_response(['ok' => false, 'error' => 'Action reservee aux administrateurs.'], 403);
}
if (in_array($operation, $publisherOnly, true) && !can_collaborate($user)) {
    json_response(['ok' => false, 'error' => 'Action reservee aux collaborateurs ou administrateurs.'], 403);
}

if (($state['localContacts'] ?? null) === '__KEEP_EXISTING_LOCAL_CONTACTS__') {
    unset($state['localContacts']);
    write_admin_state_partial($state, $user, $operation ?: 'mise a jour', $target, $detail);
    json_response(['ok' => true, 'partial' => true, 'version' => state_version('admin_state')]);
}

$previous = read_admin_state();
$state = merge_preserved_admin_files(array_merge(default_admin_state(), $state), $previous);
unset($previous);
append_activity($state, $user, $operation ?: 'mise a jour', $target, $detail);
write_admin_state($state);

json_response(['ok' => true, 'saved' => true, 'version' => state_version('admin_state')]);
