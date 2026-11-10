import {test,expect,type Page} from '@playwright/test';
const state=async(p:Page)=>JSON.parse(await p.getByTestId('editor-state').textContent()||'{}');
async function xy(p:Page,x:number,y:number){const c=p.locator('canvas[aria-label="Kanvas editor rumah Ratna"]');const b=await c.boundingBox();const v=JSON.parse(await c.getAttribute('data-view')||'{}');return {x:b!.x+v.ox+(x+.5)*48*v.scale,y:b!.y+v.oy+(y+.5)*48*v.scale};}
async function stroke(p:Page,x:number,y:number,x2=x,y2=y){const a=await xy(p,x,y),b=await xy(p,x2,y2);await p.mouse.move(a.x,a.y);await p.mouse.down();await p.mouse.move(b.x,b.y,{steps:8});await p.mouse.up();}
test('Editor 3: wall line, door, shared history, erase, cancel and protection',async({page})=>{
 await page.goto('/editor.html');await expect(page.getByRole('heading',{name:/House editor/})).toBeVisible();
 const original=await state(page);expect(original.dirty).toBe(false);
 await page.getByRole('button',{name:'Tambah dinding',exact:true}).click();await stroke(page,11,4,11,8);
 let s=await state(page);expect(s.tiles[6][11]).toBe(1);expect(s.cursor).toBe(1);
 await page.getByRole('button',{name:'Bukaan pintu',exact:true}).click();await stroke(page,11,6);s=await state(page);expect(s.tiles[6][11]).toBe(0);expect(s.openings).toEqual([{x:11,y:6}]);
 await page.getByTitle('Undo (Ctrl+Z)').click();expect((await state(page)).tiles[6][11]).toBe(1);
 await page.getByTitle('Redo (Ctrl+Shift+Z)').click();expect((await state(page)).openings).toHaveLength(1);
 await page.getByRole('button',{name:'Hapus dinding',exact:true}).click();await stroke(page,11,4,11,8);expect((await state(page)).tiles).toEqual(original.tiles);expect((await state(page)).openings).toHaveLength(0);
 await page.getByRole('button',{name:'Tambah dinding',exact:true}).click();const a=await xy(page,11,4);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.keyboard.press('Escape');await page.mouse.up();expect((await state(page)).tiles).toEqual(original.tiles);
 await stroke(page,0,5);await expect(page.getByRole('status')).toContainText('luar dikunci');expect((await state(page)).tiles).toEqual(original.tiles);
 await stroke(page,3,2);await expect(page.getByRole('status')).toContainText('furnitur');
});
test('Editor 3: v3 export/import, rejected import atomicity and undo',async({page})=>{
 await page.goto('/editor.html');await page.getByRole('button',{name:'Tambah dinding',exact:true}).click();await stroke(page,11,4,11,8);await page.getByRole('button',{name:'Bukaan pintu',exact:true}).click();await stroke(page,11,6);
 const before=await state(page);const dl=page.waitForEvent('download');await page.getByRole('button',{name:'Ekspor JSON ↗'}).click();const download=await dl;expect(download.suggestedFilename()).toBe('ratna-room-v3.json');const stream=await download.createReadStream();let text='';for await(const part of stream!)text+=part.toString();expect(JSON.parse(text).version).toBe(3);
 await page.getByTitle('Undo (Ctrl+Z)').click();
 await page.locator('input[type=file]').setInputFiles({name:'room.json',mimeType:'application/json',buffer:Buffer.from(text)});expect((await state(page)).openings).toEqual(before.openings);
 const valid=await state(page);const bad=JSON.parse(text);bad.tiles[0][0]=0;await page.locator('input[type=file]').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});await expect(page.getByRole('status')).toContainText('Impor gagal');expect(await state(page)).toEqual(valid);
 await page.screenshot({path:'test-results/editor3-walls.png'});
});
test('Editor 3: furniture and wall changes share history without losing grid',async({page})=>{
 await page.goto('/editor.html');await page.getByRole('button',{name:'Tambah dinding',exact:true}).click();await stroke(page,11,4,11,8);
 const withWall=await state(page);
 await page.getByRole('button',{name:'Katalog +'}).click();await page.getByRole('button',{name:'Tambah Meja kosong',exact:true}).click();
 const added=await state(page);expect(added.tool).toBe('select');expect(added.tiles).toEqual(withWall.tiles);expect(added.props.length).toBe(withWall.props.length+1);
 await page.getByTitle('Undo (Ctrl+Z)').click();expect((await state(page)).props).toEqual(withWall.props);expect((await state(page)).tiles).toEqual(withWall.tiles);
 await page.getByTitle('Undo (Ctrl+Z)').click();expect((await state(page)).tiles[6][11]).toBe(0);
 await page.getByTitle('Redo (Ctrl+Shift+Z)').click();expect((await state(page)).tiles[6][11]).toBe(1);
});
test('compact modular: parent movement, individual selection, undo and protected device',async({page})=>{
 await page.goto('/editor.html');await page.getByLabel('Snap grid').selectOption('0');
 const initial=await state(page);const laptop=initial.props.find((p:any)=>p.id==='house-laptop');
 await page.getByRole('button',{name:/study table.*wood-table/i}).click();
 await page.getByLabel('Posisi X',{exact:true}).fill('3.7');await page.getByLabel('Posisi X',{exact:true}).press('Enter');
 expect((await state(page)).props.find((p:any)=>p.id==='house-laptop').x).toBeCloseTo(laptop.x+1);
 await page.getByRole('button',{name:'Hapus objek',exact:true}).click();await expect(page.getByRole('status')).toContainText('masih memiliki barang');
 await page.getByTitle('Undo (Ctrl+Z)').click();
 await page.getByRole('button',{name:/Laptop Bu Ratna.*laptop-item/}).click();await expect(page.getByLabel('Meja penopang')).toHaveValue('house-study-table');await expect(page.getByRole('button',{name:'Hapus objek',exact:true})).toBeDisabled();
 expect((await state(page)).props.find((p:any)=>p.id==='house-laptop')).toEqual(laptop);
});
test('compact modular: actual laptop remains interactive in game',async({page})=>{
 await page.goto('/tests/browser/world.html?compact');const c=page.locator('canvas');await expect.poll(async()=>Boolean(await c.getAttribute('data-world'))).toBe(true);
 const w=JSON.parse(await c.getAttribute('data-world')||'{}'),b=await c.boundingBox();await page.mouse.click(b!.x+w.camera.offsetX+3.7*48*w.camera.scale,b!.y+w.camera.offsetY+2.8*48*w.camera.scale);
 await expect(page.getByRole('dialog',{name:/Komputer/})).toBeVisible();await page.getByRole('button',{name:'Periksa fisik perangkat'}).click();await expect(page.getByRole('button',{name:/Ukur jarak dengan meteran|Ukur ulang/})).toBeVisible();
});
