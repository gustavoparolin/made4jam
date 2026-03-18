/**
 * AI / Algorithmic Setlist Assistant
 *
 * Groups songs into blocks by drummer, places cover band songs first within
 * each group, minimizes instrument swaps within each block (greedy nearest-
 * neighbour), splits oversized groups into multiple blocks, then interleaves
 * blocks across drummers so no two consecutive blocks share the same drummer.
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

  // Build cover band roster: bandName → Map<role, Set<musicianId>>
  const bandRosters = buildBandRosters(coverBands);

  // ── Step 1: Group songs by drummer ──────────────────────────────────────
  const drummerGroups = new Map<number | null, number[]>(); // drummer_id → songIds

  for (const songId of songIds) {
    const lineup = lineupMap.get(songId);
    const drummer = lineup?.drums_id ?? null;
    if (!drummerGroups.has(drummer)) drummerGroups.set(drummer, []);
    drummerGroups.get(drummer)!.push(songId);
  }

  const unassignedIds = drummerGroups.get(null) ?? [];
  drummerGroups.delete(null);

  // ── Step 2 & 3: For each drummer group, tag cover-band songs then sort ──
  const drummerBlockLists: ProposedBlock[][] = [];

  for (const [drummerId, groupSongIds] of drummerGroups) {
    const drummerName = musicians.find(m => m.id === drummerId)?.name ?? `Drummer ${drummerId}`;

    // Tag each song with its best matching cover band (if any)
    const tagged = groupSongIds.map(id => ({
      id,
      coverBand: detectCoverBand(id, lineupMap.get(id) ?? null, bandRosters),
    }));

    const coverBandSongs = tagged.filter(t => t.coverBand !== null);
    const mixedSongs = tagged.filter(t => t.coverBand === null);

    // Group cover-band songs by band name so same-band songs are together
    const cbByBand = new Map<string, number[]>();
    for (const t of coverBandSongs) {
      if (!cbByBand.has(t.coverBand!)) cbByBand.set(t.coverBand!, []);
      cbByBand.get(t.coverBand!)!.push(t.id);
    }

    // Cover band songs ordered by band (largest group first)
    const orderedCB: number[] = [];
    const sortedBands = [...cbByBand.entries()].sort((a, b) => b[1].length - a[1].length);
    for (const [, ids] of sortedBands) orderedCB.push(...ids);

    // Mixed songs: greedy nearest-neighbour starting from the last cover-band song
    const orderedMixed = greedyOrder(
      mixedSongs.map(t => t.id),
      lineupMap,
      orderedCB.length > 0 ? orderedCB[orderedCB.length - 1] : null,
    );

    const allOrdered = [...orderedCB, ...orderedMixed];

    // ── Step 4: Split into blocks of maxBlockSize ─────────────────────────
    const subBlocks = chunkIntoBlocks(allOrdered, maxBlockSize, orderedCB.length, cbByBand);
    const blockNames = nameBlocks(subBlocks, sortedBands.map(([name]) => name), drummerName);

    drummerBlockLists.push(blockNames);
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

const ROLES_TO_CHECK: Array<keyof LineupRow> = [
  'vocals_id', 'rhythm_guitar_id', 'lead_guitar_id', 'bass_id', 'drums_id',
];

function detectCoverBand(
  _songId: number,
  lineup: LineupRow | null,
  bandRosters: BandRosters,
): string | null {
  if (!lineup) return null;

  let bestBand: string | null = null;
  let bestMatches = 0;

  for (const [bandName, byRole] of bandRosters) {
    let matches = 0;
    for (const field of ROLES_TO_CHECK) {
      const musicianId = lineup[field] as number | null;
      if (!musicianId) continue;
      const roleKey = field.replace('_id', '') as string;
      if (byRole.get(roleKey)?.has(musicianId)) matches++;
    }
    if (matches >= 3 && matches > bestMatches) {
      bestMatches = matches;
      bestBand = bandName;
    }
  }

  return bestBand;
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

/**
 * Splits an ordered song list into chunks of maxBlockSize.
 * Cover-band songs appear at the start of the first sub-block; subsequent
 * sub-blocks for the same drummer begin with whatever is next.
 */
function chunkIntoBlocks(
  orderedIds: number[],
  maxBlockSize: number,
  _coverBandCount: number,
  _cbByBand: Map<string, number[]>,
): Array<{ songIds: number[] }> {
  const chunks: Array<{ songIds: number[] }> = [];
  for (let i = 0; i < orderedIds.length; i += maxBlockSize) {
    chunks.push({ songIds: orderedIds.slice(i, i + maxBlockSize) });
  }
  return chunks;
}

/**
 * Assigns names to the sub-blocks for a single drummer group.
 * First sub-block: named after the leading cover band (if any), else drummer.
 * Subsequent sub-blocks: drummer name.
 */
function nameBlocks(
  chunks: Array<{ songIds: number[] }>,
  sortedBandNames: string[],
  drummerName: string,
): NamedBlock[] {
  return chunks.map((chunk, i) => {
    const name = i === 0 && sortedBandNames.length > 0
      ? sortedBandNames[0]
      : drummerName;
    return { name, songIds: chunk.songIds };
  });
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
