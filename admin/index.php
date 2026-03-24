<?php
$config = require __DIR__ . '/config.php';
$users = $config['users'] ?? [];

// Basic HTTP auth
$authUser = $_SERVER['PHP_AUTH_USER'] ?? '';
$authPass = $_SERVER['PHP_AUTH_PW'] ?? '';

if (!isset($users[$authUser]) || $users[$authUser] !== $authPass) {
    header('WWW-Authenticate: Basic realm="Gasto Obra Admin"');
    header('HTTP/1.0 401 Unauthorized');
    echo 'Acceso denegado.';
    exit;
}

$docsDir = realpath(__DIR__ . '/../docs');

// Serve a specific file
if (isset($_GET['file'])) {
    $requested = basename($_GET['file']);
    $filePath = $docsDir . '/' . $requested;

    if (!str_ends_with($requested, '.html') || !is_file($filePath) || realpath($filePath) !== $filePath) {
        http_response_code(404);
        echo 'Archivo no encontrado.';
        exit;
    }

    readfile($filePath);
    exit;
}

// List HTML files
$files = glob($docsDir . '/*.html');
$files = array_map('basename', $files);
sort($files);
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gasto Obra - Admin</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; }
        h1 { font-size: 1.4rem; margin-bottom: 24px; }
        ul { list-style: none; }
        li { margin-bottom: 8px; }
        a { color: #2563eb; text-decoration: none; padding: 8px 12px; display: block; border-radius: 6px; transition: background 0.15s; }
        a:hover { background: #f1f5f9; }
    </style>
</head>
<body>
    <h1>Documentos</h1>
    <ul>
        <?php foreach ($files as $file): ?>
            <li><a href="?file=<?= urlencode($file) ?>"><?= htmlspecialchars($file) ?></a></li>
        <?php endforeach; ?>
    </ul>
</body>
</html>
