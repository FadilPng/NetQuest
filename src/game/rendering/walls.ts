import { wallLayout } from '../wallLayout';
import { TILE_SIZE, roundRect } from './primitives';

// Orientation is derived from neighbouring wall tiles; collisions remain unchanged.
export function drawWallTile(ctx: CanvasRenderingContext2D, gx: number, gy: number, isGlass: boolean, tiles?: number[][]) {
  if (!tiles) { drawWallTileHorizontal(ctx, gx, gy, isGlass); return; }
  const layout = wallLayout(tiles, gx, gy);
  const S = TILE_SIZE;
  const x = gx * S, y = gy * S;
  if (layout.orientation === 'horizontal') {
    drawWallTileHorizontal(ctx, gx, gy, isGlass);
    return;
  }
  ctx.save();
  if (layout.orientation === 'vertical') {
    // Exposed face points into the room; glass framing follows the partition axis.
    const roomOnRight = tiles[gy]?.[gx+1] !== undefined && ![1,5].includes(tiles[gy][gx+1]);
    ctx.translate(x + S/2, y + S/2);
    ctx.rotate(roomOnRight ? -Math.PI/2 : Math.PI/2);
    ctx.translate(-x-S/2, -y-S/2);
    drawWallTileHorizontal(ctx, gx, gy, isGlass);
  } else {
    // Corners/T-junctions share a continuous cap rather than overlapping rotated tiles.
    ctx.fillStyle = isGlass ? '#1E293B' : '#292524';
    ctx.fillRect(x,y,S,S);
    if (isGlass) {
      ctx.strokeStyle = '#64748B'; ctx.lineWidth = 4;
      ctx.beginPath();
      if (layout.west) { ctx.moveTo(x,y+S/2); ctx.lineTo(x+S/2,y+S/2); }
      if (layout.east) { ctx.moveTo(x+S/2,y+S/2); ctx.lineTo(x+S,y+S/2); }
      if (layout.north) { ctx.moveTo(x+S/2,y); ctx.lineTo(x+S/2,y+S/2); }
      if (layout.south) { ctx.moveTo(x+S/2,y+S/2); ctx.lineTo(x+S/2,y+S); }
      ctx.stroke();
      ctx.fillStyle = '#94A3B8'; ctx.fillRect(x+S/2-4,y+S/2-4,8,8);
    } else {
      const side = (rotation: number) => {
        ctx.save(); ctx.translate(x+S/2,y+S/2); ctx.rotate(rotation); ctx.translate(-S/2,-S/2);
        const grad = ctx.createLinearGradient(0,S*.44,0,S*.88);
        grad.addColorStop(0,'#57534E'); grad.addColorStop(1,'#44403C');
        ctx.fillStyle = grad; ctx.fillRect(0,S*.44,S,S*.44);
        ctx.fillStyle = 'rgba(255,251,235,.14)'; ctx.fillRect(0,S*.44,S,2);
        ctx.fillStyle = '#1C1917'; ctx.fillRect(0,S*.88,S,S*.12);
        ctx.restore();
      };
      if (!layout.west) side(Math.PI/2);
      if (!layout.east) side(-Math.PI/2);
      if (!layout.south) side(0);
      ctx.fillStyle = '#44403C';
      if (!layout.north) ctx.fillRect(x,y,S,4);
    }
  }
  ctx.restore();
}

// Draw 2.5D architectural walls, windows & tempered glass partitions
function drawWallTileHorizontal(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  isGlass: boolean
) {
  const x = gx * TILE_SIZE;
  const y = gy * TILE_SIZE;
  const S = TILE_SIZE;

  if (isGlass) {
    // Tempered Glass Server Room Partition
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(x, y, S, S);

    // Translucent cyan-tinted glass pane
    const glassGrad = ctx.createLinearGradient(x, y + 6, x, y + S - 6);
    glassGrad.addColorStop(0, 'rgba(56, 189, 248, 0.32)');
    glassGrad.addColorStop(1, 'rgba(14, 116, 144, 0.22)');
    ctx.fillStyle = glassGrad;
    ctx.fillRect(x + 2, y + 6, S - 4, S - 12);

    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(x + 2, y + 6, S - 4, S - 12);

    // Safety frosted stripe across middle of glass
    ctx.fillStyle = 'rgba(224, 242, 254, 0.22)';
    ctx.fillRect(x + 3, y + S * 0.48, S - 6, 3);

    // Diagonal specular shine
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 9, y + S - 11);
    ctx.lineTo(x + 21, y + 11);
    ctx.stroke();

    // Brushed aluminum mullions
    ctx.fillStyle = '#64748B';
    ctx.fillRect(x, y + 4, 4, S - 8);
    ctx.fillRect(x + S - 4, y + 4, 4, S - 8);
  } else {
    // 2.5D Architectural Wall (Top cap + Plaster face + Wooden baseboard)
    // Top cap
    ctx.fillStyle = '#292524';
    ctx.fillRect(x, y, S, S * 0.44);
    ctx.fillStyle = '#44403C';
    ctx.fillRect(x, y, S, 4);

    // Front plaster wall with warm-slate gradient
    const wallGrad = ctx.createLinearGradient(x, y + S * 0.44, x, y + S * 0.88);
    wallGrad.addColorStop(0, '#57534E');
    wallGrad.addColorStop(1, '#44403C');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(x, y + S * 0.44, S, S * 0.44);

    // Top molding trim
    ctx.fillStyle = 'rgba(255, 251, 235, 0.14)';
    ctx.fillRect(x, y + S * 0.44, S, 2);

    // Dark timber baseboard
    ctx.fillStyle = '#1C1917';
    ctx.fillRect(x, y + S * 0.88, S, S * 0.12);

    // Decorative daylight windows on top exterior wall (gy === 0)
    if (gy === 0 && (gx === 3 || gx === 4 || gx === 9 || gx === 10)) {
      // Window frame
      ctx.fillStyle = '#78350F';
      roundRect(ctx, x + 4, y + 14, S - 8, S * 0.68, 3);
      ctx.fill();

      // Sky & daylight glass
      const skyGrad = ctx.createLinearGradient(x, y + 17, x, y + 17 + S * 0.56);
      skyGrad.addColorStop(0, '#BAE6FD');
      skyGrad.addColorStop(1, '#FEF3C7');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(x + 7, y + 17, S - 14, S * 0.56);

      // Window cross-mullion
      ctx.fillStyle = '#78350F';
      ctx.fillRect(x + S / 2 - 1, y + 17, 2, S * 0.56);
      ctx.fillRect(x + 7, y + 17 + S * 0.27, S - 14, 2);

      // Sunbeam reflection
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 11, y + 17 + S * 0.48);
      ctx.lineTo(x + 19, y + 20);
      ctx.stroke();
    }
  }
}

