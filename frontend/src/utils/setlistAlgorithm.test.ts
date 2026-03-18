import { describe, it, expect } from 'vitest';
import {
  generateSetlist,
  suggestBlockSize,
  type LineupRow,
  type CoverBandMember,
  type MusicianRow,
} from './setlistAlgorithm';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

const musicians: MusicianRow[] = [
  { id: 1, name: 'Hugo' },      // drummer A
  { id: 2, name: 'Marco' },     // drummer B
  { id: 3, name: 'Tomas' },     // rhythm guitar
  { id: 4, name: 'Andreas' },   // lead guitar
  { id: 5, name: 'Marley' },    // bass A
  { id: 6, name: 'Rob' },       // bass B
  { id: 7, name: 'Chris' },     // vocals
];

/** Cover band Chaos BC uses Hugo drums + Tomas rhythm + Andreas lead + Marley bass + Chris vocals */
const coverBands: CoverBandMember[] = [
  { band_name: 'Chaos BC', musician_id: 1, role: 'drums' },
  { band_name: 'Chaos BC', musician_id: 3, role: 'rhythm_guitar' },
  { band_name: 'Chaos BC', musician_id: 4, role: 'lead_guitar' },
  { band_name: 'Chaos BC', musician_id: 5, role: 'bass' },
  { band_name: 'Chaos BC', musician_id: 7, role: 'vocals' },
];

function makeLineup(
  songId: number,
  drums: number | null,
  bass: number | null = null,
  rhythm: number | null = null,
  lead: number | null = null,
  vocals: number | null = null,
): LineupRow {
  return {
    song_id: songId,
    drums_id: drums,
    bass_id: bass,
    rhythm_guitar_id: rhythm,
    lead_guitar_id: lead,
    vocals_id: vocals,
  };
}

// ---------------------------------------------------------------------------
// suggestBlockSize
// ---------------------------------------------------------------------------

