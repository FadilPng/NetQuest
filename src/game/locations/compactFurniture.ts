import type {MapProp} from '../types';
/** Split only original compact-house bundles; preserve their supporting footprints. */
export function splitCompactFurniture(props:MapProp[]):MapProp[]{
 const result:MapProp[]=[];
 for(const p of props){
  const table=(id:string):MapProp=>({...p,id,kind:'wood-table',deviceId:undefined,label:undefined});
  const item=(id:string,kind:MapProp['kind'],dx:number,dy:number,w:number,h:number,parentId:string):MapProp=>({id,kind,x:Number((p.x+dx).toFixed(3)),y:Number((p.y+dy).toFixed(3)),w,h,solid:false,parentId});
  if(p.id==='house-laptop'&&p.kind==='desk-laptop'){
   if(p.rotation)throw new Error('Kembalikan rotasi paket laptop lama ke 0° sebelum impor.');
   result.push(table('house-study-table'),{...item(p.id,'laptop-item',.5,.3,1,.8,'house-study-table'),deviceId:p.deviceId,label:p.label},
    item('house-study-lamp','desk-lamp',.1,.15,.3,.4,'house-study-table'),item('house-study-book','book-stack',1.65,.25,.3,.5,'house-study-table'),
    {id:'house-study-chair',kind:'chair',x:p.x-.7,y:p.y+1.5,w:.7,h:.7,solid:true});
  }else if(p.id==='house-tv'&&p.kind==='tv-unit'){
   if(p.rotation)throw new Error('Kembalikan rotasi paket TV lama ke 0° sebelum impor.');
   result.push(table('house-tv-table'),{...item(p.id,'monitor-item',.3,.1,1.5,.75,'house-tv-table'),label:p.label});
  }else if(p.id==='house-router'&&p.kind==='home-router'){
   result.push(table('house-router-table'),{...item(p.id,'router-item',.2,.2,1,.7,'house-router-table'),deviceId:p.deviceId,label:p.label});
  }else if(p.id==='house-table'&&p.kind==='coffee-table'){
   if(p.rotation)throw new Error('Kembalikan rotasi meja lama ke 0° sebelum impor.');
   result.push(table(p.id),item('house-table-book','book-stack',.25,.2,.4,.5,p.id),item('house-table-cups','cup-tray',1,.25,.5,.45,p.id));
  }else result.push(p);
 }
 return result;
}
