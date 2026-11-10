import {migrateFurniture} from './migrateFurniture';
import {isSurface,isTabletop,validateAttachments} from '../game/propAttachments';
import { CATALOG, assetFor, dimensionLimits, protectedProp } from './catalog';
import { hitsWalls } from '../game/wallGeometry';
import type { MapProp, WallSegment } from '../game/types';
export function positionProp(prop:MapProp,x:number,y:number,cols:number,rows:number,snap:number):MapProp {
  const round=(n:number)=>snap>0?Math.round(n/snap)*snap:n;
  return {...prop,x:Number(Math.max(0,Math.min(cols-prop.w,round(x))).toFixed(3)),y:Number(Math.max(0,Math.min(rows-prop.h,round(y))).toFixed(3))};
}
export function exportPositions(props:MapProp[]):string {
  return JSON.stringify({format:'netquest-positions',version:1,location:'house',placements:props.map(({id,x,y})=>({id,x,y}))},null,2);
}
export function importPositions(text:string,base:MapProp[],cols:number,rows:number):MapProp[] {
  const data=JSON.parse(text);
  // Retired wall decorations are dropped when opening an older positions export.
  if(Array.isArray(data?.placements))data.placements=data.placements.filter((p:{id?:string})=>!['house-pkk-board','house-family-photo'].includes(p?.id||''));
  if(data?.format==='netquest-positions'&&data.version===1&&data.location==='house'&&Array.isArray(data.placements)&&!data.placements.some((p:{id:string})=>p.id==='house-study-table')&&base.some(p=>p.id==='house-study-table')){
    const legacyKinds:Record<string,MapProp['kind']>={'house-router':'home-router','house-laptop':'desk-laptop','house-printer':'printer-table','house-tv':'tv-unit','house-dining':'dining-set','house-table':'coffee-table'};
    const legacy=data.placements.map((v:{id:string;x:number;y:number})=>{
      const seed=base.find(p=>p.id===v.id);if(!seed)throw new Error('ID layout lama tidak dikenal.');
      const surface=seed.parentId?base.find(p=>p.id===seed.parentId):undefined;
      return {...seed,parentId:undefined,w:surface?.w??seed.w,h:surface?.h??seed.h,solid:surface?.solid??seed.solid,kind:legacyKinds[v.id]||seed.kind,x:v.x,y:v.y};
    });
    const migrated=migrateFurniture(legacy,base);
    return importLayout(JSON.stringify({format:'netquest-furniture',version:2,location:'house',props:migrated}),base,cols,rows);
  }
  if(data.format!=='netquest-positions'||data.version!==1||data.location!=='house'||!Array.isArray(data.placements)||data.placements.length!==base.length)throw new Error('Format tidak cocok. Gunakan ekspor posisi rumah Ratna versi 1.');
  const seen=new Set<string>();
  for(const p of data.placements){
    const original=base.find(b=>b.id===p.id);
    if(!original||seen.has(p.id)||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.y<0||p.x+original.w>cols||p.y+original.h>rows)throw new Error('ID duplikat/tidak dikenal atau koordinat di luar peta.');
    seen.add(p.id);
  }
  const result=base.map(p=>{const v=data.placements.find((v:{id:string})=>v.id===p.id);return {...p,x:v.x,y:v.y};});
  validateAttachments(result);return result;
}
export function overlaps(a:MapProp,b:MapProp):boolean {
  return a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y;
}
export function placementWarnings(prop:MapProp,props:MapProp[],tiles:number[][],walls:readonly WallSegment[]=[]):string[] {
  if(!prop.solid)return isTabletop(prop)&&!prop.parentId?['Belum ditautkan ke meja. Pilih permukaan di inspektor.']:[];
  const warnings:string[]=[];
  for(let y=Math.floor(prop.y);y<Math.ceil(prop.y+prop.h);y++)for(let x=Math.floor(prop.x);x<Math.ceil(prop.x+prop.w);x++){
    if([1,5].includes(tiles[y]?.[x])){warnings.push('Bertumpuk dengan dinding.');y=tiles.length;break;}
  }
  if(hitsWalls(prop,walls)&&!warnings.includes('Bertumpuk dengan dinding.'))warnings.push('Bertumpuk dengan dinding.');
  if(props.some(p=>p.id!==prop.id&&p.solid&&overlaps(prop,p)))warnings.push('Bertumpuk dengan furnitur solid lain.');
  return warnings;
}

