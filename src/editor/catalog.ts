import type { MapProp } from '../game/types';
export interface CatalogAsset {kind:MapProp['kind'];name:string;w:number;h:number;solid:boolean;resize?:[number,number,number,number];rotate?:boolean}
export const CATALOG:CatalogAsset[]=[
 {kind:'router-item',name:'Router dekoratif',w:1,h:.7,solid:false,rotate:true},
 {kind:'wood-table',name:'Meja kosong',w:2,h:1.4,solid:true,resize:[.8,.7,5,4],rotate:true},
 {kind:'chair',name:'Kursi lepas',w:.7,h:.7,solid:true,resize:[.45,.45,1.3,1.3],rotate:true},
 {kind:'laptop-item',name:'Laptop dekoratif',w:1,h:.8,solid:false,rotate:true},
 {kind:'monitor-item',name:'Monitor / TV meja',w:1.5,h:.75,solid:false,rotate:true},
 {kind:'printer-item',name:'Printer lepas',w:1,h:.7,solid:false,rotate:true},
 {kind:'desk-lamp',name:'Lampu meja',w:.3,h:.4,solid:false,rotate:true},
 {kind:'book-stack',name:'Buku / map',w:.3,h:.5,solid:false,rotate:true},
 {kind:'cup-tray',name:'Nampan minuman',w:.7,h:.5,solid:false,rotate:true},
 {kind:'sofa',name:'Sofa',w:2.5,h:1.2,solid:true,resize:[1.8,1,5,2.5],rotate:true},
 {kind:'bed',name:'Tempat tidur',w:3.1,h:2.8,solid:true,resize:[1.8,2.5,4,4],rotate:true},
 {kind:'wardrobe',name:'Lemari',w:1.1,h:2.5,solid:true,resize:[.9,1.5,3,4],rotate:true},
 {kind:'bookshelf',name:'Rak buku lantai',w:2,h:.9,solid:true},
 {kind:'kitchenette',name:'Meja dapur',w:2.6,h:1.2,solid:true},
 {kind:'plant-monstera',name:'Tanaman monstera',w:1,h:1,solid:true},
 {kind:'plant-snake',name:'Lidah mertua',w:1,h:1,solid:true},
 {kind:'water-cooler',name:'Dispenser',w:1,h:1,solid:true},
 {kind:'washbasin',name:'Wastafel',w:1.2,h:.8,solid:true},
 {kind:'toilet',name:'Kloset',w:1,h:1.5,solid:true},
 {kind:'shower',name:'Shower',w:1.4,h:2.2,solid:true},
 {kind:'chair-stack',name:'Kursi cadangan',w:.8,h:1.1,solid:true},
];
export const assetFor=(p:MapProp)=>CATALOG.find(a=>a.kind===p.kind);
export const protectedProp=(p:MapProp)=>Boolean(p.deviceId)||['entry-door','door-threshold'].includes(p.kind);
export function dimensionLimits(p:MapProp):[number,number,number,number]|undefined {
 const r=assetFor(p)?.resize;if(!r||protectedProp(p))return;
 return (p.rotation===90||p.rotation===270)?[r[1],r[0],r[3],r[2]]:r;
}
