<?php
// One account: who they are, how the business is going, their obras, how they use
// the app and their chats with the bot. Firebase via lib/usage.php, chats via lib/chats.php.
try {
    $u = usage_user($uid);
    $error = $u ? null : 'Usuario no encontrado.';
} catch (Throwable $e) {
    $u = null;
    $error = 'No se pudieron cargar los datos: ' . $e->getMessage();
}

// Chats live in MySQL; if it's unreachable the rest of the page still renders.
$chats = null;
$chatError = null;
if ($u) {
    try {
        $chats = chats_for_user($uid);
    } catch (Throwable $e) {
        $chatError = $e->getMessage();
    }
}

$TYPES = [
    'expense' => ['Gasto cliente', '#B8660B'],
    'provider_expense' => ['Gasto propio', '#3B6FD4'],
    'payment' => ['Pago recibido', '#2E8B57'],
];
$MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

$page_title = $u['name'] ?? 'Usuario';
require __DIR__ . '/../includes/header.php';
?>
<div class="text-sm text-gray-500"><a href="/usuarios" class="hover:text-gray-900">Usuarios</a> / <?= h($u['name'] ?? $uid) ?></div>

<?php if (!$u): ?>
    <div class="mt-4 bg-red-50 text-red-700 border border-red-200 rounded-lg p-4"><?= h($error) ?></div>
<?php else:
    $k = $u['kpis'];
    $delta = $k['prev30'] ? (int) round(($k['last30'] - $k['prev30']) / $k['prev30'] * 100) : null;
    $months = (int) max(1, round((time() - strtotime($u['createdAt'])) / (30 * DAY)));
    $initials = implode('', array_map(fn($w) => mb_substr($w, 0, 1), array_slice(explode(' ', trim($u['name'] ?? '?')), 0, 2)));
