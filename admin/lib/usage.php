<?php
// Usage data: who signed up and what they actually did. Mirrors server/src/helpers/usageReport.js
// (which still backs the CLI script); here it reads Firebase directly via lib/firebase.php.

const DAY = 86400;

// WhatsApp ids are E.164 without '+'. Argentina adds a '9' after 54 for mobiles,
// so 549 + area code. Only codes we have actually seen are mapped.
function phone_origin(string $raw): string {
    static $countries = [54 => 'Argentina', 52 => 'México', 56 => 'Chile', 57 => 'Colombia', 51 => 'Perú', 598 => 'Uruguay', 595 => 'Paraguay', 591 => 'Bolivia', 55 => 'Brasil', 34 => 'España', 1 => 'USA/Canadá'];
    static $arAreas = [11 => 'Buenos Aires (AMBA)', 351 => 'Córdoba', 341 => 'Rosario', 261 => 'Mendoza', 381 => 'Tucumán', 387 => 'Salta', 388 => 'Jujuy', 299 => 'Neuquén', 223 => 'Mar del Plata', 342 => 'Santa Fe', 221 => 'La Plata', 264 => 'San Juan', 370 => 'Formosa', 376 => 'Posadas', 380 => 'La Rioja', 383 => 'Catamarca', 385 => 'Santiago del Estero', 379 => 'Corrientes', 362 => 'Resistencia', 343 => 'Paraná', 345 => 'Concordia', 353 => 'Villa María', 358 => 'Río Cuarto', 336 => 'San Nicolás', 291 => 'Bahía Blanca', 249 => 'Tandil', 280 => 'Trelew', 297 => 'Comodoro Rivadavia', 2944 => 'Bariloche', 2657 => 'Merlo (SL)', 266 => 'San Luis', 2966 => 'Río Gallegos'];

    $n = preg_replace('/\D/', '', $raw);
    foreach ([598, 595, 591, 54, 52, 56, 57, 51, 55, 34, 1] as $cc) {
        if (!str_starts_with($n, (string) $cc)) continue;
        $rest = substr($n, strlen((string) $cc));
        if ($cc === 54) {
            if (str_starts_with($rest, '9')) $rest = substr($rest, 1);
            foreach ([4, 3, 2] as $len) {
                $area = (int) substr($rest, 0, $len);
                if (isset($arAreas[$area])) return "Argentina, {$arAreas[$area]} ($area)";
            }
            return 'Argentina, área ' . substr($rest, 0, 3) . '?';
        }
        return $countries[$cc];
    }
    return 'desconocido';
}

function ts(?string $iso): int {
    return $iso ? strtotime($iso) : 0;
}

function sum_amount(array $rows): float {
    return array_sum(array_map(fn($e) => (float) ($e['amount'] ?? 0), $rows));
}

function usage_load(): array {
    $users = firebase_auth_users();
    $projects = firestore_list('projects');
    $expenses = firestore_list('expenses');

    // whatsappLinks holds BOTH linked phones (doc id = phone) and pending
    // verification codes (doc id = code, status 'pending'). Keep them apart.
    $phones = [];
    $pending = [];
    foreach (firestore_list('whatsappLinks') as $l) {
        if (empty($l['userId'])) continue;
        if (($l['status'] ?? null) === 'pending') {
            $pending[$l['userId']] = ($pending[$l['userId']] ?? 0) + 1;
        } else {
            $phones[$l['userId']][] = [
                'phone' => $l['phoneNumber'] ?? $l['id'],
                'contactName' => $l['contactName'] ?? null,
                'linkedAt' => $l['linkedAt'] ?? null,
            ];
        }
    }

    $byProvider = fn(array $rows) => array_reduce($rows, function ($acc, $r) {
        $acc[$r['providerId'] ?? ''][] = $r;
        return $acc;
    }, []);

    return [$users, $byProvider($projects), $byProvider($expenses), $expenses, $projects, $phones, $pending];
}

// Count items in the last 30 days and the 30 before, so the dashboard shows trend.
function windowed(array $times, int $now): array {
    $current = $previous = 0;
    foreach ($times as $t) {
        if (!$t) continue;
        $age = $now - $t;
        if ($age < 30 * DAY) $current++;
        elseif ($age < 60 * DAY) $previous++;
    }
    return ['current' => $current, 'previous' => $previous];
}

