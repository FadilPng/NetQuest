import { test, expect, type Page } from '@playwright/test';
const canvas = (p:Page)=>p.getByTestId('craft-canvas');
const state = async(p:Page)=>JSON.parse(await p.locator('#state').textContent() || '{}');
async function point(p:Page,x:number,y:number) { return canvas(p).evaluate((svg,pt)=>{const matrix=(svg as SVGSVGElement).getScreenCTM()!; const q=new DOMPoint(pt.x,pt.y).matrixTransform(matrix); return {x:q.x,y:q.y};},{x,y}); }
async function click(p:Page,x:number,y:number) { const pos=await point(p,x,y); await p.mouse.click(pos.x,pos.y); }
async function drag(p:Page,x:number,y:number,tx:number,ty:number) { const a=await point(p,x,y), b=await point(p,tx,ty); await p.mouse.move(a.x,a.y);await p.mouse.down();await p.mouse.move(b.x,b.y,{steps:18});await p.mouse.up(); }
async function phase(p:Page,value:string) { await expect(canvas(p)).toHaveAttribute('data-phase',value); }
async function start(p:Page) { await p.getByRole('button',{name:/Mulai: Tarik/}).click();await phase(p,'cut');await click(p,60+7*680/15,108);await phase(p,'strip'); }
async function end(p:Page, order=['wo','o','wg','b','wb','g','wbr','br'], finish=true) {
 await drag(p,560,145,500,145);
 await drag(p,560,180,665,180);await phase(p,'untwist');
 for(let i=0;i<4;i++){const y=82+i*56; const a=await point(p,360,y),b=await point(p,610,y);await p.mouse.move(a.x,a.y);await p.mouse.down();await p.mouse.move(b.x,b.y,{steps:15});await p.mouse.move(a.x,a.y,{steps:15});await p.mouse.up();}
 await phase(p,'arrange');
 for(let i=0;i<order.length;i++){ const wire=p.locator(`[data-wire="${order[i]}"]`);await drag(p,Number(await wire.getAttribute('data-tip-x')),Number(await wire.getAttribute('data-tip-y')),610,66+i*30); }
 await p.getByRole('button',{name:/Susunan siap/}).click();await phase(p,'trim');
 // Initial trim handle at 200+3cm*70-10 = 400.
 await drag(p,400,107,291,107);await click(p,291,107);await phase(p,'insert');
 await drag(p,650,150,250,150);
 await p.getByRole('button',{name:/Masukkan ke tang/}).click();await phase(p,'crimp');
 await drag(p,700,300,700,150);
 if(finish) await p.getByRole('button',{name:/Ujung .* beres|Lanjut uji LAN/}).click();
}
async function tester(p:Page){await phase(p,'test');await drag(p,150,300,195,213);await drag(p,650,300,605,213);await p.getByRole('button',{name:'Nyalakan tester'}).click();await expect(p.getByRole('button',{name:'Uji ulang'})).toBeVisible();}
test('both ends, real pointer interactions, tester, materials and port installation',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/tests/browser/workbench.html');await start(page);await end(page);await phase(page,'strip');await end(page);await tester(page);
 await page.screenshot({path:'test-results/completed-wiremap.png'});
 await page.getByRole('button',{name:/Simpan kabel ke tas/}).click();const s=await state(page);expect(s.inventory.utpRollMeters).toBe(13);expect(s.inventory.rj45Connectors).toBe(4);expect(s.inventory.unfinishedCables).toHaveLength(0);expect(s.inventory.cables).toHaveLength(1);expect(s.inventory.cables[0]).toMatchObject({type:'straight',faulty:false,tested:true,lengthMeters:7});
 await page.getByRole('button',{name:'Tutup meja crimping'}).click();await page.getByRole('button',{name:'Uji pemasangan'}).click();await page.getByRole('button',{name:/ETHERNET/}).click();await page.getByRole('button',{name:/LAN 2/}).click();const installed=await state(page);expect(installed.devices['laptop-ratna'].cableConnected).toBe(true);expect(installed.devices['laptop-ratna'].uplinkPortLabel).toBe('LAN 2');expect(installed.inventory.cables).toHaveLength(0);expect(errors).toEqual([]);
});
test('missing tool and insufficient connectors block consumption',async({page})=>{for(const query of ['?no-tool=1','?connectors=1']){await page.goto('/tests/browser/workbench.html'+query);await page.getByRole('button',{name:/Mulai: Tarik/}).click();expect((await state(page)).inventory.utpRollMeters).toBe(20);await expect(canvas(page)).toHaveCount(0);}});

