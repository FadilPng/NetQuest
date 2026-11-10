const wall = (tile: number | undefined) => tile === 1 || tile === 5;
export function wallLayout(tiles: number[][], x: number, y: number) {
  const north = wall(tiles[y-1]?.[x]);
  const south = wall(tiles[y+1]?.[x]);
  const west = wall(tiles[y]?.[x-1]);
  const east = wall(tiles[y]?.[x+1]);
  const horizontal = west || east;
  const vertical = north || south;
  return { north, south, west, east, orientation: horizontal && vertical ? 'junction' : vertical ? 'vertical' : 'horizontal' } as const;
}
