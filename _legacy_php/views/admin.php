<?php
if (($_GET['key'] ?? '') !== ADMIN_KEY && empty($_SESSION['admin_auth'])) {
    http_response_code(403);
    die("<div style='color:white; font-family:sans-serif; padding:50px;'>Unauthorized. /admin?key=SECRET required.</div>");
}
$_SESSION['admin_auth'] = true;

$db = getDB();
$songs = $db->query("SELECT * FROM songs")->fetchAll();
$roles = ['vocals', 'rhythm_guitar', 'lead_guitar', 'bass', 'drums'];

$sel_stmt = $db->query("SELECT s.song_id, s.role, m.id, m.name FROM selections s JOIN musicians m ON s.musician_id = m.id");
$all_sel = $sel_stmt->fetchAll();
$matrix = [];
foreach($all_sel as $row) {
    $matrix[$row['song_id']][$row['role']][] = ['id'=>$row['id'], 'name'=>$row['name']];
}

$lines = $db->query("SELECT * FROM lineups")->fetchAll();
$lineups = [];
foreach($lines as $l) {
    $lineups[$l['song_id']] = $l;
}

ob_start();
?>
<div class="mb-6 flex justify-between items-center">
    <div>
        <h1 class="text-3xl font-bold text-red-500">Organizer Dashboard</h1>
        <p class="text-gray-400">Assemble your jam bands from the volunteer pool below.</p>
    </div>
</div>

<div class="space-y-6">
    <?php foreach($songs as $song): 
        $s_id = $song['id'];
        $orphans = [];
        foreach($roles as $r) {
            if (empty($matrix[$s_id][$r])) { $orphans[] = $r; }
        }
    ?>
    <div x-data="{
            saving: false,
            form: <?= json_encode([
                'vocals_id' => $lineups[$s_id]['vocals_id'] ?? '',
                'rhythm_guitar_id' => $lineups[$s_id]['rhythm_guitar_id'] ?? '',
                'lead_guitar_id' => $lineups[$s_id]['lead_guitar_id'] ?? '',
                'bass_id' => $lineups[$s_id]['bass_id'] ?? '',
                'drums_id' => $lineups[$s_id]['drums_id'] ?? ''
            ]) ?>,
            saveLineup() {
                this.saving = true;
                fetch('/api/save_lineup', {
                    method: 'POST',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({song_id: <?= $s_id ?>, ...this.form})
                }).finally(() => { 
                    setTimeout(() => this.saving = false, 500); 
                });
            }
         }" 
         class="bg-gray-800 p-5 rounded-lg border <?= !empty($orphans) ? 'border-yellow-600' : 'border-gray-700' ?> shadow-md">
         
        <div class="mb-4">
            <h2 class="text-2xl font-bold text-white"><?= htmlspecialchars($song['title']) ?> <span class="text-gray-400 text-lg font-normal">by <?= htmlspecialchars($song['artist']) ?></span></h2>
            <?php if(!empty($orphans)): ?>
                <p class="text-yellow-500 text-sm font-bold mt-1 tracking-wide">⚠️ MISSING SLOTS: <?= strtoupper(implode(', ', str_replace('_',' ',$orphans))) ?></p>
            <?php endif; ?>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
            <?php foreach($roles as $r): ?>
            <div class="bg-gray-900 p-3 rounded">
                <label class="block text-[10px] uppercase text-gray-500 font-bold mb-2 tracking-wide"><?= str_replace('_', ' ', $r) ?></label>
                <select x-model="form.<?= $r ?>_id" @change="saveLineup" class="w-full bg-gray-800 border border-gray-600 rounded text-sm p-2 text-white focus:border-red-500 outline-none">
                    <option value="">-- Let's Jam --</option>
                    <?php if(!empty($matrix[$s_id][$r])): foreach($matrix[$s_id][$r] as $m): ?>
                        <option value="<?= $m['id'] ?>"><?= htmlspecialchars($m['name']) ?></option>
                    <?php endforeach; endif; ?>
                </select>
            </div>
            <?php endforeach; ?>
        </div>
         
         <div class="mt-3 flex justify-end h-4">
            <span x-show="saving" x-cloak class="text-green-400 text-xs font-bold transition-opacity">Saved ✓</span>
         </div>
    </div>
    <?php endforeach; ?>
</div>
<?php
$content = ob_get_clean();
require __DIR__ . '/layout.php';