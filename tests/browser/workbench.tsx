import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import { CableCraftModal } from '../../src/components/CableCraftModal';
import { HardwarePlugModal } from '../../src/components/HardwarePlugModal';
import { createInitialDevices } from '../../src/game/worldData';
import { installPhysicalCable } from '../../src/game/physicalLink';
import type { TechnicianInventory, CraftedCableItem } from '../../src/game/types';
function Harness() {
 const params = new URLSearchParams(location.search);
 const [inventory, setInventory] = useState<TechnicianInventory>({ hasCrimper: !params.has('no-tool'), hasLanTester: !params.has('no-tester'), hasConsoleCable: false, hasMeasuringTape: true, utpRollMeters: 20, rj45Connectors: Number(params.get('connectors') || 6), cables: [], unfinishedCables: params.has('ready') ? [{id:'ready',lengthMeters:7,plan:'straight',createdAt:0,end1:{order:['wo','o','wg','b','wb','g','wbr','br'],flipped:false},end2:{order:params.has('miswire')?['o','wo','wg','b','wb','g','wbr','br']:['wo','o','wg','b','wb','g','wbr','br'],flipped:false}}] : [] });
 const [open, setOpen] = useState(true);
 const [devices, setDevices] = useState(createInitialDevices);
 const [plug, setPlug] = useState<'source'|'target'|null>(null);
 const [cable, setCable] = useState<CraftedCableItem|null>(null);
 return <><button onClick={()=>setOpen(true)}>Buka meja uji</button><button onClick={()=>setPlug('source')}>Uji pemasangan</button><pre id="state" style={{display:'none'}}>{JSON.stringify({inventory, devices, open})}</pre>
 {open && <CableCraftModal inventory={inventory} onUpdateInventory={setInventory} onCraftCable={item=>setInventory(prev=>({...prev,cables:[...prev.cables,item]}))} onClose={()=>setOpen(false)}/>}
 {plug && <HardwarePlugModal device={devices[plug==='source'?'laptop-ratna':'rt-ratna']} mode={plug} inventory={inventory} cableRun={cable?{cableId:cable.id,cableType:cable.type,lengthMeters:cable.lengthMeters,sourceDeviceId:'laptop-ratna',sourcePort:'ETHERNET',usedMeters:6}:null} requiredMeters={6} counterpartName="Lab endpoint" onPlugSource={item=>{setCable(item);setPlug('target');}} onPlugTarget={port=>{if(cable){setDevices(prev=>installPhysicalCable(prev,'laptop-ratna',cable,'rt-ratna',port));setInventory(prev=>({...prev,cables:prev.cables.filter(c=>c.id!==cable.id)}));}setPlug(null);}} onClose={()=>setPlug(null)}/>}
 </>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Harness/></React.StrictMode>);
