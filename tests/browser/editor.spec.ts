import {test,expect,type Page} from '@playwright/test';
const state=async(p:Page)=>JSON.parse(await p.getByTestId('editor-state').textContent()||'{}');
const item=async(p:Page,id='house-sofa')=>(await state(p)).props.find((v:{id:string})=>v.id===id);
async function drag(p:Page,dx:number,dy:number,cancel=false){
 const prop=await item(p);const c=p.getByLabel('Kanvas editor rumah Ratna');const b=(await c.boundingBox())!;const v=JSON.parse((await c.getAttribute('data-view'))!);
 const x=b.x+v.ox+(prop.x+prop.w/2)*48*v.scale,y=b.y+v.oy+(prop.y+prop.h/2)*48*v.scale;
 await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x+dx*48*v.scale,y+dy*48*v.scale,{steps:8});if(cancel)await p.keyboard.press('Escape');await p.mouse.up();
}
test('editor: drag, snap, single-step undo/redo, cancel and read-only game data',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/editor.html');
 await expect(page.getByRole('heading',{name:/House editor/})).toBeVisible();
 const before=await item(page);await drag(page,.7,-1.2);const after=await item(page);
 expect(after.x).toBe(11.25);expect(after.y).toBe(17.5);expect((await state(page)).cursor).toBe(1);
 await page.getByTitle('Undo (Ctrl+Z)').click();expect(await item(page)).toEqual(before);
 await page.getByTitle('Redo (Ctrl+Shift+Z)').click();expect(await item(page)).toEqual(after);
 await drag(page,1,1,true);expect(await item(page)).toEqual(after);expect((await state(page)).cursor).toBe(1);
 await page.getByLabel('Tabrakan',{exact:true}).check();
 await page.getByLabel('Posisi X',{exact:true}).fill('12');await page.getByLabel('Posisi X',{exact:true}).press('Enter');
 expect((await item(page)).x).toBe(12);await page.keyboard.press('Control+z');expect((await item(page)).x).toBe(after.x);
 await page.screenshot({path:'test-results/editor-overview.png'});
 expect(errors).toEqual([]);
 // Fresh load reads the original location, not the editor draft.
 await page.reload();expect(await item(page)).toEqual(before);
});
test('editor: export/import round trip, invalid import and undo branch',async({page})=>{
 await page.goto('/editor.html');await expect(page.getByLabel('Posisi X',{exact:true})).toBeVisible();
 await page.getByLabel('Posisi X',{exact:true}).fill('12');await page.getByLabel('Posisi X',{exact:true}).press('Enter');
 const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Ekspor JSON'}).click();const download=await downloaded;
 const stream=await download.createReadStream();let json='';for await(const chunk of stream!)json+=chunk.toString();
 expect(JSON.parse(json).props.find((p:{id:string})=>p.id==='house-sofa').x).toBe(12);
 await page.getByTitle('Undo (Ctrl+Z)').click();
 await page.locator('input[type=file]').setInputFiles({name:'positions.json',mimeType:'application/json',buffer:Buffer.from(json)});
 await expect(page.getByRole('status')).toContainText('diimpor');expect((await item(page)).x).toBe(12);
 await page.getByTitle('Undo (Ctrl+Z)').click();await page.getByLabel('Posisi X',{exact:true}).fill('11');await page.getByLabel('Posisi X',{exact:true}).press('Enter');
 await expect(page.getByTitle('Redo (Ctrl+Shift+Z)')).toBeDisabled();
 const before=await state(page);await page.locator('input[type=file]').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"location":"house"}')});
 await expect(page.getByRole('status')).toContainText('Impor gagal');expect((await state(page)).props).toEqual(before.props);
});


test('editor 2: catalog add, resize, rotate, delete, history and v2 round trip',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/editor.html');
 const count=(await state(page)).props.length;
 await page.getByRole('button',{name:'Katalog +'}).click();
 await page.getByRole('button',{name:'Tambah Sofa',exact:true}).click();
 const id=(await state(page)).selected;
 expect((await state(page)).props).toHaveLength(count+1);
 expect(id).toMatch(/^editor-/);
 await page.getByLabel('Lebar objek').fill('3');await page.getByLabel('Lebar objek').press('Enter');
 expect((await item(page,id)).w).toBe(3);
 await page.getByRole('button',{name:'Putar 90°'}).click();const rotated=await item(page,id);
 expect(rotated.rotation).toBe(90);expect(rotated.w).toBe(1.2);expect(rotated.h).toBe(3);
 await page.getByLabel('Tabrakan',{exact:true}).check();
 await page.screenshot({path:'test-results/editor-2-catalog.png'});
 const dl=page.waitForEvent('download');await page.getByRole('button',{name:'Ekspor JSON'}).click();
 const stream=await (await dl).createReadStream();let json='';for await(const chunk of stream!)json+=chunk.toString();
 expect(JSON.parse(json).version).toBe(2);
 await page.getByRole('button',{name:'Hapus objek',exact:true}).click();expect((await state(page)).props).toHaveLength(count);
 await page.getByTitle('Undo (Ctrl+Z)').click();expect(await item(page,id)).toEqual(rotated);
 await page.getByTitle('Undo (Ctrl+Z)').click();expect((await item(page,id)).rotation||0).toBe(0);
 await page.locator('input[type=file]').setInputFiles({name:'furniture.json',mimeType:'application/json',buffer:Buffer.from(json)});
 await expect(page.getByRole('status')).toContainText('diimpor');expect(await item(page,id)).toEqual(rotated);
 expect(errors).toEqual([]);
});

