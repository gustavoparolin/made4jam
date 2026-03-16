<?php
$db = getDB();
$songs = $db->query("SELECT id, title, artist FROM songs ORDER BY title ASC")->fetchAll();

$sel_stmt = $db->query("SELECT song_id, role, COUNT(id) as c FROM selections GROUP BY song_id, role");
$counts = [];
foreach($sel_stmt->fetchAll() as $row) {
    $counts[$row['song_id']][$row['role']] = $row['c'];
}

$roles = ['vocals', 'rhythm_guitar', 'lead_guitar', 'bass', 'drums'];

ob_start();
?>
<div class="mb-8">
    <h1 class="text-3xl font-bold mb-2">Live Roster</h1>
    <p class="text-gray-400">See which songs desperately need your talent!</p>
</div>

<div class="grid lg:grid-cols-2 gap-4">
    <?php foreach($songs as $s): ?>
    <div class="bg-gray-800 p-4 rounded border border-gray-700 hover:border-gray-600 transition shadow">
        <h2 class="font-bold text-lg text-white mb-3"><?= htmlspecialchars($s['title']) ?> <span class="text-sm font-normal text-gray-400">by <?= htmlspecialchars($s['artist']) ?></span></h2>
        
        <div class="flex flex-wrap gap-2 text-xs font-semibold tracking-wide uppercase">
            <?php foreach($roles as $r): 
                $c = $counts[$s['id']][$r] ?? 0;
                // Green if slots exist, Red if empty
                $bg = $c > 0 ? 'bg-green-900 border-green-700 text-green-300' : 'bg-red-900 border-red-700 text-red-200';
            ?>
            <span class="px-2 py-1 rounded border <?= $bg ?>">
                <?= str_replace('_', ' ', $r) ?>: <?= $c ?>
            </span>
            <?php endforeach; ?>
        </div>
    </div>
    <?php endforeach; ?>
</div>

<div class="mt-8 text-center">
    <a href="/" class="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded transition shadow">Sign Up to Jam</a>
</div>
<?php
$content = ob_get_clean();
require __DIR__ . '/layout.php';