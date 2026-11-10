import { TILE_SIZE, roundRect } from './primitives';

// Deterministic pseudo-random helper for natural wood grain & tile variation
function hash2d(gx: number, gy: number): number {
  const n = Math.sin(gx * 127.1 + gy * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

// Draw rich textured 2.5D floor tile based on zone type
export function drawFloorTile(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  tileType: number,
  tiles?: number[][]
) {
  const x = gx * TILE_SIZE;
  const y = gy * TILE_SIZE;
  const S = TILE_SIZE;
  const rnd = hash2d(gx, gy);

  if (tileType === 0) {
    // Warm Golden-Oak Parquet Planks with natural grain variation
    const woodTones = ['#D9B484', '#D4AD7B', '#DFBC8E', '#CFA673'];
    ctx.fillStyle = woodTones[Math.floor(rnd * woodTones.length)];
    ctx.fillRect(x, y, S, S);

    // Individual plank subtle shade & grain
    for (let p = 0; p < 3; p++) {
      const py = y + p * 16;
      const pRnd = hash2d(gx * 3 + p, gy * 5);
      ctx.fillStyle = pRnd > 0.5 ? 'rgba(255, 244, 224, 0.14)' : 'rgba(120, 72, 30, 0.08)';
      ctx.fillRect(x, py + 1, S, 14);

      // Subtle wood grain wave
      ctx.strokeStyle = 'rgba(120, 72, 30, 0.11)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 2, py + 7 + (pRnd - 0.5) * 3);
      ctx.quadraticCurveTo(x + S * 0.5, py + 5 + pRnd * 4, x + S - 2, py + 8);
      ctx.stroke();
    }

    // Plank horizontal seams
    ctx.fillStyle = 'rgba(101, 61, 24, 0.28)';
    ctx.fillRect(x, y + 15.5, S, 1.2);
    ctx.fillRect(x, y + 31.5, S, 1.2);
    ctx.fillRect(x, y + 47, S, 1);

    // Staggered vertical joints + tiny nail dots
    const offset = (gy % 2) * 22;
    const j1 = (12 + offset) % S;
    const j2 = (34 + offset) % S;
    const j3 = (22 + offset) % S;
    ctx.fillRect(x + j1, y, 1.3, 16);
    ctx.fillRect(x + j2, y + 16, 1.3, 16);
    ctx.fillRect(x + j3, y + 32, 1.3, 16);
  } else if (tileType === 2) {
    // Server Room (NOC) Anti-Static Raised Floor Tiles
    ctx.fillStyle = (gx + gy) % 2 === 0 ? '#182436' : '#1D2B40';
    ctx.fillRect(x, y, S, S);

    // Inner bevel & metallic seam
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, S - 1, S - 1);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.strokeRect(x + 3.5, y + 3.5, S - 7, S - 7);

    // Perforated cooling airflow vent tiles in front of server racks
    if (gx >= 15 && gx <= 20 && gy === 4) {
      ctx.fillStyle = '#0F172A';
      roundRect(ctx, x + 7, y + 7, S - 14, S - 14, 3);
      ctx.fill();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
      for (let vy = y + 11; vy < y + S - 10; vy += 5) {
        for (let vx = x + 11; vx < x + S - 10; vx += 5) {
          ctx.fillRect(vx, vy, 2.5, 2.5);
        }
      }
    } else {
      // Corner anti-static bolts
      ctx.fillStyle = 'rgba(148, 163, 184, 0.22)';
      ctx.fillRect(x + 6, y + 6, 2, 2);
      ctx.fillRect(x + S - 8, y + 6, 2, 2);
      ctx.fillRect(x + 6, y + S - 8, 2, 2);
      ctx.fillRect(x + S - 8, y + S - 8, 2, 2);
    }
  } else if (tileType === 3) {
    // Pantry / Kitchen Ceramic Tile with warm grout & gloss
    ctx.fillStyle = (gx + gy) % 2 === 0 ? '#EFECE6' : '#E3DFD5';
    ctx.fillRect(x, y, S, S);

    // Grout lines
    ctx.strokeStyle = 'rgba(140, 125, 105, 0.28)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(x + 0.5, y + 0.5, S - 1, S - 1);

    // Subtle diamond mosaic accent at tile corners
    ctx.fillStyle = 'rgba(180, 130, 85, 0.16)';
    ctx.beginPath();
    ctx.arc(x + S / 2, y + S / 2, 3, 0, Math.PI * 2);
    ctx.fill();

    // Ceramic highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
    ctx.fillRect(x + 5, y + 5, 14, 3);
  } else if (tileType === 4) {
    // Cozy Woven Area Rug / Lounge Carpet with Decorative Border
    ctx.fillStyle = '#334155';
    ctx.fillRect(x, y, S, S);

    // Subtle fabric weave texture
    ctx.fillStyle = (gx + gy) % 2 === 0 ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.14)';
    ctx.fillRect(x + 2, y + 2, S - 4, S - 4);
    ctx.fillStyle = 'rgba(251, 191, 36, 0.05)';
    for (let wy = y + 6; wy < y + S; wy += 8) {
      ctx.fillRect(x + 4, wy, S - 8, 1);
    }

    // Check neighbors to draw warm woven rug trim along outer edges of carpet zone
    if (tiles) {
      const topOther = tiles[gy - 1]?.[gx] !== 4;
      const botOther = tiles[gy + 1]?.[gx] !== 4;
      const leftOther = tiles[gy]?.[gx - 1] !== 4;
      const rightOther = tiles[gy]?.[gx + 1] !== 4;

      ctx.fillStyle = 'rgba(217, 160, 91, 0.45)';
      if (topOther) ctx.fillRect(x, y + 2, S, 3);
      if (botOther) ctx.fillRect(x, y + S - 5, S, 3);
      if (leftOther) ctx.fillRect(x + 2, y, 3, S);
      if (rightOther) ctx.fillRect(x + S - 5, y, 3, S);
    }
  }

  // Ambient Occlusion Shadow cast onto floor below solid/glass walls
  if (tiles && gy > 0) {
    const above = tiles[gy - 1]?.[gx];
    if (above === 1 || above === 5) {
      const grad = ctx.createLinearGradient(x, y, x, y + 14);
      grad.addColorStop(0, 'rgba(28, 25, 23, 0.32)');
      grad.addColorStop(1, 'rgba(28, 25, 23, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, S, 14);
    }
  }
}
