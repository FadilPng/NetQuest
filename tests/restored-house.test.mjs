import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
async function load(contents){const r=await build({stdin:{contents,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});return import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));}
const old=execFileSync('git',['show','HEAD:src/game/worldData.ts'],{encoding:'utf8'});
const blocks=['HOUSE_MAP','HOUSE_NPCS','HOUSE_PROPS','HOUSE_CABLES'].map(n=>old.match(new RegExp('const '+n+':[\\s\\S]*?\\n\\];'))[0]);
const obj=old.match(/  house: \{([\s\S]*?)\n  \},\n  office:/)[1];
const {expected}=await load(blocks.join('\n')+'\nexport const expected={'+obj+'};');
const {splitCompactFurniture,RATNA_HOUSE:h,createInitialDevices,exportLayout,importLayout,exportPositions,importPositions}=await load("export {splitCompactFurniture} from './src/game/locations/compactFurniture';export {RATNA_HOUSE} from './src/game/locations/ratnaHouse';export {createInitialDevices} from './src/game/worldData';export * from './src/editor/model';");
assert.deepEqual(h,{...expected,props:splitCompactFurniture(expected.props)});
assert.deepEqual(importLayout(exportLayout(expected.props),h.props,h.cols,h.rows),h.props);
assert.deepEqual(importPositions(exportPositions(expected.props),h.props,h.cols,h.rows),h.props);
assert.deepEqual(importLayout(exportLayout(h.props),h.props,h.cols,h.rows),h.props);
assert.deepEqual(importPositions(exportPositions(h.props),h.props,h.cols,h.rows),h.props);
const devices=createInitialDevices();for(const p of h.props.filter(p=>p.deviceId)){const d=devices[p.deviceId];assert.equal(d.x,p.x);assert.equal(d.y,p.y);assert.equal(d.widthTiles,p.w);assert.equal(d.heightTiles,p.h);}
console.log('PASS compact house retains baseline tiles/NPC/cables/spawn with separated bundles and legacy migration; device bounds and editor v1/v2 round trips');
