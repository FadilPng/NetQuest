import {drawModular} from './rendering/furniture/modular';
import { drawHomeDetail } from './rendering/furniture/homeDetails';
import { drawEntryDoor } from './rendering/furniture/entryDoor';
import { drawBed } from './rendering/furniture/bed';
import { drawTvUnit } from './rendering/furniture/tvUnit';
import { drawBookshelf } from './rendering/furniture/bookshelf';
import { drawKitchenette } from './rendering/furniture/kitchenette';
import { drawPlants } from './rendering/furniture/plants';
import { drawWaterCooler } from './rendering/furniture/waterCooler';
import { drawSofa } from './rendering/furniture/sofa';
import { drawCoffeeTable } from './rendering/furniture/coffeeTable';
import { Direction, MapProp, NetworkDevice } from './types';
import { TILE_SIZE, roundRect } from './rendering/primitives';
export { TILE_SIZE, roundRect } from './rendering/primitives';
export { drawFloorTile } from './rendering/floors';
export { drawWallTile } from './rendering/walls';

// Draw detailed 2.5D top-down props, furniture & Cisco hardware
export function drawMapProp(
  ctx: CanvasRenderingContext2D,
  prop: MapProp,
  device: NetworkDevice | undefined,
  time: number,
  isHighlighted: boolean
) {
  const px = prop.x * TILE_SIZE;
  const py = prop.y * TILE_SIZE;
  const pw = prop.w * TILE_SIZE;
  const ph = prop.h * TILE_SIZE;

  // Rotate geometry only. World bounds, hit testing, collision and labels remain axis-aligned.
  if (prop.rotation) {
    const quarter = prop.rotation === 90 || prop.rotation === 270;
    const w = quarter ? prop.h : prop.w, h = quarter ? prop.w : prop.h;
    ctx.save();
    ctx.translate(px + pw / 2, py + ph / 2);
    ctx.rotate(prop.rotation * Math.PI / 180);
    drawMapProp(ctx, {...prop, rotation: 0, x: -w/2, y: -h/2, w, h, label: undefined}, device, time, isHighlighted);
    ctx.restore();
    ctx.save();drawPropLabel(ctx,prop,px,py,pw,ph,isHighlighted);ctx.restore();
    return;
  }

  ctx.save();

  // Interactive highlight aura when player is nearby
  if (isHighlighted) {
    const pulse = 0.6 + Math.sin(time * 6) * 0.25;
    ctx.strokeStyle = `rgba(15, 118, 110, ${pulse})`;
    ctx.lineWidth = 3;
    roundRect(ctx, px - 4, py - 4, pw + 8, ph + 8, 12);
    ctx.stroke();

    ctx.fillStyle = 'rgba(20, 184, 166, 0.14)';
    roundRect(ctx, px - 4, py - 4, pw + 8, ph + 8, 12);
    ctx.fill();
  }

  switch (prop.kind) {
    case 'router-item': case 'wood-table': case 'chair': case 'laptop-item': case 'monitor-item': case 'printer-item': case 'desk-lamp': case 'book-stack': case 'cup-tray': {
      drawModular({ctx,px,py,pw,ph,prop,time},device); break;
    }
    case 'printer-table': case 'wardrobe': case 'dining-set':
    case 'washbasin': case 'toilet': case 'shower':
    case 'pkk-board': case 'family-photo': case 'chair-stack': case 'door-threshold': {
      drawHomeDetail({ctx, px, py, pw, ph, prop, time});
      break;
    }
    case 'entry-door': {
      drawEntryDoor({ctx, px, py, pw, ph, prop, time});
      break;
    }
    case 'bed': {
      drawBed({ctx, px, py, pw, ph, prop, time});
      break;
    }
    case 'desk-laptop': {
      // Cozy Home Study Desk with Open Laptop, Warm Desk Lamp, Notebook & Wooden Chair
      const online = device ? device.cableConnected : false;
      const ipOk = device ? !(device.ipAddress || '').startsWith('169.254') : false;

      // Soft floor shadow
      ctx.fillStyle = 'rgba(41, 37, 36, 0.28)';
      roundRect(ctx, px + 5, py + 9, pw - 6, ph - 5, 8);
      ctx.fill();

      // Wooden chair with fabric cushion tucked in front
      const chairX = px + pw * 0.48;
      const chairY = py + ph - 5;
      ctx.fillStyle = '#5C3A18';
      roundRect(ctx, chairX - 14, chairY - 10, 28, 18, 6);
      ctx.fill();
      ctx.fillStyle = '#B45309';
      roundRect(ctx, chairX - 11, chairY - 8, 22, 12, 4);
      ctx.fill();
      ctx.fillStyle = '#78350F';
      roundRect(ctx, chairX - 14, chairY + 4, 28, 6, 3);
      ctx.fill();

      // Mahogany desk body (3D front edge + top surface)
      ctx.fillStyle = '#5C3415';
      roundRect(ctx, px + 2, py + 5, pw - 4, ph - 15, 6);
      ctx.fill();

      const deskGrad = ctx.createLinearGradient(px, py + 4, px, py + ph - 16);
      deskGrad.addColorStop(0, '#9A5B2C');
      deskGrad.addColorStop(1, '#7C471E');
      ctx.fillStyle = deskGrad;
      roundRect(ctx, px + 3, py + 4, pw - 6, ph - 20, 5);
      ctx.fill();

      // Cream desk runner mat
      ctx.fillStyle = '#F5EFE6';
      roundRect(ctx, px + 18, py + 8, 52, ph - 28, 4);
      ctx.fill();

      // Open Laptop (Silver aluminum base + angled display lid)
      const lx = px + 24;
      const ly = py + 10;
      // Display lid (top)
      ctx.fillStyle = '#334155';
      roundRect(ctx, lx, ly, 36, 15, 3);
      ctx.fill();
      // Screen content
      ctx.fillStyle = !online ? '#991B1B' : !ipOk ? '#B45309' : '#0284C7';
      ctx.fillRect(lx + 2.5, ly + 2.5, 31, 10.5);
      if (online && ipOk) {
        ctx.fillStyle = '#E0F2FE';
        ctx.fillRect(lx + 5, ly + 5, 16, 2);
        ctx.fillStyle = '#7DD3FC';
        ctx.fillRect(lx + 5, ly + 8.5, 24, 2);
      } else {
        ctx.strokeStyle = '#FECACA';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(lx + 15, ly + 5);
        ctx.lineTo(lx + 21, ly + 10);
        ctx.moveTo(lx + 21, ly + 5);
        ctx.lineTo(lx + 15, ly + 10);
        ctx.stroke();
      }
      // Laptop keyboard deck
      ctx.fillStyle = '#CBD5E1';
      roundRect(ctx, lx - 1, ly + 15, 38, 14, 2);
      ctx.fill();
      ctx.fillStyle = '#334155';
      ctx.fillRect(lx + 2, ly + 17, 32, 6);
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(lx + 13, ly + 24.5, 10, 3.5);

      // Wireless mouse
      ctx.fillStyle = '#F8FAFC';
      roundRect(ctx, lx + 40, ly + 19, 6, 9, 3);
      ctx.fill();

      // Warm articulated desk lamp on left with soft glow
      const lampGlow = ctx.createRadialGradient(px + 14, py + 16, 2, px + 14, py + 16, 20);
      lampGlow.addColorStop(0, 'rgba(253, 224, 71, 0.45)');
      lampGlow.addColorStop(1, 'rgba(253, 224, 71, 0)');
      ctx.fillStyle = lampGlow;
      ctx.beginPath();
      ctx.arc(px + 14, py + 16, 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.arc(px + 11, py + 12, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#D97706';
      ctx.beginPath();
      ctx.arc(px + 14, py + 16, 5, 0, Math.PI * 2);
      ctx.fill();

      // Open notebook & pen on right
      ctx.fillStyle = '#FEF9C3';
      roundRect(ctx, px + pw - 20, py + 12, 13, 17, 1.5);
      ctx.fill();
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px + pw - 17, py + 16);
      ctx.lineTo(px + pw - 10, py + 16);
      ctx.moveTo(px + pw - 17, py + 20);
      ctx.lineTo(px + pw - 10, py + 20);
      ctx.stroke();
      break;
    }

    case 'desk-pc': {
      const online = device ? device.cableConnected : true;
      // Floor contact shadow
      ctx.fillStyle = 'rgba(28, 25, 23, 0.30)';
      roundRect(ctx, px + 4, py + 8, pw - 6, ph - 6, 8);
      ctx.fill();

      // Ergonomic Swivel Chair
      const chairX = px + pw * 0.5;
      const chairY = py + ph - 6;
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.ellipse(chairX, chairY, 15, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.ellipse(chairX, chairY - 2, 12, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0F172A';
      roundRect(ctx, chairX - 13, chairY + 4, 26, 7, 3);
      ctx.fill();

      // 2.5D Wooden Office Desk (front bevel + oak top)
      ctx.fillStyle = '#6B421C';
      roundRect(ctx, px + 2, py + 4, pw - 4, ph - 15, 6);
      ctx.fill();

      const oakGrad = ctx.createLinearGradient(px, py + 4, px, py + ph - 18);
      oakGrad.addColorStop(0, '#B98049');
      oakGrad.addColorStop(1, '#9C6635');
      ctx.fillStyle = oakGrad;
      roundRect(ctx, px + 3, py + 4, pw - 6, ph - 20, 5);
      ctx.fill();

      // Wide dark deskmat
      ctx.fillStyle = '#1E293B';
      roundRect(ctx, px + 18, py + 22, 58, 20, 3);
      ctx.fill();

      // Dual Curved Widescreen Monitors
      const drawMonitor = (mx: number, my: number, mw: number, mh: number, tilt: number) => {
        ctx.save();
        ctx.translate(mx + mw / 2, my + mh / 2);
        ctx.rotate(tilt);
        // Stand neck
        ctx.fillStyle = '#475569';
        ctx.fillRect(-3, 4, 6, 7);
        // Outer bezel
        ctx.fillStyle = '#0F172A';
        roundRect(ctx, -mw / 2, -mh / 2, mw, mh, 3);
        ctx.fill();
        // Screen display
        ctx.fillStyle = online ? '#0369A1' : '#991B1B';
        ctx.fillRect(-mw / 2 + 2, -mh / 2 + 2, mw - 4, mh - 4);
        if (online) {
          ctx.fillStyle = '#BAE6FD';
          ctx.fillRect(-mw / 2 + 4, -mh / 2 + 4, mw * 0.55, 2);
          ctx.fillStyle = '#38BDF8';
          ctx.fillRect(-mw / 2 + 4, -mh / 2 + 8, mw * 0.75, 2);
          ctx.fillStyle = '#34D399';
          ctx.fillRect(-mw / 2 + 4, -mh / 2 + 11, mw * 0.4, 1.5);
        } else {
          ctx.strokeStyle = '#FCA5A5';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(-4, -3);
          ctx.lineTo(4, 3);
          ctx.moveTo(4, -3);
          ctx.lineTo(-4, 3);
          ctx.stroke();
        }
        ctx.restore();
      };

      drawMonitor(px + 12, py + 8, 30, 15, -0.09);
      drawMonitor(px + 46, py + 8, 30, 15, 0.09);

      // Mechanical Keyboard with keycap rows
      ctx.fillStyle = '#0F172A';
      roundRect(ctx, px + 23, py + 26, 32, 11, 2);
      ctx.fill();
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(px + 25, py + 28, 28, 2);
      ctx.fillRect(px + 25, py + 31, 28, 2);
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(px + 28, py + 34, 22, 2);

      // Ergonomic Mouse
      ctx.fillStyle = '#F8FAFC';
      roundRect(ctx, px + 61, py + 27, 7, 10, 3.5);
      ctx.fill();

      // CPU Tower on right edge of desk
      ctx.fillStyle = '#0F172A';
      roundRect(ctx, px + pw - 16, py + 8, 11, 28, 2.5);
      ctx.fill();
      ctx.fillStyle = online ? '#10B981' : '#EF4444';
      ctx.fillRect(px + pw - 13, py + 11, 5, 2);
      ctx.fillStyle = '#334155';
      ctx.fillRect(px + pw - 13, py + 16, 5, 14);

      // Coffee Mug
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.arc(px + 10, py + 31, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6F4E37';
      ctx.beginPath();
      ctx.arc(px + 10, py + 31, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'toolbench': {
      // Heavy IT Engineering Workbench with Cutting Mat, Cable Spools, Crimper & LAN Tester
      ctx.fillStyle = 'rgba(28, 25, 23, 0.34)';
      roundRect(ctx, px + 4, py + 7, pw - 4, ph - 4, 8);
      ctx.fill();

      // Heavy steel frame & butcher-block oak top
      ctx.fillStyle = '#334155';
      roundRect(ctx, px + 2, py + 2, pw - 4, ph - 6, 6);
      ctx.fill();
      const benchGrad = ctx.createLinearGradient(px, py + 5, px, py + ph - 8);
      benchGrad.addColorStop(0, '#C68B53');
      benchGrad.addColorStop(1, '#A46B38');
      ctx.fillStyle = benchGrad;
      roundRect(ctx, px + 5, py + 5, pw - 10, ph - 12, 4);
      ctx.fill();

      // Green ESD Anti-Static Cutting Mat with grid lines
      ctx.fillStyle = '#0F766E';
      roundRect(ctx, px + 10, py + 10, pw - 52, ph - 22, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 13, py + 13, pw - 58, ph - 28);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      for (let gx = px + 21; gx < px + pw - 48; gx += 8) {
        ctx.beginPath();
        ctx.moveTo(gx, py + 13);
        ctx.lineTo(gx, py + ph - 15);
        ctx.stroke();
      }

      // Coiled Yellow UTP Cat6 Roll
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 3.8;
      ctx.beginPath();
      ctx.arc(px + 28, py + 28, 9.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#CA8A04';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px + 28, py + 28, 6.5, 0, Math.PI * 2);
      ctx.stroke();

      // Red-handled RJ45 Crimping Tool on mat
      ctx.save();
      ctx.translate(px + 54, py + 28);
      ctx.rotate(-0.35);
      ctx.fillStyle = '#DC2626';
      roundRect(ctx, -11, -5, 15, 4, 2);
      ctx.fill();
      roundRect(ctx, -11, 1, 15, 4, 2);
      ctx.fill();
      ctx.fillStyle = '#475569';
      roundRect(ctx, 2, -4, 9, 8, 1.5);
      ctx.fill();
      ctx.restore();

      // Organizer box with RJ45 plugs + LAN Tester on right
      ctx.fillStyle = '#1E293B';
      roundRect(ctx, px + pw - 36, py + 10, 24, 34, 3);
      ctx.fill();
      // Animated scanning LEDs on LAN tester
      const scanIdx = Math.floor(time * 6) % 4;
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i === scanIdx ? '#4ADE80' : '#166534';
        ctx.fillRect(px + pw - 31, py + 14 + i * 6, 14, 3.5);
      }
      break;
    }

    case 'cisco-switch-rack': {
      // Cisco Catalyst 2960 24-Port Managed Switch
      ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
      roundRect(ctx, px + 3, py + 5, pw - 4, ph - 4, 6);
      ctx.fill();

      // 19-inch Rack Frame + Mounting Ears
      ctx.fillStyle = '#0F172A';
      roundRect(ctx, px + 2, py + 2, pw - 4, ph - 6, 5);
      ctx.fill();
      ctx.fillStyle = '#475569';
      ctx.fillRect(px + 3, py + 8, 4, ph - 18);
      ctx.fillRect(px + pw - 7, py + 8, 4, ph - 18);

      // Cisco Metallic Teal-Blue Chassis
      const swGrad = ctx.createLinearGradient(px, py + 6, px, py + ph - 10);
      swGrad.addColorStop(0, '#0E7490');
      swGrad.addColorStop(1, '#155E75');
      ctx.fillStyle = swGrad;
      roundRect(ctx, px + 7, py + 6, pw - 14, ph - 16, 3);
      ctx.fill();
      ctx.fillStyle = '#22D3EE';
      ctx.fillRect(px + 7, py + 6, pw - 14, 2.5);

      // Cisco White Bridge Logo Bars
      ctx.fillStyle = '#FFFFFF';
      [0, 3, 6, 9, 12].forEach((dx, idx) => {
        const barH = idx === 2 ? 7 : idx % 2 === 1 ? 5 : 3;
        ctx.fillRect(px + 11 + dx, py + 20 - barH, 1.8, barH);
      });

      // 2 Rows of RJ45 Ports + Live Blinking LEDs
      for (let col = 0; col < 8; col++) {
        const portX = px + 29 + col * 6.5;
        for (let row = 0; row < 2; row++) {
          const portY = py + 13 + row * 9;
          ctx.fillStyle = '#090D16';
          ctx.fillRect(portX, portY, 4.8, 5);

          const active = device ? device.cableConnected && col < 4 : col < 3;
          const blink = Math.sin(time * 10 + col * 1.9 + row) > -0.2;
          ctx.fillStyle = active ? (blink ? '#4ADE80' : '#16A34A') : '#475569';
          ctx.fillRect(portX + 1, portY - 2.5, 2.8, 1.8);
        }
      }

      // Blue Console Port + SFP Uplink on right
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(px + pw - 17, py + 13, 6, 6);
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(px + pw - 17, py + 22, 6, 5);
      break;
    }

    case 'cisco-router-rack': {
      // Stylized wired Cisco 1941 lab router; not a scaled panel replica.
      ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
      roundRect(ctx, px + 3, py + 6, pw - 4, ph - 4, 6);
      ctx.fill();

      // Router Chassis
      const rtGrad = ctx.createLinearGradient(px, py + 8, px, py + ph - 6);
      rtGrad.addColorStop(0, '#334155');
      rtGrad.addColorStop(1, '#1E293B');
      ctx.fillStyle = rtGrad;
      roundRect(ctx, px + 4, py + 8, pw - 8, ph - 14, 5);
      ctx.fill();
      ctx.fillStyle = '#00BCEB';
      ctx.fillRect(px + 4, py + 11, pw - 8, 2.5);

      const g0Up = Boolean(device?.interfaces['GigabitEthernet0/0']?.adminUp && device?.interfaces['GigabitEthernet0/0']?.lineProtocolUp);
      const g1Up = Boolean(device?.interfaces['GigabitEthernet0/1']?.adminUp && device?.interfaces['GigabitEthernet0/1']?.lineProtocolUp);

      // Selected onboard G0/0 and G0/1 ports (stylized).
      ctx.fillStyle = '#090D16';
      ctx.fillRect(px + 14, py + 18, 10, 8);
      ctx.fillStyle = g0Up ? '#4ADE80' : '#374151';
      ctx.fillRect(px + 16, py + 15, 6, 2);

      ctx.fillStyle = '#090D16';
      ctx.fillRect(px + 28, py + 18, 10, 8);
      ctx.fillStyle = g1Up ? '#4ADE80' : '#374151';
      ctx.fillRect(px + 30, py + 15, 6, 2);

      // Console Port (Sky Blue)
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(px + 44, py + 18, 9, 8);

      // Ventilation slots
      ctx.fillStyle = '#0F172A';
      for (let vx = px + 60; vx < px + pw - 22; vx += 4) {
        ctx.fillRect(vx, py + 18, 2, 8);
      }

      // SYS LED
      const sysPulse = Math.sin(time * 5) > 0;
      ctx.fillStyle = sysPulse ? '#4ADE80' : '#16A34A';
      ctx.beginPath();
      ctx.arc(px + pw - 13, py + 22, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'server-rack':
    case 'server-unit': {
      // 42U Enterprise Server Rack Cabinet with Glass Door & Blade Activity LEDs
      ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
      roundRect(ctx, px + 4, py + 6, pw - 4, ph - 4, 6);
      ctx.fill();

      // Steel Outer Frame
      ctx.fillStyle = '#0F172A';
      roundRect(ctx, px + 2, py + 2, pw - 4, ph - 6, 5);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.6;
      roundRect(ctx, px + 2, py + 2, pw - 4, ph - 6, 5);
      ctx.stroke();

      // Server Blade Units
      const rows = Math.max(4, Math.floor((ph - 14) / 10));
      for (let r = 0; r < rows; r++) {
        const ry = py + 8 + r * 10;
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(px + 7, ry, pw - 14, 7.5);

        // Drive bays & ventilation
        ctx.fillStyle = '#090D16';
        for (let vx = px + 22; vx < px + pw - 12; vx += 4) {
          ctx.fillRect(vx, ry + 2, 2.2, 3.5);
        }

        // Animated Status LEDs
        const ledOn = Math.sin(time * 7 + r * 2.1) > -0.3;
        ctx.fillStyle = ledOn ? '#4ADE80' : '#166534';
        ctx.fillRect(px + 10, ry + 2, 3, 3);
        ctx.fillStyle = r % 2 === 0 ? '#38BDF8' : '#F59E0B';
        ctx.fillRect(px + 15, ry + 2, 3, 3);
      }

      // Tempered Glass Door Glare Overlay
      ctx.fillStyle = 'rgba(186, 230, 253, 0.08)';
      ctx.fillRect(px + 6, py + 6, pw - 12, ph - 14);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px + 10, py + ph - 14);
      ctx.lineTo(px + pw - 12, py + 12);
      ctx.stroke();
      break;
    }

    case 'ap-stand': {
      // Generic lab access point, DC powered.
      const wifiOn = device?.wifiActive ?? false;
      ctx.fillStyle = 'rgba(28, 25, 23, 0.34)';
      ctx.beginPath();
      ctx.arc(px + pw / 2 + 2, py + ph / 2 + 4, 18, 0, Math.PI * 2);
      ctx.fill();

      // White sculpted AP housing
      const apGrad = ctx.createRadialGradient(
        px + pw / 2 - 4,
        py + ph / 2 - 4,
        2,
        px + pw / 2,
        py + ph / 2,
        22
      );
      apGrad.addColorStop(0, '#FFFFFF');
      apGrad.addColorStop(1, '#E2E8F0');
      ctx.fillStyle = apGrad;
      roundRect(ctx, px + 7, py + 7, pw - 14, ph - 14, 11);
      ctx.fill();
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1.5;
      roundRect(ctx, px + 7, py + 7, pw - 14, ph - 14, 11);
      ctx.stroke();

      // Cisco LED Ring
      ctx.strokeStyle = wifiOn ? '#00BCEB' : '#EF4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px + pw / 2, py + ph / 2, 7, 0, Math.PI * 2);
      ctx.stroke();

      if (wifiOn) {
        const wave = (time * 1.4) % 1;
        ctx.strokeStyle = `rgba(0, 188, 235, ${1 - wave})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px + pw / 2, py + ph / 2, 12 + wave * 24, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }

    case 'home-router': {
      // Home Wi-Fi Router on Wooden Console Table + Fiber ONT Box
      const online = device?.wifiActive ?? false;
      ctx.fillStyle = 'rgba(62, 39, 24, 0.30)';
      roundRect(ctx, px + 4, py + ph - 18, pw - 4, 13, 4);
      ctx.fill();

      // Wooden console shelf
      ctx.fillStyle = '#7C4A21';
      roundRect(ctx, px + 2, py + ph - 20, pw - 4, 11, 3);
      ctx.fill();
      ctx.fillStyle = '#A6713E';
      ctx.fillRect(px + 4, py + ph - 19, pw - 8, 3);

      // Fiber ONT mini box on left + yellow fiber patch cord
      ctx.fillStyle = '#E2E8F0';
      roundRect(ctx, px + 5, py + 19, 12, 14, 2);
      ctx.fill();
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px + 16, py + 26);
      ctx.quadraticCurveTo(px + 20, py + 31, px + 23, py + 26);
      ctx.stroke();

      // 4 White Antennas
      ctx.strokeStyle = '#F8FAFC';
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      [23, 32, 44, 53].forEach((ax, idx) => {
        ctx.beginPath();
        ctx.moveTo(px + ax, py + 15);
        ctx.lineTo(px + ax + (idx < 2 ? -3 : 3), py + 2);
        ctx.stroke();
      });

      // Router white body
      ctx.fillStyle = '#FFFFFF';
      roundRect(ctx, px + 19, py + 14, pw - 24, ph - 31, 5);
      ctx.fill();
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1.4;
      roundRect(ctx, px + 19, py + 14, pw - 24, ph - 31, 5);
      ctx.stroke();

      // Status LEDs (PWR, WAN, WIFI, LAN)
      [
        online ? '#22C55E' : '#EF4444',
        '#0EA5E9',
        online ? '#22C55E' : '#94A3B8',
        '#F59E0B',
      ].forEach((col, i) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(px + 25 + i * 6, py + 26, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      if (online) {
        for (let i = 0; i < 3; i++) {
          const wave = (time * 1.1 + i * 0.3) % 1;
          ctx.strokeStyle = `rgba(14, 165, 233, ${0.7 * (1 - wave)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(px + pw * 0.56, py + 18, 12 + wave * 22, Math.PI * 1.15, Math.PI * 1.85);
          ctx.stroke();
        }
      }
      break;
    }

    case 'tv-unit': {
      drawTvUnit({ ctx, px, py, pw, ph, prop, time });
      break;
    }

    case 'bookshelf': {
      drawBookshelf({ ctx, px, py, pw, ph, prop, time });
      break;
    }

    case 'kitchenette': {
      drawKitchenette({ ctx, px, py, pw, ph, prop, time });
      break;
    }

    case 'plant-monstera':
    case 'plant-snake': {
      drawPlants({ ctx, px, py, pw, ph, prop, time });
      break;
    }

    case 'coffee-station': {
      ctx.fillStyle = 'rgba(28, 25, 23, 0.28)';
      roundRect(ctx, px + 3, py + 5, pw - 4, ph - 4, 6);
      ctx.fill();

      ctx.fillStyle = '#475569';
      roundRect(ctx, px + 2, py + 2, pw - 4, ph - 6, 5);
      ctx.fill();
      ctx.fillStyle = '#F8FAFC';
      roundRect(ctx, px + 4, py + 4, pw - 8, ph - 10, 4);
      ctx.fill();

      // Espresso Machine
      ctx.fillStyle = '#1E293B';
      roundRect(ctx, px + 9, py + 8, 30, 25, 4);
      ctx.fill();
      ctx.fillStyle = '#B45309';
      ctx.fillRect(px + 13, py + 11, 22, 4);
      // Drip tray & cup
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(px + 14, py + 26, 20, 4);
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(px + 24, py + 25, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Rising Steam Wisps
      const steamOffset = (time * 14) % 10;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px + 22, py + 12 - steamOffset);
      ctx.lineTo(px + 24, py + 6 - steamOffset);
      ctx.stroke();

      // Coffee bean jar & mugs on right
      ctx.fillStyle = '#78350F';
      ctx.beginPath();
      ctx.arc(px + pw - 22, py + 18, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(px + pw - 13, py + 28, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'water-cooler': {
      drawWaterCooler({ ctx, px, py, pw, ph, prop, time });
      break;
    }

    case 'sofa': {
      drawSofa({ ctx, px, py, pw, ph, prop, time });
      break;
    }

    case 'coffee-table': {
      drawCoffeeTable({ ctx, px, py, pw, ph, prop, time });
      break;
    }

    case 'whiteboard': {
      ctx.fillStyle = '#334155';
      roundRect(ctx, px + 4, py + 6, pw - 8, ph - 10, 4);
      ctx.fill();
      ctx.fillStyle = '#F8FAFC';
      roundRect(ctx, px + 7, py + 9, pw - 14, ph - 16, 2);
      ctx.fill();

      // Hand-drawn diagram notes
      ctx.strokeStyle = '#0F766E';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 14, py + 15, 11, 8);
      ctx.beginPath();
      ctx.moveTo(px + 25, py + 19);
      ctx.lineTo(px + 42, py + 19);
      ctx.stroke();
      ctx.strokeStyle = '#B45309';
      ctx.beginPath();
      ctx.arc(px + 48, py + 19, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px + 53, py + 19);
      ctx.lineTo(px + 70, py + 19);
      ctx.stroke();
      ctx.strokeStyle = '#BE123C';
      ctx.strokeRect(px + 70, py + 14, 11, 10);
      break;
    }
  }

  drawPropLabel(ctx, prop, px, py, pw, ph, isHighlighted);

  ctx.restore();
}

function drawPropLabel(ctx: CanvasRenderingContext2D, prop: MapProp, px: number, py: number, pw: number, ph: number, isHighlighted: boolean) {
  // Crisp label pill below interactive hardware
  if (prop.label) {
    ctx.font = '700 9.5px "Plus Jakarta Sans", sans-serif';
    const textW = ctx.measureText(prop.label).width;
    const lx = px + pw / 2 - textW / 2 - 6;
    const ly = py + ph - 1;
    ctx.fillStyle = isHighlighted ? 'rgba(15, 118, 110, 0.95)' : 'rgba(28, 25, 23, 0.84)';
    roundRect(ctx, lx, ly, textW + 12, 15, 5);
    ctx.fill();
    ctx.strokeStyle = isHighlighted ? '#5EEAD4' : 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 1;
    roundRect(ctx, lx, ly, textW + 12, 15, 5);
    ctx.stroke();

    ctx.fillStyle = '#FBF7EF';
    ctx.fillText(prop.label, lx + 6, ly + 11);
  }

}

export interface CharacterRenderOptions {
  x: number;
  y: number;
  direction: Direction;
  walkPhase: number;
  isMoving: boolean;
  shirtColor: string;
  accentColor: string;
  hairColor: string;
  hasLanyard?: boolean;
  hasGlasses?: boolean;
  hasHeadset?: boolean;
  isFemale?: boolean;
  equippedCable?: 'none' | 'straight' | 'crossover' | 'console';
  nameTag?: string;
  questBadge?: '!' | '?' | '✓' | null;
  time: number;
}

// Expressive 2D Top-Down RPG Character Sprite (Shoulders, Vest/Shirt, Toolbag, Layered Hair, Face)
export function drawCharacter(ctx: CanvasRenderingContext2D, opts: CharacterRenderOptions) {
  const {
    x,
    y,
    direction,
    walkPhase,
    isMoving,
    shirtColor,
    accentColor,
    hairColor,
    hasLanyard,
    hasGlasses,
    hasHeadset,
    isFemale,
    equippedCable,
    nameTag,
    questBadge,
    time,
  } = opts;

  ctx.save();

  const bob = isMoving ? Math.abs(Math.sin(walkPhase * 10)) * 2.8 : Math.sin(time * 2.5) * 0.7;
  const swing = isMoving ? Math.sin(walkPhase * 10) * 4.5 : 0;

  // Ground Contact Shadow
  ctx.fillStyle = 'rgba(28, 25, 23, 0.34)';
  ctx.beginPath();
  ctx.ellipse(x, y + 16.5, 13.5, 6.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Animated Feet / Shoes
  ctx.fillStyle = '#1C1917';
  if (direction === 'left' || direction === 'right') {
    ctx.beginPath();
    ctx.ellipse(x - swing, y + 14.5, 5, 3.4, 0, 0, Math.PI * 2);
    ctx.ellipse(x + swing, y + 14.5, 5, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(x - 5, y + 14.5 + swing * 0.45, 4.2, 3.4, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 5, y + 14.5 - swing * 0.45, 4.2, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Torso & Shoulders
  const torsoY = y - 2 - bob;
  ctx.fillStyle = shirtColor;
  roundRect(ctx, x - 12, torsoY, 24, 16, 7);
  ctx.fill();

  // Subtle torso shading
  ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
  roundRect(ctx, x - 12, torsoY + 11, 24, 5, 3);
  ctx.fill();

  // Collar / Shirt Accent
  ctx.fillStyle = accentColor;
  if (direction === 'down') {
    ctx.beginPath();
    ctx.moveTo(x - 5, torsoY + 1);
    ctx.lineTo(x, torsoY + 6.5);
    ctx.lineTo(x + 5, torsoY + 1);
    ctx.closePath();
    ctx.fill();
  }

  // Technician Crossbody Toolbag Strap & Hip Pouch (for player with lanyard)
  if (hasLanyard) {
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(x - 9, torsoY + 1);
    ctx.lineTo(x + 9, torsoY + 14);
    ctx.stroke();

    // Small brown leather tool pouch on hip
    ctx.fillStyle = '#92400E';
    roundRect(ctx, x + 7, torsoY + 9, 6.5, 7, 2);
    ctx.fill();
  }

  // Signature IT Support Lanyard & ID Badge
  if (hasLanyard && direction !== 'up') {
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(x - 4, torsoY + 1);
    ctx.lineTo(x, torsoY + 10);
    ctx.lineTo(x + 4, torsoY + 1);
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x - 2.5, torsoY + 9, 5, 6);
    ctx.fillStyle = '#0F766E';
    ctx.fillRect(x - 2.5, torsoY + 9, 5, 2);
  }

  // Animated Arms / Hands
  ctx.fillStyle = '#FDBA74';
  let handX = x + 13.5;
  let handY = torsoY + 8;
  if (direction === 'down' || direction === 'up') {
    handX = x + 13.5;
    handY = torsoY + 8 + swing * 0.5;
    ctx.beginPath();
    ctx.arc(x - 13.5, torsoY + 8 - swing * 0.5, 3.6, 0, Math.PI * 2);
    ctx.arc(handX, handY, 3.6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const armOffset = direction === 'right' ? 4 : -4;
    handX = x + armOffset + swing * 0.7;
    handY = torsoY + 9;
    ctx.beginPath();
    ctx.arc(handX, handY, 3.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Coiled Cable in Hand when equipped
  if (equippedCable && equippedCable !== 'none') {
    const cableColor =
      equippedCable === 'straight'
        ? '#FACC15'
        : equippedCable === 'crossover'
        ? '#FB923C'
        : '#38BDF8';
    ctx.strokeStyle = cableColor;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(handX + 2, handY + 2, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#1C1917';
    ctx.fillRect(handX + 5, handY - 1, 3, 3);
  }

  // Neck shadow
  const headY = y - 14.5 - bob;
  ctx.fillStyle = '#E5A97C';
  ctx.fillRect(x - 3.5, headY + 9, 7, 4);

  // Head
  ctx.fillStyle = '#FED7AA';
  ctx.beginPath();
  ctx.arc(x, headY, 11.8, 0, Math.PI * 2);
  ctx.fill();

  // Layered Hair
  ctx.fillStyle = hairColor;
  if (direction === 'up') {
    ctx.beginPath();
    ctx.arc(x, headY, 12.2, 0, Math.PI * 2);
    ctx.fill();
    if (isFemale) {
      ctx.beginPath();
      ctx.arc(x, headY + 6, 5.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Top hair volume + bangs
    ctx.beginPath();
    ctx.arc(x, headY - 2, 12.2, Math.PI * 0.95, Math.PI * 2.05);
    ctx.fill();
    // Hair fringe
    ctx.beginPath();
    ctx.moveTo(x - 10, headY - 4);
    ctx.quadraticCurveTo(x - 3, headY - 9, x + 2, headY - 4);
    ctx.quadraticCurveTo(x + 7, headY - 8, x + 10, headY - 4);
    ctx.fill();
    // Side hair
    ctx.fillRect(x - 12, headY - 3, 3.6, isFemale ? 12 : 6);
    ctx.fillRect(x + 8.4, headY - 3, 3.6, isFemale ? 12 : 6);
    if (isFemale) {
      ctx.beginPath();
      ctx.arc(x + (direction === 'left' ? 11 : -11), headY - 4, 4.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Expressive Eyes, Blush & Glasses
  if (direction !== 'up') {
    const eyeShiftX = direction === 'left' ? -3 : direction === 'right' ? 3 : 0;
    // Soft cheek blush
    ctx.fillStyle = 'rgba(244, 63, 94, 0.16)';
    ctx.beginPath();
    ctx.arc(x - 6.2 + eyeShiftX, headY + 4, 2.3, 0, Math.PI * 2);
    ctx.arc(x + 6.2 + eyeShiftX, headY + 4, 2.3, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#1C1917';
    ctx.beginPath();
    ctx.arc(x - 3.8 + eyeShiftX, headY + 1, 1.8, 0, Math.PI * 2);
    ctx.arc(x + 3.8 + eyeShiftX, headY + 1, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Catchlight
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x - 4.4 + eyeShiftX, headY + 0.1, 1.1, 1.1);
    ctx.fillRect(x + 3.2 + eyeShiftX, headY + 0.1, 1.1, 1.1);

    if (hasGlasses) {
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(x - 7 + eyeShiftX, headY - 1.6, 6, 5);
      ctx.strokeRect(x + 1 + eyeShiftX, headY - 1.6, 6, 5);
      ctx.beginPath();
      ctx.moveTo(x - 1 + eyeShiftX, headY + 0.5);
      ctx.lineTo(x + 1 + eyeShiftX, headY + 0.5);
      ctx.stroke();
    }
  }

  // IT Support Headset
  if (hasHeadset) {
    ctx.strokeStyle = '#0F766E';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, headY - 1, 12.8, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    ctx.fillStyle = '#1C1917';
    ctx.fillRect(x - 14.2, headY - 3, 3.2, 6);
    ctx.fillRect(x + 11, headY - 3, 3.2, 6);
  }

  // Name Tag Pill above head
  if (nameTag) {
    ctx.font = '700 10px "Plus Jakarta Sans", sans-serif';
    const tw = ctx.measureText(nameTag).width;
    const ny = headY - 24;
    ctx.fillStyle = 'rgba(28, 25, 23, 0.84)';
    roundRect(ctx, x - tw / 2 - 6, ny, tw + 12, 15, 7);
    ctx.fill();
    ctx.fillStyle = '#FBF7EF';
    ctx.fillText(nameTag, x - tw / 2, ny + 11);
  }

  // Floating Quest Badge
  if (questBadge) {
    const qFloat = Math.sin(time * 5) * 2.8;
    const qy = headY - 40 + qFloat;
    const badgeColor =
      questBadge === '!' ? '#F59E0B' : questBadge === '?' ? '#0D9488' : '#22C55E';

    ctx.fillStyle = badgeColor;
    ctx.beginPath();
    ctx.arc(x, qy, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1C1917';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = questBadge === '?' ? '#FFFFFF' : '#1C1917';
    ctx.font = '800 13px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(questBadge, x, qy + 4.5);
    ctx.textAlign = 'left';
  }

  ctx.restore();
}
