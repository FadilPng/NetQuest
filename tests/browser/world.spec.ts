import { test, expect, type Page } from '@playwright/test';
const state=async(p:Page)=>JSON.parse(await p.getByTestId('world-state').textContent()||'{}');
const world=async(p:Page)=>JSON.parse(await p.locator('canvas').getAttribute('data-world')||'{}');
async function clickWorld(p:Page,x:number,y:number){const w=await world(p);const box=await p.locator('canvas').boundingBox();await p.mouse.click(box!.x+w.camera.offsetX+x*48*w.camera.scale,box!.y+w.camera.offsetY+y*48*w.camera.scale);}
async function move(p:Page,axis:'x'|'y',target:number){
 const deadline=Date.now()+12000;
 while(Date.now()<deadline){const pos=(await world(p)).player[axis];const diff=target-pos;if(Math.abs(diff)<.09)return;const key=axis==='x'?(diff>0?'d':'a'):(diff>0?'s':'w');await p.keyboard.down(key);await p.waitForTimeout(Math.min(120,Math.max(18,Math.abs(diff)*140)));await p.keyboard.up(key);await p.waitForTimeout(25);}
 throw new Error(`Failed walking to ${axis}=${target}; player=${JSON.stringify((await world(p)).player)}`);
}
async function openLaptop(p:Page){await clickWorld(p,3.7,12.8);await expect(p.getByRole('dialog',{name:/Komputer/})).toBeVisible();await p.getByRole('button',{name:'Periksa fisik perangkat'}).click();}
async function beginMeasure(p:Page){await openLaptop(p);await p.getByRole('button',{name:/Ukur jarak dengan meteran|Ukur ulang/}).click();await expect.poll(async()=>(await state(p)).cableRun?.mode).toBe('measure');}
async function beginCable(p:Page){await openLaptop(p);await p.getByRole('button',{name:/Colok Ujung A/}).click();await p.getByRole('button',{name:/ETHERNET/}).click();await expect.poll(async()=>(await state(p)).cableRun?.mode).toBe('cable');}
async function route(p:Page){await move(p,'y',16.5);await move(p,'x',17);await move(p,'y',13.5);await move(p,'x',18.3);}
async function returnToLaptop(p:Page){await move(p,'x',17);await move(p,'y',16.5);await move(p,'x',3.7);await move(p,'y',14.1);}
test('world: measure real walking route, return, pull and install LAN 2',async({page})=>{
 await page.goto('/tests/browser/world.html');await expect.poll(async()=>Boolean((await world(page)).camera)).toBe(true);
 await beginMeasure(page);await route(page);const w=await world(page);const pts=[...w.trail,w.player,{x:18.3,y:11.95}];const fullMeters=pts.slice(1).reduce((sum:any,pt:any,i:number)=>sum+Math.hypot(pt.x-pts[i].x,pt.y-pts[i].y)*.5,0);await clickWorld(page,18.3,11.95);await expect.poll(async()=>(await state(page)).cableRun).toBeNull();expect((await state(page)).measuredRoutes['laptop-ratna']).toBeGreaterThanOrEqual(fullMeters-.01);expect((await state(page)).measuredRoutes['laptop-ratna']).toBeGreaterThan(6);
 await returnToLaptop(page);await beginCable(page);await route(page);await clickWorld(page,18.3,11.95);await page.getByRole('button',{name:/LAN 2/}).click();await expect.poll(async()=>(await state(page)).devices['laptop-ratna'].cableConnected).toBe(true);expect((await state(page)).inventory.cables).toHaveLength(0);expect((await state(page)).devices['laptop-ratna'].uplinkPortLabel).toBe('LAN 2');await page.screenshot({path:'test-results/world-installed.png'});
});
test('world: short cable becomes taut, player can retreat, cancel preserves cable',async({page})=>{
 await page.goto('/tests/browser/world.html?length=2');await expect.poll(async()=>Boolean((await world(page)).camera)).toBe(true);await beginCable(page);await pHold(page,'d',1500);await expect.poll(async()=>(await state(page)).cableTaut).toBe(true);const x=(await world(page)).player.x;
 await pHold(page,'a',400);expect((await world(page)).player.x).toBeLessThan(x-.3);
 await page.getByRole('button',{name:'Batal & Gulung'}).click();expect((await state(page)).inventory.cables).toHaveLength(1);expect((await state(page)).cableRun).toBeNull();expect((await state(page)).devices['laptop-ratna'].cableConnected).toBe(false);
});
async function pHold(p:Page,key:string,ms:number){await p.keyboard.down(key);await p.waitForTimeout(ms);await p.keyboard.up(key);}

