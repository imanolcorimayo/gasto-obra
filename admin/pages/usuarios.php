<?php
// Accounts by recency + 30-day trend vs the previous 30 days. Data: GET /api/admin/usage.
$res = api_get('/api/admin/usage');
$data = $res['data'];

$page_title = 'Usuarios';
require __DIR__ . '/../includes/header.php';
?>
<div class="flex items-baseline justify-between mb-6">
    <h1 class="text-2xl font-semibold">Usuarios</h1>
    <span class="text-sm text-gray-500">Últimos 30 días vs. 30 anteriores</span>
</div>

<?php if (!$data): ?>
    <div class="bg-red-50 text-red-700 border border-red-200 rounded-lg p-4">No se pudo cargar la API: <?= h($res['error']) ?></div>
<?php else: ?>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <?php foreach ([
            'Usuarios activos' => $data['metrics']['activeUsers'],
            'Usuarios nuevos' => $data['metrics']['newUsers'],
            'Movimientos' => $data['metrics']['expenses'],
            'Obras nuevas' => $data['metrics']['newProjects'],
        ] as $label => $m):
            $diff = $m['current'] - $m['previous'];
            $pct = $m['previous'] ? round($diff / $m['previous'] * 100) : null;
        ?>
            <div class="bg-white border border-gray-200 rounded-lg p-5">
                <div class="text-sm font-medium text-gray-600"><?= h($label) ?></div>
                <div class="mt-1 text-3xl font-semibold"><?= (int) $m['current'] ?></div>
                <div class="mt-1 text-sm">
                    <?php if ($diff > 0): ?>
                        <span class="text-emerald-600 font-medium">▲ <?= $pct !== null ? "$pct%" : "+$diff" ?></span>
                    <?php elseif ($diff < 0): ?>
                        <span class="text-red-600 font-medium">▼ <?= abs($pct) ?>%</span>
                    <?php else: ?>
                        <span class="text-gray-400">= </span>
                    <?php endif; ?>
                    <span class="text-gray-500">vs <?= (int) $m['previous'] ?></span>
                </div>
            </div>
        <?php endforeach; ?>
    </div>

    <div class="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table class="w-full text-sm" id="users">
            <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600 border-b border-gray-200">
                <tr>
                    <th data-type="text" class="px-4 py-3 font-medium cursor-pointer select-none hover:text-gray-900">Usuario</th>
                    <th data-type="num" data-dir="desc" class="px-4 py-3 font-medium cursor-pointer select-none hover:text-gray-900">Última actividad</th>
                    <th data-type="num" class="px-4 py-3 font-medium cursor-pointer select-none hover:text-gray-900 text-right">Gastos 30d</th>
                    <th data-type="num" class="px-4 py-3 font-medium cursor-pointer select-none hover:text-gray-900 text-right">Gastos</th>
                    <th data-type="num" class="px-4 py-3 font-medium cursor-pointer select-none hover:text-gray-900 text-right">Obras</th>
                    <th data-type="text" class="px-4 py-3 font-medium cursor-pointer select-none hover:text-gray-900">Origen</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
                <?php foreach ($data['users'] as $u):
                    $stale = !$u['lastActivityAt'] || (time() - strtotime($u['lastActivityAt'])) > 30 * 86400;
                ?>
                    <tr class="hover:bg-gray-50 <?= $stale ? 'text-gray-400' : '' ?>">
                        <td class="px-4 py-3" data-value="<?= h(mb_strtolower($u['name'] ?? '')) ?>">
                            <a href="/usuarios/<?= h($u['uid']) ?>" class="font-medium <?= $stale ? 'text-gray-500' : 'text-gray-900' ?> hover:text-brand"><?= h($u['name'] ?: '(sin nombre)') ?></a>
                            <?php if ($u['isNew']): ?><span class="ml-1.5 text-[11px] font-medium text-brand bg-amber-50 rounded px-1.5 py-0.5">nuevo</span><?php endif; ?>
                            <div class="text-xs text-gray-500"><?= h($u['email'] ?: 'sin email') ?></div>
                        </td>
                        <td class="px-4 py-3 whitespace-nowrap" data-value="<?= $u['lastActivityAt'] ? strtotime($u['lastActivityAt']) : 0 ?>" title="<?= fecha($u['lastActivityAt']) ?>">
                            <span class="inline-flex items-center gap-2"><?= recency_dot($u['lastActivityAt']) ?> <?= hace($u['lastActivityAt']) ?></span>
                        </td>
                        <td class="px-4 py-3 text-right font-medium" data-value="<?= (int) $u['expenses30d'] ?>"><?= (int) $u['expenses30d'] ?: '<span class="text-gray-300">0</span>' ?></td>
                        <td class="px-4 py-3 text-right" data-value="<?= (int) $u['expenses'] ?>"><?= (int) $u['expenses'] ?></td>
                        <td class="px-4 py-3 text-right" data-value="<?= (int) $u['projects'] ?>"><?= (int) $u['projects'] ?></td>
                        <td class="px-4 py-3" data-value="<?= h(implode(', ', $u['origins'])) ?>">
                            <?php if ($u['origins']): ?>
                                <?= h(implode(', ', $u['origins'])) ?>
                            <?php elseif ($u['pendingCodes']): ?>
                                <span class="text-amber-600">sin vincular (<?= (int) $u['pendingCodes'] ?> cód.)</span>
                            <?php else: ?>
                                <span class="text-gray-300">—</span>
                            <?php endif; ?>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <p class="mt-3 text-xs text-gray-400">Última actividad = último gasto o login. Activo = registró al menos un movimiento en el período.</p>

    <script>
    // Click a header to sort by its column; click again to flip direction.
    (() => {
        const table = document.getElementById('users');
        const heads = [...table.querySelectorAll('th')];
        const tbody = table.tBodies[0];
        const mark = (th, dir) => {
            heads.forEach(h => h.textContent = h.textContent.replace(/ [▲▼]$/, ''));
            th.textContent += dir === 'asc' ? ' ▲' : ' ▼';
        };
        heads.forEach((th, i) => th.addEventListener('click', () => {
            const dir = th.dataset.dir === 'desc' ? 'asc' : 'desc';
            heads.forEach(h => delete h.dataset.dir);
            th.dataset.dir = dir;
            const num = th.dataset.type === 'num';
            const val = tr => tr.cells[i].dataset.value;
            [...tbody.rows]
                .sort((a, b) => {
                    const r = num ? val(a) - val(b) : val(a).localeCompare(val(b));
                    return dir === 'asc' ? r : -r;
                })
                .forEach(tr => tbody.appendChild(tr));
            mark(th, dir);
        }));
        mark(heads[1], 'desc');
    })();
    </script>
<?php endif; ?>
<?php require __DIR__ . '/../includes/footer.php'; ?>
