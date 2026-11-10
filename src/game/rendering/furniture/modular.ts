import type {NetworkDevice} from '../../types';
import type {FurnitureDrawArgs} from './types';
import {roundRect} from '../primitives';
/** Independent floor furniture and tabletop items; no implicit chairs/devices. */
export function drawModular({ctx,px:x,py:y,pw:w,ph:h,prop}:FurnitureDrawArgs,device?:NetworkDevice){
 const box=(a:number,b:number,c:number,d:number,color:string,r=3)=>{ctx.fillStyle=color;roundRect(ctx,a,b,c,d,r);ctx.fill();};
 const oval=(a:number,b:number,c:number,d:number,color:string)=>{ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(a,b,c,d,0,0,Math.PI*2);ctx.fill();};
 switch(prop.kind){
  case 'router-item':
   box(x+2,y+h*.23,w-4,h*.7,'#E2E8E2',4);box(x+3,y+h*.2,w-6,h*.5,'#FAFCF7',4);
   box(x+w*.1,y,3,h*.3,'#64748B',1);box(x+w*.83,y,3,h*.3,'#64748B',1);
   for(let i=0;i<4;i++)box(x+w*.18+i*w*.16,y+h*.6,3,2,i===0?'#38BDF8':device?.wifiActive?'#22C55E':'#94A3B8',1);
   if(device?.wifiActive){ctx.strokeStyle='#38BDF8';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(x+w*.5,y+h*.23,w*.23,Math.PI*1.15,Math.PI*1.85);ctx.stroke();}break;
  case 'wood-table':
   box(x+3,y+5,w-3,h-3,'rgba(41,37,36,.25)',5);box(x,y,w,h,'#70451F',5);box(x+3,y+2,w-6,h-7,'#A6713E',4);
   ctx.strokeStyle='rgba(80,44,20,.22)';ctx.lineWidth=1;for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(x+6,y+h*i/4);ctx.lineTo(x+w-6,y+h*i/4);ctx.stroke();}break;
  case 'chair':
   box(x+3,y+5,w-3,h-4,'rgba(41,37,36,.22)',4);box(x,y,w,h,'#795335',5);box(x+4,y+3,w-8,h-11,'#B9A17B',4);box(x,y+h-9,w,8,'#63432B',3);break;
  case 'laptop-item': {
   const online=device?.cableConnected;const ipOk=device&&!(device.ipAddress||'').startsWith('169.254');
   box(x,y,w,h*.55,'#334155',3);box(x+3,y+3,w-6,h*.55-6,device?(!online?'#991B1B':!ipOk?'#B45309':'#0284C7'):'#0284C7',1);
   box(x,y+h*.55,w,h*.45,'#CBD5E1',2);box(x+4,y+h*.61,w-8,h*.15,'#334155',1);box(x+w*.36,y+h*.82,w*.28,h*.1,'#94A3B8',1);
   if(device&&!online){ctx.strokeStyle='#FECACA';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x+w*.4,y+h*.18);ctx.lineTo(x+w*.6,y+h*.36);ctx.moveTo(x+w*.6,y+h*.18);ctx.lineTo(x+w*.4,y+h*.36);ctx.stroke();}break;
  }
  case 'monitor-item':
   box(x+w*.4,y+h*.65,w*.2,h*.24,'#475569',1);box(x+w*.25,y+h*.88,w*.5,h*.1,'#334155',2);
   box(x,y,w,h*.72,'#1E293B',3);box(x+3,y+3,w-6,h*.72-6,'#0F766E',1);box(x+6,y+6,w*.5,3,'#67C4C0',1);break;
  case 'printer-item':
   box(x,y+h*.12,w,h*.78,'#475569',4);box(x+2,y+h*.16,w-4,h*.36,'#CBD5D5');box(x+w*.15,y,w*.7,h*.25,'#FAF8F1',1);
   box(x+5,y+h*.55,w-10,4,'#17232A',1);box(x+w*.2,y+h*.65,w*.6,h*.34,'#FAF8F1',1);break;
  case 'desk-lamp':
   oval(x+w*.5,y+h*.76,w*.35,h*.18,'#334155');box(x+w*.46,y+h*.2,w*.1,h*.52,'#8A6C3C',1);oval(x+w*.5,y+h*.22,w*.46,h*.22,'#D99A35');oval(x+w*.5,y+h*.27,w*.3,h*.1,'#FDE68A');break;
  case 'book-stack':
   box(x+2,y+4,w-2,h-4,'#0F766E',1);box(x,y,w-3,h-6,'#F6E7BF',1);box(x+3,y+3,w-9,3,'#B45309',1);break;
  case 'cup-tray':
   box(x,y,w,h,'#976F44',4);box(x+3,y+3,w-6,h-6,'#C5AA7F',3);
   for(const fx of [.3,.7]){oval(x+w*fx,y+h*.5,w*.16,h*.27,'#FAF6E9');oval(x+w*fx,y+h*.5,w*.11,h*.18,'#805333');}break;
 }
}
