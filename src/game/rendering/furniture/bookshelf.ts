import type { FurnitureDrawArgs } from './types';
import { roundRect } from '../primitives';

export function drawBookshelf({ ctx, px, py, pw, ph }: FurnitureDrawArgs) {
  // 3-Tier Wooden Bookcase with Colorful Networking Books & Archive Boxes
  ctx.fillStyle = 'rgba(62, 39, 24, 0.32)';
  roundRect(ctx, px + 5, py + 7, pw - 6, ph - 4, 4);
  ctx.fill();
  ctx.fillStyle = '#6B3E1B';
  roundRect(ctx, px + 2, py + 2, pw - 4, ph - 8, 4);
  ctx.fill();
  ctx.fillStyle = '#4A2A11';
  ctx.fillRect(px + 6, py + 7, pw - 12, 10);
  ctx.fillRect(px + 6, py + 20, pw - 12, 10);

  // Top shelf books
  const books1 = ['#0284C7', '#0F766E', '#B45309', '#BE123C', '#0369A1', '#CA8A04', '#4338CA'];
  books1.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(px + 9 + i * 6.5, py + 8, 5, 9);
  });
  // Second shelf books + archive box
  const books2 = ['#0F766E', '#D97706', '#0284C7', '#1E293B'];
  books2.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(px + 9 + i * 6.5, py + 21, 5, 9);
  });
  ctx.fillStyle = '#D6C3A5';
  roundRect(ctx, px + pw - 26, py + 21, 16, 9, 1.5);
  ctx.fill();
}
