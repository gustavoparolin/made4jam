/**
 * AI / Algorithmic Setlist Assistant
 *
 * Block naming: each cover band's designated drummer "owns" a block group.
 * All songs played by that drummer go into that cover band's named block(s).
 * Within each block, songs where ALL cover band members are present come
 * first; remaining songs (same drummer, different members) follow, ordered
 * by greedy nearest-neighbour to minimise instrument swaps.
 *
 * Blocks are round-robin interleaved across drummer groups so no two
 * consecutive blocks share the same drummer.
 */

export interface LineupRow {
  song_id: number;
  vocals_id: number | null;
  rhythm_guitar_id: number | null;
  lead_guitar_id: number | null;
  bass_id: number | null;
  drums_id: number | null;
}

export interface CoverBandMember {
  band_name: string;
  musician_id: number;
  role: 'vocals' | 'rhythm_guitar' | 'lead_guitar' | 'bass' | 'drums';
}

export interface MusicianRow {
  id: number;
  name: string;
}

export interface ProposedBlock {
  name: string;
  songIds: number[];
}

export interface SetlistPlan {
  blocks: ProposedBlock[];
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Returns a suggested max-songs-per-block given the total number of songs
 * and how many drummers are available. Aims for ~3 rotations per drummer.
 * Result is clamped to [3, 6].
 */
export function suggestBlockSize(totalSongs: number, drummerCount: number): number {
  if (drummerCount <= 0) return 6;
  const raw = Math.round(totalSongs / (drummerCount * 3));
  return Math.min(6, Math.max(3, raw));
}

// ---------------------------------------------------------------------------
// Main algorithm
// ---------------------------------------------------------------------------

export function generateSetlist(opts: {
  songIds: number[];
  lineups: LineupRow[];
  coverBands: CoverBandMember[];
  musicians: MusicianRow[];
  maxBlockSize: number;
}): SetlistPlan {
  const { songIds, lineups, coverBands, musicians, maxBlockSize } = opts;

  const lineupMap = new Map<number, LineupRow>(lineups.map(l => [l.song_id, l]));

  const bandRosters = buildBandRosters(coverBands);
  // Map drummer musician_id → cover band name they represent
  const drummerToCoverBand = buildDrummerToCoverBand(coverBands);

  // ── Step 1: Group songs by drummer ──────────────────────────────────────
  const drummerGroups = new Map<number | null, number[]>();

  for (const songId of songIds) {
    const lineup = lineupMap.get(songId);
    const drummer = lineup?.drums_id ?? null;
    if (!drummerGroups.has(drummer)) drummerGroups.set(drummer, []);
    drummerGroups.get(drummer)!.push(songId);
  }

  const unassignedIds = drummerGroups.get(null) ?? [];
  drummerGroups.delete(null);

  // ── Steps 2-5: Sort and split each drummer group into named blocks ───────
  const drummerBlockLists: NamedBlock[][] = [];

  for (const [drummerId, groupSongIds] of drummerGroups) {
    // Block label = cover band name if this drummer represents one, else drummer name
    const coverBandName = drummerToCoverBand.get(drummerId!) ?? null;
    const drummerName = musicians.find(m => m.id === drummerId)?.name ?? `Drummer ${drummerId}`;
    const blockLabel = coverBandName ?? drummerName;

    // Split into full-CB songs (all members match) vs mixed songs
    let fullCBSongIds: number[] = [];
    let mixedSongIds: number[] = [];

    if (coverBandName) {
      const roster = bandRosters.get(coverBandName)!;
      for (const songId of groupSongIds) {
        if (isFullCoverBandSong(lineupMap.get(songId) ?? null, roster)) {
          fullCBSongIds.push(songId);
        } else {
          mixedSongIds.push(songId);
        }
      }
    } else {
      mixedSongIds = [...groupSongIds];
    }

    // Greedy nearest-neighbour for mixed songs, starting from last full-CB song
    const orderedMixed = greedyOrder(
      mixedSongIds,
      lineupMap,
      fullCBSongIds.length > 0 ? fullCBSongIds[fullCBSongIds.length - 1] : null,
    );

    const allOrdered = [...fullCBSongIds, ...orderedMixed];

    // Split into blocks of maxBlockSize, all carrying the same label
    const chunks = chunkArray(allOrdered, maxBlockSize);
    const namedBlocks: NamedBlock[] = chunks.map(chunk => ({ name: blockLabel, songIds: chunk.songIds }));

    drummerBlockLists.push(namedBlocks);
  }

  // ── Step 6: Interleave blocks across drummers ────────────────────────────
  const interleaved = interleaveBlocks(drummerBlockLists);

  // Assign Set numbers
  const finalBlocks: ProposedBlock[] = interleaved.map((b, i) => ({
    name: `Set ${i + 1} - ${b.name}`,
    songIds: b.songIds,
  }));

  // Unassigned goes at the end
  if (unassignedIds.length > 0) {
    finalBlocks.push({ name: 'Unassigned Songs', songIds: unassignedIds });
  }

  return { blocks: finalBlocks };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type BandRosters = Map<string, Map<string, Set<number>>>;

function buildBandRosters(coverBands: CoverBandMember[]): BandRosters {
  const rosters: BandRosters = new Map();
  for (const m of coverBands) {
    if (!rosters.has(m.band_name)) rosters.set(m.band_name, new Map());
    const byRole = rosters.get(m.band_name)!;
    if (!byRole.has(m.role)) byRole.set(m.role, new Set());
    byRole.get(m.role)!.add(m.musician_id);
  }
  return rosters;
}

/** Returns a map of drummer musician_id → the cover band they represent. */
function buildDrummerToCoverBand(coverBands: CoverBandMember[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const m of coverBands) {
    if (m.role === 'drums') map.set(m.musician_id, m.band_name);
  }
  return map;
}

const NON_DRUM_ROLES: Array<[string, keyof LineupRow]> = [
  ['vocals', 'vocals_id'],
  ['rhythm_guitar', 'rhythm_guitar_id'],
  ['lead_guitar', 'lead_guitar_id'],
  ['bass', 'bass_id'],
];

/**
 * Returns true if every non-drummer slot that the cover band has defined
 * is filled with the corresponding cover band member in this song's lineup.
 */
function isFullCoverBandSong(
  lineup: LineupRow | null,
  roster: Map<string, Set<number>>,
): boolean {
  if (!lineup) return false;
  for (const [role, field] of NON_DRUM_ROLES) {
    const rosterMembers = roster.get(role);
    if (!rosterMembers || rosterMembers.size === 0) continue;
    const musicianId = lineup[field] as number | null;
    if (!musicianId || !rosterMembers.has(musicianId)) return false;
  }
  return true;
}

/** Count lineup members that differ between two songs (excluding drummer). */
function swapCost(
  aId: number | null,
  bId: number,
  lineupMap: Map<number, LineupRow>,
): number {
  if (aId === null) return 4; // can't compare, treat as max cost
  const a = lineupMap.get(aId);
  const b = lineupMap.get(bId);
  if (!a || !b) return 4;

  const NON_DRUM_ROLES: Array<keyof LineupRow> = [
    'vocals_id', 'rhythm_guitar_id', 'lead_guitar_id', 'bass_id',
  ];
  let cost = 0;
  for (const field of NON_DRUM_ROLES) {
    if (a[field] !== b[field]) cost++;
  }
  return cost;
}

/** Greedy nearest-neighbour ordering to minimise total swap cost. */
function greedyOrder(
  ids: number[],
  lineupMap: Map<number, LineupRow>,
  startId: number | null,
): number[] {
  if (ids.length === 0) return [];

  const remaining = new Set(ids);
  const result: number[] = [];
  let current: number | null = startId;

  while (remaining.size > 0) {
    let bestId: number | null = null;
    let bestCost = Infinity;

    for (const id of remaining) {
      const cost = swapCost(current, id, lineupMap);
      if (cost < bestCost) {
        bestCost = cost;
        bestId = id;
      }
    }

    result.push(bestId!);
    remaining.delete(bestId!);
    current = bestId;
  }

  return result;
}

interface NamedBlock { name: string; songIds: number[] }

function chunkArray(ids: number[], size: number): Array<{ songIds: number[] }> {
  const chunks: Array<{ songIds: number[] }> = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push({ songIds: ids.slice(i, i + size) });
  }
  return chunks;
}

/**
 * Round-robin interleaves arrays of blocks from different drummer groups
 * so consecutive blocks never share the same drummer.
 */
function interleaveBlocks(groups: NamedBlock[][]): NamedBlock[] {
  const result: NamedBlock[] = [];
  const queues = groups.map(g => [...g]);

  while (queues.some(q => q.length > 0)) {
    for (const queue of queues) {
      if (queue.length > 0) result.push(queue.shift()!);
    }
  }

  return result;
}
