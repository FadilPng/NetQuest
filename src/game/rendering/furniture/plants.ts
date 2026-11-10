import type { FurnitureDrawArgs } from './types';

export function drawPlants({ ctx, px, py, pw, ph, prop, time }: FurnitureDrawArgs) {
  const cx = px + pw / 2;
  const cy = py + ph / 2;
  ctx.fillStyle = 'rgba(28, 25, 23, 0.28)';
  ctx.beginPath();
  ctx.ellipse(cx + 3, cy + 8, 15, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Terracotta or Ceramic Pot
  ctx.fillStyle = prop.kind === 'plant-monstera' ? '#C26D4A' : '#E2E8F0';
  ctx.beginPath();
  ctx.arc(cx, cy + 4, 11.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = prop.kind === 'plant-monstera' ? '#9A4E31' : '#CBD5E1';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#3E2723';
  ctx.beginPath();
  ctx.arc(cx, cy + 3, 8, 0, Math.PI * 2);
  ctx.fill();

  // Layered Lush Leaves with gentle breeze
  const leafAngles = [0, 1.05, 2.1, 3.15, 4.2, 5.25];
  leafAngles.forEach((ang, idx) => {
    const sway = Math.sin(time * 1.6 + idx) * 0.05;
    const lx = cx + Math.cos(ang + sway) * 10.5;
    const ly = cy + Math.sin(ang + sway) * 9.5 - 2;
    ctx.fillStyle = idx % 2 === 0 ? '#15803D' : '#22C55E';
    ctx.beginPath();
    ctx.ellipse(lx, ly, 8.5, 5.2, ang + sway, 0, Math.PI * 2);
    ctx.fill();
    if (prop.kind === 'plant-snake') {
      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  });
}
