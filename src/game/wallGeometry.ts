import type { WallSegment } from './types';
export interface Bounds { x:number; y:number; w:number; h:number }
/** Same rectangle for collision, renderer and editor overlay. Segments are axis aligned. */
export function wallBounds(wall:WallSegment):Bounds {
  const r=wall.thickness/2;
  return {x:Math.min(wall.x1,wall.x2)-r,y:Math.min(wall.y1,wall.y2)-r,
    w:Math.abs(wall.x2-wall.x1)+wall.thickness,h:Math.abs(wall.y2-wall.y1)+wall.thickness};
}
export function boundsOverlap(a:Bounds,b:Bounds):boolean {
  return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
}
export function hitsWalls(bounds:Bounds,walls:readonly WallSegment[]):boolean {
  return walls.some(w=>boundsOverlap(bounds,wallBounds(w)));
}
export function playerHitsWalls(x:number,y:number,walls:readonly WallSegment[]):boolean {
  const radius=.28;
  return hitsWalls({x:x-radius,y:y-radius*.5,w:radius*2,h:radius*1.5},walls);
}
