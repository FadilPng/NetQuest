import type { FurnitureDrawArgs } from './types';
import { roundRect } from '../primitives';

export function drawSofa({ ctx, px, py, pw, ph }: FurnitureDrawArgs) {
  // Plush Lounge / Living Room Sofa with Armrests & Throw Pillows
  ctx.fillStyle = 'rgba(28, 25, 23, 0.34)';
  roundRect(ctx, px + 4, py + 6, pw - 4, ph - 4, 8);
  ctx.fill();

  ctx.fillStyle = '#0F766E';
  roundRect(ctx, px + 2, py + 2, pw - 4, ph - 6, 8);
  ctx.fill();

  // Backrest & Armrests
  ctx.fillStyle = '#115E59';
  roundRect(ctx, px + 2, py + 2, pw - 4, 13, 6);
  ctx.fill();
  roundRect(ctx, px + 2, py + 2, 11, ph - 6, 5);
  ctx.fill();
  roundRect(ctx, px + pw - 13, py + 2, 11, ph - 6, 5);
  ctx.fill();

  // Seat Cushions
  ctx.fillStyle = '#14B8A6';
  const cw = (pw - 30) / 2;
  roundRect(ctx, px + 14, py + 16, cw, ph - 24, 4);
  ctx.fill();
  roundRect(ctx, px + 16 + cw, py + 16, cw, ph - 24, 4);
  ctx.fill();

  // Warm Throw Pillows
  ctx.fillStyle = '#FBBF24';
  roundRect(ctx, px + 15, py + 13, 13, 10, 3);
  ctx.fill();
  ctx.fillStyle = '#FDBA74';
  roundRect(ctx, px + pw - 28, py + 13, 13, 10, 3);
  ctx.fill();
}
