<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

require_once 'config.php';

// Support both Apache (.htaccess) and PHP Built-in Server routing
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (isset($_GET['request'])) {
    $request = rtrim($_GET['request'], '/');
} elseif (preg_match('/\/api\/(.*)$/', $uri, $matches)) {
    $request = rtrim($matches[1], '/');
} else {
    $request = trim(str_replace('index.php', '', $uri), '/');
}

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

function response($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

// --- Self-healing: ensure m4j_blocks table and songs columns exist ---
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS m4j_blocks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
    // Add block_id and sort_order to m4j_songs if missing
    $cols = $pdo->query("SHOW COLUMNS FROM m4j_songs")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('block_id', $cols)) {
        $pdo->exec("ALTER TABLE m4j_songs ADD COLUMN block_id INT DEFAULT NULL");
    }
    if (!in_array('sort_order', $cols)) {
        $pdo->exec("ALTER TABLE m4j_songs ADD COLUMN sort_order INT DEFAULT 0");
    }
} catch (Exception $e) {
    // Silently continue — table may already exist
}

// --- Self-healing: ensure m4j_cover_bands table exists ---
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS m4j_cover_bands (
        id INT AUTO_INCREMENT PRIMARY KEY,
        band_name VARCHAR(255) NOT NULL,
        musician_id INT NOT NULL,
        role VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
} catch (Exception $e) {
    // Silently continue
}

