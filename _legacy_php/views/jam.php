<?php
$db = getDB();

$token = $_COOKIE['m4j_token'] ?? $_GET['u'] ?? null;
if (!$token) { header("Location: /"); exit; }

$stmt = $db->prepare("SELECT id, name FROM musicians WHERE token = ?");
$stmt->execute([$token]);
$user = $stmt->fetch();
if (!$user) { header("Location: /"); exit; }

if (!isset($_COOKIE['m4j_token'])) {
    setcookie('m4j_token', $token, time() + 31536000, "/");
}

$stmt = $db->prepare("SELECT song_id, role FROM selections WHERE musician_id = ?");
$stmt->execute([$user['id']]);
$mySelectionsRaw = $stmt->fetchAll();

$mySelections = [];
foreach ($mySelectionsRaw as $sel) {
    $mySelections[$sel['song_id']][$sel['role']] = true;
}

$songs = $db->query("SELECT id, title, artist, reference_link FROM songs ORDER BY title ASC")->fetchAll();

$rolesCount = $db->query("SELECT song_id, role, COUNT(id) as count FROM selections GROUP BY song_id, role")->fetchAll();
$counter = [];
foreach($rolesCount as $rc) {
    $counter[$rc['song_id']][$rc['role']] = $rc['count'];
}

$roles = ['vocals', 'rhythm_guitar', 'lead_guitar', 'bass', 'drums'];
$roleLabels = ['Vocals', 'Rhythm Guitar', 'Lead Guitar', 'Bass', 'Drums'];

ob_start();
?>
<div class="mb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
    <div>
        <h1 class="text-3xl font-bold mb-1">Pick Your Songs</h1>
        <p class="text-sm text-gray-400">Welcome, <span class="font-bold text-white"><?= htmlspecialchars($user['name']) ?></span>.</p>
    </div>
    <div class="w-full md:w-auto">
        <label class="text-xs text-gray-500 block mb-1">Bookmark this link to return later:</label>
        <input type="text" readonly value="<?= 'http://' . $_SERVER['HTTP_HOST'] . '/jam?u=' . htmlspecialchars($token) ?>" class="bg-gray-800 border border-gray-700 text-xs px-3 py-2 rounded w-full md:w-72 text-gray-400" onclick="this.select()">
    </div>
</div>

<div class="grid gap-6">
    <?php foreach ($songs as $s): ?>
    <div x-data="{
            saving: false,
            selections: <?= json_encode([
                'vocals' => isset($mySelections[$s['id']]['vocals']),
                'rhythm_guitar' => isset($mySelections[$s['id']]['rhythm_guitar']),
                'lead_guitar' => isset($mySelections[$s['id']]['lead_guitar']),
                'bass' => isset($mySelections[$s['id']]['bass']),
                'drums' => isset($mySelections[$s['id']]['drums']),
            ]) ?>,
            toggleRole(role) {
                this.saving = true;
                this.selections[role] = !this.selections[role];
                
                fetch('/api/save_selection', {
                    method: 'POST',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({
                        song_id: <?= $s['id'] ?>,
                        role: role,
                        selected: this.selections[role],
                        token: '<?= $token ?>'
                    })
                }).finally(() => { this.saving = false; });
            }
         }" 
         class="bg-gray-800 rounded-lg p-5 border border-gray-700 shadow-md">
        
        <div class="mb-4 border-b border-gray-700 pb-3 flex justify-between items-start">
            <div>
                <h2 class="text-xl font-bold text-white"><?= htmlspecialchars($s['title']) ?></h2>
                <span class="text-sm text-gray-400 font-normal">by <?= htmlspecialchars($s['artist']) ?></span>
            </div>
            <?php if($s['reference_link']): ?>
                <a href="<?= htmlspecialchars($s['reference_link']) ?>" target="_blank" class="text-blue-400 text-sm hover:underline">Reference 🎵</a>
            <?php endif; ?>
        </div>
        
        <div class="flex flex-wrap gap-4 select-none">
            <?php foreach ($roles as $idx => $role): ?>
            <label class="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-700 transition w-full sm:w-auto" :class="saving ? 'opacity-50' : ''">
                <input type="checkbox" 
                       :checked="selections['<?= $role ?>']" 
                       @change="toggleRole('<?= $role ?>')"
                       class="w-5 h-5 accent-red-600 bg-gray-900 border-gray-600 rounded">
                <span class="text-gray-200"><?= $roleLabels[$idx] ?> 
                    <span class="text-xs text-gray-500 ml-1">(<?= $counter[$s['id']][$role] ?? 0 ?>)</span>
                </span>
            </label>
            <?php endforeach; ?>
        </div>
    </div>
    <?php endforeach; ?>
</div>
<?php
$content = ob_get_clean();
require __DIR__ . '/layout.php';