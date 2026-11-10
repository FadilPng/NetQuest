import { roundRect } from '../primitives';
import type { FurnitureDrawArgs } from './types';
/** Basic furniture for the structural pass; no new decorative style. */
export function drawBed({ctx,px,py,pw,ph}:FurnitureDrawArgs) {
  ctx.fillStyle='rgba(41,37,36,0.25)';roundRect(ctx,px+4,py+6,pw,ph,5);ctx.fill();
  ctx.fillStyle='#7C4A21';roundRect(ctx,px,py,pw,ph,5);ctx.fill();
  ctx.fillStyle='#A6713E';roundRect(ctx,px+3,py+3,pw-6,12,3);ctx.fill();
  ctx.fillStyle='#E7DFD0';roundRect(ctx,px+6,py+16,pw-12,ph-23,4);ctx.fill();
  ctx.fillStyle='#77938C';roundRect(ctx,px+6,py+47,pw-12,ph-54,3);ctx.fill();
  ctx.fillStyle='#FAF5EA';
  const pillows=pw>110?2:1;
  for(let i=0;i<pillows;i++){roundRect(ctx,px+11+i*(pw-22)/pillows,py+21,(pw-28)/pillows,20,4);ctx.fill();}
}