try {
    // GET /test
    if ($method === 'GET' && $request === 'test') {
        response(['message' => 'PHP/MySQL Backend is running!']);
    }
    
    // GET /export
    elseif ($method === 'GET' && $request === 'export') {
        $tables = ['m4j_events', 'm4j_musicians', 'm4j_songs', 'm4j_selections', 'm4j_lineups', 'm4j_blocks'];
        $sql = "-- Made4Jam Database Backup\n-- Date: " . date('Y-m-d H:i:s') . "\n\n";
        
        $sql .= "SET FOREIGN_KEY_CHECKS=0;\n\n";

        foreach ($tables as $table) {
            $stmt = $pdo->query("SELECT * FROM `$table`");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            if (count($rows) > 0) {
                $sql .= "-- \n-- Data for table `$table`\n-- \n";
                $sql .= "TRUNCATE TABLE `$table`;\n";
                foreach ($rows as $row) {
                    $keys = array_keys($row);
                    $escapedValues = array_map(function($val) use ($pdo) {
                        return $val === null ? 'NULL' : $pdo->quote($val);
                    }, array_values($row));
                    $sql .= "INSERT INTO `$table` (`" . implode("`, `", $keys) . "`) VALUES (" . implode(", ", $escapedValues) . ");\n";
                }
                $sql .= "\n";
            }
        }
        
        $sql .= "SET FOREIGN_KEY_CHECKS=1;\n";

        header('Content-Type: text/plain');
        header('Content-Disposition: attachment; filename="made4jam_backup_' . date('Y-m-d_H-i') . '.sql"');
        echo $sql;
        exit;
    }

      // GET /events
      elseif ($method === 'GET' && $request === 'events') {
          // Self-heal: ensure all events have a slug
          $checkStmt = $pdo->query("SELECT id FROM m4j_events WHERE slug IS NULL OR slug = ''");
          $missingSlugs = $checkStmt->fetchAll();
          if (count($missingSlugs) > 0) {
              $updateStmt = $pdo->prepare("UPDATE m4j_events SET slug = ? WHERE id = ?");
              foreach ($missingSlugs as $ev) {
                  $newSlug = substr(md5(uniqid("evt_" . $ev['id'], true)), 0, 8);
                  $updateStmt->execute([$newSlug, $ev['id']]);
              }
          }
          $stmt = $pdo->query("SELECT * FROM m4j_events ORDER BY created_at DESC");
          response($stmt->fetchAll());
      }

    // DELETE /events/:eventId
    elseif ($method === 'DELETE' && preg_match('/^events\/(\d+)$/', $request, $matches)) {
        $stmt = $pdo->prepare('DELETE FROM m4j_events WHERE id = ?');
        $stmt->execute([$matches[1]]);
        response(['success' => true]);
    }

    // POST /events
    elseif ($method === 'POST' && $request === 'events') {
        $name = $input['name'] ?? null;
        $date = $input['date'] ?? null;
        if (!$name) response(['error' => 'Event name is required'], 400);
        $slug = substr(md5(uniqid()), 0, 8);
        $stmt = $pdo->prepare("INSERT INTO m4j_events (name, date, slug) VALUES (?, ?, ?)");
        $stmt->execute([$name, $date, $slug]);
        response(['id' => $pdo->lastInsertId(), 'slug' => $slug]);
    }

    // GET /events/:eventId/songs
    elseif ($method === 'GET' && preg_match('/^events\/(\d+)\/songs$/', $request, $matches)) {
        $stmt = $pdo->prepare("SELECT * FROM m4j_songs WHERE event_id = ?");
        $stmt->execute([$matches[1]]);
        response($stmt->fetchAll());
    }

    // POST /events/:eventId/songs
    elseif ($method === 'POST' && preg_match('/^events\/(\d+)\/songs$/', $request, $matches)) {
        $eventId = $matches[1];
        $title = $input['title'] ?? null;
        $artist = $input['artist'] ?? null;
        $genre = $input['genre'] ?? null;
        if (!$title || !$artist) response(['error' => 'Title and artist are required'], 400);
        
        // prevent duplicate in same event
        $check = $pdo->prepare("SELECT id FROM m4j_songs WHERE event_id = ? AND title = ? AND artist = ?");
        $check->execute([$eventId, $title, $artist]);
        if ($check->fetch()) response(['error' => 'Song already exists in this event'], 409);
        
        $stmt = $pdo->prepare("INSERT INTO m4j_songs (event_id, title, artist, genre) VALUES (?, ?, ?, ?)");
        $stmt->execute([$eventId, $title, $artist, $genre]);
        response(['id' => $pdo->lastInsertId(), 'success' => true]);
    }

    // GET /musicians
    elseif ($method === 'GET' && $request === 'musicians') {
        $stmt = $pdo->query("SELECT id, name FROM m4j_musicians ORDER BY name ASC");
        response($stmt->fetchAll());
    }

    // PUT /musicians/:id
    elseif ($method === 'PUT' && preg_match('/^musicians\/(\d+)$/', $request, $matches)) {
        $musicianId = $matches[1];
        $name = $input['name'] ?? null;
        if (!$name) response(['error' => 'Name is required'], 400);
        $stmt = $pdo->prepare("UPDATE m4j_musicians SET name = ? WHERE id = ?");
        $stmt->execute([$name, $musicianId]);
        response(['success' => true]);
    }

    // DELETE /musicians/:id
    elseif ($method === 'DELETE' && preg_match('/^musicians\/(\d+)$/', $request, $matches)) {
        $musicianId = $matches[1];
        $stmt = $pdo->prepare("DELETE FROM m4j_musicians WHERE id = ?");
        $stmt->execute([$musicianId]);
        
        $pdo->prepare("DELETE FROM m4j_selections WHERE musician_id = ?")->execute([$musicianId]);
        
        $roles = ['vocals_id', 'rhythm_guitar_id', 'lead_guitar_id', 'bass_id', 'drums_id'];
        foreach ($roles as $role) {
            $pdo->prepare("UPDATE m4j_lineups SET $role = NULL WHERE $role = ?")->execute([$musicianId]);
        }
        
        response(['success' => true]);
    }

    // PUT /events/:id
    elseif ($method === 'PUT' && preg_match('/^events\/(\d+)$/', $request, $matches)) {
        $eventId = $matches[1];
        $name = $input['name'] ?? null;
        $date = $input['date'] ?? null;
        if (!$name) response(['error' => 'Name is required'], 400);
        
        $stmt = $pdo->prepare("UPDATE m4j_events SET name = ?, date = ? WHERE id = ?");
        $stmt->execute([$name, $date, $eventId]);
        response(['success' => true]);
    }

    // POST /musicians/login
    elseif ($method === 'POST' && $request === 'musicians/login') {
        $token = $input['token'] ?? null;
        $name = $input['name'] ?? null;
        if (!$token) response(['error' => 'Token is required'], 400);

        $stmt = $pdo->prepare("SELECT * FROM m4j_musicians WHERE token = ?");
        $stmt->execute([$token]);
        $user = $stmt->fetch();

        if ($user) {
            response($user);
        } elseif ($name) {
            // Let's see if a user with this name already exists
            $stmt = $pdo->prepare("SELECT * FROM m4j_musicians WHERE name = ?");
            $stmt->execute([$name]);
            $existingUser = $stmt->fetch();

            if ($existingUser) {
                // Return the existing user, and optionally update their token so they can log in via this new browser
                $stmt = $pdo->prepare("UPDATE m4j_musicians SET token = ? WHERE id = ?");
                $stmt->execute([$token, $existingUser['id']]);
                $existingUser['token'] = $token;
                response($existingUser);
            } else {
                $stmt = $pdo->prepare("INSERT INTO m4j_musicians (name, token) VALUES (?, ?)");
                $stmt->execute([$name, $token]);
                $newId = $pdo->lastInsertId();
                $stmt = $pdo->prepare("SELECT * FROM m4j_musicians WHERE id = ?");
                $stmt->execute([$newId]);
                response($stmt->fetch());
            }
        } else {
            response(['error' => 'Musician not found and no name provided to register.'], 404);
        }
    }

    // GET /events/:eventId/selections
    elseif ($method === 'GET' && preg_match('/^events\/(\d+)\/selections$/', $request, $matches)) {
        $stmt = $pdo->prepare("
            SELECT s.song_id, s.musician_id, m.name as musician_name, s.role
            FROM m4j_selections s
            JOIN m4j_musicians m ON s.musician_id = m.id
            JOIN m4j_songs sg ON s.song_id = sg.id
            WHERE sg.event_id = ?
        ");
        $stmt->execute([$matches[1]]);
        response($stmt->fetchAll());
    }

    // POST /selections/toggle
    elseif ($method === 'POST' && $request === 'selections/toggle') {
        $songId = $input['songId'] ?? null;
        $musicianId = $input['musicianId'] ?? null;
        $role = $input['role'] ?? null;
        $checked = $input['checked'] ?? false;

        if (!$songId || !$musicianId || !$role) response(['error' => 'Missing fields'], 400);

        if ($checked) {
            $stmt = $pdo->prepare("INSERT IGNORE INTO m4j_selections (song_id, musician_id, role) VALUES (?, ?, ?)");
            $stmt->execute([$songId, $musicianId, $role]);
        } else {
            $stmt = $pdo->prepare("DELETE FROM m4j_selections WHERE song_id = ? AND musician_id = ? AND role = ?");
            $stmt->execute([$songId, $musicianId, $role]);
        }
        response(['success' => true]);
    }

    // GET /events/:eventId/lineups
    elseif ($method === 'GET' && preg_match('/^events\/(\d+)\/lineups$/', $request, $matches)) {
        $stmt = $pdo->prepare("
            SELECT l.*,
              v.name as vocals_name,
              rg.name as rhythm_guitar_name,
              lg.name as lead_guitar_name,
              b.name as bass_name,
              d.name as drums_name,
              ev.name as extra_vocals_name,
              eg.name as extra_guitar_name,
              eb.name as extra_bass_name
            FROM m4j_lineups l
            JOIN m4j_songs s ON l.song_id = s.id
            LEFT JOIN m4j_musicians v ON l.vocals_id = v.id
            LEFT JOIN m4j_musicians rg ON l.rhythm_guitar_id = rg.id
            LEFT JOIN m4j_musicians lg ON l.lead_guitar_id = lg.id
            LEFT JOIN m4j_musicians b ON l.bass_id = b.id
            LEFT JOIN m4j_musicians d ON l.drums_id = d.id
            LEFT JOIN m4j_musicians ev ON l.extra_vocals_id = ev.id
            LEFT JOIN m4j_musicians eg ON l.extra_guitar_id = eg.id
            LEFT JOIN m4j_musicians eb ON l.extra_bass_id = eb.id
            WHERE s.event_id = ?
        ");
        $stmt->execute([$matches[1]]);
        response($stmt->fetchAll());
    }

    // POST /lineups/save
    elseif ($method === 'POST' && $request === 'lineups/save') {
        $songId = $input['songId'] ?? null;
        if (!$songId) response(['error' => 'Song ID is required'], 400);

        $stmt = $pdo->prepare("
            INSERT INTO m4j_lineups (song_id, vocals_id, rhythm_guitar_id, lead_guitar_id, bass_id, drums_id, extra_vocals_id, extra_guitar_id, extra_bass_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                vocals_id = VALUES(vocals_id),
                rhythm_guitar_id = VALUES(rhythm_guitar_id),
                lead_guitar_id = VALUES(lead_guitar_id),
                bass_id = VALUES(bass_id),
                drums_id = VALUES(drums_id),
                extra_vocals_id = VALUES(extra_vocals_id),
                extra_guitar_id = VALUES(extra_guitar_id),
                extra_bass_id = VALUES(extra_bass_id)
        ");
        $stmt->execute([
            $songId,
            $input['vocalsId'] ?? null,
            $input['rhythmGuitarId'] ?? null,
            $input['leadGuitarId'] ?? null,
            $input['bassId'] ?? null,
            $input['drumsId'] ?? null,
            $input['extraVocalsId'] ?? null,
            $input['extraGuitarId'] ?? null,
            $input['extraBassId'] ?? null
        ]);
        response(['success' => true]);
    }

    // DELETE /songs/:songId
    elseif ($method === 'DELETE' && preg_match('/^songs\/(\d+)$/', $request, $matches)) {
        $stmt = $pdo->prepare("DELETE FROM m4j_songs WHERE id = ?");
        $stmt->execute([$matches[1]]);
        response(['success' => true]);
    }

    // PUT /songs/:songId
    elseif ($method === 'PUT' && preg_match('/^songs\/(\d+)$/', $request, $matches)) {
        $songId = $matches[1];
        $title = $input['title'] ?? null;
        $artist = $input['artist'] ?? null;
        $genre = $input['genre'] ?? null;
        $lyrics = $input['lyrics'] ?? null;

        if (!$title || !$artist) response(['error' => 'Title and artist are required'], 400);

        $stmt = $pdo->prepare("UPDATE m4j_songs SET title = ?, artist = ?, genre = ?, lyrics = ? WHERE id = ?");
        $stmt->execute([$title, $artist, $genre, $lyrics, $songId]);

        $stmt = $pdo->prepare("SELECT * FROM m4j_songs WHERE id = ?");
        $stmt->execute([$songId]);
        response($stmt->fetch());
    }

    // --- Block endpoints ---

    // GET /blocks?event_id=X
    elseif ($method === 'GET' && $request === 'blocks') {
        $eventId = $_GET['event_id'] ?? null;
        if (!$eventId) response(['error' => 'event_id is required'], 400);
        $stmt = $pdo->prepare("SELECT * FROM m4j_blocks WHERE event_id = ? ORDER BY sort_order ASC");
        $stmt->execute([$eventId]);
        response($stmt->fetchAll());
    }

    // POST /blocks
    elseif ($method === 'POST' && $request === 'blocks') {
        $eventId = $input['event_id'] ?? null;
        $name = $input['name'] ?? null;
        $sortOrder = $input['sort_order'] ?? 0;
        if (!$eventId || !$name) response(['error' => 'event_id and name are required'], 400);
        $stmt = $pdo->prepare("INSERT INTO m4j_blocks (event_id, name, sort_order) VALUES (?, ?, ?)");
        $stmt->execute([$eventId, $name, $sortOrder]);
        response(['id' => $pdo->lastInsertId(), 'success' => true]);
    }

    // PUT /blocks/:id
    elseif ($method === 'PUT' && preg_match('/^blocks\/(\d+)$/', $request, $matches)) {
        $blockId = $matches[1];
        $name = $input['name'] ?? null;
        $sortOrder = $input['sort_order'] ?? null;
        if (!$name) response(['error' => 'name is required'], 400);
        $stmt = $pdo->prepare("UPDATE m4j_blocks SET name = ?, sort_order = ? WHERE id = ?");
        $stmt->execute([$name, $sortOrder, $blockId]);
        response(['success' => true]);
    }

    // DELETE /blocks/:id
    elseif ($method === 'DELETE' && preg_match('/^blocks\/(\d+)$/', $request, $matches)) {
        $blockId = $matches[1];
        // Unassign songs from this block
        $pdo->prepare("UPDATE m4j_songs SET block_id = NULL WHERE block_id = ?")->execute([$blockId]);
        $stmt = $pdo->prepare("DELETE FROM m4j_blocks WHERE id = ?");
        $stmt->execute([$blockId]);
        response(['success' => true]);
    }

    // POST /blocks/reorder
    elseif ($method === 'POST' && $request === 'blocks/reorder') {
        $stmt = $pdo->prepare("UPDATE m4j_blocks SET sort_order = ? WHERE id = ?");
        foreach ($input as $item) {
            $stmt->execute([$item['sort_order'], $item['id']]);
        }
        response(['success' => true]);
    }

    // POST /songs/reorder
    elseif ($method === 'POST' && $request === 'songs/reorder') {
        $stmt = $pdo->prepare("UPDATE m4j_songs SET sort_order = ?, block_id = ? WHERE id = ?");
        foreach ($input as $item) {
            $stmt->execute([$item['sort_order'], $item['block_id'], $item['id']]);
        }
        response(['success' => true]);
    }

    // GET /cover-bands
    elseif ($method === 'GET' && $request === 'cover-bands') {
        $stmt = $pdo->query("SELECT cb.*, m.name AS musician_name FROM m4j_cover_bands cb LEFT JOIN m4j_musicians m ON cb.musician_id = m.id ORDER BY cb.band_name, cb.role");
        response($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    // POST /cover-bands
    elseif ($method === 'POST' && $request === 'cover-bands') {
        $band_name = $input['band_name'] ?? null;
        $musician_id = $input['musician_id'] ?? null;
        $role = $input['role'] ?? null;
        if (!$band_name || !$musician_id || !$role) {
            response(['error' => 'band_name, musician_id, and role are required'], 400);
        } else {
            $stmt = $pdo->prepare("INSERT INTO m4j_cover_bands (band_name, musician_id, role) VALUES (?, ?, ?)");
            $stmt->execute([$band_name, $musician_id, $role]);
            response(['id' => $pdo->lastInsertId()], 201);
        }
    }

    // DELETE /cover-bands/:id
    elseif ($method === 'DELETE' && preg_match('/^cover-bands\/(\d+)$/', $request, $matches)) {
        $id = intval($matches[1]);
        $stmt = $pdo->prepare("DELETE FROM m4j_cover_bands WHERE id = ?");
        $stmt->execute([$id]);
        response(['success' => true]);
    }

    // Default 404
    else {
        response(['error' => 'API Endpoint Not Found'], 404);
    }

} catch (Exception $e) {
    response(['error' => 'Server Error: ' . $e->getMessage()], 500);
}