// One row per auth user, most recently active first, plus 30-day trend metrics.
// "Active" = recorded at least one expense in the window (login time only exists
// as a last value, so it can't be compared across periods).
function usage_summary(): array {
    [$users, $projectsBy, $expensesBy, $expenses, $projects, $phones, $pending] = usage_load();
    $now = time();

    $rows = array_map(function ($u) use ($projectsBy, $expensesBy, $phones, $pending, $now) {
        $ue = $expensesBy[$u['uid']] ?? [];
        $times = array_map(fn($e) => ts($e['createdAt'] ?? null), $ue);
        $lastExpense = $times ? max($times) : 0;
        $lastActivity = max($lastExpense, ts($u['lastLoginAt']));
        return $u + [
            'isNew' => $now - ts($u['createdAt']) < 30 * DAY,
            'lastActivityAt' => $lastActivity ? gmdate('c', $lastActivity) : null,
            'projects' => count($projectsBy[$u['uid']] ?? []),
            'expenses' => count($ue),
            'expenses30d' => count(array_filter($times, fn($t) => $now - $t < 30 * DAY)),
            'origins' => array_values(array_unique(array_map(fn($p) => phone_origin($p['phone']), $phones[$u['uid']] ?? []))),
            'pendingCodes' => $pending[$u['uid']] ?? 0,
        ];
    }, $users);

    usort($rows, fn($a, $b) => strcmp($b['lastActivityAt'] ?? '', $a['lastActivityAt'] ?? ''));

    // Distinct providers with at least one expense in [from, to) days ago.
    $activeIn = function (int $from, int $to) use ($expenses, $now) {
        $ids = [];
        foreach ($expenses as $e) {
            $age = $now - ts($e['createdAt'] ?? null);
            if ($age >= $from * DAY && $age < $to * DAY) $ids[$e['providerId'] ?? ''] = true;
        }
        return count($ids);
    };

    return [
        'metrics' => [
            'activeUsers' => ['current' => $activeIn(0, 30), 'previous' => $activeIn(30, 60)],
            'newUsers' => windowed(array_map(fn($u) => ts($u['createdAt']), $users), $now),
            'expenses' => windowed(array_map(fn($e) => ts($e['createdAt'] ?? null), $expenses), $now),
            'newProjects' => windowed(array_map(fn($p) => ts($p['createdAt'] ?? null), $projects), $now),
        ],
        'users' => $rows,
    ];
}

