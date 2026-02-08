import type { LiveScratchIR, Track } from '@/engine/types';

export interface IRDiff {
  bpmChanged: boolean;
  addedTracks: Track[];
  removedTrackIds: string[];
  updatedTracks: Track[];
}

export function diffIR(prev: LiveScratchIR | null, next: LiveScratchIR): IRDiff {
  if (!prev) {
    return { bpmChanged: true, addedTracks: next.tracks, removedTrackIds: [], updatedTracks: [] };
  }
  const bpmChanged = prev.bpm !== next.bpm;
  const prevIds = new Set(prev.tracks.map(t => t.id));
  const nextIds = new Set(next.tracks.map(t => t.id));
  const addedTracks = next.tracks.filter(t => !prevIds.has(t.id));
  const removedTrackIds = prev.tracks.filter(t => !nextIds.has(t.id)).map(t => t.id);
  const updatedTracks = next.tracks.filter(t => {
    if (!prevIds.has(t.id)) return false;
    const prevTrack = prev.tracks.find(pt => pt.id === t.id);
    return JSON.stringify(prevTrack) !== JSON.stringify(t);
  });
  return { bpmChanged, addedTracks, removedTrackIds, updatedTracks };
}
