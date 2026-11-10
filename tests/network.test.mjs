import { build } from 'esbuild';
import assert from 'node:assert/strict';
const bundled = await build({ stdin: { contents: "export * from './src/game/wallGeometry'; export * from './src/game/animation'; export * from './src/game/network'; export * from './src/game/cableRoute'; export * from './src/game/hardwareLink'; export * from './src/game/floorCable'; export * from './src/game/wallLayout'; export * from './src/game/cableTesting'; export * from './src/game/physicalLink'; export * from './src/game/missionChecks'; export {LOCATIONS,createInitialDevices} from './src/game/worldData';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, platform: 'node', format: 'esm' });
const { wallBounds, hitsWalls, playerHitsWalls, LOCATIONS, frameDeltaSeconds, packetPosition, advanceCableRoute, routeMeters, completedCableRoute, measuredCableMeters, cableFits, setInterfaceAdmin, supportsCable, hasPhysicalFloorCable, wallLayout, evaluateCable, T568A, T568B, installPhysicalCable, getMarketingJobStatus, checkWebAccess, isIPv4, isSubnetMask, sameSubnet, canPing, createInitialDevices } = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
let count = 0;
const check = (name, fn) => { fn(); count++; console.log('PASS', name); };
check('IPv4 rejects invalid octets and arbitrary text', () => {
  for (const ip of ['999.999.999.999', 'a.b.c.d', '192.168.1', '01.2.3.4', '-1.2.3.4']) assert.equal(isIPv4(ip), false);
  assert.equal(isIPv4('192.168.1.20'), true);
});
check('masks must be contiguous', () => {
  assert.equal(isSubnetMask('255.0.255.0'), false);
  assert.equal(isSubnetMask('255.255.254.0'), true);
});
check('subnet matching uses actual mask', () => {
  assert.equal(sameSubnet('10.1.0.1', '10.1.1.2', '255.255.254.0'), true);
  assert.equal(sameSubnet('10.1.0.1', '10.1.1.2', '255.255.255.0'), false);
});
const d = createInitialDevices();
const laptop = d['laptop-ratna'];
laptop.ipAddress = '192.168.1.20'; laptop.subnetMask = '255.255.255.0'; laptop.defaultGateway = '192.168.1.1';
check('disconnected client cannot ping gateway', () => assert.equal(canPing(laptop, '192.168.1.1', d), false));
laptop.cableConnected = true; laptop.interfaces.Ethernet0.lineProtocolUp = true;
check('connected home client can ping real router', () => assert.equal(canPing(laptop, '192.168.1.1', d), true));
check('nonexistent hosts and invented gateway do not reply', () => {
  laptop.defaultGateway = '192.168.1.99';
  assert.equal(canPing(laptop, '192.168.1.99', d), false);
  assert.equal(canPing(laptop, '192.168.1.999', d), false);
});
check('wrong subnet cannot reach home router', () => {
  laptop.ipAddress = '169.254.1.2';
  assert.equal(canPing(laptop, '192.168.1.1', d), false);
});
const dimas = d['pc-dimas'];
d.sw1.interfaces['FastEthernet0/2'].vlan = 10;
check('wrong VLAN blocks office ping', () => assert.equal(canPing(dimas, '192.168.10.100', d), false));
d.sw1.interfaces['FastEthernet0/2'].vlan = 20;
check('shutdown router blocks routing', () => assert.equal(canPing(dimas, '192.168.10.100', d), false));
const g1 = d.r1.interfaces['GigabitEthernet0/1'];
g1.adminUp = true; g1.lineProtocolUp = true; g1.ipAddress = '192.168.20.1'; g1.subnetMask = '255.255.255.0';
check('configured router routes to real server', () => assert.equal(canPing(dimas, '192.168.10.100', d), true));
check('missing return gateway blocks routing', () => {
  d['srv-fin'].defaultGateway = '192.168.10.99';
  assert.equal(canPing(dimas, '192.168.10.100', d), false);
});
check('router mission is solvable before VLAN assignment mission', () => {
  d['srv-fin'].defaultGateway = '192.168.10.1';
  d.sw1.interfaces['FastEthernet0/2'].vlan = 1;
  assert.equal(canPing(dimas, '192.168.10.100', d), true);
});
check('wrong assigned VLAN blocks routing even with working router', () => {
  d.sw1.interfaces['FastEthernet0/2'].vlan = 10;
  assert.equal(canPing(dimas, '192.168.10.100', d), false);
});
check('web rejects disconnected device', () => {
  const world = createInitialDevices();
  assert.equal(checkWebAccess(world['laptop-ratna'], world), 'link');
});
check('web needs a real reachable gateway and supports service failure cases', () => {
  const world = createInitialDevices();
  const pc = world['laptop-ratna'];
  pc.cableConnected = true; pc.interfaces.Ethernet0.lineProtocolUp = true;
  assert.equal(checkWebAccess(pc, world), 'gateway');
  pc.ipAddress = '192.168.1.20'; pc.subnetMask = '255.255.255.0'; pc.defaultGateway = '192.168.1.1';
  assert.equal(checkWebAccess(pc, world), 'ok');
  assert.equal(checkWebAccess(pc, world, { ispUp: false, dnsUp: true, serviceUp: true }), 'isp');
  assert.equal(checkWebAccess(pc, world, { ispUp: true, dnsUp: false, serviceUp: true }), 'dns');
  assert.equal(checkWebAccess(pc, world, { ispUp: true, dnsUp: true, serviceUp: false }), 'service');
  pc.defaultGateway = pc.ipAddress;
  assert.equal(checkWebAccess(pc, world), 'gateway');
});
check('mission 3: broken gateway blocks both server and YouPipe; repair restores both', () => {
  const world = createInitialDevices();
  const pc = world['pc-dimas'];
  assert.equal(canPing(pc, '192.168.10.100', world), false);
  assert.equal(checkWebAccess(pc, world), 'gateway');
  const iface = world.r1.interfaces['GigabitEthernet0/1'];
  iface.ipAddress = '192.168.20.1';
  iface.subnetMask = '255.255.255.0';
  iface.adminUp = true;
  iface.lineProtocolUp = true;
  assert.equal(canPing(pc, '192.168.10.100', world), true);
  assert.equal(checkWebAccess(pc, world), 'ok');
});
check('job 3 dialogue and completion share the same verification status', () => {
  const world = createInitialDevices();
  assert.equal(getMarketingJobStatus(world, []), 'broken');
  const iface = world.r1.interfaces['GigabitEthernet0/1'];
  iface.adminUp = true;
  assert.equal(getMarketingJobStatus(world, []), 'broken');
  iface.lineProtocolUp = true; iface.ipAddress = '192.168.20.1'; iface.subnetMask = '255.255.255.0';
  assert.equal(getMarketingJobStatus(world, []), 'needs-verification');
  assert.equal(getMarketingJobStatus(world, ['pc-sari:192.168.10.100']), 'needs-verification');
  assert.equal(getMarketingJobStatus(world, ['pc-dimas:192.168.20.1']), 'needs-verification');
  assert.equal(getMarketingJobStatus(world, ['pc-dimas:192.168.10.100']), 'complete');
  iface.adminUp = false;
  assert.equal(getMarketingJobStatus(world, ['pc-dimas:192.168.10.100']), 'broken');
});
check('physical cable records LAN 2 at both ends without overwriting WAN', () => {
  const world = createInitialDevices();
  const cable = { id: 'test', type: 'straight', lengthMeters: 8, createdAt: 0 };
  const result = installPhysicalCable(world, 'laptop-ratna', cable, 'rt-ratna', 'LAN 2');
  assert.equal(result['laptop-ratna'].uplinkPortLabel, 'LAN 2');
  assert.equal(result['laptop-ratna'].interfaces.Ethernet0.connectedTo, 'RUMAH-RATNA (LAN 2)');
  assert.equal(result['rt-ratna'].interfaces['LAN 2'].connectedTo, 'LAPTOP-RATNA (Eth0)');
  assert.equal(result['rt-ratna'].interfaces.Ethernet0.connectedTo, world['rt-ratna'].interfaces.Ethernet0.connectedTo);
  assert.equal(world['rt-ratna'].interfaces['LAN 2'], undefined);
  const replaced = installPhysicalCable(result, 'laptop-ratna', cable, 'rt-ratna', 'LAN 1');
  assert.equal(replaced['rt-ratna'].interfaces['LAN 2'].lineProtocolUp, false);
});
check('faulty cable has physical endpoints but no link', () => {
  const world = createInitialDevices();
  const result = installPhysicalCable(world, 'laptop-ratna', { id: 'bad', type: 'straight', lengthMeters: 8, createdAt: 0, faulty: true }, 'rt-ratna', 'LAN 1');
  assert.equal(result['laptop-ratna'].cableConnected, false);
  assert.equal(result['rt-ratna'].interfaces['LAN 1'].lineProtocolUp, false);
  assert.ok(result['laptop-ratna'].interfaces.Ethernet0.connectedTo);
});
check('crimping: A-A and B-B are valid straight cables', () => {
  for (const order of [T568A, T568B]) {
    const result = evaluateCable({ 1: { order, flipped: false }, 2: { order, flipped: false } });
    assert.equal(result.ok, true); assert.equal(result.kind, 'straight');
  }
});
check('crimping: A-B maps the two-pair crossover correctly', () => {
  const result = evaluateCable({ 1: { order: T568A, flipped: false }, 2: { order: T568B, flipped: false } });
  assert.equal(result.kind, 'crossover'); assert.deepEqual(result.map, [2,5,0,3,4,1,6,7]);
});
check('crimping: flipped connector is valid when conductor order matches the pin view', () => {
  const result = evaluateCable({ 1: { order: [...T568B].reverse(), flipped: true }, 2: { order: T568B, flipped: false } });
  assert.equal(result.ok, true);
});
check('continuity tester cannot distinguish a straight split pair from standard straight cable', () => {
  const order = ['wo','o','wg','g','wb','b','wbr','br'];
  const result = evaluateCable({ 1: { order, flipped: false }, 2: { order, flipped: false } });
  const standard = evaluateCable({ 1: { order: T568B, flipped: false }, 2: { order: T568B, flipped: false } });
  assert.equal(result.ok, false); assert.equal(result.kind, 'split');
  assert.equal(result.testerOk, true); assert.equal(result.text, standard.text);
  assert.deepEqual(result.map, standard.map);
});
check('nonstandard pair-preserving layout is not falsely labelled split pair', () => {
  const order = ['wbr','br','wg','b','wb','g','wo','o'];
  const result = evaluateCable({ 1: { order, flipped: false }, 2: { order, flipped: false } });
  assert.equal(result.kind, 'nonstandard'); assert.equal(result.testerOk, true);
});
check('wall orientation follows horizontal, vertical, corner and mixed glass connections', () => {
  assert.equal(wallLayout([[0,1,0],[0,1,0],[0,1,0]],1,1).orientation, 'vertical');
  assert.equal(wallLayout([[0,0,0],[1,1,1],[0,0,0]],1,1).orientation, 'horizontal');
  assert.equal(wallLayout([[1,1],[1,0]],0,0).orientation, 'junction');
  assert.equal(wallLayout([[0,5,0],[0,5,1],[0,5,0]],1,1).orientation, 'junction');
  assert.equal(wallLayout([[1]],0,0).orientation, 'horizontal');
});
check('floor cables show installed links including faults, not missing routes', () => {
  const world = createInitialDevices();
  assert.equal(hasPhysicalFloorCable(world['laptop-ratna'], world['rt-ratna']), false);
  assert.equal(hasPhysicalFloorCable(world['pc-dimas'], world.sw1), true);
  assert.equal(hasPhysicalFloorCable(world.sw1, world.r1), true);
  assert.equal(hasPhysicalFloorCable(world.r1, world['srv-fin']), true);
  assert.equal(hasPhysicalFloorCable(world.sw1, world['ap-lounge']), true);
  world['pc-dimas'].cableConnected = false;
  world['pc-dimas'].interfaces.Ethernet0.lineProtocolUp = false;
  assert.equal(hasPhysicalFloorCable(world['pc-dimas'], world.sw1), true);
});
check('Auto-MDI-X accepts valid crossover, not a faulty cable', () => {
  const world = createInitialDevices();
  const cable = { id: 'cross', type: 'crossover', lengthMeters: 8, createdAt: 0 };
  assert.equal(supportsCable(cable, world['ap-lounge'], world.sw1), true);
  assert.equal(supportsCable({ ...cable, faulty: true }, world['ap-lounge'], world.sw1), false);
  const result = installPhysicalCable(world, 'ap-lounge', cable, 'sw1', 'Fa0/3');
  assert.equal(result['ap-lounge'].cableConnected, true);
  assert.equal(result.sw1.interfaces['FastEthernet0/3'].cableFaulty, false);
});
check('no shutdown cannot repair broken AP cable; DC-powered radio remains active', () => {
  const world = createInitialDevices();
  const result = setInterfaceAdmin(world, 'sw1', 'FastEthernet0/3', true);
  assert.equal(result.sw1.interfaces['FastEthernet0/3'].lineProtocolUp, false);
  assert.equal(result['ap-lounge'].cableConnected, false);
  assert.equal(result['ap-lounge'].wifiActive, true);
});
check('switch shutdown drops peer link; re-enable restores only a good physical cable', () => {
  const world = createInitialDevices();
  const down = setInterfaceAdmin(world, 'sw1', 'FastEthernet0/1', false);
  assert.equal(down['pc-sari'].cableConnected, false);
  const up = setInterfaceAdmin(down, 'sw1', 'FastEthernet0/1', true);
  assert.equal(up['pc-sari'].cableConnected, true);
  up.sw1.interfaces['FastEthernet0/1'].cableType = 'none';
  assert.equal(setInterfaceAdmin(up, 'sw1', 'FastEthernet0/1', true).sw1.interfaces['FastEthernet0/1'].lineProtocolUp, false);
});
check('field routes retract on backtracking and retain corners', () => {
  const trail = [{x:0,y:0},{x:4,y:0},{x:4,y:4}];
  const back = advanceCableRoute(trail,{x:4,y:2});
  assert.equal(routeMeters(back),3);
  assert.deepEqual(back,[{x:0,y:0},{x:4,y:0},{x:4,y:2}]);
  assert.equal(routeMeters(advanceCableRoute(back,{x:4,y:4})),4);
});
check('measurement and installation include final endpoint, with no extra cable allowance', () => {
  const route = completedCableRoute([{x:0,y:0},{x:6,y:0}],{x:6,y:0},{x:6,y:1.2});
  assert.equal(routeMeters(route),3.6);assert.equal(measuredCableMeters(route),4);
  assert.equal(cableFits(route,3.5),false);assert.equal(cableFits(route,3.6),true);
});
check('animation restart cannot move time backwards or jump after tab resume', () => {
  assert.equal(frameDeltaSeconds(100, 105), 0);
  assert.equal(frameDeltaSeconds(116, 100), .016);
  assert.equal(frameDeltaSeconds(10000, 100), .05);
});
check('packet interpolation never indexes before or after its path', () => {
  const path = [{x:1,y:2},{x:3,y:4},{x:5,y:2}];
  assert.deepEqual(packetPosition(path, -.001), path[0]);
  assert.deepEqual(packetPosition(path, 0), path[0]);
  assert.deepEqual(packetPosition(path, .25), {x:2,y:3});
  assert.deepEqual(packetPosition(path, 1), path[2]);
  assert.deepEqual(packetPosition(path, 1.1), path[2]);
  assert.equal(packetPosition([], 0), null);
  assert.equal(packetPosition([path[0]], 0), null);
  assert.equal(packetPosition(path, NaN), null);
});
check('Ratna house structure and network device anchors stay synchronized', () => {
  const house = LOCATIONS.house;
  assert.equal(house.tiles.length, house.rows);
  assert.ok(house.tiles.every(row => row.length === house.cols));
  assert.equal(house.props.filter(p => p.kind === 'bed').length, 3);
  assert.ok([0,3,4].includes(house.tiles[Math.floor(house.spawn.y)][Math.floor(house.spawn.x)]));
  const devices = createInitialDevices();
  for (const p of house.props.filter(p => p.deviceId)) {
    const d = devices[p.deviceId];
    assert.deepEqual([d.x,d.y,d.widthTiles,d.heightTiles],[p.x,p.y,p.w,p.h]);
  }
  assert.equal(house.tiles[14][9], 0);
  assert.ok(playerHitsWalls(9,14,house.walls));
  assert.equal(playerHitsWalls(9,16.5,house.walls),false);
  assert.equal(house.tiles[16][9], 0);
  assert.equal(house.tiles[10][16], 0);
  // The built-in cable route must pass through openings, not solid partitions.
  const points = house.floorCables[0].points;
  for(let i=1;i<points.length;i++) {
    const a=points[i-1], b=points[i];
    for(let n=0;n<=100;n++) {
      const x=a.x+(b.x-a.x)*n/100, y=a.y+(b.y-a.y)*n/100;
      assert.notEqual(house.tiles[Math.floor(y)][Math.floor(x)],1);
      assert.equal(hitsWalls({x,y,w:.001,h:.001},house.walls),false);
    }
  }
});
check('thin walls share precise bounds and leave old wall tiles walkable', () => {
 const walls=LOCATIONS.house.walls;
 assert.ok(walls.length>0);
 assert.ok(walls.every(w=>[w.x1,w.x2,w.y1,w.y2].every(Number.isInteger)));
 assert.ok(LOCATIONS.house.props.every(p=>!['pkk-board','family-photo'].includes(p.kind)));
 assert.ok(LOCATIONS.house.tiles.flat().every(t=>t!==1&&t!==5));
 const study=walls.find(w=>w.id==='study-0');
 const b=wallBounds(study);assert.ok(Math.abs(b.w-.2)<1e-8);
 assert.equal(playerHitsWalls(8.6,14,walls),false);
 assert.equal(playerHitsWalls(8.8,14,walls),true);
 assert.equal(playerHitsWalls(9.4,14,walls),false);
 assert.equal(playerHitsWalls(9.8,14,walls),false);
 assert.equal(playerHitsWalls(9,17,walls),false);
 assert.equal(playerHitsWalls(9,15.95,walls),true);
 assert.equal(playerHitsWalls(0,15,walls),true);
 assert.equal(playerHitsWalls(26,15,walls),true);
 for(const p of LOCATIONS.house.props.filter(p=>p.solid))assert.equal(hitsWalls(p,walls),false,p.id+' must not overlap a wall');
});
console.log(`${count} regression tests passed.`);
