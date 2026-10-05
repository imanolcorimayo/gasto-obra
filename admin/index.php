<?php
// Front controller: auth → route → page. Only this file is executable (see docs/nginx).
$config = require __DIR__ . '/config.php';
require __DIR__ . '/lib/helpers.php';
require __DIR__ . '/lib/api.php';

// Basic HTTP auth
$users = $config['users'] ?? [];
$authUser = $_SERVER['PHP_AUTH_USER'] ?? '';
$authPass = $_SERVER['PHP_AUTH_PW'] ?? '';

if (!isset($users[$authUser]) || !hash_equals($users[$authUser], $authPass)) {
    header('WWW-Authenticate: Basic realm="Gasto Obra Admin"');
    header('HTTP/1.0 401 Unauthorized');
    echo 'Acceso denegado.';
    exit;
}

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

if ($path === '/' || $path === '/usuarios') {
    require __DIR__ . '/pages/usuarios.php';
} elseif (preg_match('#^/usuarios/([A-Za-z0-9]{10,40})$#', $path, $m)) {
    $uid = $m[1];
    require __DIR__ . '/pages/usuario.php';
} elseif ($path === '/documentos') {
    require __DIR__ . '/pages/docs.php';
} else {
    http_response_code(404);
    $page_title = 'No encontrado';
    require __DIR__ . '/includes/header.php';
    echo '<p class="text-gray-500">Página no encontrada.</p>';
    require __DIR__ . '/includes/footer.php';
}
