<?php
// Load credentials from .env
$envPath = __DIR__ . '/.env';
$env = file_exists($envPath) ? parse_ini_file($envPath) : [];

// Detect if we are running locally (WAMP) or on cPanel (parolin.net)
$isLocal = (strpos($_SERVER['HTTP_HOST'], 'localhost') !== false || strpos($_SERVER['HTTP_HOST'], '127.0.0.1') !== false);

if ($isLocal) {
    // ---- LOCAL ENVIRONMENT (Wamp Server) ----
    $host = $env['LOCAL_DB_HOST'] ?? '127.0.0.1';
    $port = $env['LOCAL_DB_PORT'] ?? '3307';      
    $db   = $env['LOCAL_DB_NAME'] ?? 'made4jam';
    $user = $env['LOCAL_DB_USER'] ?? 'root';
    $pass = $env['LOCAL_DB_PASS'] ?? '';          
} else {
    // ---- REMOTE ENVIRONMENT (cPanel) ----
    $host = $env['PROD_DB_HOST'] ?? 'localhost';
    $port = $env['PROD_DB_PORT'] ?? '3306';      
    $db   = $env['PROD_DB_NAME'] ?? 'parolin_db';
    $user = $env['PROD_DB_USER'] ?? 'parolin_admin';
    $pass = $env['PROD_DB_PASS'] ?? '';
}

$charset = 'utf8mb4';

$dsn = "mysql:host=$host;port=$port;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}
