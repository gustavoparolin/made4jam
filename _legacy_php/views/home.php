<?php
$db = getDB();

$token = $_COOKIE['m4j_token'] ?? $_GET['u'] ?? null;
if ($token) {
    $stmt = $db->prepare("SELECT id FROM musicians WHERE token = ?");
    $stmt->execute([$token]);
    if ($stmt->fetch()) {
        if (!isset($_COOKIE['m4j_token'])) {
            setcookie('m4j_token', $token, time() + 31536000, "/");
        }
        header("Location: /jam?u=" . urlencode($token));
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim($_POST['name'] ?? '');
    if ($name) {
        $token = bin2hex(random_bytes(16));
        $stmt = $db->prepare("INSERT INTO musicians (name, token) VALUES (?, ?)");
        $stmt->execute([$name, $token]);
        setcookie('m4j_token', $token, time() + 31536000, "/");
        header("Location: /jam?u=" . urlencode($token));
        exit;
    }
}

ob_start();
?>
<div class="max-w-md mx-auto bg-gray-800 p-8 rounded-lg shadow-lg mt-10 border border-gray-700">
    <h1 class="text-3xl font-bold mb-4 text-center text-white">Join the Jam</h1>
    <p class="text-gray-400 mb-6 text-center">Enter your name to start selecting the songs you want to play or sing on.</p>
    
    <form method="POST" class="space-y-5">
        <div>
            <label class="block text-sm font-medium mb-2 text-gray-300">Your Name (or Stage Name)</label>
            <input type="text" name="name" required placeholder="e.g. Ozzy" class="w-full bg-gray-900 border border-gray-600 rounded px-4 py-3 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500">
        </div>
        <button type="submit" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded transition shadow-lg">Let's Rock!</button>
    </form>
</div>
<?php
$content = ob_get_clean();
require __DIR__ . '/layout.php';