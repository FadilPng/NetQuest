import type {GameLocation,MapProp} from '../game/types';
import {importLayout,overlaps} from './model';
export type Opening={x:number;y:number};
export type RoomDraft={props:MapProp[];tiles:number[][];openings:Opening[]};
export type WallTool='select'|'wall'|'erase'|'door';
export const initialRoom=(h:GameLocation):RoomDraft=>({props:h.props.map(p=>({...p})),tiles:h.tiles.map(r=>[...r]),openings:[]});
const wall=(t:number)=>t===1||t===5;
export function editWall(room:RoomDraft,h:GameLocation,tool:WallTool,start:Opening,end:Opening):RoomDraft{
 if(tool==='select')return room;
 const dx=end.x-start.x,dy=end.y-start.y;
 const horizontal=Math.abs(dx)>=Math.abs(dy);
 const steps=tool==='door'?0:Math.abs(horizontal?dx:dy);
 if(![start.x,start.y,end.x,end.y].every(Number.isInteger)||steps>Math.max(h.cols,h.rows))throw new Error('Koordinat grid tidak valid.');
 const cells=Array.from({length:steps+1},(_,i)=>({x:start.x+(horizontal?Math.sign(dx)*i:0),y:start.y+(!horizontal?Math.sign(dy)*i:0)}));
 const next:RoomDraft={props:room.props,tiles:room.tiles.map(r=>[...r]),openings:room.openings.map(p=>({...p}))};
 for(const c of cells){
  if(c.x<=0||c.y<=0||c.x>=h.cols-1||c.y>=h.rows-1)throw new Error('Dinding luar dikunci agar rumah tetap tertutup.');
  if(tool==='wall'&&!wall(room.tiles[c.y][c.x])){
   if(room.props.some(p=>overlaps({...p,...c,w:1,h:1},p)))throw new Error('Pindahkan furnitur sebelum menambah dinding di sini.');
   if([h.spawn,...h.npcs].some(p=>p.x+.4>c.x&&p.x-.4<c.x+1&&p.y+.4>c.y&&p.y-.4<c.y+1))throw new Error('Dinding tidak boleh menutup NPC atau titik masuk.');
  }
  if(tool==='door'&&!wall(room.tiles[c.y][c.x]))throw new Error('Klik dinding dalam untuk membuat bukaan pintu.');
  next.openings=next.openings.filter(p=>p.x!==c.x||p.y!==c.y);
  if(tool==='wall')next.tiles[c.y][c.x]=1;
  else if(wall(room.tiles[c.y][c.x]))next.tiles[c.y][c.x]=wall(h.tiles[c.y][c.x])?0:h.tiles[c.y][c.x];
  if(tool==='door')next.openings.push(c);
 }
 return next;
}
export function exportRoom(room:RoomDraft,h:GameLocation){return JSON.stringify({format:'netquest-room',version:3,location:h.id,cols:h.cols,rows:h.rows,...room},null,2);}
export function importRoom(text:string,h:GameLocation,current:RoomDraft):RoomDraft{
 const v=JSON.parse(text);
 if(v?.format!=='netquest-room')return {...current,props:importLayout(text,h.props,h.cols,h.rows)};
 if(v.version!==3||v.location!==h.id||v.cols!==h.cols||v.rows!==h.rows||!Array.isArray(v.tiles)||v.tiles.length!==h.rows||!Array.isArray(v.openings)||v.openings.length>h.cols*h.rows)throw new Error('Format/ukuran denah tidak cocok.');
 if(v.tiles.some((r:unknown)=>!Array.isArray(r)||r.length!==h.cols||r.some(t=>![0,1,2,3,4,5].includes(t))))throw new Error('Grid dinding tidak valid.');
 const props=importLayout(JSON.stringify({format:'netquest-furniture',version:2,location:h.id,props:v.props}),h.props,h.cols,h.rows);
 const seen=new Set<string>();
 for(const p of v.openings){if(!p||!Number.isInteger(p.x)||!Number.isInteger(p.y)||p.x<=0||p.y<=0||p.x>=h.cols-1||p.y>=h.rows-1||wall(v.tiles[p.y][p.x])||seen.has(`${p.x},${p.y}`))throw new Error('Bukaan pintu tidak valid.');seen.add(`${p.x},${p.y}`);}
 for(let y=0;y<h.rows;y++)for(let x=0;x<h.cols;x++){
  if(x===0||y===0||x===h.cols-1||y===h.rows-1){if(v.tiles[y][x]!==h.tiles[y][x])throw new Error('Dinding luar dikunci.');}
  else if(wall(v.tiles[y][x])&&!wall(h.tiles[y][x]))editWall({props,tiles:h.tiles,openings:[]},h,'wall',{x,y},{x,y});
 }
 return {props,tiles:v.tiles,openings:v.openings.map((p:Opening)=>({x:p.x,y:p.y}))};
}
