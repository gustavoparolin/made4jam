import { useMemo } from 'react';
import type { Block, Song } from '../store/useAppStore';

// All lineup role fields that count as "playing a song"
const LINEUP_ROLE_FIELDS = [
  'vocals_id',
  'rhythm_guitar_id',
  'lead_guitar_id',
  'bass_id',
  'drums_id',
  'extra_vocals_id',
  'extra_guitar_id',
  'extra_bass_id',
] as const;

interface MusicianRow { id: number; name: string; }
interface MusicianStat { id: number; name: string; count: number; }
interface BandStat { name: string; count: number; }

interface Section {
  label: string;
  /** Number of un-assigned songs cumulative through this block */
  totalSongs: number;
  musicians: MusicianStat[];
  bands: BandStat[];
}

// ---------------------------------------------------------------------------
// Pure computation — runs on every render when deps change (reactive to lineups)
// ---------------------------------------------------------------------------
function computeSections(
  blocks: Block[],
  songs: Song[],
  lineups: any[],
  musicians: MusicianRow[],
): Section[] {
  const sorted = [...blocks].sort((a, b) => a.sort_order - b.sort_order);
  // Only real blocks (id > 0). Unassigned songs are excluded from the dashboard.
  const realBlocks = sorted.filter(b => b.id !== 0);
  if (realBlocks.length === 0) return [];

  const lineupMap = new Map<number, any>(lineups.map(l => [l.song_id, l]));

  // Running accumulators — mutated across iterations for O(n) cumulative pass
  const cumMusicianCounts = new Map<number, number>();
  const cumBandCounts = new Map<string, number>();
  let cumTotal = 0;

  return realBlocks.map((block, i) => {
    // Add this block's songs to the accumulators
    const blockSongs = songs
      .filter(s => s.block_id === block.id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    for (const song of blockSongs) {
      cumTotal++;
      cumBandCounts.set(song.artist, (cumBandCounts.get(song.artist) || 0) + 1);

      const lp = lineupMap.get(song.id);
      if (lp) {
        // Deduplicate: count each musician once per song, even if they fill multiple roles
        const seenInSong = new Set<number>();
        for (const field of LINEUP_ROLE_FIELDS) {
          const mid = lp[field];
          if (mid != null) {
            seenInSong.add(Number(mid));
          }
        }
        for (const numId of seenInSong) {
          cumMusicianCounts.set(numId, (cumMusicianCounts.get(numId) || 0) + 1);
        }
      }
    }

    // Label: solo block name for the first section, "Block1 → BlockN" for the rest
    const label = i === 0 ? block.name : `${realBlocks[0].name} → ${block.name}`;

    // Snapshot current state of accumulators (new arrays each iteration)
    const musicianStats: MusicianStat[] = musicians
      .map(m => ({ id: m.id, name: m.name, count: cumMusicianCounts.get(m.id) || 0 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const bandStats: BandStat[] = [...cumBandCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    return { label, totalSongs: cumTotal, musicians: musicianStats, bands: bandStats };
  });
}

// ---------------------------------------------------------------------------
// Sub-component: a table of names + counts + inline bar
// ---------------------------------------------------------------------------
function StatTable({
  title,
  items,
  totalSongs,
}: {
  title: string;
  items: Array<{ name: string; count: number }>;
  totalSongs: number;
}) {
  const maxCount = Math.max(...items.map(i => i.count), 1);

  return (
    <div>
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{title}</h3>
      <div className="space-y-1">
        {items.map((item, idx) => {
          const pct = Math.round((item.count / maxCount) * 100);
          const overplaying = totalSongs >= 3 && item.count > totalSongs * 0.7;
          const notPlaying = item.count === 0;

          const rowCls = notPlaying
            ? 'bg-amber-900/20 border border-amber-700/30 rounded px-2 py-1'
            : overplaying
            ? 'bg-red-900/20 border border-red-700/30 rounded px-2 py-1'
            : 'px-2 py-1';

          const countCls = notPlaying
            ? 'text-amber-400'
            : overplaying
            ? 'text-red-400'
            : 'text-purple-300';

          const barCls = overplaying
            ? 'bg-red-500'
            : notPlaying
            ? 'bg-amber-700/50'
            : 'bg-purple-500';

          return (
            <div key={idx} className={`flex items-center gap-3 ${rowCls}`}>
              <span className="w-32 text-sm text-gray-300 truncate shrink-0">{item.name}</span>
              <span className={`w-8 text-right text-sm font-bold shrink-0 tabular-nums ${countCls}`}>
                {item.count}
              </span>
              <div className="flex-1 h-2.5 bg-slate-700 rounded overflow-hidden">
                <div
                  className={`h-full rounded transition-all duration-300 ${barCls}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
interface Props {
  blocks: Block[];
  songs: Song[];
  lineups: any[];
  musicians: MusicianRow[];
}

export default function AdminDashboard({ blocks, songs, lineups, musicians }: Props) {
  const sections = useMemo(
    () => computeSections(blocks, songs, lineups, musicians),
    [blocks, songs, lineups, musicians],
  );

  if (sections.length === 0) {
    return (
      <div className="text-gray-400 p-8 text-center">
        No blocks found. Create blocks in the <strong className="text-gray-300">Songs &amp; Lineups</strong> tab first.
      </div>
    );
  }

  return (
    <div className="space-y-3 py-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-purple-400">Cumulative Block Dashboard</h2>
        <p className="text-gray-400 text-sm mt-1">
          Each section shows cumulative totals from Block 1 up to that point.
          <span className="ml-3 inline-flex gap-4">
            <span className="text-amber-400">■ Not playing</span>
            <span className="text-red-400">■ Overplaying (&gt;70% of songs)</span>
          </span>
        </p>
      </div>

      {sections.map((section, i) => (
        <details
          key={i}
          open={i === sections.length - 1}
          className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden group"
        >
          <summary className="cursor-pointer px-6 py-4 flex items-center gap-3 hover:bg-slate-800/60 transition select-none list-none">
            <span className="text-purple-400 text-sm transition-transform group-open:rotate-90 inline-block">▶</span>
            <span className="font-bold text-white">{section.label}</span>
            <span className="text-gray-400 text-sm">
              ({section.totalSongs} song{section.totalSongs !== 1 ? 's' : ''} cumulative)
            </span>
          </summary>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-6 pb-6 pt-4 border-t border-slate-700">
            <StatTable
              title="Musicians — songs played"
              items={section.musicians}
              totalSongs={section.totalSongs}
            />
            <StatTable
              title="Bands"
              items={section.bands}
              totalSongs={section.totalSongs}
            />
          </div>
        </details>
      ))}
    </div>
  );
}