// Everything the user detail page shows; null if unknown uid. Reads only this user's documents.
// Amounts by type: 'expense' = gasto por cuenta del cliente, 'provider_expense' = gasto propio,
// 'payment' = pago recibido del cliente.
function usage_user(string $uid): ?array {
    $u = firebase_auth_user($uid);
    if (!$u) return null;
    $now = time();

    $projects = firestore_where('projects', 'providerId', $uid);
    $expenses = firestore_where('expenses', 'providerId', $uid);
    $links = firestore_where('whatsappLinks', 'userId', $uid);
    foreach ($expenses as &$e) $e['_ts'] = ts($e['createdAt'] ?? null);
    unset($e);
    usort($expenses, fn($a, $b) => $b['_ts'] <=> $a['_ts']);

    $ofType = fn(array $rows, string $t) => array_filter($rows, fn($e) => ($e['type'] ?? 'expense') === $t);
    $hasReceipt = fn($e) => !empty($e['imageUrl']) || !empty($e['fileUrl']);
    $notPayments = array_filter($expenses, fn($e) => ($e['type'] ?? '') !== 'payment');

    // Per obra: budget use, spent for the client, collected, balance.
    $obras = array_map(function ($p) use ($expenses, $ofType) {
        $pe = array_filter($expenses, fn($e) => ($e['projectId'] ?? null) === $p['id']);
        $spent = sum_amount($ofType($pe, 'expense'));
        $paid = sum_amount($ofType($pe, 'payment'));
        return [
            'name' => trim($p['name'] ?? ''),
            'status' => $p['status'] ?? '',
            'client' => $p['clientName'] ?? null,
            'joined' => !empty($p['clientUserId']),
            'budget' => (float) ($p['budget'] ?? 0),
            'spent' => $spent,
            'paid' => $paid,
            'own' => sum_amount($ofType($pe, 'provider_expense')),
            'n' => count($pe),
            'last' => $pe ? max(array_column($pe, '_ts')) : 0,
        ];
    }, $projects);
    usort($obras, fn($a, $b) => [$a['status'] !== 'active', -$a['last']] <=> [$b['status'] !== 'active', -$b['last']]);

    // Monthly movement counts by type, from the first month with activity to now.
    $months = [];
    $first = $expenses ? min(array_column($expenses, '_ts')) : $now;
    for ($m = strtotime(date('Y-m-01', $first)); $m <= $now; $m = strtotime('+1 month', $m)) {
        $months[date('Y-m', $m)] = ['expense' => 0, 'provider_expense' => 0, 'payment' => 0];
    }
    $hours = array_fill(0, 24, 0);
    $weekdays = array_fill(0, 7, 0);
    $tz = new DateTimeZone('America/Argentina/Buenos_Aires');
    foreach ($expenses as $e) {
        if (!$e['_ts']) continue;
        $d = (new DateTime('@' . $e['_ts']))->setTimezone($tz);
        $key = $d->format('Y-m');
        if (isset($months[$key][$e['type'] ?? ''])) $months[$key][$e['type']]++;
        $hours[(int) $d->format('G')]++;
        $weekdays[(int) $d->format('N') - 1]++;
    }

    $categories = [];
    foreach ($ofType($expenses, 'expense') as $e) {
        $c = $e['category'] ?? 'otros';
        $categories[$c] = ($categories[$c] ?? 0) + (float) ($e['amount'] ?? 0);
    }
    arsort($categories);

    $vendors = [];
    foreach ($notPayments as $e) {
        $v = trim($e['vendor'] ?? '');
        if ($v === '') continue;
        $vendors[$v]['count'] = ($vendors[$v]['count'] ?? 0) + 1;
        $vendors[$v]['amount'] = ($vendors[$v]['amount'] ?? 0) + (float) ($e['amount'] ?? 0);
    }
    uasort($vendors, fn($a, $b) => $b['amount'] <=> $a['amount']);

    $last30 = count(array_filter($expenses, fn($e) => $now - $e['_ts'] < 30 * DAY));
    $prev30 = count(array_filter($expenses, fn($e) => $now - $e['_ts'] >= 30 * DAY && $now - $e['_ts'] < 60 * DAY));
    $spent = sum_amount($ofType($expenses, 'expense'));

    $projectNames = array_column($projects, 'name', 'id');

    return $u + [
        'phones' => array_values(array_map(fn($l) => [
            'phone' => $l['phoneNumber'] ?? $l['id'],
            'origin' => phone_origin($l['phoneNumber'] ?? $l['id']),
        ], array_filter($links, fn($l) => ($l['status'] ?? '') !== 'pending'))),
        'lastActivityAt' => $expenses ? gmdate('c', $expenses[0]['_ts']) : null,
        'kpis' => [
            'last30' => $last30,
            'prev30' => $prev30,
            'spent' => $spent,
            'spentObras' => count(array_filter($obras, fn($o) => $o['spent'] > 0)),
            'toCollect' => array_sum(array_map(fn($o) => max(0, $o['spent'] - $o['paid']), array_filter($obras, fn($o) => $o['client'] && $o['status'] === 'active'))),
            'toCollectObras' => count(array_filter($obras, fn($o) => $o['client'] && $o['status'] === 'active' && $o['spent'] - $o['paid'] >= 1)),
            'receiptsPct' => $notPayments ? round(100 * count(array_filter($notPayments, $hasReceipt)) / count($notPayments)) : 0,
            'activeObras' => count(array_filter($obras, fn($o) => $o['status'] === 'active')),
        ],
        'obras' => $obras,
        'months' => $months,
        'hours' => $hours,
        'weekdays' => $weekdays,
        'formats' => [
            'photo' => count(array_filter($notPayments, fn($e) => !empty($e['imageUrl']))),
            'pdf' => count(array_filter($notPayments, fn($e) => !empty($e['fileUrl']))),
            'text' => count(array_filter($notPayments, fn($e) => !$hasReceipt($e) && empty($e['audioUrl']))),
            'audio' => count(array_filter($expenses, fn($e) => !empty($e['audioUrl']))),
            'total' => count($notPayments),
        ],
        'categories' => $categories,
        'vendors' => array_slice($vendors, 0, 6, true),
        'recent' => array_map(fn($e) => [
            'at' => $e['_ts'],
            'obra' => trim($projectNames[$e['projectId'] ?? ''] ?? ''),
            'title' => $e['title'] ?? '',
            'category' => $e['category'] ?? '',
            'type' => $e['type'] ?? 'expense',
            'source' => $e['source'] ?? '',
            'media' => !empty($e['imageUrl']) ? 'foto' : (!empty($e['fileUrl']) ? 'pdf' : (!empty($e['audioUrl']) ? 'audio' : '')),
            'amount' => (float) ($e['amount'] ?? 0),
        ], array_slice($expenses, 0, 8)),
    ];
}
