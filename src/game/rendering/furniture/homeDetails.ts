import { roundRect } from '../primitives';
import type { FurnitureDrawArgs } from './types';

/** Reusable household props. Bounds/collision belong to the location data. */
export function drawHomeDetail({ctx,px:x,py:y,pw:w,ph:h,prop}:FurnitureDrawArgs) {
  const box=(a:number,b:number,c:number,d:number,color:string,r=3)=>{
    ctx.fillStyle=color;roundRect(ctx,a,b,c,d,r);ctx.fill();
  };
  const ellipse=(a:number,b:number,c:number,d:number,color:string)=>{
    ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(a,b,c,d,0,0,Math.PI*2);ctx.fill();
  };
  if(prop.solid)box(x+3,y+5,w,h,'rgba(41,37,36,.22)',5);
  switch(prop.kind){
    case 'printer-table':
      box(x,y,w,h,'#7C4A21');box(x+3,y+3,w-6,h-8,'#A6713E');
      box(x+8,y+9,w*.58,h*.65,'#475569',5);box(x+10,y+8,w*.58-4,h*.36,'#CBD5D5');
      box(x+16,y-3,w*.38,h*.3,'#FAF8F1',1);
      box(x+15,y+h*.53,w*.4,5,'#1C292D',1);box(x+20,y+h*.6,w*.3,h*.27,'#FAF8F1',1);
      box(x+w*.74,y+7,w*.16,h*.65,'#0F766E',1);box(x+w*.75,y+13,w*.14,5,'#F1E7CC',0);
      break;
    case 'wardrobe':
      box(x,y,w,h,'#704923',4);box(x+4,y+3,w-8,h-8,'#A67A4E');
      ctx.strokeStyle='#79532F';ctx.lineWidth=2;ctx.strokeRect(x+7,y+7,w/2-10,h-17);ctx.strokeRect(x+w/2+3,y+7,w/2-10,h-17);
      box(x+w/2-6,y+h*.48,3,10,'#D9C794',1);box(x+w/2+4,y+h*.48,3,10,'#D9C794',1);
      break;
    case 'dining-set': {
      // Chairs stay inside the prop collision footprint.
      for(const sy of [.18,.66]){
        box(x,y+h*sy,w*.2,h*.2,'#805831');box(x+w*.8,y+h*sy,w*.2,h*.2,'#805831');
        box(x+3,y+h*sy+3,w*.14,h*.12,'#B9A17B');box(x+w*.83,y+h*sy+3,w*.14,h*.12,'#B9A17B');
      }
      box(x+w*.2,y+2,w*.6,h-4,'#855A32',6);box(x+w*.23,y+5,w*.54,h-10,'#B68A53',5);
      ellipse(x+w*.5,y+h*.5,9,12,'#F4EADA');ellipse(x+w*.5,y+h*.5,5,7,'#D9A342');
      break;
    }
    case 'washbasin':
      box(x,y,w,h,'#8D7358');box(x+2,y+2,w-4,h-5,'#ECECE3');
      ellipse(x+w*.5,y+h*.55,w*.32,h*.3,'#B8CAC7');ellipse(x+w*.5,y+h*.53,w*.25,h*.22,'#F8FAF5');
      box(x+w*.46,y+2,5,10,'#7C8C92',1);break;
    case 'toilet':
      box(x+4,y,w-8,h*.32,'#DCE4DE',5);ellipse(x+w/2,y+h*.64,w*.44,h*.36,'#F7F8F0');
      ellipse(x+w/2,y+h*.64,w*.28,h*.24,'#9CADAA');ellipse(x+w/2,y+h*.64,w*.19,h*.17,'#D6E6E5');
      box(x+w*.65,y+5,7,3,'#8E9B9E',1);break;
    case 'shower':
      box(x,y,w,h,'#8CA19C');box(x+3,y+3,w-6,h-6,'#C5D4CC');
      ctx.strokeStyle='rgba(255,255,255,.6)';ctx.lineWidth=1;
      for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(x+w*i/4,y);ctx.lineTo(x+w*i/4,y+h);ctx.stroke();}
      box(x+w*.46,y+5,4,h*.25,'#71858A',1);ellipse(x+w*.5,y+h*.28,8,5,'#E2E9E4');
      box(x+w*.7,y+h*.8,8,8,'#728681',1);break;
    case 'pkk-board':
      box(x,y,w,h,'#805D3F');box(x+4,y+4,w-8,h-8,'#D2B48A');
      box(x+9,y+11,w*.38,h-22,'#FAF6E9',1);box(x+w*.55,y+11,w*.3,h-22,'#EEE2B7',1);
      ctx.fillStyle='#0F766E';ctx.font='bold 9px sans-serif';ctx.fillText('PKK',x+13,y+25);
      ctx.strokeStyle='#A99B80';ctx.lineWidth=1;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(x+13,y+32+i*5);ctx.lineTo(x+w*.4,y+32+i*5);ctx.stroke();}
      break;
    case 'family-photo':
      box(x,y,w,h,'#795335');box(x+4,y+4,w-8,h-8,'#D7DDD2');
      for(let i=0;i<4;i++){const fx=x+10+i*(w-20)/3;ellipse(fx,y+h*.44,4,5,'#CE9C75');box(fx-4,y+h*.57,8,h*.23,i%2?'#0F766E':'#9F1239',3);}
      break;
    case 'chair-stack':
      for(let i=2;i>=0;i--){box(x+i*3,y+i*5,w-8,h-12,'#785735',4);box(x+4+i*3,y+5+i*5,w-16,h-24,'#B69A74',3);}break;
    case 'door-threshold':
      // Only the two jambs: no line across the opening that could look like a closed wall.
      if(w>h){box(x-2,y-1,4,h+2,'#A9855B',1);box(x+w-2,y-1,4,h+2,'#A9855B',1);}
      else{box(x-1,y-2,w+2,4,'#A9855B',1);box(x-1,y+h-2,w+2,4,'#A9855B',1);}
      break;
  }
}