test('world: remaining distance to destination port cannot be skipped with a short cable',async({page})=>{
 await page.goto('/tests/browser/world.html?length=11');await expect.poll(async()=>Boolean((await world(page)).camera)).toBe(true);await beginCable(page);await route(page);await clickWorld(page,18.3,11.95);await page.getByRole('button',{name:/LAN 1/}).click();
 const panel=page.getByRole('dialog',{name:'Inspeksi port perangkat'});await expect(panel.getByTestId('target-route-length')).toContainText('Total sampai port:');await expect(panel.getByRole('alert')).toContainText('Kabel kurang panjang! Rute sampai port');await expect(panel.getByRole('alert')).toBeVisible();expect((await state(page)).inventory.cables).toHaveLength(1);expect((await state(page)).devices['laptop-ratna'].cableConnected).toBe(false);expect((await state(page)).cableRun.mode).toBe('cable');await page.keyboard.press('Escape');await page.getByRole('button',{name:'Batal & Gulung'}).click();expect((await state(page)).inventory.cables).toHaveLength(1);
});
test('world: cancel measurement and travel during a pull leave inventory and devices intact',async({page})=>{
 await page.goto('/tests/browser/world.html');await expect.poll(async()=>Boolean((await world(page)).camera)).toBe(true);await beginMeasure(page);await pHold(page,'d',200);await page.getByRole('button',{name:'Batal & Gulung'}).click();expect((await state(page)).measuredRoutes).toEqual({});await move(page,'x',3.7);await beginCable(page);await pHold(page,'d',250);await page.keyboard.press('r');await page.getByRole('button',{name:'Ke Kantor'}).click();await expect.poll(async()=>(await state(page)).location).toBe('base');expect((await state(page)).cableRun).toBeNull();expect((await state(page)).inventory.cables).toHaveLength(1);expect((await state(page)).devices['laptop-ratna'].cableConnected).toBe(false);await expect.poll(async()=>(await world(page)).trail.length).toBe(0);
});
test('world: pushing against furniture does not pass through it or consume route length',async({page})=>{
 await page.goto('/tests/browser/world.html');await expect.poll(async()=>Boolean((await world(page)).camera)).toBe(true);await beginMeasure(page);await pHold(page,'w',600);const a=await world(page);const used=(await state(page)).cableRun.usedMeters;await pHold(page,'w',400);const b=await world(page);expect(b.player.y).toBeGreaterThanOrEqual(13.6);expect(Math.abs(a.player.y-b.player.y)).toBeLessThan(.02);expect((await state(page)).cableRun.usedMeters).toBeCloseTo(used,2);await page.getByRole('button',{name:'Batal & Gulung'}).click();
});


test('world: camera follows after completing a job and dismissing the reward card',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/tests/browser/world.html?mission');
 await expect.poll(async()=>Boolean((await world(page)).camera)).toBe(true);
 await beginCable(page);await route(page);await clickWorld(page,18.3,11.95);
 await page.getByRole('button',{name:/LAN 2/}).click();
 await expect(page.getByRole('button',{name:'Lihat Job Berikutnya di HP'})).toBeVisible();
 await page.getByRole('button',{name:'Lihat Job Berikutnya di HP'}).click();
 await expect.poll(async()=>(await state(page)).currentMissionIndex).toBe(1);
 // At 100% the entire map fits: stationary camera is intentional. Zoom in
 // so this assertion really exercises following, not a map-edge clamp.
 for(let i=0;i<5;i++)await page.keyboard.press('+');
 await expect(page.getByText('175%',{exact:true})).toBeVisible();
 await page.waitForTimeout(700);
 await move(page,'x',17);await move(page,'y',16.5);await move(page,'x',14);
 const before=await world(page);
 await move(page,'x',12);await page.waitForTimeout(500);
 const after=await world(page);
 expect(after.player.x).toBeLessThan(before.player.x-1.7);
 expect(after.camera.offsetX).toBeGreaterThan(before.camera.offsetX+80);
 const box=await page.locator('canvas').boundingBox();
 expect(Math.abs(after.player.x*48*after.camera.scale+after.camera.offsetX-box!.width/2)).toBeLessThan(12);
 // Camera must also resume after opening/closing the inventory.
 await page.keyboard.press('r');await page.keyboard.press('Escape');
 await move(page,'x',14);await page.waitForTimeout(500);
 expect((await world(page)).camera.offsetX).toBeLessThan(after.camera.offsetX-80);
 expect(errors).toEqual([]);
 await page.screenshot({path:'test-results/camera-after-mission.png'});
});