describe('suggestBlockSize', () => {
  it('returns 6 for large event with few drummers', () => {
    expect(suggestBlockSize(100, 4)).toBe(6);
  });

  it('returns at least 3', () => {
    expect(suggestBlockSize(10, 10)).toBeGreaterThanOrEqual(3);
  });

  it('returns at most 6', () => {
    expect(suggestBlockSize(200, 1)).toBeLessThanOrEqual(6);
  });

  it('returns 6 when drummerCount is 0', () => {
    expect(suggestBlockSize(50, 0)).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// generateSetlist — drummer grouping
// ---------------------------------------------------------------------------

describe('generateSetlist — drummer grouping', () => {
  it('groups all songs with the same drummer into the same block(s)', () => {
    // Songs 1-3: Hugo drums. Song 4: Marco drums.
    const lineups: LineupRow[] = [
      makeLineup(1, 1, 5, 3, 4, 7), // Chaos BC full
      makeLineup(2, 1, 5, 3, 4, 7),
      makeLineup(3, 1, 6, 3, 4, 7),
      makeLineup(4, 2, 5, 3, 4, 7),
    ];

    const plan = generateSetlist({
      songIds: [1, 2, 3, 4],
      lineups,
      coverBands,
      musicians,
      maxBlockSize: 6,
    });

    // Hugo songs and Marco songs should never be in the same block
    const hugoSongs = new Set([1, 2, 3]);
    const marcoSongs = new Set([4]);

    for (const block of plan.blocks) {
      const hasHugo = block.songIds.some(id => hugoSongs.has(id));
      const hasMarco = block.songIds.some(id => marcoSongs.has(id));
      expect(hasHugo && hasMarco).toBe(false);
    }
  });

  it('songs without drummer go into "Unassigned Songs" block', () => {
    const lineups: LineupRow[] = [
      makeLineup(1, 1, 5, 3, 4, 7),
      makeLineup(2, null),         // no drummer
    ];

    const plan = generateSetlist({
      songIds: [1, 2],
      lineups,
      coverBands,
      musicians,
      maxBlockSize: 6,
    });

    const unassigned = plan.blocks.find(b => b.name === 'Unassigned Songs');
    expect(unassigned).toBeDefined();
    expect(unassigned!.songIds).toContain(2);
    expect(unassigned!.songIds).not.toContain(1);
  });
});

// ---------------------------------------------------------------------------
// generateSetlist — cover band priority
// ---------------------------------------------------------------------------

describe('generateSetlist — cover band priority', () => {
  it('cover-band songs appear before mixed songs within the same block', () => {
    // Songs 1 & 2: full Chaos BC lineup (cover band match ≥3 members)
    // Song 3: Hugo drums but different bass → mixed
    const lineups: LineupRow[] = [
      makeLineup(1, 1, 5, 3, 4, 7), // Chaos BC (all 5 match)
      makeLineup(2, 1, 5, 3, 4, 7), // Chaos BC
      makeLineup(3, 1, 6, 3, 4, 7), // Hugo drums, Rob bass (4 match Chaos BC: still ≥3 → cover band)
      makeLineup(4, 1, 6, null, null, null), // Hugo drums, Rob bass, no guitars → 2 matches, mixed
    ];

    const plan = generateSetlist({
      songIds: [4, 3, 2, 1], // intentionally shuffled
      lineups,
      coverBands,
      musicians,
      maxBlockSize: 6,
    });

    // All songs go into one block (Hugo). Cover-band songs should come first.
    const hugoBlock = plan.blocks.find(b => b.name.includes('Chaos BC') || b.name.includes('Hugo'));
    expect(hugoBlock).toBeDefined();

    // Song 4 (only 2 CB matches) must come after songs 1, 2, 3 (≥3 CB matches)
    const idx4 = hugoBlock!.songIds.indexOf(4);
    const idx1 = hugoBlock!.songIds.indexOf(1);
    const idx2 = hugoBlock!.songIds.indexOf(2);
    const idx3 = hugoBlock!.songIds.indexOf(3);

    expect(idx4).toBeGreaterThan(idx1);
    expect(idx4).toBeGreaterThan(idx2);
    expect(idx4).toBeGreaterThan(idx3);
  });
});

// ---------------------------------------------------------------------------
// generateSetlist — block splitting
// ---------------------------------------------------------------------------

describe('generateSetlist — block splitting', () => {
  it('splits a drummer group into multiple blocks when songs > maxBlockSize', () => {
    const lineups: LineupRow[] = Array.from({ length: 8 }, (_, i) =>
      makeLineup(i + 1, 1, 5, 3, 4, 7),
    );

    const plan = generateSetlist({
      songIds: Array.from({ length: 8 }, (_, i) => i + 1),
      lineups,
      coverBands,
      musicians,
      maxBlockSize: 3,
    });

    // 8 songs / 3 max = 3 blocks (3+3+2) — all non-unassigned
    const dataBlocks = plan.blocks.filter(b => b.name !== 'Unassigned Songs');
    expect(dataBlocks.length).toBeGreaterThanOrEqual(3);

    // Each block ≤ maxBlockSize
    for (const b of dataBlocks) {
      expect(b.songIds.length).toBeLessThanOrEqual(3);
    }
  });

  it('all song IDs appear exactly once across all blocks', () => {
    const lineups: LineupRow[] = [
      makeLineup(1, 1, 5, 3, 4, 7),
      makeLineup(2, 1, 5, 3, 4, 7),
      makeLineup(3, 2, 5, 3, 4, 7),
      makeLineup(4, 2, 6, 3, 4, 7),
      makeLineup(5, null),
    ];

    const plan = generateSetlist({
      songIds: [1, 2, 3, 4, 5],
      lineups,
      coverBands,
      musicians,
      maxBlockSize: 4,
    });

    const all = plan.blocks.flatMap(b => b.songIds);
    expect(all.sort()).toEqual([1, 2, 3, 4, 5].sort());
  });
});

// ---------------------------------------------------------------------------
// generateSetlist — interleaving
// ---------------------------------------------------------------------------

describe('generateSetlist — interleaving', () => {
  it('does not place two consecutive blocks with the same drummer when multiple drummers exist', () => {
    // 4 songs for Hugo, 4 songs for Marco, maxBlockSize=2 → 2 blocks each → round-robin
    const hugoSongs = [1, 2, 3, 4];
    const marcoSongs = [5, 6, 7, 8];

    const lineups: LineupRow[] = [
      ...hugoSongs.map(id => makeLineup(id, 1, 5, 3, 4, 7)),
      ...marcoSongs.map(id => makeLineup(id, 2, 5, 3, 4, 7)),
    ];

    const plan = generateSetlist({
      songIds: [...hugoSongs, ...marcoSongs],
      lineups,
      coverBands,
      musicians,
      maxBlockSize: 2,
    });

    const dataBlocks = plan.blocks.filter(b => b.name !== 'Unassigned Songs');
    const hugoSet = new Set(hugoSongs);
    const marcoSet = new Set(marcoSongs);

    for (let i = 0; i < dataBlocks.length - 1; i++) {
      const aIsHugo = dataBlocks[i].songIds.some(id => hugoSet.has(id));
      const bIsHugo = dataBlocks[i + 1].songIds.some(id => hugoSet.has(id));
      const aIsMarco = dataBlocks[i].songIds.some(id => marcoSet.has(id));
      const bIsMarco = dataBlocks[i + 1].songIds.some(id => marcoSet.has(id));

      // Consecutive blocks must not both be Hugo-only or both be Marco-only
      expect(aIsHugo && bIsHugo && !aIsMarco && !bIsMarco).toBe(false);
      expect(aIsMarco && bIsMarco && !aIsHugo && !bIsHugo).toBe(false);
    }
  });

  it('unassigned block is always last', () => {
    const lineups: LineupRow[] = [
      makeLineup(1, 1),
      makeLineup(2, null),
    ];

    const plan = generateSetlist({
      songIds: [1, 2],
      lineups,
      coverBands,
      musicians,
      maxBlockSize: 6,
    });

    const last = plan.blocks[plan.blocks.length - 1];
    expect(last.name).toBe('Unassigned Songs');
  });
});

// ---------------------------------------------------------------------------
// generateSetlist — block naming
// ---------------------------------------------------------------------------

describe('generateSetlist — block naming', () => {
  it('names the first Hugo block after the cover band when cover songs exist', () => {
    const lineups: LineupRow[] = [
      makeLineup(1, 1, 5, 3, 4, 7), // Chaos BC
    ];

    const plan = generateSetlist({
      songIds: [1],
      lineups,
      coverBands,
      musicians,
      maxBlockSize: 6,
    });

    const block = plan.blocks[0];
    expect(block.name).toContain('Chaos BC');
  });

  it("names the block after the drummer when no cover band songs exist", () => {
    const lineups: LineupRow[] = [
      makeLineup(1, 1, 6, null, null, null), // Hugo drums, Rob bass — only 2 CB matches
    ];

    const plan = generateSetlist({
      songIds: [1],
      lineups,
      coverBands,
      musicians,
      maxBlockSize: 6,
    });

    const block = plan.blocks[0];
    expect(block.name).toContain('Hugo');
  });

  it('prefixes every block name with "Set N -"', () => {
    const lineups: LineupRow[] = [
      makeLineup(1, 1, 5, 3, 4, 7),
      makeLineup(2, 2, 5, 3, 4, 7),
    ];

    const plan = generateSetlist({
      songIds: [1, 2],
      lineups,
      coverBands,
      musicians,
      maxBlockSize: 6,
    });

    const dataBlocks = plan.blocks.filter(b => b.name !== 'Unassigned Songs');
    for (const block of dataBlocks) {
      expect(block.name).toMatch(/^Set \d+ - /);
    }
  });
});
