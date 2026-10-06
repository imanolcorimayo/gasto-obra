<?php
// Firebase over plain REST (curl + openssl): service-account login, Firestore reads,
// Auth user listing. Read-only on purpose, the admin only looks.

// Service account JSON, from config.php (base64, same value as FIREBASE_SERVICE_ACCOUNT in server/.env).
function firebase_sa(): array {
    global $config;
    static $sa = null;
    if ($sa === null) {
        $sa = json_decode(base64_decode($config['firebase_service_account'] ?? ''), true);
        if (!$sa || empty($sa['private_key'])) throw new RuntimeException('Service account inválido en config.php');
    }
    return $sa;
}

// OAuth access token from a self-signed JWT (RS256). Cached until shortly before expiry in a
// private folder outside the web root (repo/.cache, mode 0700), never the shared /tmp.
function firebase_token(): string {
    $sa = firebase_sa();
    $dir = dirname(__DIR__, 2) . '/.cache';
    if (!is_dir($dir)) @mkdir($dir, 0700);
    $cacheFile = "$dir/admin-firebase-token.json";

    if (is_file($cacheFile) && !is_link($cacheFile) && fileowner($cacheFile) === getmyuid()) {
        $cached = json_decode((string) file_get_contents($cacheFile), true);
        if ($cached && $cached['exp'] > time() + 60) return $cached['token'];
    }

    $b64 = fn($s) => rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
    $now = time();
    $head = $b64(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
    $claims = $b64(json_encode([
        'iss' => $sa['client_email'],
        'scope' => 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/identitytoolkit',
        'aud' => 'https://oauth2.googleapis.com/token',
        'iat' => $now,
        'exp' => $now + 3600,
    ]));
    openssl_sign("$head.$claims", $sig, $sa['private_key'], OPENSSL_ALGO_SHA256);
    $jwt = "$head.$claims." . $b64($sig);

    $res = firebase_http('POST', 'https://oauth2.googleapis.com/token', http_build_query([
        'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion' => $jwt,
    ]), ['Content-Type: application/x-www-form-urlencoded'], false);

    // Atomic write, private from the first byte: temp file under umask 0077, then rename.
    $old = umask(0077);
    // tempnam() silently falls back to /tmp when $dir is unusable, so check first.
    $tmp = is_dir($dir) && is_writable($dir) ? @tempnam($dir, 'tok') : false;
    if ($tmp && @file_put_contents($tmp, json_encode(['token' => $res['access_token'], 'exp' => $now + (int) $res['expires_in']]))) {
        @rename($tmp, $cacheFile);
    }
    umask($old);
    return $res['access_token'];
}

function firebase_http(string $method, string $url, ?string $body = null, array $headers = [], bool $auth = true): array {
    if ($auth) $headers[] = 'Authorization: Bearer ' . firebase_token();
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTPHEADER => $headers,
    ]);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    $data = is_string($raw) ? json_decode($raw, true) : null;
    if ($status < 200 || $status >= 300) {
        $msg = $data['error']['message'] ?? $data['error_description'] ?? $err ?: "HTTP $status";
        error_log("[firebase] $method $url → $status $msg");
        throw new RuntimeException("Firebase: $msg");
    }
    return $data ?? [];
}

// Firestore typed value → plain PHP. Timestamps stay ISO strings.
function firestore_value(array $v) {
    if (array_key_exists('nullValue', $v)) return null;
    if (isset($v['stringValue'])) return $v['stringValue'];
    if (isset($v['integerValue'])) return (int) $v['integerValue'];
    if (isset($v['doubleValue'])) return (float) $v['doubleValue'];
    if (isset($v['booleanValue'])) return $v['booleanValue'];
    if (isset($v['timestampValue'])) return $v['timestampValue'];
    if (isset($v['mapValue'])) return array_map('firestore_value', $v['mapValue']['fields'] ?? []);
    if (isset($v['arrayValue'])) return array_map('firestore_value', $v['arrayValue']['values'] ?? []);
    if (isset($v['referenceValue'])) return $v['referenceValue'];
    return null;
}

// Every document of a collection as ['id' => ..., ...fields]. Pages through the whole collection.
function firestore_list(string $collection): array {
    $project = firebase_sa()['project_id'];
    $docs = [];
    $pageToken = '';
    do {
        $url = "https://firestore.googleapis.com/v1/projects/$project/databases/(default)/documents/$collection?pageSize=300"
            . ($pageToken ? '&pageToken=' . urlencode($pageToken) : '');
        $res = firebase_http('GET', $url);
        foreach ($res['documents'] ?? [] as $d) {
            $docs[] = ['id' => basename($d['name'])] + array_map('firestore_value', $d['fields'] ?? []);
        }
        $pageToken = $res['nextPageToken'] ?? '';
    } while ($pageToken);
    return $docs;
}

// All Firebase Auth users: uid, email, displayName, createdAt / lastLoginAt as ISO.
function firebase_auth_users(): array {
    $project = firebase_sa()['project_id'];
    $users = [];
    $pageToken = '';
    do {
        $url = "https://identitytoolkit.googleapis.com/v1/projects/$project/accounts:batchGet?maxResults=1000"
            . ($pageToken ? '&nextPageToken=' . urlencode($pageToken) : '');
        $res = firebase_http('GET', $url);
        foreach ($res['users'] ?? [] as $u) {
            $users[] = [
                'uid' => $u['localId'],
                'email' => $u['email'] ?? null,
                'name' => $u['displayName'] ?? null,
                'createdAt' => isset($u['createdAt']) ? gmdate('c', intdiv((int) $u['createdAt'], 1000)) : null,
                'lastLoginAt' => isset($u['lastLoginAt']) ? gmdate('c', intdiv((int) $u['lastLoginAt'], 1000)) : null,
            ];
        }
        $pageToken = $res['nextPageToken'] ?? '';
    } while ($pageToken);
    return $users;
}

// Documents of a collection where $field == $value (Firestore runQuery). Same shape as firestore_list().
function firestore_where(string $collection, string $field, string $value): array {
    $project = firebase_sa()['project_id'];
    $url = "https://firestore.googleapis.com/v1/projects/$project/databases/(default)/documents:runQuery";
    $res = firebase_http('POST', $url, json_encode(['structuredQuery' => [
        'from' => [['collectionId' => $collection]],
        'where' => ['fieldFilter' => ['field' => ['fieldPath' => $field], 'op' => 'EQUAL', 'value' => ['stringValue' => $value]]],
    ]]), ['Content-Type: application/json']);
    $docs = [];
    foreach ($res as $row) {
        if (empty($row['document'])) continue;
        $d = $row['document'];
        $docs[] = ['id' => basename($d['name'])] + array_map('firestore_value', $d['fields'] ?? []);
    }
    return $docs;
}

// One Firebase Auth user by uid, same shape as firebase_auth_users(); null if unknown.
function firebase_auth_user(string $uid): ?array {
    $project = firebase_sa()['project_id'];
    $res = firebase_http('POST', "https://identitytoolkit.googleapis.com/v1/projects/$project/accounts:lookup",
        json_encode(['localId' => [$uid]]), ['Content-Type: application/json']);
    $u = $res['users'][0] ?? null;
    if (!$u) return null;
    return [
        'uid' => $u['localId'],
        'email' => $u['email'] ?? null,
        'name' => $u['displayName'] ?? null,
        'createdAt' => isset($u['createdAt']) ? gmdate('c', intdiv((int) $u['createdAt'], 1000)) : null,
        'lastLoginAt' => isset($u['lastLoginAt']) ? gmdate('c', intdiv((int) $u['lastLoginAt'], 1000)) : null,
    ];
}
