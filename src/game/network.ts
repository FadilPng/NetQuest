import type { NetworkDevice, InterfaceState } from './types';

export function isIPv4(value: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(value) &&
    value.split('.').every(part => Number(part) <= 255 && String(Number(part)) === part);
}
const numeric = (ip: string) => ip.split('.').reduce((n, part) => ((n << 8) | Number(part)) >>> 0, 0);
export function isSubnetMask(mask: string): boolean {
  if (!isIPv4(mask)) return false;
  const bits = numeric(mask).toString(2).padStart(32, '0');
  return /^1+0*$/.test(bits);
}
export function sameSubnet(a: string, b: string, mask: string): boolean {
  return isIPv4(a) && isIPv4(b) && isSubnetMask(mask) &&
    (numeric(a) & numeric(mask)) === (numeric(b) & numeric(mask));
}
const up = (i?: InterfaceState) => Boolean(i?.adminUp && i.lineProtocolUp);

// Deliberately bounded model of the topology in worldData, not a complete IOS emulator.
export function canPing(source: NetworkDevice, target: string, devices: Record<string, NetworkDevice>): boolean {
  if (!isIPv4(target) || !isIPv4(source.ipAddress || '') || !isSubnetMask(source.subnetMask || '')) return false;
  if (target === source.ipAddress) return true;
  const portMap: Record<string, string> = { 'pc-sari': 'FastEthernet0/1', 'pc-dimas': 'FastEthernet0/2', 'ap-lounge': 'FastEthernet0/3' };
  const vlan = (d: NetworkDevice) => portMap[d.id] ? devices.sw1?.interfaces[portMap[d.id]]?.vlan : d.id === 'srv-fin' ? 10 : undefined;
  const connected = (d: NetworkDevice) => {
    if (!d.cableConnected || !up(d.interfaces.Ethernet0)) return false;
    const port = portMap[d.id];
    return !port || Boolean(up(devices.sw1?.interfaces[port]) && up(devices.sw1?.interfaces['GigabitEthernet0/1']));
  };
  if (!connected(source)) return false;
  const home = (d: NetworkDevice) => ['laptop-ratna', 'rt-ratna'].includes(d.id);
  const local = (a: NetworkDevice, b: NetworkDevice) =>
    home(a) === home(b) && (home(a) || vlan(a) === vlan(b)) &&
    sameSubnet(a.ipAddress || '', b.ipAddress || '', a.subnetMask || '') &&
    sameSubnet(a.ipAddress || '', b.ipAddress || '', b.subnetMask || '');
  const router = devices.r1;
  const interfaces = Object.values(router?.interfaces || {});
  const reachableInterface = (d: NetworkDevice, i: InterfaceState) => !home(d) && up(i) &&
    // Initial lab uses a shared VLAN 1; routed subnets still exist on that LAN.
    (vlan(d) === 1 || vlan(d) === (i.name === 'GigabitEthernet0/0' ? 10 : 20)) &&
    sameSubnet(d.ipAddress || '', i.ipAddress, d.subnetMask || '') &&
    sameSubnet(d.ipAddress || '', i.ipAddress, i.subnetMask);
  const targetInterface = interfaces.find(i => i.ipAddress === target);
  if (targetInterface) return reachableInterface(source, targetInterface);
  const dest = Object.values(devices).find(d => d.ipAddress === target);
  if (!dest || !connected(dest)) return false;
  if (local(source, dest)) return true;
  if (home(source) || home(dest)) return false;
  const ingress = interfaces.find(i => i.ipAddress === source.defaultGateway && reachableInterface(source, i));
  const egress = interfaces.find(i => i.ipAddress === dest.defaultGateway && reachableInterface(dest, i));
  return Boolean(ingress && egress);
}

/** Scenario assumptions, not a claim about real Internet connectivity. */
export const WEB_LAB = { ispUp: true, dnsUp: true, serviceUp: true };
export function checkWebAccess(source: NetworkDevice, devices: Record<string, NetworkDevice>, services = WEB_LAB): 'ok' | 'link' | 'gateway' | 'isp' | 'dns' | 'service' {
  if (!source.cableConnected || !up(source.interfaces.Ethernet0)) return 'link';
  const gateway = source.defaultGateway || '';
  const expected = ['laptop-ratna', 'rt-ratna'].includes(source.id)
    ? devices['rt-ratna']?.ipAddress
    : Object.values(devices.r1?.interfaces || {}).find(i => i.ipAddress === gateway)?.ipAddress;
  if (!gateway || gateway !== expected || gateway === source.ipAddress || !canPing(source, gateway, devices)) return 'gateway';
  if (!services.ispUp) return 'isp';
  if (!services.dnsUp) return 'dns';
  if (!services.serviceUp) return 'service';
  return 'ok';
}
