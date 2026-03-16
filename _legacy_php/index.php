<?php
require_once __DIR__ . '/config.php';

// Setup database on startup if it doesn't exist
if (!file_exists(DB_PATH)) {
    require_once __DIR__ . '/database/setup.php';
}

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if ($uri === '/' || $uri === '' || $uri === '/index.php') { require __DIR__ . '/views/home.php'; }
elseif ($uri === '/jam') { require __DIR__ . '/views/jam.php'; }
elseif ($uri === '/roster') { require __DIR__ . '/views/roster.php'; }
elseif ($uri === '/admin') { require __DIR__ . '/views/admin.php'; }
elseif ($uri === '/setlist') { require __DIR__ . '/views/setlist.php'; }
elseif ($uri === '/api/save_selection') { require __DIR__ . '/api/save_selection.php'; }
elseif ($uri === '/api/save_lineup') { require __DIR__ . '/api/save_lineup.php'; }
else {
    http_response_code(404);
    echo "404 Not Found";
}