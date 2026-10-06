<?php
return [
    'users' => [
        'admin' => 'change-this-password',
    ],
    // Firebase service account, base64 JSON (same value as FIREBASE_SERVICE_ACCOUNT in server/.env)
    'firebase_service_account' => 'base64-service-account-json',
    // Bot conversation store (same MySQL as server/.env). Read-only user recommended in prod.
    'mysql' => [
        'host' => '127.0.0.1',
        'port' => '3306',
        'database' => 'gasto_obra',
        'user' => 'gasto_obra_admin_ro',
        'password' => 'change-this-password',
    ],
];
