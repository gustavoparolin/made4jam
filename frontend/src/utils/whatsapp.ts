import { Song, Selection, AppEvent } from '../store/useAppStore';

const ROLES_MAP: Record<string, string> = {
  vocals: 'Vocals',
  rhythm_guitar: 'Rhythm',
  lead_guitar: 'Lead',
  bass: 'Bass',
  drums: 'Drums'
};

export const generateRosterGapsText = (
  songs: Song[], 
  selections: Selection[], 
  activeEvent?: AppEvent
): string | null => {
  let text = `🎸 *Made4Jam - Roster Gaps*\n`;
  if (activeEvent) {
    text += `Event: ${activeEvent.name}\n`;
  }
  text += `\nWe are looking for musicians to fill these missing spots!\n\n`;

  let hasGaps = false;

  songs.forEach(song => {
    const rolesFilled = new Set(
      selections.filter(s => s.song_id === song.id).map(s => s.role)
    );
    
    const missingRoles = Object.entries(ROLES_MAP)
      .filter(([key]) => !rolesFilled.has(key as any))
      .map(([_, label]) => label);

    // Only broadcast songs that actually have some people interested but aren't full yet,
    // OR if you want to broadcast completely empty songs, remove the `> 0` check.
    // Assuming mostly we want to rally people to finish partially staffed songs:
    if (missingRoles.length > 0 && missingRoles.length < 5) {
      hasGaps = true;
      text += `*${song.artist}* - ${song.title}\n`;
      text += `🚨 Missing: ${missingRoles.join(', ')}\n\n`;
    }
  });

  const emptySongs = songs.filter(song => {
    return selections.filter(s => s.song_id === song.id).length === 0;
  });

  if (emptySongs.length > 0) {
    text += `*Completely Empty Songs (Need everyone!):*\n`;
    const emptyTitles = emptySongs.map(s => s.title).join(', ');
    text += `${emptyTitles}\n\n`;
    hasGaps = true;
  }

  if (!hasGaps) {
    return null;
  }

  const joinLink = activeEvent?.slug 
    ? `${window.location.origin}${window.location.pathname.replace('/admin', '/roster')}?e=${activeEvent.slug}`
    : `${window.location.origin}/roster`;

  text += `👉 Sign up here to claim a spot: ${joinLink}`;

  return text;
};
