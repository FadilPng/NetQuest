import type { FurnitureDrawArgs } from './types';
import { roundRect } from '../primitives';

export function drawCoffeeTable({ ctx, px, py, pw, ph }: FurnitureDrawArgs) {
  ctx.fillStyle = 'rgba(28, 25, 23, 0.28)';
  roundRect(ctx, px + 6, py + 8, pw - 8, ph - 8, 6);
  ctx.fill();
  ctx.fillStyle = '#7C4A21';
  roundRect(ctx, px + 4, py + 5, pw - 8, ph - 10, 6);
  ctx.fill();
  ctx.fillStyle = '#A6713E';
  roundRect(ctx, px + 7, py + 8, pw - 14, ph - 16, 4);
  ctx.fill();
  // Magazine & coaster on table
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(px + 16, py + 14, 16, 12);
  ctx.fillStyle = '#0F766E';
  ctx.fillRect(px + 18, py + 16, 12, 4);
  ctx.fillStyle = '#D97706';
  ctx.beginPath();
  ctx.arc(px + pw - 20, py + 22, 4.5, 0, Math.PI * 2);
  ctx.fill();
}
