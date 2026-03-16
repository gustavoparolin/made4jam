<?php
$db = getDB();

$q = "SELECT s.title, s.artist, 
      mv.name as vocals, mr.name as rhythm, ml.name as lead, mb.name as bass, md.name as drums
      FROM songs s
      JOIN lineups l ON s.id = l.song_id
      LEFT JOIN musicians mv ON l.vocals_id = mv.id
      LEFT JOIN musicians mr ON l.rhythm_guitar_id = mr.id
      LEFT JOIN musicians ml ON l.lead_guitar_id = ml.id
      LEFT JOIN musicians mb ON l.bass_id = mb.id
      LEFT JOIN musicians md ON l.drums_id = md.id";
$bands = $db->query($q)->fetchAll();

ob_start();
?>
<div class="mb-8 flex justify-between items-center print:hidden">
    <div>
        <h1 class="text-3xl font-bold">Final Setlist</h1>
        <p class="text-gray-400">The official lineup for the jam.</p>
    </div>
    <button onclick="window.print()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded shadow transition">
        🖨️ Print Setlist
    </button>
</div>

<div class="space-y-6">
    <?php if(empty($bands)): ?>
        <div class="bg-gray-800 p-8 rounded text-center text-gray-400">
            No bands have been formed yet. Check back later!
        </div>
    <?php endif; ?>

    <?php foreach($bands as $i => $b): ?>
    <div class="bg-gray-800 p-5 rounded-lg border-l-4 border-red-500 shadow-md print:break-inside-avoid print:bg-white print:border-l-0 print:border-y-2 print:border-black print:text-black print:shadow-none print:p-2 mb-4">
        
        <h2 class="text-2xl font-bold mb-3 print:text-xl">
            <span class="text-gray-500 print:text-gray-800 ml-1 text-base">#<?= $i+1 ?></span> 
            <?= htmlspecialchars($b['title']) ?> 
            <span class="text-lg font-normal text-gray-400 print:text-gray-600">by <?= htmlspecialchars($b['artist']) ?></span>
        </h2>
        
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div class="print:border-b print:border-gray-300 print:pb-1 pb-2 border-b border-gray-700 lg:border-none">
                <span class="block text-[10px] uppercase text-gray-500 print:text-gray-500 tracking-wide font-bold">Vocals</span>
                <strong class="text-lg print:text-black text-white"><?= htmlspecialchars($b['vocals'] ?? '---') ?></strong>
            </div>
            <div class="print:border-b print:border-gray-300 print:pb-1 pb-2 border-b border-gray-700 lg:border-none">
                <span class="block text-[10px] uppercase text-gray-500 print:text-gray-500 tracking-wide font-bold">Rhythm Guitar</span>
                <strong class="text-lg print:text-black text-white"><?= htmlspecialchars($b['rhythm'] ?? '---') ?></strong>
            </div>
            <div class="print:border-b print:border-gray-300 print:pb-1 pb-2 border-b border-gray-700 lg:border-none">
                <span class="block text-[10px] uppercase text-gray-500 print:text-gray-500 tracking-wide font-bold">Lead Guitar</span>
                <strong class="text-lg print:text-black text-white"><?= htmlspecialchars($b['lead'] ?? '---') ?></strong>
            </div>
            <div class="print:border-b print:border-gray-300 print:pb-1 pb-2 border-b border-gray-700 lg:border-none">
                <span class="block text-[10px] uppercase text-gray-500 print:text-gray-500 tracking-wide font-bold">Bass</span>
                <strong class="text-lg print:text-black text-white"><?= htmlspecialchars($b['bass'] ?? '---') ?></strong>
            </div>
            <div class="print:border-b print:border-gray-300 print:pb-1">
                <span class="block text-[10px] uppercase text-gray-500 print:text-gray-500 tracking-wide font-bold">Drums</span>
                <strong class="text-lg print:text-black text-white"><?= htmlspecialchars($b['drums'] ?? '---') ?></strong>
            </div>
        </div>
    </div>
    <?php endforeach; ?>
</div>

<style>
@media print {
    body { background: white !important; font-family: sans-serif; color: black; }
    header, footer { display: none !important; }
    main { padding: 0; max-width: 100%; margin: 0; }
}
</style>
<?php
$content = ob_get_clean();
require __DIR__ . '/layout.php';