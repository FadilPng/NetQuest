import type { MapProp } from './types';
export const isSurface=(p:MapProp)=>p.kind==='wood-table';
export const isTabletop=(p:MapProp)=>['router-item','laptop-item','monitor-item','printer-item','desk-lamp','book-stack','cup-tray'].includes(p.kind);
export const containsProp=(a:MapProp,b:MapProp)=>b.x>=a.x-1e-6&&b.y>=a.y-1e-6&&b.x+b.w<=a.x+a.w+1e-6&&b.y+b.h<=a.y+a.h+1e-6;
export const drawOrder=(props:MapProp[])=>[...props.filter(p=>!p.parentId),...props.filter(p=>p.parentId)];
export function validateAttachments(props:MapProp[]):void {
 for(const child of props){
  if(!child.parentId)continue;
  const parent=props.find(p=>p.id===child.parentId);
  if(!parent||!isSurface(parent)||parent.parentId||!isTabletop(child)||child.solid||!containsProp(parent,child))throw new Error('Barang harus berada di dalam permukaan meja yang valid.');
 }
}
