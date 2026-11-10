import type {WallSegment} from '../types';
import {wallBounds} from '../wallGeometry';
import {TILE_SIZE} from './primitives';
/** Cutaway masonry: no tall faces obscuring the floor/player. */
export function drawThinWalls(ctx:CanvasRenderingContext2D,walls:readonly WallSegment[]) {
  ctx.save();
  // Draw the union of outlines before the inset tops, so junctions stay connected.
  for(const wall of walls){
    const b=wallBounds(wall);
    ctx.fillStyle='#625449';ctx.fillRect(b.x*TILE_SIZE,b.y*TILE_SIZE,b.w*TILE_SIZE,b.h*TILE_SIZE);
  }
  for(const wall of walls){
    const b=wallBounds(wall), inset=1.25;
    ctx.fillStyle=wall.thickness>=.3?'#BDA98C':'#D6C8B1';
    ctx.fillRect(b.x*TILE_SIZE+inset,b.y*TILE_SIZE+inset,b.w*TILE_SIZE-inset*2,b.h*TILE_SIZE-inset*2);
  }
  ctx.restore();
}
