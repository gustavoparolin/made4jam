<?php
$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['token'], $data['song_id'], $data['role'])) {
    http_response_code(400); 
    exit(json_encode(['error' => 'Bad Request']));
}

$db = getDB();
$stmt = $db->prepare("SELECT id FROM musicians WHERE token = ?");
$stmt->execute([$data['token']]);
$user = $stmt->fetch();

if (!$user) { 
    http_response_code(403); 
    exit(json_encode(['error' => 'Unauthorized']));
}

if ($data['selected']) {
    $stmt = $db->prepare("INSERT OR IGNORE INTO selections (song_id, musician_id, role) VALUES (?, ?, ?)");
    $stmt->execute([$data['song_id'], $user['id'], $data['role']]);
} else {
    $stmt = $db->prepare("DELETE FROM selections WHERE song_id = ? AND musician_id = ? AND role = ?");
    $stmt->execute([$data['song_id'], $user['id'], $data['role']]);
}

header('Content-Type: application/json');
echo json_encode(['status' => 'ok']);