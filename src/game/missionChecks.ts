import type { NetworkDevice } from './types';
import { canPing } from './network';

export function getMarketingJobStatus(devices: Record<string, NetworkDevice>, verifiedPings: string[]): 'broken' | 'needs-verification' | 'complete' {
  const iface = devices.r1?.interfaces['GigabitEthernet0/1'];
  const pc = devices['pc-dimas'];
  const repaired = Boolean(iface?.adminUp && iface.lineProtocolUp &&
    iface.ipAddress === '192.168.20.1' && iface.subnetMask === '255.255.255.0' &&
    pc && canPing(pc, '192.168.10.100', devices));
  if (!repaired) return 'broken';
  return verifiedPings.includes('pc-dimas:192.168.10.100') ? 'complete' : 'needs-verification';
}
