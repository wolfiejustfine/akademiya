<?php
// Copy to config.php OUTSIDE public_html. Do not commit actual settings.
return [
    'environment' => 'production',
    'base_url' => 'https://YOUR-DOMAIN.example',
    'secret' => '', // Generate: php -r "echo bin2hex(random_bytes(32));"
    'database' => [
        'dsn' => 'mysql:host=localhost;dbname=DATABASE;charset=utf8mb4',
        'username' => '', 'password' => '',
    ],
    'mail' => [
        'transport' => 'mail', // Spaceweb's PHP mail(); local tests use 'file'.
        'from' => 'practice@YOUR-DOMAIN.example',
        'outbox' => __DIR__ . '/outbox', // 'file' is allowed ONLY in local mode.
    ],
    'reports' => [
        'recipient' => '', // Set the report recipient before enabling Cron.
        'timezone' => 'Europe/Moscow',
    ],
];
