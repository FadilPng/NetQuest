import { supportsCable } from './hardwareLink';
import type { CraftedCableItem, DeviceId, NetworkDevice } from './types';

/** Physical cable endpoints and negotiated lab link state. */
export function installPhysicalCable(devices: Record<string, NetworkDevice>, sourceId: DeviceId, cable: CraftedCableItem, destinationId: DeviceId, destinationPort: string): Record<string, NetworkDevice> {
  const source = devices[sourceId];
  const destination = devices[destinationId];
  if (!source || !destination) return devices;
  const interfaceName = destinationPort === 'Fa0/1' ? 'FastEthernet0/1' : destinationPort === 'Fa0/2' ? 'FastEthernet0/2' : destinationPort === 'Fa0/3' ? 'FastEthernet0/3' : destinationPort;
  const oldPort = destination.interfaces[interfaceName];
  const cableGood = supportsCable(cable, source, destination);
  const link = cableGood && source.powered !== false && destination.powered !== false && source.interfaces.Ethernet0?.adminUp !== false && oldPort?.adminUp !== false;
  const next = { ...devices };
  // Disconnect previous physical endpoint when replacing the source's cable.
  if (source.uplinkPortLabel) {
    const oldName = source.uplinkPortLabel.replace(/^Fa/, 'FastEthernet');
    const previous = destination.interfaces[oldName];
    if (previous?.connectedTo === `${source.hostname} (Eth0)` && oldName !== interfaceName) {
      next[destinationId] = { ...destination, interfaces: { ...destination.interfaces, [oldName]: { ...previous, connectedTo: null, lineProtocolUp: false, cableType: 'none' } } };
    }
  }
  next[sourceId] = {
    ...source, cableType: cable.type, cableConnected: link, installedCableMeters: cable.lengthMeters,
    uplinkPortLabel: destinationPort, uplinkDeviceName: destination.name,
    // Radio and power state are independent of Ethernet link state.
    interfaces: { ...source.interfaces, Ethernet0: { ...source.interfaces.Ethernet0, cableType: cable.type, cableFaulty: Boolean(cable.faulty), lineProtocolUp: link, connectedTo: `${destination.hostname} (${destinationPort})` } },
  };
  next[destinationId] = { ...next[destinationId], interfaces: { ...next[destinationId].interfaces, [interfaceName]: {
    ...oldPort, name: interfaceName, shortName: destinationPort, adminUp: oldPort?.adminUp ?? true, ipAddress: oldPort?.ipAddress ?? '', subnetMask: oldPort?.subnetMask ?? '',
    connectedTo: `${source.hostname} (Eth0)`, cableType: cable.type, cableFaulty: Boolean(cable.faulty), lineProtocolUp: link,
  } } };
  return next;
}
