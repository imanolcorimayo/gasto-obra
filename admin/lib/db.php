<?php
// MySQL (the bot's conversation store). Same database the Node server writes to;
// the admin only reads it.

function get_db(): PDO {
    global $config;
    static $pdo = null;
    if ($pdo === null) {
        $c = $config['mysql'] ?? [];
        $pdo = new PDO(
            'mysql:host=' . ($c['host'] ?? '127.0.0.1') . ';port=' . ($c['port'] ?? 3306) . ';dbname=' . ($c['database'] ?? '') . ';charset=utf8mb4',
            $c['user'] ?? '', $c['password'] ?? '',
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
        );
    }
    return $pdo;
}
