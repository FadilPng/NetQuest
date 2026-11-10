import type { FurnitureDrawArgs } from './types';
import { roundRect } from '../primitives';

export function drawWaterCooler({ ctx, px, py, pw, ph }: FurnitureDrawArgs) {
  const cx = px + pw / 2;
  const cy = py + ph / 2;
  ctx.fillStyle = 'rgba(28, 25, 23, 0.25)';
  roundRect(ctx, cx - 12, cy - 10, 26, 26, 5);
  ctx.fill();

  ctx.fillStyle = '#F1F5F9';
  roundRect(ctx, cx - 13, cy - 12, 26, 26, 4);
  ctx.fill();

  // Blue Water Jug
  ctx.fillStyle = '#38BDF8';
  ctx.beginPath();
  ctx.arc(cx, cy - 2, 9.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#E0F2FE';
  ctx.beginPath();
  ctx.arc(cx - 3, cy - 4, 3.2, 0, Math.PI * 2);
  ctx.fill();
}