test('editor 2: device protection, invalid sizes/import, v1 compatibility',async({page})=>{
 await page.goto('/editor.html');const before=(await state(page)).props;
 await page.getByRole('button',{name:/Laptop Bu Ratna.*laptop-item/}).click();
 await expect(page.getByRole('button',{name:'Hapus objek',exact:true})).toBeDisabled();
 await expect(page.getByRole('button',{name:'Putar 90°'})).toBeDisabled();
 await expect(page.getByLabel('Lebar objek')).toBeDisabled();
 await page.getByLabel('Cari furnitur').fill('house-sofa');
 // Use the default sofa id through its kind/name instead of relying on hidden IDs.
 await page.getByLabel('Cari furnitur').fill('sofa');await page.locator('.object').filter({hasText:/^▤sofa/}).first().click();
 await page.getByLabel('Lebar objek').fill('0');await page.getByLabel('Lebar objek').press('Enter');
 await expect(page.getByRole('status')).toContainText('Ukuran valid');expect((await state(page)).props).toEqual(before);
 const invalid={format:'netquest-furniture',version:2,location:'house',props:before.filter((p:{id:string})=>p.id!=='house-laptop')};
 await page.locator('input[type=file]').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(invalid))});
 await expect(page.getByRole('status')).toContainText('Impor gagal');expect((await state(page)).props).toEqual(before);
 const legacy={format:'netquest-positions',version:1,location:'house',placements:before.map((p:{id:string;x:number;y:number})=>({id:p.id,x:p.id==='house-sofa'?12:p.x,y:p.y}))};
 await page.locator('input[type=file]').setInputFiles({name:'old.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacy))});
 await expect(page.getByRole('status')).toContainText('diimpor');expect((await item(page)).x).toBe(12);
});

test('modular: moving a table carries its laptop, parenting and deletion guards survive undo/import',async({page})=>{
 await page.goto('/editor.html');await page.getByLabel('Snap grid').selectOption('0');const initial=await state(page);
 const laptop=initial.props.find((p:{id:string})=>p.id==='house-laptop');
 const table=initial.props.find((p:{id:string})=>p.id==='house-study-table');
 await page.getByRole('button',{name:/study table.*wood-table/i}).click();
 await page.getByLabel('Posisi X',{exact:true}).fill(String(table.x+1));await page.getByLabel('Posisi X',{exact:true}).press('Enter');
 expect((await item(page,'house-laptop')).x).toBeCloseTo(laptop.x+1);
 await page.getByRole('button',{name:'Hapus objek',exact:true}).click();await expect(page.getByRole('status')).toContainText('masih memiliki barang');
 await expect(page.getByRole('button',{name:'Putar 90°'})).toBeDisabled();
 await page.getByTitle('Undo (Ctrl+Z)').click();expect(await item(page,'house-laptop')).toEqual(laptop);
 await page.getByRole('button',{name:/Laptop Bu Ratna.*laptop-item/}).click();
 await expect(page.getByLabel('Meja penopang')).toHaveValue('house-study-table');
 await page.getByLabel('Posisi X',{exact:true}).fill('20');await page.getByLabel('Posisi X',{exact:true}).press('Enter');
 expect((await item(page,'house-laptop')).x).toBeCloseTo(table.x+table.w-laptop.w);
 await page.getByRole('button',{name:'Katalog +'}).click();await page.getByRole('button',{name:'Tambah Meja kosong',exact:true}).click();
 const parent=(await state(page)).selected;
 await page.getByRole('button',{name:'Tambah Printer lepas',exact:true}).click();const child=(await state(page)).selected;
 expect((await item(page,child)).parentId).toBe(parent);
 expect((await item(page,child)).solid).toBe(false);
 await page.getByLabel('Meja penopang').selectOption('');expect((await item(page,child)).parentId).toBeUndefined();
 await page.getByTitle('Undo (Ctrl+Z)').click();expect((await item(page,child)).parentId).toBe(parent);
 await page.getByRole('button',{name:'Hapus objek',exact:true}).click();expect(await item(page,child)).toBeUndefined();
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.screenshot({path:'test-results/editor-modular.png'});expect(errors).toEqual([]);
});
