<?php
// Lists and serves the HTML files in /docs (brand manual, demos).
$docsDir = realpath(__DIR__ . '/../../docs');

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

$files = array_map('basename', glob($docsDir . '/*.html'));
sort($files);

$page_title = 'Documentos';
require __DIR__ . '/../includes/header.php';
?>
<h1 class="text-2xl font-semibold mb-6">Documentos</h1>
<ul class="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 max-w-xl">
    <?php foreach ($files as $file): ?>
        <li><a href="/documentos?file=<?= urlencode($file) ?>" class="block px-4 py-3 hover:bg-gray-50"><?= h($file) ?></a></li>
    <?php endforeach; ?>
</ul>
<?php require __DIR__ . '/../includes/footer.php'; ?>