test('closing immediately after crimp preserves the paid connector and completed end',async({page})=>{
 await page.goto('/tests/browser/workbench.html');await start(page);await end(page,undefined,false);
 expect((await state(page)).inventory.rj45Connectors).toBe(5);
 await page.getByRole('button',{name:'Tutup meja crimping'}).click();await page.getByRole('button',{name:'Simpan ke tas & tutup'}).click();
 const saved=await state(page);expect(saved.inventory.unfinishedCables[0].end1).toBeTruthy();
 await page.getByRole('button',{name:'Buka meja uji'}).click();await page.getByRole('button',{name:/Lanjutkan merakit/}).click();await phase(page,'strip');await expect(canvas(page)).toHaveAttribute('data-end','2');expect((await state(page)).inventory.rj45Connectors).toBe(5);
});

test('tester interruption clears results and retest is possible',async({page})=>{
 await page.goto('/tests/browser/workbench.html?ready=1');await page.getByRole('button',{name:/Lanjutkan merakit/}).click();await phase(page,'test');
 await drag(page,150,300,195,213);await drag(page,650,300,605,213);await page.getByRole('button',{name:'Nyalakan tester'}).click();
 await drag(page,195,213,150,300);await expect(page.getByRole('button',{name:/Simpan kabel ke tas/})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Nyalakan tester'})).toBeDisabled();
 await page.waitForTimeout(3600);await expect(page.getByRole('button',{name:/Simpan kabel ke tas/})).toHaveCount(0);
 await drag(page,150,300,195,213);await page.getByRole('button',{name:'Nyalakan tester'}).click();await expect(page.getByRole('button',{name:'Uji ulang'})).toBeVisible();
 await page.getByRole('button',{name:'Uji ulang'}).click();await expect(page.getByRole('button',{name:'Menguji…'})).toBeVisible();await expect(page.getByRole('button',{name:'Uji ulang'})).toBeVisible();
});
test('saving without tester does not claim a successful test',async({page})=>{
 await page.goto('/tests/browser/workbench.html?ready=1&no-tester=1');await page.getByRole('button',{name:/Lanjutkan merakit/}).click();await page.getByRole('button',{name:/Simpan tanpa diuji/}).click();
 expect((await state(page)).inventory.cables[0].tested).toBe(false);await expect(page.getByText('Kabel disimpan tanpa pengujian kontinuitas.')).toBeVisible();
});
test('cancelled cutting gesture consumes no materials; closing during transition stays closed',async({page})=>{
 await page.goto('/tests/browser/workbench.html');await page.getByRole('button',{name:/Mulai: Tarik/}).click();await phase(page,'cut');
 const pos=await point(page,60+7*680/15,108);await page.mouse.move(pos.x,pos.y);await page.mouse.down();await canvas(page).dispatchEvent('pointercancel',{pointerId:1});await page.mouse.up();expect((await state(page)).inventory.utpRollMeters).toBe(20);
 await click(page,60+7*680/15,108);await page.getByRole('button',{name:'Tutup meja crimping'}).click();await page.getByRole('button',{name:'Simpan ke tas & tutup'}).click();await page.waitForTimeout(1400);await expect(page.getByRole('dialog')).toHaveCount(0);expect((await state(page)).inventory.unfinishedCables).toHaveLength(1);
});
test('phone viewport fits horizontally and supports touch entry',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const page=await context.newPage();await page.goto('/tests/browser/workbench.html');await page.getByRole('button',{name:/Mulai: Tarik/}).tap();await phase(page,'cut');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);const pos=await point(page,60+7*680/15,108);await page.touchscreen.tap(pos.x,pos.y);await phase(page,'strip');await page.screenshot({path:'test-results/mobile-strip.png'});await context.close();
});

test('miswired cable gives wrong pin map and remains faulty when installed',async({page})=>{
 await page.goto('/tests/browser/workbench.html?ready=1&miswire=1');await page.getByRole('button',{name:/Lanjutkan merakit/}).click();await tester(page);await expect(page.getByText('Master 1–8 → Remote 2, 1, 3, 4, 5, 6, 7, 8.')).toBeVisible();await page.getByRole('button',{name:'Simpan hasil rakitan'}).click();expect((await state(page)).inventory.cables[0].faulty).toBe(true);
 await page.getByRole('button',{name:'Tutup meja crimping'}).click();await page.getByRole('button',{name:'Uji pemasangan'}).click();await page.getByRole('button',{name:/USB-A/}).click();expect((await state(page)).inventory.cables).toHaveLength(1);await page.getByRole('button',{name:/ETHERNET/}).click();await page.getByRole('button',{name:/WAN/}).click();expect((await state(page)).inventory.cables).toHaveLength(1);await page.getByRole('button',{name:/LAN 1/}).click();expect((await state(page)).devices['laptop-ratna'].cableConnected).toBe(false);
});