?>
    <!-- Who -->
    <section class="mt-3 bg-white border border-gray-200 rounded-xl p-5 flex gap-5 items-center">
        <div class="w-14 h-14 rounded-full bg-amber-50 text-brand font-bold text-xl grid place-items-center shrink-0"><?= h(mb_strtoupper($initials)) ?></div>
        <div class="min-w-0">
            <h1 class="text-2xl font-bold tracking-tight"><?= h($u['name'] ?: '(sin nombre)') ?></h1>
            <div class="text-sm text-gray-600 mt-0.5 flex flex-wrap gap-x-4">
                <span><?= h($u['email'] ?: 'sin email') ?></span>
                <?php foreach ($u['phones'] as $p): ?>
                    <span><span class="font-medium text-gray-900">+<?= h($p['phone']) ?></span> · <?= h($p['origin']) ?></span>
                <?php endforeach; ?>
                <?php if (!$u['phones']): ?><span class="text-gray-400">sin WhatsApp vinculado</span><?php endif; ?>
            </div>
            <div class="text-sm text-gray-500 mt-2">
                Alta <?= fecha($u['createdAt'], false) ?> (<?= $months ?> <?= $months === 1 ? 'mes' : 'meses' ?>) ·
                último login <?= fecha($u['lastLoginAt'], false) ?> ·
                última carga <?= $u['lastActivityAt'] ? hace($u['lastActivityAt']) : 'nunca' ?> ·
                <?= $k['activeObras'] ?> de <?= count($u['obras']) ?> obras activas ·
                <code class="text-xs text-gray-400"><?= h($u['uid']) ?></code>
            </div>
        </div>
    </section>

    <!-- KPIs -->
    <section class="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <div class="bg-white border border-gray-200 rounded-xl p-5">
            <div class="text-sm font-medium text-gray-600">Movimientos 30 d</div>
            <div class="text-3xl font-semibold mt-1"><?= $k['last30'] ?></div>
            <div class="text-xs text-gray-500 mt-1">
                <?php if ($delta !== null && $delta !== 0): ?><span class="font-semibold <?= $delta < 0 ? 'text-red-600' : 'text-emerald-600' ?>"><?= $delta < 0 ? '▼' : '▲' ?> <?= abs($delta) ?>%</span><?php endif; ?>
                vs <?= $k['prev30'] ?> los 30 previos
            </div>
        </div>
        <div class="bg-white border border-gray-200 rounded-xl p-5" title="Suma de gastos cargados por cuenta de clientes (no incluye gastos propios).">
            <div class="text-sm font-medium text-gray-600">Gastado para clientes</div>
            <div class="text-3xl font-semibold mt-1"><?= ars_short($k['spent']) ?></div>
            <div class="text-xs text-gray-500 mt-1">en <?= $k['spentObras'] ?> obras, desde el alta</div>
        </div>
        <div class="bg-white border border-gray-200 rounded-xl p-5" title="Obras activas donde lo gastado supera lo que pagó el cliente.">
            <div class="text-sm font-medium text-gray-600">Por cobrar</div>
            <div class="text-3xl font-semibold mt-1"><?= ars_short($k['toCollect']) ?></div>
            <div class="text-xs text-gray-500 mt-1">en <?= $k['toCollectObras'] ?> obra<?= $k['toCollectObras'] === 1 ? '' : 's' ?> activa<?= $k['toCollectObras'] === 1 ? '' : 's' ?></div>
        </div>
        <div class="bg-white border border-gray-200 rounded-xl p-5">
            <div class="text-sm font-medium text-gray-600">Con comprobante</div>
            <div class="text-3xl font-semibold mt-1"><?= $k['receiptsPct'] ?>%</div>
            <div class="text-xs text-gray-500 mt-1">de los gastos tienen foto o PDF</div>
        </div>
    </section>

    <!-- Activity + how / when -->
    <div class="grid lg:grid-cols-3 gap-4 mt-4">
        <section class="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
            <div class="flex justify-between items-baseline">
                <h2 class="font-semibold">Actividad por mes</h2>
                <span class="text-xs text-gray-500">cantidad de movimientos</span>
            </div>
            <div class="h-72 mt-3"><canvas id="chMonths"></canvas></div>
        </section>
        <section class="bg-white border border-gray-200 rounded-xl p-5">
            <h2 class="font-semibold">Cómo y cuándo carga</h2>
            <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 mt-4 mb-2">Formato de los gastos</div>
            <?php $f = $u['formats']; ?>
            <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                <span><b class="text-gray-900"><?= pct($f['photo'], $f['total']) ?>%</b> foto</span>
                <span><b class="text-gray-900"><?= pct($f['pdf'], $f['total']) ?>%</b> PDF</span>
                <span><b class="text-gray-900"><?= pct($f['text'], $f['total']) ?>%</b> solo texto</span>
                <span><b class="text-gray-900"><?= $f['audio'] ?></b> audios</span>
            </div>
            <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 mt-5 mb-1">Hora del día</div>
            <div class="h-24"><canvas id="chHours"></canvas></div>
            <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 mt-4 mb-1">Día de la semana</div>
            <div class="h-24"><canvas id="chDays"></canvas></div>
        </section>
    </div>

    <!-- Obras -->
    <section class="bg-white border border-gray-200 rounded-xl mt-4">
        <div class="flex justify-between items-baseline px-5 pt-5">
            <h2 class="font-semibold">Obras</h2>
            <span class="text-xs text-gray-500">tocá un encabezado para ordenar</span>
        </div>
        <div class="overflow-x-auto px-5 pb-3">
            <table class="w-full text-sm" id="obras">
                <thead class="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                    <tr>
                        <th data-type="text" class="py-3 pr-3 font-semibold cursor-pointer select-none hover:text-gray-900">Obra · cliente</th>
                        <th data-type="text" class="py-3 px-3 font-semibold cursor-pointer select-none hover:text-gray-900">Estado</th>
                        <th data-type="num" class="py-3 px-3 font-semibold cursor-pointer select-none hover:text-gray-900">Presupuesto</th>
                        <th data-type="num" class="py-3 px-3 font-semibold cursor-pointer select-none hover:text-gray-900 text-right">Gastado</th>
                        <th data-type="num" class="py-3 px-3 font-semibold cursor-pointer select-none hover:text-gray-900 text-right">Cobrado</th>
                        <th data-type="num" class="py-3 px-3 font-semibold cursor-pointer select-none hover:text-gray-900 text-right">Saldo</th>
                        <th data-type="num" class="py-3 px-3 font-semibold cursor-pointer select-none hover:text-gray-900 text-right">Mov.</th>
                        <th data-type="num" class="py-3 pl-3 font-semibold cursor-pointer select-none hover:text-gray-900">Último</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    <?php foreach ($u['obras'] as $o):
                        $active = $o['status'] === 'active';
                        $bal = $o['paid'] - $o['spent'];
                        $used = $o['budget'] ? pct($o['spent'], $o['budget']) : null;
                    ?>
                        <tr class="hover:bg-gray-50 <?= $active ? '' : 'text-gray-400' ?>">
                            <td class="py-3 pr-3" data-v="<?= h(mb_strtolower($o['name'])) ?>">
                                <div class="<?= $active ? 'font-semibold text-gray-900' : 'font-medium' ?>"><?= h($o['name']) ?></div>
                                <div class="text-xs text-gray-500"><?= $o['client'] ? h($o['client']) : 'sin cliente' ?><?= $o['joined'] ? ' · <span title="El cliente se unió con su cuenta y ve la obra en la app.">sigue la obra en la app</span>' : '' ?></div>
                            </td>
                            <td class="py-3 px-3" data-v="<?= h($o['status']) ?>"><?= $active ? 'Activa' : 'Archivada' ?></td>
                            <td class="py-3 px-3 min-w-[150px]" data-v="<?= $used ?? -1 ?>">
                                <?php if ($o['budget']): ?>
                                    <div class="flex justify-between text-xs"><span><?= ars_short($o['budget']) ?></span><b class="<?= $used > 100 ? 'text-red-700' : '' ?>"><?= $used ?>%</b></div>
                                    <div class="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden"><div class="h-full rounded-full <?= $used > 100 ? 'bg-red-700' : 'bg-[#B8660B]' ?>" style="width: <?= min(100, $used) ?>%"></div></div>
                                <?php else: ?><span class="text-gray-400">sin presupuesto</span><?php endif; ?>
                            </td>
                            <td class="py-3 px-3 text-right whitespace-nowrap" data-v="<?= $o['spent'] ?>"><?= $o['spent'] ? ars($o['spent']) : '<span class="text-gray-300">-</span>' ?></td>
                            <td class="py-3 px-3 text-right whitespace-nowrap" data-v="<?= $o['paid'] ?>"><?= $o['paid'] ? ars($o['paid']) : '<span class="text-gray-300">-</span>' ?></td>
                            <td class="py-3 px-3 text-right whitespace-nowrap" data-v="<?= $bal ?>">
                                <?php if (!$o['client'] || (!$o['spent'] && !$o['paid'])): ?><span class="text-gray-300">-</span>
                                <?php elseif (abs($bal) < 1): ?><span class="text-gray-400">al día</span>
                                <?php elseif ($bal < 0): ?><span class="font-semibold text-red-700"><?= ars(-$bal) ?></span><div class="text-[11px] text-red-700">por cobrar</div>
                                <?php else: ?><span class="font-semibold text-emerald-700"><?= ars($bal) ?></span><div class="text-[11px] text-emerald-700">a favor del cliente</div>
                                <?php endif; ?>
                            </td>
                            <td class="py-3 px-3 text-right" data-v="<?= $o['n'] ?>"><?= $o['n'] ?></td>
                            <td class="py-3 pl-3 whitespace-nowrap" data-v="<?= $o['last'] ?>"><?= $o['last'] ? hace_ts($o['last']) : '<span class="text-gray-400">sin movimientos</span>' ?></td>
                        </tr>
                    <?php endforeach; ?>
                    <?php if (!$u['obras']): ?><tr><td colspan="8" class="py-4 text-gray-500">Sin obras.</td></tr><?php endif; ?>
                </tbody>
            </table>
        </div>
    </section>

    <!-- Spending + vendors -->
    <div class="grid lg:grid-cols-2 gap-4 mt-4">
        <section class="bg-white border border-gray-200 rounded-xl p-5">
            <div class="flex justify-between items-baseline">
                <h2 class="font-semibold">En qué se gasta</h2>
                <span class="text-xs text-gray-500">gastos para clientes, total</span>
            </div>
            <?php if ($u['categories']): ?>
                <div class="mt-3" style="height: <?= count($u['categories']) * 34 + 30 ?>px"><canvas id="chCats"></canvas></div>
            <?php else: ?><p class="text-sm text-gray-500 mt-3">Sin gastos todavía.</p><?php endif; ?>
        </section>
        <section class="bg-white border border-gray-200 rounded-xl p-5">
            <div class="flex justify-between items-baseline">
                <h2 class="font-semibold">Proveedores frecuentes</h2>
                <span class="text-xs text-gray-500">por monto</span>
            </div>
            <table class="w-full text-sm mt-2">
                <thead class="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                    <tr><th class="py-2 font-semibold">Proveedor</th><th class="py-2 font-semibold text-right">Compras</th><th class="py-2 font-semibold text-right">Monto</th></tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    <?php foreach ($u['vendors'] as $name => $v): ?>
                        <tr><td class="py-2.5"><?= h($name) ?></td><td class="py-2.5 text-right"><?= $v['count'] ?></td><td class="py-2.5 text-right whitespace-nowrap"><?= ars($v['amount']) ?></td></tr>
                    <?php endforeach; ?>
                    <?php if (!$u['vendors']): ?><tr><td colspan="3" class="py-3 text-gray-500">Sin proveedores cargados.</td></tr><?php endif; ?>
                </tbody>
            </table>
        </section>
    </div>

    <!-- Chats -->
    <section class="bg-white border border-gray-200 rounded-xl mt-4">
        <div class="flex justify-between items-baseline px-5 pt-5">
            <h2 class="font-semibold">Conversaciones con el bot</h2>
            <span class="text-xs text-gray-500">WhatsApp y chat de la app · tocá una para leerla</span>
        </div>
        <div class="px-5 pb-3">
            <?php if ($chatError): ?>
                <p class="text-sm text-red-700 mt-3">No se pudieron cargar las conversaciones: <?= h($chatError) ?></p>
            <?php elseif (!$chats['sessions']): ?>
                <p class="text-sm text-gray-500 mt-3">Todavía no habló con el bot.</p>
            <?php else: $t = $chats['totals']; ?>
                <div class="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-600 mt-2">
                    <span><b class="text-gray-900"><?= $t['sessions'] ?></b> conversaciones</span>
                    <span><b class="text-gray-900"><?= $t['userMsgs'] ?></b> mensajes del usuario</span>
                    <span>última <?= hace($t['lastAt']) ?></span>
                    <span><b class="text-gray-900"><?= $t['errors'] ?></b> acciones fallidas</span>
                </div>
                <?php if ($chats['topActions']): ?>
                    <div class="flex flex-wrap gap-x-4 text-sm text-gray-600 mt-1">Lo que más le pide:
                        <?php foreach ($chats['topActions'] as [$label, $n]): ?><span><?= h($label) ?> <b class="text-gray-900"><?= $n ?></b></span><?php endforeach; ?>
                    </div>
                <?php endif; ?>
                <div class="overflow-x-auto mt-2">
                    <table class="w-full text-sm">
                        <thead class="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                            <tr><th class="py-3 pr-3 font-semibold">Fecha</th><th class="py-3 px-3 font-semibold">Canal</th><th class="py-3 px-3 font-semibold">Empieza con</th><th class="py-3 px-3 font-semibold text-right">Mensajes</th><th class="py-3 px-3 font-semibold">Qué hizo el bot</th><th class="py-3 px-3 font-semibold text-right">Fallas</th><th></th></tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            <?php foreach ($chats['sessions'] as $s): ?>
                                <tr class="hover:bg-gray-50 cursor-pointer" data-chat="<?= (int) $s['id'] ?>">
                                    <td class="py-3 pr-3 whitespace-nowrap"><?= fecha(gmdate('c', intdiv((int) $s['created_ts'], 1000))) ?></td>
                                    <td class="py-3 px-3"><?= $s['channel'] === 'app' ? 'App' : ($s['channel'] === 'whatsapp' ? 'WhatsApp' : h($s['channel'])) ?></td>
                                    <td class="py-3 px-3 max-w-xs truncate"><?= h($s['title'] ?? '') ?></td>
                                    <td class="py-3 px-3 text-right"><?= (int) $s['msgs'] ?></td>
                                    <td class="py-3 px-3 text-gray-500"><?= $s['tools'] ? h(implode(', ', array_map('bot_action', explode(',', $s['tools'])))) : 'solo charla' ?></td>
                                    <td class="py-3 px-3 text-right"><?= (int) $s['errors'] ? '<span class="font-semibold text-red-700">' . (int) $s['errors'] . '</span>' : '<span class="text-gray-400">0</span>' ?></td>
                                    <td class="py-3 pl-3 text-right text-brand font-medium whitespace-nowrap">Leer →</td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
                <?php if ($t['sessions'] > count($chats['sessions'])): ?>
                    <p class="text-xs text-gray-500 mt-2">Mostrando las <?= count($chats['sessions']) ?> más recientes de <?= $t['sessions'] ?>.</p>
                <?php endif; ?>
            <?php endif; ?>
        </div>
    </section>

    <!-- Last movements -->
    <section class="bg-white border border-gray-200 rounded-xl mt-4">
        <div class="flex justify-between items-baseline px-5 pt-5">
            <h2 class="font-semibold">Últimos movimientos</h2>
            <span class="text-xs text-gray-500"><?= count($u['recent']) ?> más recientes</span>
        </div>
        <div class="overflow-x-auto px-5 pb-3">
            <table class="w-full text-sm">
                <thead class="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                    <tr><th class="py-3 pr-3 font-semibold">Fecha</th><th class="py-3 px-3 font-semibold">Obra</th><th class="py-3 px-3 font-semibold">Detalle</th><th class="py-3 px-3 font-semibold">Tipo</th><th class="py-3 px-3 font-semibold">Canal</th><th class="py-3 pl-3 font-semibold text-right">Monto</th></tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    <?php foreach ($u['recent'] as $e): [$label, $color] = $TYPES[$e['type']] ?? $TYPES['expense']; ?>
                        <tr>
                            <td class="py-3 pr-3 whitespace-nowrap"><?= fecha(gmdate('c', $e['at'])) ?></td>
                            <td class="py-3 px-3"><?= h($e['obra']) ?></td>
                            <td class="py-3 px-3"><?= h($e['title']) ?><div class="text-xs text-gray-400"><?= h($e['category']) ?></div></td>
                            <td class="py-3 px-3 whitespace-nowrap text-xs text-gray-600"><span class="inline-block w-2 h-2 rounded-sm mr-1.5" style="background: <?= $color ?>"></span><?= $label ?></td>
                            <td class="py-3 px-3 text-xs text-gray-500"><?= h($e['source']) ?><?= $e['media'] ? ' · ' . $e['media'] : '' ?></td>
                            <td class="py-3 pl-3 text-right font-semibold whitespace-nowrap"><?= $e['type'] === 'payment' ? '+' : '' ?><?= ars($e['amount']) ?></td>
                        </tr>
                    <?php endforeach; ?>
                    <?php if (!$u['recent']): ?><tr><td colspan="6" class="py-4 text-gray-500">Sin movimientos.</td></tr><?php endif; ?>
                </tbody>
            </table>
        </div>
    </section>

    <!-- Chat side panel -->
    <div id="chatBg" class="fixed inset-0 bg-black/30 hidden z-40"></div>
    <aside id="chatPanel" class="fixed top-0 right-0 bottom-0 w-full max-w-lg bg-[#EFEAE2] z-50 flex flex-col translate-x-full transition-transform duration-200">
        <div class="bg-white border-b border-gray-200 px-5 py-4 flex justify-between items-start">
            <div><h3 id="chatTitle" class="font-semibold"></h3><div id="chatSub" class="text-xs text-gray-500 mt-0.5"></div></div>
            <button id="chatClose" class="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200" aria-label="Cerrar">✕</button>
        </div>
        <div id="chatThread" class="flex-1 overflow-y-auto p-4 flex flex-col gap-1.5"></div>
    </aside>

    <script src="/assets/js/chart.umd.js"></script>
    <script>
    const DATA = <?= json_encode([
        'months' => array_map(fn($key, $m) => ['label' => $MONTHS[(int) substr($key, 5) - 1], 'e' => $m['expense'], 'o' => $m['provider_expense'], 'p' => $m['payment']], array_keys($u['months']), $u['months']),
        'hours' => $u['hours'],
        'weekdays' => $u['weekdays'],
        'categories' => array_map(fn($c, $v) => [mb_strtoupper(mb_substr($c, 0, 1)) . mb_substr($c, 1), round($v)], array_keys($u['categories']), $u['categories']),
        'uid' => $u['uid'],
    ], JSON_UNESCAPED_UNICODE | JSON_HEX_TAG) ?>;

    const ars = n => '$ ' + Math.round(n).toLocaleString('es-AR');
    const arsShort = n => n >= 1e6 ? '$ ' + (n / 1e6).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' M' : n >= 1e3 ? '$ ' + Math.round(n / 1e3) + ' k' : ars(n);

    // --- charts --------------------------------------------------------------
    // Series colors validated for color-vision deficiency: amber / blue / green.
    Chart.defaults.font.family = "'Red Hat Display', system-ui, sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = '#6B7280';
    const tooltip = { backgroundColor: '#1F1C17', padding: 10, cornerRadius: 8, boxPadding: 4 };
    const grid = { color: '#F3F4F6' }, noGrid = { display: false };

    new Chart(chMonths, {
        type: 'bar',
        data: {
            labels: DATA.months.map(m => m.label),
            datasets: [['Gastos cliente', 'e', '#B8660B'], ['Gastos propios', 'o', '#3B6FD4'], ['Pagos recibidos', 'p', '#2E8B57']]
                .map(([label, key, color]) => ({ label, data: DATA.months.map(m => m[key]), backgroundColor: color, borderRadius: 4, borderSkipped: 'bottom', maxBarThickness: 44 })),
        },
        options: {
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top', align: 'end', labels: { boxWidth: 10, boxHeight: 10, useBorderRadius: true, borderRadius: 3 } }, tooltip: { ...tooltip, mode: 'index' } },
            scales: { x: { stacked: true, grid: noGrid }, y: { stacked: true, grid, border: { display: false }, ticks: { precision: 0 } } },
        },
    });

    const miniBars = (el, labels, data) => new Chart(el, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Movimientos', data, backgroundColor: '#B8660B', borderRadius: 3, borderSkipped: 'bottom' }] },
        options: {
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip },
            scales: { x: { grid: noGrid, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } }, y: { display: false } },
        },
    });
    miniBars(chHours, DATA.hours.map((_, h) => `${h} h`), DATA.hours);
    miniBars(chDays, ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'], DATA.weekdays);

    if (window.chCats) {
        const total = DATA.categories.reduce((a, [, v]) => a + v, 0);
        new Chart(chCats, {
            type: 'bar',
            data: { labels: DATA.categories.map(([c]) => c), datasets: [{ label: 'Gastado', data: DATA.categories.map(([, v]) => v), backgroundColor: '#B8660B', borderRadius: 4, borderSkipped: 'left', maxBarThickness: 18 }] },
            options: {
                indexAxis: 'y', maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { ...tooltip, callbacks: { label: c => `${ars(c.raw)} · ${Math.round(c.raw / total * 100)}%` } } },
                scales: { x: { grid, border: { display: false }, ticks: { callback: v => arsShort(v) } }, y: { grid: noGrid } },
            },
        });
    }

    // --- sortable obras table -------------------------------------------------
    (() => {
        const tbl = document.getElementById('obras'), heads = [...tbl.querySelectorAll('th')];
        heads.forEach((th, i) => th.addEventListener('click', () => {
            const dir = th.dataset.dir === 'desc' ? 'asc' : 'desc';
            heads.forEach(h => { delete h.dataset.dir; h.textContent = h.textContent.replace(/ [▲▼]$/, ''); });
            th.dataset.dir = dir; th.textContent += dir === 'asc' ? ' ▲' : ' ▼';
            const num = th.dataset.type === 'num', v = tr => tr.cells[i].dataset.v;
            [...tbl.tBodies[0].rows].filter(tr => tr.cells.length > 1)
                .sort((a, b) => { const r = num ? v(a) - v(b) : v(a).localeCompare(v(b)); return dir === 'asc' ? r : -r; })
                .forEach(tr => tbl.tBodies[0].appendChild(tr));
        }));
    })();

    // --- chat side panel: WhatsApp-like thread, what the bot did under each reply
    (() => {
        const panel = document.getElementById('chatPanel'), bg = document.getElementById('chatBg'), thread = document.getElementById('chatThread');
        const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        // WhatsApp-style *bold* / **bold**, plus clickable links (only http/https, already escaped).
        const fmt = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<b>$1</b>')
            .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener" class="text-blue-700 underline">$1</a>');
        const open = () => { panel.classList.remove('translate-x-full'); bg.classList.remove('hidden'); };
        const close = () => { panel.classList.add('translate-x-full'); bg.classList.add('hidden'); };

        document.querySelectorAll('tr[data-chat]').forEach(tr => tr.addEventListener('click', async () => {
            thread.innerHTML = '<p class="text-sm text-gray-500 text-center mt-8">Cargando…</p>';
            open();
            try {
                const res = await fetch(`/usuarios/${DATA.uid}/chat/${tr.dataset.chat}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Error');
                const s = data.session;
                document.getElementById('chatTitle').textContent = s.channel === 'app' ? 'Chat de la app' : 'WhatsApp';
                document.getElementById('chatSub').textContent = `${new Date(+s.created_ts).toLocaleString('es-AR')} · ${data.messages.length} mensajes`;
                let lastDay = '';
                thread.innerHTML = data.messages.map(m => {
                    const d = new Date(m.at);
                    const day = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
                    const sep = day !== lastDay ? `<div class="self-center text-[11px] text-gray-500 bg-white/70 px-2 py-0.5 rounded my-1.5">${day}</div>` : '';
                    lastDay = day;
                    const media = m.media.length ? `<i class="text-gray-500">[${m.media.join(', ')}]</i> ` : '';
                    const bubble = m.role === 'user' ? 'self-end bg-[#DCF3D0] rounded-tr-sm' : 'self-start bg-white rounded-tl-sm';
                    const acts = m.actions.length ? `<div class="self-start text-xs text-gray-500 px-1 pb-1">${m.actions.map(a => a.ok
                        ? `<span class="mr-2.5">✓ ${esc(a.label)}</span>`
                        : a.asked
                        ? `<span class="mr-2.5">? pidió confirmar antes de que ${esc(a.label.replace(/^(\S+)ó /, '$1e '))}</span>`
                        : `<span class="mr-2.5 text-red-700">✕ ${esc(a.label)} falló${a.error ? ': ' + esc(a.error) : ''}</span>`).join('')}</div>` : '';
                    return `${sep}<div class="max-w-[82%] ${bubble} rounded-xl px-2.5 pt-2 pb-1.5 text-[13.5px] leading-snug whitespace-pre-wrap break-words shadow-sm">${media}${fmt(m.content || '')}<span class="block text-right text-[10.5px] text-gray-500 mt-0.5">${d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span></div>${acts}`;
                }).join('') || '<p class="text-sm text-gray-500 text-center mt-8">Sin mensajes.</p>';
            } catch (err) {
                thread.innerHTML = `<p class="text-sm text-red-700 text-center mt-8">No se pudo cargar: ${esc(err.message)}</p>`;
            }
        }));
        bg.addEventListener('click', close);
        document.getElementById('chatClose').addEventListener('click', close);
        document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    })();
    </script>
<?php endif; ?>
<?php require __DIR__ . '/../includes/footer.php'; ?>
