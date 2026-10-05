<?php
// Thin client for the Node API's /api/admin/* routes. The token stays server-side;
// the browser only ever talks to this PHP app.

/**
 * GET an admin API path. Returns ['status' => int, 'data' => ?array, 'error' => ?string].
 */
function api_get(string $path): array {
    global $config;
    $url = rtrim($config['api_url'] ?? '', '/') . $path;

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . ($config['api_token'] ?? '')],
    ]);
    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    $data = is_string($raw) ? json_decode($raw, true) : null;
    if ($status !== 200) {
        error_log("[api] GET $path → $status $err");
        return ['status' => $status, 'data' => null, 'error' => $data['error'] ?? ($err ?: "HTTP $status")];
    }
    return ['status' => $status, 'data' => $data, 'error' => null];
}
