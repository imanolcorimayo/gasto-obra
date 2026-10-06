<?php
// Front controller: auth → route → page. Only this file is executable (see docs/nginx).
$config = require __DIR__ . '/config.php';
require __DIR__ . '/lib/helpers.php';
require __DIR__ . '/lib/firebase.php';
require __DIR__ . '/lib/usage.php';
require __DIR__ . '/lib/db.php';
require __DIR__ . '/lib/chats.php';

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
} elseif (preg_match('#^/usuarios/([A-Za-z0-9]{10,40})/chat/(\d+)$#', $path, $m)) {
    // JSON transcript for the chat side panel; only sessions owned by that uid.
    header('Content-Type: application/json; charset=utf-8');
    try {
        $chat = chat_session($m[1], (int) $m[2]);
        if (!$chat) http_response_code(404);
        echo json_encode($chat ?? ['error' => 'Conversación no encontrada'], JSON_UNESCAPED_UNICODE);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
} elseif ($path === '/documentos') {
    require __DIR__ . '/pages/docs.php';
} else {
    http_response_code(404);
    $page_title = 'No encontrado';
    require __DIR__ . '/includes/header.php';
    echo '<p class="text-gray-500">Página no encontrada.</p>';
    require __DIR__ . '/includes/footer.php';
}