test('world: compact HUD travel menu returns to office safely and back to the job',async({page})=>{
 await page.goto('/tests/browser/world.html');
 await expect.poll(async()=>Boolean((await world(page)).camera)).toBe(true);
 await expect(page.getByTitle('Toko Online (di HP)')).toHaveCount(0);
 await page.screenshot({path:'test-results/desktop-clean-hud.png'});
 await beginCable(page);await pHold(page,'d',200);
 await page.getByRole('button',{name:'Pindah',exact:true}).click();
 const menu=page.getByRole('dialog',{name:'Pindah tempat'});
 await expect(menu).toBeVisible();await expect(menu).toContainText('Kabel tetap di tas');
 const pos=(await world(page)).player.x;await pHold(page,'d',200);
 expect((await world(page)).player.x).toBeCloseTo(pos,2);
 await page.keyboard.press('Escape');await expect(menu).not.toBeVisible();
 await page.getByRole('button',{name:'Pindah',exact:true}).click();
 await page.screenshot({path:'test-results/desktop-travel-menu.png'});
 await menu.getByRole('button',{name:'Kembali ke kantor',exact:true}).click();
 await expect.poll(async()=>(await state(page)).location).toBe('base');
 expect((await state(page)).cableRun).toBeNull();expect((await state(page)).inventory.cables).toHaveLength(1);
 await page.getByRole('button',{name:'Pindah',exact:true}).click();
 await expect(menu.getByRole('button',{name:'Sudah di kantor'})).toBeDisabled();
 await menu.getByRole('button',{name:'Ke Rumah Ibu Ratna'}).click();
 await expect.poll(async()=>(await state(page)).location).toBe('house');
 await expect(menu).not.toBeVisible();
});


test('phone: right handset, Supdawg call stays inside HP and acceptance records NetQuest job',async({page})=>{
 await page.goto('/tests/browser/world.html?base');
 await page.getByRole('button',{name:'Buka HP (Q)'}).click();
 const phone=page.getByRole('dialog',{name:'Ponsel teknisi'});
 await expect(phone).toBeVisible();await page.waitForTimeout(250);
 const box=await phone.boundingBox();expect(box!.x).toBeGreaterThan(950);expect(box!.width).toBeLessThan(350);
 await phone.getByRole('button',{name:/Buka NetQuest:/}).click();
 await expect(phone.getByText('Belum ada job aktif')).toBeVisible();
 await expect(phone.getByTestId('phone-call')).toHaveCount(0);
 await phone.getByRole('button',{name:'Buka Supdawg',exact:true}).click();
 await phone.getByRole('button',{name:/Supdawg · Panggilan masuk/}).click();await swipeAnswer(page);
 await expect(phone.getByTestId('phone-call')).toBeVisible();
 expect((await state(page)).jobAccepted).toBe(false);
 await phone.getByRole('button',{name:'Akhiri tanpa menerima'}).click();
 expect((await state(page)).jobAccepted).toBe(false);
 await phone.getByRole('button',{name:/Supdawg · Panggilan masuk/}).click();await swipeAnswer(page);
 await page.screenshot({path:'test-results/desktop-phone-call.png'});
 for(let i=0;i<15;i++){
   if(await phone.getByRole('button',{name:'Setuju & terima job'}).count())break;
   await phone.getByRole('button',{name:'Lanjut percakapan'}).click();
 }
 await phone.getByRole('button',{name:'Setuju & terima job'}).click();
 await expect.poll(async()=>(await state(page)).jobAccepted).toBe(true);
 await expect(phone).toBeVisible();await expect(phone.getByText('Job diterima',{exact:true})).toBeVisible();
 await phone.getByRole('button',{name:'Layar utama'}).click();
 await phone.getByRole('button',{name:/Buka Lupabapak:/}).click();
 await expect(phone.getByText('Lupabapak',{exact:true})).toBeVisible();
 await page.keyboard.press('Escape');await expect(phone).not.toBeVisible();
 await expect(page.getByRole('button',{name:'Buka HP (Q)'})).toBeVisible();
});

test('phone: incoming notification overlays without shifting home or Supdawg',async({page})=>{
 for(const height of [900,768,650]){
  await page.setViewportSize({width:1365,height});
  await page.goto('/tests/browser/world.html?base');
  await page.getByRole('button',{name:'Buka HP (Q)'}).click();
  const phone=page.getByRole('dialog',{name:'Ponsel teknisi'});
  await page.waitForTimeout(250);
  const home=phone.locator('.nq-home-screen');
  expect(await home.evaluate(e=>e.scrollHeight-e.clientHeight)).toBeLessThanOrEqual(1);
  const apps=await phone.locator('.nq-home-apps').boundingBox();
  const nav=await phone.locator('.nq-system-nav').boundingBox();
  expect(apps!.y+apps!.height).toBeLessThan(nav!.y);
  await phone.getByRole('button',{name:'Tutup notifikasi panggilan'}).click();
  expect((await phone.locator('.nq-home-apps').boundingBox())!.y).toBeCloseTo(apps!.y,1);
  await phone.getByRole('button',{name:/Buka Supdawg:/}).click();
  await phone.getByRole('button',{name:'Angkat panggilan klien'}).click();await swipeAnswer(page);
  await expect(phone.getByTestId('phone-call')).toBeVisible();
  await phone.getByRole('button',{name:'Akhiri tanpa menerima'}).click();
  expect((await state(page)).jobAccepted).toBe(false);
  await phone.getByRole('button',{name:'Layar utama'}).click();
  if(height===768)await page.screenshot({path:'test-results/phone-home-no-scroll.png'});
 }
});

