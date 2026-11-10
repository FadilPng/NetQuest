import { Plug, Ruler, Router, Wifi, X } from 'lucide-react';
import type { DeviceId, NetworkDevice } from '../game/types';
import { PhysicalSocket } from './PhysicalSocket';

export function NetworkApplianceModal({ device, hasTape, measuredMeters, onMeasure, onPlug, onClose }: {
  device: NetworkDevice; hasTape: boolean; measuredMeters: number | null;
  onMeasure: (id: DeviceId) => void; onPlug: (id: DeviceId) => void; onClose: () => void;
}) {
  const home = device.id === 'rt-ratna';
  const ports = home
    ? [{ label: 'WAN', key: 'Ethernet0' }, { label: 'LAN 1', key: 'LAN 1' }, { label: 'LAN 2', key: 'LAN 2' }]
    : [{ label: 'ETH0 / UPLINK', key: 'Ethernet0' }];
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 p-3 backdrop-blur-sm">
    <section role="dialog" aria-modal="true" aria-label={`Inspeksi ${device.name}`} className="nq-appliance">
      <header><div>{home ? <Router size={23}/> : <Wifi size={23}/>}<span><h2>{device.name}</h2><small>Inspeksi fisik · bukan layar sistem operasi</small></span></div><button aria-label="Tutup inspeksi" onClick={onClose}><X size={20}/></button></header>
      <div className="nq-appliance-body"><span className="nq-appliance-label">{home ? 'ROUTER RUMAH · PERANGKAT GENERIK LAB' : 'ACCESS POINT · SKEMA PORT TERPILIH'}</span>
        <div className="nq-appliance-ports">{ports.map(p => { const iface = device.interfaces[p.key]; const link = Boolean(iface?.adminUp && iface.lineProtocolUp); return <div key={p.key}><PhysicalSocket kind="ethernet" link={link}/><strong>{p.label}</strong><small>{iface?.connectedTo || 'Tidak ada sambungan tercatat'}</small><span className={link ? 'link-up' : ''}>Link {link ? 'aktif' : 'tidak aktif'}</span></div>; })}</div>
      </div>
      <div className="nq-appliance-content"><h3>Catatan instalasi</h3><dl><div><dt>Nama</dt><dd>{device.hostname}</dd></div><div><dt>Alamat manajemen</dt><dd>{device.ipAddress || 'Belum diatur'}</dd></div><div><dt>Subnet mask</dt><dd>{device.subnetMask || 'Belum diatur'}</dd></div><div><dt>Sumber daya</dt><dd>{device.powerSource === 'dc' ? 'Adaptor DC' : device.powerSource === 'poe' ? 'PoE' : 'AC'}</dd></div><div><dt>SSID</dt><dd>{device.wifiSsid || 'Tidak tersedia'}</dd></div></dl>
        {!home && <><div className="nq-appliance-actions"><button disabled={!hasTape} onClick={() => onMeasure(device.id)}><Ruler size={15}/> Ukur rute ke switch</button><button onClick={() => onPlug(device.id)}><Plug size={15}/> Pasang kabel uplink</button></div><p>{measuredMeters === null ? 'Rute belum diukur.' : `Hasil pengukuran rute: ${measuredMeters.toFixed(1)} m.`}</p></>}
        
      </div>
    </section>
  </div>;
}
