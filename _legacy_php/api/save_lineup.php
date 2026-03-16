<?php
if (empty($_SESSION['admin_auth'])) { 
    http_response_code(403); 
    exit(json_encode(['error' => 'Forbidden']));
}

$data = json_decode(file_get_contents('php://input'), true);
if (!$data || !isset($data['song_id'])) { 
    http_response_code(400); 
    exit(json_encode(['error' => 'Bad Request']));
}

$db = getDB();
$stmt = $db->prepare("INSERT INTO lineups (song_id, vocals_id, rhythm_guitar_id, lead_guitar_id, bass_id, drums_id) 
                      VALUES (:s, :v, :r, :l, :b, :d) 
                      ON CONFLICT(song_id) DO UPDATE SET 
                      vocals_id=:v, rhythm_guitar_id=:r, lead_guitar_id=:l, bass_id=:b, drums_id=:d");

$stmt->execute([
    ':s' => $data['song_id'],
    ':v' => $data['vocals_id'] ?: null,
    ':r' => $data['rhythm_guitar_id'] ?: null,
    ':l' => $data['lead_guitar_id'] ?: null,
    ':b' => $data['bass_id'] ?: null,
    ':d' => $data['drums_id'] ?: null
]);

header('Content-Type: application/json');
echo json_encode(['status' => 'ok']);