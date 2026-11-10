import { roundRect } from '../primitives';
import type { FurnitureDrawArgs } from './types';
/** Closed front door: marks arrival without opening a playable exterior. */
export function drawEntryDoor({ctx,px,py,pw,ph}:FurnitureDrawArgs) {
  ctx.fillStyle='#534238';roundRect(ctx,px-4,py-3,pw+8,ph+6,3);ctx.fill();
  ctx.fillStyle='#A6713E';ctx.fillRect(px,py,pw,ph);
  ctx.strokeStyle='#704923';ctx.lineWidth=2;
  ctx.strokeRect(px+5,py+4,pw/2-10,ph-8);ctx.strokeRect(px+pw/2+5,py+4,pw/2-10,ph-8);
  ctx.fillStyle='#D8BD7F';ctx.fillRect(px+pw/2-8,py+ph/2,5,3);
}
