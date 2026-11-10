import {initialRoom,editWall,exportRoom,importRoom,type RoomDraft,type WallTool} from './structure';
import {drawOrder,isSurface,isTabletop} from '../game/propAttachments';
import { drawThinWalls } from '../game/rendering/thinWalls';
import { wallBounds } from '../game/wallGeometry';
import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {RATNA_HOUSE as house} from '../game/locations/ratnaHouse';
import {createInitialDevices} from '../game/worldData';
import {drawFloorTile,drawWallTile,drawMapProp,TILE_SIZE} from '../game/sprites';
import type {MapProp} from '../game/types';
import {placementWarnings,resizeProp,addCatalogProp,deleteProp,moveWithContents,replaceAttachedProp,rotateWithContents,attachTo} from './model';
import {CATALOG,assetFor,protectedProp,dimensionLimits,type CatalogAsset} from './catalog';
import './style.css';
const devices=createInitialDevices();
const nice=(p:MapProp)=>p.label||(p.id.startsWith('editor-')?assetFor(p)?.name:undefined)||p.id.replace(/^house-/,'').replace(/-/g,' ');
function AssetPreview({asset}:{asset:CatalogAsset}) {
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{const c=ref.current!,ctx=c.getContext('2d')!;c.width=144;c.height=88;
   const scale=Math.min(128/(asset.w*48+16),72/(asset.h*48+16));ctx.clearRect(0,0,144,88);ctx.translate((144-asset.w*48*scale)/2,(88-asset.h*48*scale)/2);ctx.scale(scale,scale);
   drawMapProp(ctx,{id:'preview',kind:asset.kind,x:0,y:0,w:asset.w,h:asset.h,solid:asset.solid},undefined,0,false);
 },[asset]);return <canvas ref={ref} aria-hidden="true"/>;
}
function Editor(){
 const [history,setHistory]=useState<RoomDraft[]>([initialRoom(house)]);const [cursor,setCursor]=useState(0);
 const room=history[cursor];const props=room.props;
 const [tool,setTool]=useState<WallTool>('select');
 const [wallPreview,setWallPreview]=useState<RoomDraft|null>(null);const visibleRoom=wallPreview||room;const tiles=visibleRoom.tiles;
 const stroke=useRef<{start:{x:number;y:number};next:RoomDraft|null}|null>(null);const [draft,setDraft]=useState<MapProp[]|null>(null);const shown=draft||props;
 const [selected,setSelected]=useState<string|null>('house-sofa');const item=shown.find(p=>p.id===selected);
 const [libraryTab,setLibraryTab]=useState<'objects'|'catalog'>('objects');
 const [snap,setSnap]=useState(.25);const [grid,setGrid]=useState(true);const [collision,setCollision]=useState(false);
 const [zoom,setZoom]=useState(1);const [pan,setPan]=useState({x:0,y:0});const [query,setQuery]=useState('');
 const [message,setMessage]=useState('Siap menata. Perubahan hanya di editor, bukan di game.');
 const [size,setSize]=useState({w:800,h:700});const canvas=useRef<HTMLCanvasElement>(null);const stage=useRef<HTMLDivElement>(null);
 const file=useRef<HTMLInputElement>(null);const drag=useRef<{id:number;propId?:string;x:number;y:number;px:number;py:number;start:MapProp[]}|null>(null);
 const view=useRef({scale:1,ox:0,oy:0});
 const dirty=JSON.stringify(room)!==JSON.stringify(initialRoom(house));
 const commitRoom=(next:RoomDraft)=>{if(JSON.stringify(next)===JSON.stringify(room))return;setHistory(h=>[...h.slice(0,cursor+1),next]);setCursor(cursor+1);};
 const commit=(next:MapProp[])=>commitRoom({...room,props:next});
 const undo=()=>{if(drag.current||stroke.current)return;setDraft(null);setCursor(c=>Math.max(0,c-1));};
 const redo=()=>{if(drag.current||stroke.current)return;setDraft(null);setCursor(c=>Math.min(history.length-1,c+1));};
 const attempt=(action:()=>MapProp[])=>{try{commit(action());}catch(err){setMessage(err instanceof Error?err.message:'Perubahan tidak valid.');}};
 const remove=()=>{if(item)attempt(()=>deleteProp(props,item.id));};
 const add=(kind:MapProp['kind'])=>{
  setTool('select');
  if(props.length>=256){setMessage('Maksimum 256 objek per layout.');return;}
  const v=view.current;const x=(size.w/2-v.ox)/v.scale/48,y=(size.h/2-v.oy)/v.scale/48;
  const id='editor-'+crypto.randomUUID();const a=CATALOG.find(a=>a.kind===kind)!;
  const next=addCatalogProp(kind,id,x-a.w/2,y-a.h/2,house.cols,house.rows,snap);
  let result=[...props,next];const surface=item&&(isSurface(item)?item:props.find(p=>p.id===item.parentId));
  if(isTabletop(next)&&surface&&surface.w>=next.w&&surface.h>=next.h)result=attachTo(result,id,surface.id);
  commit(result);setSelected(id);setMessage(`${a.name} ditambahkan. Geser dari tengah tampilan ke posisi tujuan.`);
 };
 const reposition=(id:string,x:number,y:number)=>commit(moveWithContents(props,id,x,y,house.cols,house.rows,snap));
 useEffect(()=>{const el=stage.current!;const ob=new ResizeObserver(()=>setSize({w:el.clientWidth,h:el.clientHeight}));ob.observe(el);return()=>ob.disconnect();},[]);
 useEffect(()=>{const stop=(e:BeforeUnloadEvent)=>{if(dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',stop);return()=>window.removeEventListener('beforeunload',stop);},[dirty]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{
   if((e.target as HTMLElement).closest('input,select,textarea'))return;
   if(e.key==='Escape'){drag.current=null;stroke.current=null;setWallPreview(null);setDraft(null);return;}
   if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}
   if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo();return;}
   if(tool!=='select')return;
   if((e.key==='Delete'||e.key==='Backspace')&&item){e.preventDefault();remove();return;}
   if(item&&e.key.startsWith('Arrow')){e.preventDefault();const n=e.shiftKey?1:(snap||.1);reposition(item.id,item.x+(e.key==='ArrowRight'?n:e.key==='ArrowLeft'?-n:0),item.y+(e.key==='ArrowDown'?n:e.key==='ArrowUp'?-n:0));}
 };window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);});
 useEffect(()=>{
   const c=canvas.current!;const dpr=window.devicePixelRatio||1;c.width=size.w*dpr;c.height=size.h*dpr;
   const ctx=c.getContext('2d')!;ctx.scale(dpr,dpr);ctx.fillStyle='#e7e1d5';ctx.fillRect(0,0,size.w,size.h);
   const scale=Math.min((size.w-60)/(house.cols*TILE_SIZE),(size.h-60)/(house.rows*TILE_SIZE))*zoom;
   const ox=(size.w-house.cols*TILE_SIZE*scale)/2+pan.x,oy=(size.h-house.rows*TILE_SIZE*scale)/2+pan.y;view.current={scale,ox,oy};
   c.dataset.view=JSON.stringify(view.current);
   ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);
   tiles.forEach((row,y)=>row.forEach((t,x)=>{if(t===1||t===5)drawWallTile(ctx,x,y,t===5,tiles);else drawFloorTile(ctx,x,y,t,tiles);}));
   for(const door of visibleRoom.openings){
    const x=door.x*48,y=door.y*48;const vertical=tiles[door.y-1]?.[door.x]===1||tiles[door.y+1]?.[door.x]===1;
    ctx.fillStyle='#A6713E';if(vertical){ctx.fillRect(x,y,48,3);ctx.fillRect(x,y+45,48,3);}else{ctx.fillRect(x,y,3,48);ctx.fillRect(x+45,y,3,48);}
    ctx.strokeStyle='rgba(15,118,110,.65)';ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.strokeRect(x+5,y+5,38,38);ctx.setLineDash([]);
   }
   if(house.walls)drawThinWalls(ctx,house.walls);
   if(grid){ctx.strokeStyle='rgba(51,65,85,.2)';ctx.lineWidth=1/scale;ctx.beginPath();for(let x=0;x<=house.cols;x++){ctx.moveTo(x*48,0);ctx.lineTo(x*48,house.rows*48);}for(let y=0;y<=house.rows;y++){ctx.moveTo(0,y*48);ctx.lineTo(house.cols*48,y*48);}ctx.stroke();}
   for(const p of drawOrder(shown)){const d=p.deviceId?devices[p.deviceId]:undefined;drawMapProp(ctx,p,d?{...d,x:p.x,y:p.y,widthTiles:p.w,heightTiles:p.h}:undefined,0,false);}
   ctx.font='bold 11px sans-serif';ctx.fillStyle='rgba(62,39,24,.45)';for(const l of house.roomLabels||[])ctx.fillText(l.text,l.x*48,l.y*48);
   if(collision){
     ctx.fillStyle='rgba(185,28,28,.18)';tiles.forEach((row,y)=>row.forEach((t,x)=>{if(t===1||t===5)ctx.fillRect(x*48,y*48,48,48);}));
     for(const wall of house.walls||[]){const b=wallBounds(wall);ctx.fillRect(b.x*48,b.y*48,b.w*48,b.h*48);}
     for(const p of shown){ctx.fillStyle=p.solid?'rgba(225,29,72,.22)':'rgba(14,165,233,.1)';ctx.fillRect(p.x*48,p.y*48,p.w*48,p.h*48);ctx.strokeStyle=p.solid?'#be123c':'#0284c7';ctx.lineWidth=1/scale;ctx.strokeRect(p.x*48,p.y*48,p.w*48,p.h*48);}
   }
   // Read-only NPC and spawn markers; moving them belongs to later editor stages.
   for(const npc of house.npcs){ctx.fillStyle='#9f1239';ctx.beginPath();ctx.arc(npc.x*48,npc.y*48,.62*48,0,Math.PI*2);ctx.fill();ctx.fillStyle='white';ctx.font='bold 11px sans-serif';ctx.fillText(npc.name,npc.x*48-20,npc.y*48+4);}
   ctx.strokeStyle='#0284c7';ctx.lineWidth=2/scale;ctx.beginPath();ctx.arc(house.spawn.x*48,house.spawn.y*48,12,0,Math.PI*2);ctx.stroke();
   if(item){ctx.strokeStyle='#0f766e';ctx.lineWidth=3/scale;ctx.setLineDash([6/scale,4/scale]);ctx.strokeRect(item.x*48-2,item.y*48-2,item.w*48+4,item.h*48+4);ctx.setLineDash([]);}
   ctx.restore();
 },[shown,item,grid,collision,size,zoom,pan,visibleRoom]);
 const point=(e:React.PointerEvent)=>{const rect=canvas.current!.getBoundingClientRect();const v=view.current;return{x:(e.clientX-rect.left-v.ox)/v.scale/48,y:(e.clientY-rect.top-v.oy)/v.scale/48};};
 const paint=(e:React.PointerEvent)=>{if(!stroke.current)return;const p=point(e);try{const next=editWall(room,house,tool,stroke.current.start,{x:Math.floor(p.x),y:Math.floor(p.y)});stroke.current.next=next;setWallPreview(next);setMessage('Pratinjau dinding · lepas mouse untuk terapkan · Esc untuk batal.');}catch(err){stroke.current.next=null;setWallPreview(null);setMessage(err instanceof Error?err.message:'Tidak valid');}};
 const move=(e:React.PointerEvent)=>{
   if(stroke.current){paint(e);return;}

   const d=drag.current;if(!d||d.id!==e.pointerId)return;
   if(!d.propId){setPan({x:d.px+e.clientX-d.x,y:d.py+e.clientY-d.y});return;}
   const pos=point(e);setDraft(moveWithContents(d.start,d.propId,d.px+pos.x-d.x,d.py+pos.y-d.y,house.cols,house.rows,snap));
 };
 const end=(e:React.PointerEvent,cancel=false)=>{if(stroke.current){if(!cancel&&stroke.current.next){commitRoom(stroke.current.next);setMessage('Denah diperbarui. Bisa di-undo; belum diterapkan ke game.');}stroke.current=null;setWallPreview(null);if(canvas.current?.hasPointerCapture(e.pointerId))canvas.current.releasePointerCapture(e.pointerId);return;}const d=drag.current;if(!d)return;if(d.propId&&!cancel){const pos=point(e);if(Math.hypot(pos.x-d.x,pos.y-d.y)>.02)commit(moveWithContents(d.start,d.propId,d.px+pos.x-d.x,d.py+pos.y-d.y,house.cols,house.rows,snap));}drag.current=null;setDraft(null);if(canvas.current?.hasPointerCapture(e.pointerId))canvas.current.releasePointerCapture(e.pointerId);};
 const download=()=>{const blob=new Blob([exportRoom(room,house)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='ratna-room-v3.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Denah v3 (dinding, bukaan, furnitur) diekspor. File ini belum diterapkan ke game.');};
 const warnings=item?placementWarnings(item,shown,tiles,house.walls):[];
 const allWarnings=shown.filter(p=>placementWarnings(p,shown,tiles,house.walls).length).length;
 return <div className="editor">
   <header><div className="brand">NQ<span>WORKSHOP</span></div><div className="heading"><h1>House editor <b>03 · dinding & pintu</b></h1><p>Rumah Bu Ratna <span> / </span> Tata letak furnitur</p></div><div className="top-actions"><span className="local">{dirty?'● Draf lokal':'● Layout awal'}</span><button onClick={()=>file.current?.click()}>Impor JSON</button><button className="primary" onClick={download}>Ekspor JSON ↗</button></div></header>
   <div className="workspace"><aside className="library"><div className="library-tabs"><button aria-pressed={libraryTab==='objects'} onClick={()=>setLibraryTab('objects')}>Di rumah <small>{props.length}</small></button><button aria-pressed={libraryTab==='catalog'} onClick={()=>setLibraryTab('catalog')}>Katalog +</button></div><input aria-label="Cari furnitur" placeholder="Cari furnitur…" value={query} onChange={e=>setQuery(e.target.value)}/>
   {libraryTab==='objects'?<div className="object-list">{props.filter(p=>(nice(p)+' '+p.kind).toLowerCase().includes(query.toLowerCase())).map(p=><button key={p.id} className={selected===p.id?'object active':'object'} onClick={()=>{setTool('select');setSelected(p.id);}}><span className="object-icon">{p.deviceId?'▣':p.solid?'▤':'◇'}</span><span>{nice(p)}<small>{p.kind}{protectedProp(p)?' · dilindungi':''}</small></span></button>)}</div>:
   <div className="catalog-list">{CATALOG.filter(a=>(a.name+' '+a.kind).toLowerCase().includes(query.toLowerCase())).map(a=><button key={a.kind} aria-label={`Tambah ${a.name}`} onClick={()=>add(a.kind)} className="asset-card"><AssetPreview asset={a}/><strong>{a.name}</strong><small>{a.w} × {a.h} tile {a.rotate?' · ↻':''}</small><span>+ Tambahkan</span></button>)}</div>}
   <div className="library-note">Aset yang sama dengan game.<br/>Komponen lepas · tanpa dekorasi dinding.</div></aside>
   <main><div className="toolbar"><div><button title="Undo (Ctrl+Z)" disabled={cursor===0} onClick={undo}>↶ Undo</button><button title="Redo (Ctrl+Shift+Z)" disabled={cursor===history.length-1} onClick={redo}>↷ Redo</button></div><div><label>Snap <select aria-label="Snap grid" value={snap} onChange={e=>setSnap(Number(e.target.value))}><option value="0">Bebas</option><option value="0.25">¼ tile</option><option value="0.5">½ tile</option><option value="1">1 tile</option></select></label><label><input type="checkbox" checked={grid} onChange={e=>setGrid(e.target.checked)}/> Grid</label><label><input type="checkbox" checked={collision} onChange={e=>setCollision(e.target.checked)}/> Tabrakan</label></div></div>
   <div className="wall-tools" role="group" aria-label="Alat denah">{([['select','Pilih objek'],['wall','Tambah dinding'],['door','Bukaan pintu'],['erase','Hapus dinding']] as const).map(([id,label])=><button key={id} aria-pressed={tool===id} onClick={()=>{setTool(id);setSelected(null);}}>{label}</button>)}<span>{tool==='select'?'Mode furnitur':'Grid 1 tile · klik / tarik garis · dinding luar terkunci'}</span></div>
   <div className="stage" ref={stage}><canvas aria-label="Kanvas editor rumah Ratna" ref={canvas} onContextMenu={e=>e.preventDefault()} onPointerDown={e=>{
    if(e.button!==0&&e.button!==1)return;e.preventDefault();const pos=point(e);if(e.button===0&&tool!=='select'){stroke.current={start:{x:Math.floor(pos.x),y:Math.floor(pos.y)},next:null};paint(e);e.currentTarget.setPointerCapture(e.pointerId);return;}const hit=e.button===0?drawOrder(shown).reverse().find(p=>pos.x>=p.x&&pos.x<=p.x+p.w&&pos.y>=p.y&&pos.y<=p.y+p.h):undefined;
    if(hit){setSelected(hit.id);drag.current={id:e.pointerId,propId:hit.id,x:pos.x,y:pos.y,px:hit.x,py:hit.y,start:props};}
    else{if(e.button===0)setSelected(null);drag.current={id:e.pointerId,x:e.clientX,y:e.clientY,px:pan.x,py:pan.y,start:props};}
    e.currentTarget.setPointerCapture(e.pointerId);
   }} onPointerMove={move} onPointerUp={e=>end(e)} onPointerCancel={e=>end(e,true)} onLostPointerCapture={()=>{stroke.current=null;setWallPreview(null);drag.current=null;setDraft(null);}}/>
   <div className="canvas-badge">DENAH INTERIOR <span>{house.cols} × {house.rows} tile</span></div><div className="zoom"><button aria-label="Perkecil" onClick={()=>setZoom(z=>Math.max(.5,z-.25))}>−</button><span>{Math.round(zoom*100)}%</span><button aria-label="Perbesar" onClick={()=>setZoom(z=>Math.min(3,z+.25))}>+</button><button onClick={()=>{setZoom(1);setPan({x:0,y:0});}}>Pas peta</button></div>
   </div><div className="hint">Drag objek · Drag area kosong / mouse tengah untuk pan · Panah untuk geser · Delete hapus · Esc batalkan drag</div></main>
   <aside className="inspector"><div className="section-title">INSPEKTOR</div>{item?<><h2>{nice(item)}</h2><code>{item.id}</code><div className="fields" key={item.id+':'+item.x+':'+item.y}>{(['x','y'] as const).map(axis=><label key={axis}>{axis.toUpperCase()} <span>tile</span><input aria-label={`Posisi ${axis.toUpperCase()}`} type="number" step={snap||.1} defaultValue={item[axis]} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}} onBlur={e=>{if(e.currentTarget.value.trim()!==''&&Number.isFinite(e.currentTarget.valueAsNumber))reposition(item.id,axis==='x'?e.currentTarget.valueAsNumber:item.x,axis==='y'?e.currentTarget.valueAsNumber:item.y);}}/></label>)}</div><div className="fields dimensions" key={'size:'+item.id+':'+item.w+':'+item.h}>
   {(['w','h'] as const).map(axis=><label key={axis}>{axis==='w'?'Lebar':'Tinggi'} <span>tile</span><input aria-label={axis==='w'?'Lebar objek':'Tinggi objek'} type="number" step="0.1" disabled={!dimensionLimits(item)} defaultValue={item[axis]} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}} onBlur={e=>{const value=e.currentTarget.valueAsNumber;try{const next=resizeProp(item,axis==='w'?value:item.w,axis==='h'?value:item.h,house.cols,house.rows);commit(replaceAttachedProp(props,next));}catch(err){setMessage(err instanceof Error?err.message:'Ukuran tidak valid.');e.currentTarget.value=String(item[axis]);}}}/></label>)}
   </div><div className="object-actions"><button disabled={!assetFor(item)?.rotate||protectedProp(item)||props.some(p=>p.parentId===item.id)} onClick={()=>attempt(()=>rotateWithContents(props,item.id,house.cols,house.rows))}>↻ Putar 90°</button><span>{item.rotation||0}°</span><button className="danger" disabled={protectedProp(item)} onClick={remove}>Hapus objek</button></div>
   {!dimensionLimits(item)&&<p className="muted">Ukuran dikunci: renderer aset ini belum mendukung resize aman.</p>}
   {isTabletop(item)&&<label className="support-select">Diletakkan di atas<select aria-label="Meja penopang" value={item.parentId||''} onChange={e=>attempt(()=>attachTo(props,item.id,e.target.value||undefined))}><option value="" disabled={Boolean(item.deviceId)}>Tanpa meja</option>{props.filter(isSurface).map(p=><option key={p.id} value={p.id}>{nice(p)} · {p.id.slice(-8)}</option>)}</select></label>}
   {props.some(p=>p.parentId===item.id)&&<p className="muted">Isi meja ikut saat digeser. Rotasi dikunci selama ada barang; ukuran baru harus tetap memuat semua isinya. Meja tidak dapat dihapus sebelum isinya dipindahkan.</p>}
   <dl><dt>Ukuran</dt><dd>{item.w} × {item.h} tile</dd><dt>Tabrakan</dt><dd>{item.solid?'Solid':'Dekoratif'}</dd><dt>Perangkat</dt><dd>{item.deviceId||'—'}</dd></dl><div className={warnings.length?'notice warning':'notice'}>{warnings.length?warnings.join(' '):'Tidak ada tumpukan solid yang terdeteksi.'}</div>{item.deviceId&&<p className="muted">Posisi perangkat pada preview mengikuti objek. Perangkat misi tidak bisa dihapus, diubah ukuran atau diputar; state jaringan tidak diubah.</p>}</>:<div className="empty">Pilih objek di peta atau daftar untuk mengatur posisinya.</div>}<div className="scope"><strong>Editor 3 · dinding & pintu</strong><p>Meja & barang terpisah. Pilih meja sebelum menambah laptop, printer atau aksesori agar otomatis ditautkan. Semua perubahan bisa di-undo.</p><p>Dinding dalam dapat digambar atau dihapus. Bukaan pintu menghapus collision dinding, tanpa daun pintu/animasi. Dinding luar, NPC dan spawn dikunci. Mode coba jalan belum tersedia.</p><p>Overlay merah = tabrakan. Biru = dekorasi/spawn. Ini pemeriksaan tumpukan, bukan jaminan jalur bisa dilewati.</p><button onClick={()=>{if(window.confirm('Kembalikan semua posisi ke layout awal? Bisa di-undo.'))commitRoom(initialRoom(house));}}>Reset ke layout awal</button></div></aside></div>
   <footer><span role="status">{message}</span><span>{allWarnings} objek perlu ditinjau · {cursor} perubahan · Belum diterapkan ke game</span></footer>
   <input ref={file} hidden type="file" accept=".json,application/json" onChange={async e=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;try{if(f.size>1_000_000)throw new Error('File terlalu besar.');const next=importRoom(await f.text(),house,room);commitRoom(next);setSelected(id=>next.props.some(p=>p.id===id)?id:next.props[0]?.id||null);setMessage('Layout diimpor. File v1/v2 hanya mengganti furnitur; v3 memuat denah. Bisa di-undo.');}catch(err){setMessage('Impor gagal: '+(err instanceof Error?err.message:'File tidak valid'));}}}/>
   <output hidden data-testid="editor-state">{JSON.stringify({props:shown,tiles,openings:visibleRoom.openings,tool,selected,cursor,historyLength:history.length,dirty})}</output>
 </div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Editor/></React.StrictMode>);
