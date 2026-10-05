<?php
// One account: phones, obras, last 20 expenses. Data: GET /api/admin/usage/:uid.
$res = api_get('/api/admin/usage/' . rawurlencode($uid));
$u = $res['data'];

$page_title = $u['name'] ?? 'Usuario';
require __DIR__ . '/../includes/header.php';
?>
<a href="/usuarios" class="text-sm text-gray-500 hover:underline">← Usuarios</a>

<?php if (!$u): ?>
    <div class="mt-4 bg-red-50 text-red-700 border border-red-200 rounded-lg p-4"><?= h($res['status'] === 404 ? 'Usuario no encontrado.' : 'No se pudo cargar la API: ' . $res['error']) ?></div>
<?php else: ?>
    <div class="mt-2 mb-6">
        <h1 class="text-2xl font-semibold"><?= h($u['name'] ?: '(sin nombre)') ?></h1>
        <div class="text-sm text-gray-600"><?= h($u['email'] ?: 'sin email') ?> · <code class="text-xs"><?= h($u['uid']) ?></code></div>
        <div class="text-sm text-gray-500 mt-1">Alta <?= fecha($u['createdAt']) ?> · Último login <?= fecha($u['lastLoginAt']) ?></div>
    </div>

    <div class="grid md:grid-cols-2 gap-4 mb-6">
        <section class="bg-white border border-gray-200 rounded-lg p-4">
            <h2 class="font-semibold mb-3">Teléfonos</h2>
            <?php if (!$u['phones']): ?>
                <p class="text-sm text-gray-500">Ninguno vinculado.</p>
            <?php endif; ?>
            <ul class="space-y-2 text-sm">
                <?php foreach ($u['phones'] as $p): ?>
                    <li>
                        <span class="font-medium"><?= h($p['phone']) ?></span> · <?= h($p['origin']) ?>
                        <div class="text-xs text-gray-500">WhatsApp: <?= h($p['contactName'] ?: '—') ?> · vinculado <?= fecha($p['linkedAt']) ?></div>
                    </li>
                <?php endforeach; ?>
            </ul>
            <p class="text-xs text-gray-500 mt-3">Códigos pendientes sin usar: <?= (int) $u['pendingCodes'] ?></p>
        </section>

        <section class="bg-white border border-gray-200 rounded-lg p-4">
            <h2 class="font-semibold mb-3">Obras</h2>
            <?php if (!$u['projects']): ?>
                <p class="text-sm text-gray-500">Sin obras.</p>
            <?php endif; ?>
            <ul class="space-y-2 text-sm">
                <?php foreach ($u['projects'] as $p): ?>
                    <li class="flex justify-between gap-3">
                        <div>
                            <span class="font-medium"><?= h($p['name']) ?></span>
                            <span class="text-xs rounded px-1.5 py-0.5 <?= $p['status'] === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500' ?>"><?= h($p['status']) ?></span>
                            <div class="text-xs text-gray-500">creada <?= fecha($p['createdAt']) ?></div>
                        </div>
                        <div class="text-right whitespace-nowrap"><?= ars($p['total']) ?><div class="text-xs text-gray-500"><?= (int) $p['expenses'] ?> gastos</div></div>
                    </li>
                <?php endforeach; ?>
            </ul>
        </section>
    </div>

    <section class="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <h2 class="font-semibold px-4 pt-4 pb-2">Últimos 20 gastos</h2>
        <table class="w-full text-sm">
            <thead class="text-left text-xs text-gray-500 border-b border-gray-200">
                <tr>
                    <th class="px-4 py-2">Fecha</th>
                    <th class="px-4 py-2">Tipo</th>
                    <th class="px-4 py-2 text-right">Monto</th>
                    <th class="px-4 py-2">Categoría</th>
                    <th class="px-4 py-2">Canal</th>
                    <th class="px-4 py-2">Título</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
                <?php foreach ($u['lastExpenses'] as $e): ?>
                    <tr>
                        <td class="px-4 py-2 whitespace-nowrap"><?= fecha($e['createdAt']) ?></td>
                        <td class="px-4 py-2 text-xs text-gray-600"><?= h($e['type']) ?></td>
                        <td class="px-4 py-2 text-right whitespace-nowrap"><?= ars($e['amount']) ?></td>
                        <td class="px-4 py-2"><?= h($e['category'] ?: '—') ?></td>
                        <td class="px-4 py-2 text-xs text-gray-600"><?= h($e['source']) ?><?= $e['media'] ? ' · ' . h(implode('+', $e['media'])) : '' ?></td>
                        <td class="px-4 py-2"><?= h($e['title']) ?></td>
                    </tr>
                <?php endforeach; ?>
                <?php if (!$u['lastExpenses']): ?>
                    <tr><td colspan="6" class="px-4 py-3 text-gray-500">Sin gastos.</td></tr>
                <?php endif; ?>
            </tbody>
        </table>
    </section>
<?php endif; ?>
<?php require __DIR__ . '/../includes/footer.php'; ?>
