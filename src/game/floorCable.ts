import type { NetworkDevice } from './types';

/** Physical presence must not depend on logical link/admin/IP status. */
export function hasPhysicalFloorCable(from?: NetworkDevice, to?: NetworkDevice): boolean {
  if (!from || !to) return false;
  const endpoint = [from, to].find(d => ['pc', 'server', 'ap'].includes(d.type) && d.id !== 'rt-ratna');
  if (endpoint) return endpoint.cableType !== 'none' && Boolean(endpoint.interfaces.Ethernet0?.connectedTo);
  return from.cableType !== 'none' && to.cableType !== 'none';
}
