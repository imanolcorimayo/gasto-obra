<?php
// Bot conversations from MySQL (agent_session / agent_message / tool_call).
// A session = one user + channel, closed after 10 min without messages.

// Tool names → what the bot did, in the user's words.
const BOT_ACTIONS = [
    'record_expense' => 'registró gasto', 'look_up_expenses' => 'buscó gastos', 'get_summary' => 'dio resumen',
    'share_expense' => 'compartió gasto', 'share_summary' => 'compartió resumen', 'get_share_link' => 'pasó link',
    'delete_expense' => 'borró gasto', 'edit_expense' => 'editó gasto', 'list_projects' => 'listó obras',
    'update_project' => 'editó obra', 'create_project' => 'creó obra', 'close_project' => 'cerró obra',
    'switch_project' => 'cambió de obra', 'get_receipt_image' => 'mostró ticket',
];

function bot_action(string $tool): string {
    return BOT_ACTIONS[$tool] ?? $tool;
}

// Latest sessions of a user with message / tool / error counts, plus totals and top actions.
function chats_for_user(string $uid, int $limit = 30): array {
    $db = get_db();
    $st = $db->prepare("
        SELECT s.id, s.channel, s.title, s.created_ts, s.updated_ts,
          (SELECT COUNT(*) FROM agent_message m WHERE m.session_id = s.id) AS msgs,
          (SELECT GROUP_CONCAT(DISTINCT t.tool_name) FROM tool_call t JOIN agent_message m ON m.id = t.message_id WHERE m.session_id = s.id) AS tools,
          (SELECT COUNT(*) FROM tool_call t JOIN agent_message m ON m.id = t.message_id WHERE m.session_id = s.id AND t.status = 'error') AS errors
        FROM agent_session s
        WHERE s.user_id = ?
        ORDER BY s.updated_ts DESC
        LIMIT $limit");
    $st->execute([$uid]);
    $sessions = $st->fetchAll();

    $st = $db->prepare("
        SELECT COUNT(DISTINCT s.id) AS sessions, SUM(m.role = 'user') AS user_msgs, MAX(m.created_ts) AS last_ts
        FROM agent_session s JOIN agent_message m ON m.session_id = s.id
        WHERE s.user_id = ?");
    $st->execute([$uid]);
    $totals = $st->fetch();

    $st = $db->prepare("
        SELECT t.tool_name, COUNT(*) AS n, SUM(t.status = 'error') AS errors
        FROM tool_call t JOIN agent_message m ON m.id = t.message_id JOIN agent_session s ON s.id = m.session_id
        WHERE s.user_id = ?
        GROUP BY t.tool_name ORDER BY n DESC");
    $st->execute([$uid]);
    $tools = $st->fetchAll();

    return [
        'sessions' => $sessions,
        'totals' => [
            'sessions' => (int) $totals['sessions'],
            'userMsgs' => (int) $totals['user_msgs'],
            'lastAt' => $totals['last_ts'] ? gmdate('c', intdiv((int) $totals['last_ts'], 1000)) : null,
            'errors' => array_sum(array_column($tools, 'errors')),
        ],
        'topActions' => array_slice(array_map(fn($t) => [bot_action($t['tool_name']), (int) $t['n']], $tools), 0, 5),
    ];
}

// Full transcript of one session (only if it belongs to $uid), each message with its tool calls and media.
function chat_session(string $uid, int $sessionId): ?array {
    $db = get_db();
    $st = $db->prepare('SELECT id, channel, title, created_ts FROM agent_session WHERE id = ? AND user_id = ?');
    $st->execute([$sessionId, $uid]);
    $session = $st->fetch();
    if (!$session) return null;

    $st = $db->prepare('SELECT id, role, content, created_ts FROM agent_message WHERE session_id = ? ORDER BY created_ts, id');
    $st->execute([$sessionId]);
    $messages = $st->fetchAll();
    if (!$messages) return ['session' => $session, 'messages' => []];

    $ids = array_column($messages, 'id');
    $in = implode(',', array_fill(0, count($ids), '?'));
    $byMsg = fn(string $sql) => array_reduce(
        (function () use ($db, $sql, $ids) { $s = $db->prepare($sql); $s->execute($ids); return $s->fetchAll(); })(),
        function ($acc, $r) { $acc[$r['message_id']][] = $r; return $acc; }, []
    );
    $tools = $byMsg("SELECT message_id, tool_name, status, error_text FROM tool_call WHERE message_id IN ($in) ORDER BY id");
    $media = $byMsg("SELECT message_id, kind FROM agent_message_media WHERE message_id IN ($in) ORDER BY id");

    return [
        'session' => $session,
        'messages' => array_map(fn($m) => [
            'role' => $m['role'],
            'content' => $m['content'],
            'at' => (int) $m['created_ts'],
            'actions' => array_map(fn($t) => ['label' => bot_action($t['tool_name']), 'ok' => $t['status'] === 'ok', 'error' => $t['error_text']], $tools[$m['id']] ?? []),
            'media' => array_column($media[$m['id']] ?? [], 'kind'),
        ], $messages),
    ];
}