export function resizeProp(prop:MapProp,w:number,h:number,cols:number,rows:number):MapProp {
 const limits=dimensionLimits(prop);
 if(!limits||!Number.isFinite(w)||!Number.isFinite(h))throw new Error('Ukuran aset ini tidak bisa diubah.');
 if(w<limits[0]||h<limits[1]||w>limits[2]||h>limits[3])throw new Error(`Ukuran valid: ${limits[0]}–${limits[2]} × ${limits[1]}–${limits[3]} tile.`);
 return positionProp({...prop,w:Number(w.toFixed(3)),h:Number(h.toFixed(3))},prop.x,prop.y,cols,rows,0);
}
export function rotateProp(prop:MapProp,cols:number,rows:number):MapProp {
 if(!assetFor(prop)?.rotate||protectedProp(prop))throw new Error('Rotasi belum didukung untuk aset ini.');
 const rotation=((prop.rotation||0)+90)%360 as 0|90|180|270;
 return positionProp({...prop,rotation,w:prop.h,h:prop.w},prop.x+(prop.w-prop.h)/2,prop.y+(prop.h-prop.w)/2,cols,rows,0);
}
export function addCatalogProp(kind:MapProp['kind'],id:string,x:number,y:number,cols:number,rows:number,snap:number):MapProp {
 const asset=CATALOG.find(a=>a.kind===kind);if(!asset)throw new Error('Aset tidak tersedia.');
 return positionProp({id,kind,x,y,w:asset.w,h:asset.h,solid:asset.solid},x,y,cols,rows,snap);
}
export function deleteProp(props:MapProp[],id:string):MapProp[] {
 const p=props.find(p=>p.id===id);if(!p)return props;
 if(protectedProp(p))throw new Error('Objek misi dan pintu dilindungi.');
 if(props.some(c=>c.parentId===id))throw new Error('Meja masih memiliki barang. Pindahkan atau lepas isinya terlebih dahulu.');
 return props.filter(p=>p.id!==id);
}
export function exportLayout(props:MapProp[]):string {
 return JSON.stringify({format:'netquest-furniture',version:2,location:'house',props},null,2);
}
export function importLayout(text:string,base:MapProp[],cols:number,rows:number):MapProp[] {
 const data=JSON.parse(text);
 if(data?.format==='netquest-positions')return importPositions(text,base,cols,rows);
 if(Array.isArray(data?.props))data.props=data.props.filter((p:MapProp)=>p&&!['pkk-board','family-photo'].includes(p.kind));
 if(Array.isArray(data?.props))data.props=migrateFurniture(data.props,base);
 if(data?.format!=='netquest-furniture'||data.version!==2||data.location!=='house'||!Array.isArray(data.props)||data.props.length>256)throw new Error('Gunakan file furnitur v2 atau posisi v1 NetQuest.');
 const seen=new Set<string>();
 const result:MapProp[]=data.props.map((v:MapProp)=>{
   if(!v||typeof v.id!=='string'||v.id.length>100||seen.has(v.id))throw new Error('ID objek tidak valid atau duplikat.');
   seen.add(v.id);
   const old=base.find(p=>p.id===v.id);
   const a=CATALOG.find(a=>a.kind===v.kind);
   if(old ? v.kind!==old.kind : !a||!/^editor-[a-zA-Z0-9-]+$/.test(v.id))throw new Error('Jenis atau ID aset tidak dikenali.');
   const template:MapProp=old||{id:v.id,kind:v.kind,x:0,y:0,w:a!.w,h:a!.h,solid:a!.solid};
   if(v.deviceId!==template.deviceId||v.solid!==template.solid||v.label!==template.label)throw new Error('Metadata perangkat, label dan collision tidak boleh diubah lewat impor.');
   if(template.deviceId&&template.parentId&&!v.parentId)throw new Error('Perangkat misi wajib memiliki meja.');
   const angle=v.rotation??0;
   if(![0,90,180,270].includes(angle)||(angle!==0&&(!a?.rotate||protectedProp(template))))throw new Error('Rotasi tidak didukung.');
   const p={...template,parentId:v.parentId,x:v.x,y:v.y,w:v.w,h:v.h,...(v.rotation!==undefined?{rotation:v.rotation}:{})};
   if(v.parentId===undefined)delete p.parentId;
   const limits=dimensionLimits(p);
   if(![p.x,p.y,p.w,p.h].every(Number.isFinite)||p.x<0||p.y<0||p.w<=0||p.h<=0||p.x+p.w>cols||p.y+p.h>rows)throw new Error('Ukuran/posisi di luar batas peta.');
   if(limits){if(p.w<limits[0]||p.w>limits[2]||p.h<limits[1]||p.h>limits[3])throw new Error('Ukuran aset di luar batas aman.');}
   else if(p.w!==((angle===90||angle===270)?template.h:template.w)||p.h!==((angle===90||angle===270)?template.w:template.h))throw new Error('Ukuran aset ini dikunci.');
   return p;
 });
 if(base.some(p=>protectedProp(p)&&!seen.has(p.id)))throw new Error('Perangkat misi atau pintu wajib tetap ada.');
 validateAttachments(result);
 return result;
}


