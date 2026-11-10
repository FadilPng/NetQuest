import type { CraftedCableItem, InterfaceState, NetworkDevice } from './types';

export function supportsCable(cable: CraftedCableItem, a: NetworkDevice, b: NetworkDevice): boolean {
  return !cable.faulty && (cable.type === 'straight' || a.autoMdix === true || b.autoMdix === true);
}

/** Set admin state without inventing physical carrier. The lab assumes fixed speed/duplex auto. */
export function setInterfaceAdmin(devices: Record<string, NetworkDevice>, id: string, name: string, adminUp: boolean): Record<string, NetworkDevice> {
  const device = devices[id];
  const iface = device?.interfaces[name];
  if (!device || !iface) return devices;
  const peerIds: Record<string, string> = { 'FastEthernet0/1': 'pc-sari', 'FastEthernet0/2': 'pc-dimas', 'FastEthernet0/3': 'ap-lounge' };
  const peerId = id === 'sw1' ? peerIds[name] : undefined;
  const peer = peerId ? devices[peerId] : undefined;
  const peerIf = peer?.interfaces.Ethernet0;
  const link = Boolean(adminUp && iface.connectedTo && iface.cableType !== 'none' && iface.cableType !== 'console' && !iface.cableFaulty && device.powered !== false &&
    (!peer || (peerIf?.adminUp && peerIf.connectedTo && peerIf.cableType !== 'none' && !peerIf.cableFaulty && peer.powered !== false)));
  const updated: InterfaceState = { ...iface, adminUp, lineProtocolUp: link };
  const next = { ...devices, [id]: { ...device, interfaces: { ...device.interfaces, [name]: updated } } };
  if (peer && peerIf && peerId) next[peerId] = { ...peer, cableConnected: link, interfaces: { ...peer.interfaces, Ethernet0: { ...peerIf, lineProtocolUp: link } } };
  return next;
}
