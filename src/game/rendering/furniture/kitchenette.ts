import type { FurnitureDrawArgs } from './types';
import { roundRect } from '../primitives';

export function drawKitchenette({ ctx, px, py, pw, ph }: FurnitureDrawArgs) {
  // Kitchen Counter with Granite Top, Stainless Sink, 2-Burner Stove & Kettle
  ctx.fillStyle = 'rgba(62, 39, 24, 0.25)';
  roundRect(ctx, px + 5, py + 7, pw - 6, ph - 4, 5);
  ctx.fill();
  ctx.fillStyle = '#C8B496';
  roundRect(ctx, px + 2, py + 2, pw - 4, ph - 8, 4);
  ctx.fill();
  // Speckled granite countertop
  ctx.fillStyle = '#E7E2D8';
  roundRect(ctx, px + 4, py + 5, pw - 8, ph - 24, 3);
  ctx.fill();

  // Stainless Sink
  ctx.fillStyle = '#94A3B8';
  roundRect(ctx, px + 10, py + 10, 24, 16, 4);
  ctx.fill();
  ctx.fillStyle = '#64748B';
  roundRect(ctx, px + 13, py + 13, 18, 10, 2);
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px + 22, py + 10);
  ctx.lineTo(px + 22, py + 5);
  ctx.lineTo(px + 28, py + 5);
  ctx.stroke();

  // 2-Burner Stove & Kettle
  ctx.fillStyle = '#1E293B';
  roundRect(ctx, px + 44, py + 9, 34, 18, 3);
  ctx.fill();
  ctx.strokeStyle = '#64748B';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(px + 53, py + 18, 5, 0, Math.PI * 2);
  ctx.arc(px + 69, py + 18, 5, 0, Math.PI * 2);
  ctx.stroke();
  // Kettle on left burner
  ctx.fillStyle = '#0F766E';
  ctx.beginPath();
  ctx.arc(px + 53, py + 18, 4, 0, Math.PI * 2);
  ctx.fill();

  // Cutting board & mug on right
  ctx.fillStyle = '#B47B44';
  roundRect(ctx, px + pw - 34, py + 11, 16, 13, 2);
  ctx.fill();
  ctx.fillStyle = '#0EA5E9';
  ctx.beginPath();
  ctx.arc(px + pw - 12, py + 17, 4, 0, Math.PI * 2);
  ctx.fill();

  // Cabinet handles
  ctx.fillStyle = '#786244';
  ctx.fillRect(px + 14, py + ph - 11, 14, 2.5);
  ctx.fillRect(px + 52, py + ph - 11, 14, 2.5);
  ctx.fillRect(px + pw - 28, py + ph - 11, 14, 2.5);
}