/** Translate a surface and its children atomically; tabletop drag stays on its surface. */
export function moveWithContents(props:MapProp[],id:string,x:number,y:number,cols:number,rows:number,snap:number):MapProp[] {
 const p=props.find(p=>p.id===id);if(!p)return props;
 let next=positionProp(p,x,y,cols,rows,snap);
 const parent=props.find(q=>q.id===p.parentId);
 if(parent)next={...next,x:Math.max(parent.x,Math.min(parent.x+parent.w-p.w,next.x)),y:Math.max(parent.y,Math.min(parent.y+parent.h-p.h,next.y))};
 const dx=next.x-p.x,dy=next.y-p.y;
 return props.map(q=>q.id===id?next:q.parentId===id?{...q,x:Number((q.x+dx).toFixed(3)),y:Number((q.y+dy).toFixed(3))}:q);
}
export function replaceAttachedProp(props:MapProp[],next:MapProp):MapProp[] {
 const old=props.find(p=>p.id===next.id);
 const dx=next.x-(old?.x??next.x),dy=next.y-(old?.y??next.y);
 const result=props.map(p=>p.id===next.id?next:p.parentId===next.id?{...p,x:p.x+dx,y:p.y+dy}:p);validateAttachments(result);return result;
}
export function attachTo(props:MapProp[],id:string,parentId:string|undefined):MapProp[] {
 const child=props.find(p=>p.id===id);if(!child||!isTabletop(child))throw new Error('Hanya barang meja yang dapat ditautkan.');
 if(!parentId){if(child.deviceId)throw new Error('Perangkat misi harus tetap di atas meja.');return props.map(p=>p.id===id?{...p,parentId:undefined}:p);}
 const parent=props.find(p=>p.id===parentId);
 if(!parent||!isSurface(parent)||parent.w<child.w||parent.h<child.h)throw new Error('Meja tidak cukup besar.');
 const next={...child,parentId,x:Math.max(parent.x,Math.min(parent.x+parent.w-child.w,child.x)),y:Math.max(parent.y,Math.min(parent.y+parent.h-child.h,child.y))};
 return replaceAttachedProp(props,next);
}
export function rotateWithContents(props:MapProp[],id:string,cols:number,rows:number):MapProp[]{
 const item=props.find(p=>p.id===id);if(!item)return props;
 if(props.some(p=>p.parentId===id))throw new Error('Pindahkan isi meja sebelum memutar meja.');
 return replaceAttachedProp(props,rotateProp(item,cols,rows));
}
