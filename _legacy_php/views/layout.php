<!DOCTYPE html>
<html lang="en" class="bg-gray-900 text-gray-100">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Made4Jam</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <style>
        [x-cloak] { display: none !important; }
    </style>
</head>
<body class="min-h-screen flex flex-col font-sans">
    <header class="bg-gray-800 border-b border-gray-700 p-4 shadow-md print:hidden">
        <div class="max-w-6xl mx-auto flex justify-between items-center">
            <a href="/" class="text-2xl font-bold text-red-500 tracking-wider">🎸 Made<span class="text-white">4</span>Jam</a>
            <nav class="space-x-4 text-sm font-semibold">
                <a href="/roster" class="hover:text-red-400 text-gray-200">Roster</a>
                <a href="/setlist" class="hover:text-red-400 text-gray-200">Setlist</a>
            </nav>
        </div>
    </header>
    <main class="flex-grow max-w-6xl mx-auto w-full p-4 md:p-6">
        <?= $content ?>
    </main>
    <footer class="bg-gray-800 border-t border-gray-700 p-4 text-center text-xs text-gray-500 mt-8 print:hidden">
        &copy; <?= date('Y') ?> Made4Jam. Developed with precision.
    </footer>
</body>
</html>