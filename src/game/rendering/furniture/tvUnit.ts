import type { FurnitureDrawArgs } from './types';
import { roundRect } from '../primitives';

export function drawTvUnit({ ctx, px, py, pw, ph }: FurnitureDrawArgs) {
  // Wooden TV Cabinet + Widescreen TV + Soundbar
  ctx.fillStyle = 'rgba(62, 39, 24, 0.32)';
  roundRect(ctx, px + 5, py + 8, pw - 6, ph - 4, 5);
  ctx.fill();
  ctx.fillStyle = '#7C4A21';
  roundRect(ctx, px + 3, py + 4, pw - 6, ph - 10, 4);
  ctx.fill();
  ctx.fillStyle = '#A6713E';
  roundRect(ctx, px + 6, py + 7, pw - 12, ph - 16, 3);
  ctx.fill();

  // Widescreen TV
  ctx.fillStyle = '#0F172A';
  roundRect(ctx, px + 12, py + 4, pw - 38, ph - 21, 4);
  ctx.fill();
  const tvGrad = ctx.createLinearGradient(px + 15, py + 7, px + pw - 29, py + ph - 20);
  tvGrad.addColorStop(0, '#0284C7');
  tvGrad.addColorStop(0.5, '#0D9488');
  tvGrad.addColorStop(1, '#1E293B');
  ctx.fillStyle = tvGrad;
  roundRect(ctx, px + 15, py + 7, pw - 44, ph - 27, 2);
  ctx.fill();

  // Soundbar in front of TV
  ctx.fillStyle = '#1E293B';
  roundRect(ctx, px + 20, py + ph - 16, pw - 54, 4.5, 2);
  ctx.fill();

  // Power LED
  ctx.fillStyle = '#4ADE80';
  ctx.fillRect(px + pw - 24, py + ph - 16, 2.5, 2.5);

  // Decorative vase & remote on right
  ctx.fillStyle = '#F59E0B';
  ctx.beginPath();
  ctx.arc(px + pw - 13, py + 13, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#334155';
  roundRect(ctx, px + pw - 16, py + 22, 6, 12, 2);
  ctx.fill();
}
