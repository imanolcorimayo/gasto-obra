<?php
$nav = [
    '/usuarios' => 'Usuarios',
    '/documentos' => 'Documentos',
];
$current = '/' . explode('/', trim($path ?? '', '/'))[0];
if ($current === '/') $current = '/usuarios';
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title><?= h($page_title ?? 'Admin') ?> — Gasto Obra Admin</title>
    <script src="/assets/js/tailwind.js"></script>
    <script>
        // Single brand accent (web --go-primary); everything else is neutral gray.
        tailwind.config = { theme: { extend: { colors: { brand: '#92520B' } } } }
    </script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>body{font-family:'Red Hat Display',system-ui,sans-serif;font-feature-settings:'tnum'}</style>
</head>
<body class="bg-gray-50 text-gray-900 min-h-screen antialiased">
    <header class="bg-white border-b border-gray-200">
        <div class="max-w-6xl mx-auto px-4 h-14 flex items-center gap-8">
            <a href="/" class="flex items-center gap-2 font-semibold">
                <span class="w-2.5 h-2.5 rounded-sm bg-brand"></span> Gasto Obra
                <span class="text-gray-400 font-normal">admin</span>
            </a>
            <nav class="flex gap-6 text-sm h-full">
                <?php foreach ($nav as $href => $label): ?>
                    <a href="<?= $href ?>" class="flex items-center border-b-2 <?= $current === $href ? 'border-brand text-gray-900 font-medium' : 'border-transparent text-gray-600 hover:text-gray-900' ?>"><?= h($label) ?></a>
                <?php endforeach; ?>
            </nav>
        </div>
    </header>
    <main class="max-w-6xl mx-auto px-4 py-8">
