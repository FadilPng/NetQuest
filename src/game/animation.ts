interface Point { x: number; y: number }

// An rAF timestamp can precede performance.now() sampled when an effect restarts.
// Never let a first frame run simulation backwards; cap tab-resume jumps too.
export const frameDeltaSeconds = (now: number, previous: number): number =>
  Math.max(0, Math.min(0.05, (now - previous) / 1000));

export function packetPosition(path: readonly Point[], progress: number): Point | null {
  if (path.length < 2 || !Number.isFinite(progress)) return null;
  const scaled = Math.max(0, Math.min(1, progress)) * (path.length - 1);
  const index = Math.min(path.length - 2, Math.floor(scaled));
  const t = scaled - index;
  const a = path[index], b = path[index + 1];
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
