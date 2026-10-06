<?php

function h(?string $s): string {
    return htmlspecialchars($s ?? '', ENT_QUOTES, 'UTF-8');
}

function ars($n): string {
    return '$' . number_format(round($n ?? 0), 0, ',', '.');
}

// API timestamps are ISO UTC; show them in Argentina time.
function fecha(?string $iso, bool $withTime = true): string {
    if (!$iso) return '-';
    $d = new DateTime($iso);
    $d->setTimezone(new DateTimeZone('America/Argentina/Buenos_Aires'));
    return $d->format($withTime ? 'd/m/Y H:i' : 'd/m/Y');
}

// Relative recency: "hoy", "ayer", "hace 5 d", "hace 3 m".
function hace(?string $iso): string {
    if (!$iso) return '-';
    $days = (int) floor((time() - strtotime($iso)) / 86400);
    if ($days <= 0) return 'hoy';
    if ($days === 1) return 'ayer';
    if ($days < 60) return "hace $days d";
    return 'hace ' . floor($days / 30) . ' m';
}

// Recency dot: green < 7 days, amber < 30 days, gray otherwise.
function recency_dot(?string $iso): string {
    $days = $iso ? (time() - strtotime($iso)) / 86400 : INF;
    $color = $days < 7 ? 'bg-emerald-500' : ($days < 30 ? 'bg-amber-400' : 'bg-gray-300');
    return '<span class="inline-block w-2 h-2 rounded-full ' . $color . '"></span>';
}

// Short money for KPIs and axes: $ 67,9 M · $ 842 k · $ 950.
function ars_short($n): string {
    $n = (float) $n;
    if ($n >= 1e6) return '$ ' . number_format($n / 1e6, 1, ',', '.') . ' M';
    if ($n >= 1e3) return '$ ' . number_format(round($n / 1e3), 0, ',', '.') . ' k';
    return ars($n);
}

function pct($part, $whole): int {
    return $whole ? (int) round($part / $whole * 100) : 0;
}

// Days since a unix timestamp as "hoy", "ayer", "hace 5 d", "hace 3 m".
function hace_ts(int $ts): string {
    return $ts ? hace(gmdate('c', $ts)) : '-';
}