async function swipeAnswer(page:Page,distance=65){
 const button=page.getByRole('button',{name:'Angkat panggilan: tarik ke atas',exact:true});
 const b=(await button.boundingBox())!;
 await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();
 await page.mouse.move(b.x+b.width/2,b.y+b.height/2-distance,{steps:8});await page.mouse.up();
}

test('phone: incoming call requires upward drag, supports reject and disables messages',async({page})=>{
 await page.goto('/tests/browser/world.html?base');await page.getByRole('button',{name:'Buka HP (Q)'}).click();
 const phone=page.getByRole('dialog',{name:'Ponsel teknisi'});
 await phone.getByRole('button',{name:/Supdawg · Panggilan masuk/}).click();
 await expect(phone.getByTestId('incoming-call-screen')).toBeVisible();
 await expect(phone.getByTestId('phone-call')).toHaveCount(0);
 await expect(phone.getByRole('button',{name:'Pesan (belum tersedia)'})).toBeDisabled();
 await phone.getByRole('button',{name:'Angkat panggilan: tarik ke atas',exact:true}).click();
 await expect(phone.getByTestId('incoming-call-screen')).toBeVisible();
 await swipeAnswer(page,20);await expect(phone.getByTestId('incoming-call-screen')).toBeVisible();
 await page.screenshot({path:'test-results/phone-incoming-right.png'});
 await phone.getByRole('button',{name:'Tolak panggilan',exact:true}).click();
 expect((await state(page)).jobAccepted).toBe(false);
 await expect(phone.getByTestId('incoming-call-screen')).toHaveCount(0);
 await phone.getByRole('button',{name:'Angkat panggilan klien',exact:true}).click();
 await swipeAnswer(page);await expect(phone.getByTestId('phone-call')).toBeVisible();
 expect((await state(page)).jobAccepted).toBe(false);
});

test('house phase 4: spawn, room doorways, privacy corridor and solid partition',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/tests/browser/world.html?spawn');
 await expect.poll(async()=>Boolean((await world(page)).camera)).toBe(true);
 await page.screenshot({path:'test-results/ratna-phase4-overview.png'});
 // Arrival leaves room to greet Ratna; main route to the study uses its doorway.
 await move(page,'x',13.7);await move(page,'y',16.5);await move(page,'x',3.7);await move(page,'y',14.1);
 await openLaptop(page);await page.keyboard.press('Escape');
 // A solid section of the study partition cannot be crossed.
 await move(page,'y',14.5);await move(page,'x',7.8);await pHold(page,'d',450);
 expect((await world(page)).player.x).toBeLessThan(8.7);
 await move(page,'y',16.5);await move(page,'x',16);await move(page,'y',8.7);
 // Each rear room is reachable through its own doorway, not through walls.
 for(const x of [7,13,18,23]){
  await move(page,'x',x);await move(page,'y',6.3);await move(page,'y',8.7);
 }
 // Bathroom corridor connects to kitchen. Kitchen opens back into the living area.
 await move(page,'y',11.5);await move(page,'x',21.5);await move(page,'y',16.5);await move(page,'x',16);await move(page,'x',13.7);await move(page,'y',20.2);
 expect(errors).toEqual([]);
});


test('thin walls: walk on reclaimed floor and stop at actual thin partition',async({page})=>{
 await page.goto('/tests/browser/world.html');await expect.poll(async()=>Boolean((await world(page)).camera)).toBe(true);
 await move(page,'y',16.5);await move(page,'x',9.6);await move(page,'y',14.5);
 expect((await world(page)).player.y).toBeLessThan(14.6);
 // This used to be a full solid tile. It is now usable floor on the living side.
 await pHold(page,'a',400);const x=(await world(page)).player.x;
 expect(x).toBeGreaterThanOrEqual(9.37);expect(x).toBeLessThan(9.65);
 await pHold(page,'a',250);expect((await world(page)).player.x).toBeCloseTo(x,2);
 await move(page,'y',16.5);await move(page,'x',3.7);await move(page,'y',14.1);
 await page.screenshot({path:'test-results/ratna-thin-walls.png'});
});
