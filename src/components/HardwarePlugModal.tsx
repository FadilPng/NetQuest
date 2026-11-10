import { PhysicalSocket, type SocketKind } from './PhysicalSocket';
import React, { useState } from 'react';
import {
  AlertTriangle,
  Cable,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Laptop,
  Plug,
  Router as RouterIcon,
  Ruler,
  Wifi,
  X,
} from 'lucide-react';
import {
  CraftedCableItem,
  DeviceId,
  NetworkDevice,
  TechnicianInventory,
} from '../game/types';
import { sound } from '../game/sound';

interface PortDef {
  id: string;
  label: string;
  sub: string;
  valid: boolean;
  errorHint: string;
  colorClass: string;
}

interface HardwarePlugModalProps {
  device: NetworkDevice;
  mode: 'source' | 'target';
  inventory: TechnicianInventory;
  cableRun: {
    cableId: string;
    cableType: 'straight' | 'crossover';
    lengthMeters: number;
    sourceDeviceId: DeviceId;
    sourcePort: string;
    usedMeters: number;
  } | null;
  /** Hasil ukur meteran pemain (null = belum diukur) */
  requiredMeters: number | null;
  targetRouteMeters?: number;
  counterpartName: string;
  onPlugSource: (cable: CraftedCableItem, portId: string) => void;
  onPlugTarget: (portId: string) => string | void;
  onMistake?: () => void;
  onClose: () => void;
}

function getPortsForDevice(deviceId: DeviceId): { title: string; subtitle: string; ports: PortDef[] } {
  switch (deviceId) {
    case 'laptop-ratna':
      return {
        title: 'Laptop Bu Ratna — Panel Samping Kiri',
        subtitle: 'Perangkat generik lab · identifikasi label dan bentuk konektor, bukan ukuran saja',
        ports: [
          {
            id: 'usb',
            label: 'USB-A',
            sub: 'pipih kecil',
            valid: false,
            errorHint: 'USB Type-A memiliki lidah konektor. Steker Ethernet 8P8C tidak cocok secara fisik; jangan dipaksa. Cari label LAN/Ethernet.',
            colorClass: 'bg-sky-800',
          },
          {
            id: 'eth',
            label: 'ETHERNET',
            sub: 'RJ45 · LAN',
            valid: true,
            errorHint: '',
            colorClass: 'bg-amber-600',
          },
          {
            id: 'hdmi',
            label: 'HDMI',
            sub: 'layar',
            valid: false,
            errorHint: 'Itu port HDMI untuk kabel monitor/proyektor, bukan untuk kabel jaringan UTP!',
            colorClass: 'bg-stone-700',
          },
        ],
      };
    case 'rt-ratna':
      return {
        title: 'Router Wi-Fi Rumah — Panel Belakang',
        subtitle: 'Router generik lab · ikuti label WAN/LAN; warna port tidak universal',
        ports: [
          {
            id: 'wan',
            label: 'WAN',
            sub: 'biru · ISP',
            valid: false,
            errorHint: 'Port WAN (biru) khusus untuk kabel dari modem fiber ISP! Pada topologi lab ini, laptop terhubung ke LAN. Warna bisa berbeda pada produk lain.',
            colorClass: 'bg-sky-700',
          },
          {
            id: 'lan1',
            label: 'LAN 1',
            sub: 'kuning',
            valid: true,
            errorHint: '',
            colorClass: 'bg-amber-500',
          },
          {
            id: 'lan2',
            label: 'LAN 2',
            sub: 'kuning',
            valid: true,
            errorHint: '',
            colorClass: 'bg-amber-500',
          },
          {
            id: 'pwr',
            label: 'POWER',
            sub: 'sesuai adaptor',
            valid: false,
            errorHint: 'Itu lubang adaptor listrik router, bukan port jaringan!',
            colorClass: 'bg-stone-700',
          },
        ],
      };
    case 'ap-lounge':
      return {
        title: 'AP Lounge — Detail Port Terpilih',
        subtitle: 'Skema lab; model, kebutuhan daya, dan tata letak panel belum difinalisasi',
        ports: [
          {
            id: 'dc',
            label: 'DC IN',
            sub: 'power',
            valid: false,
            errorHint: 'DC IN adalah masukan adaptor daya. Ethernet membawa data pada AP lab ini.',
            colorClass: 'bg-stone-700',
          },
          {
            id: 'eth',
            label: 'ETH0 / LAN',
            sub: 'RJ45 uplink',
            valid: true,
            errorHint: '',
            colorClass: 'bg-amber-600',
          },
          {
            id: 'con',
            label: 'CONSOLE',
            sub: 'serial',
            valid: false,
            errorHint: 'Port CONSOLE hanya untuk kabel console biru (CLI), bukan untuk jalur data uplink!',
            colorClass: 'bg-sky-800',
          },
        ],
      };
    case 'sw1':
      return {
        title: 'Switch SW1 — Detail Port Terpilih',
        subtitle: 'Skema fungsi, bukan tata letak panel fisik lengkap Cisco 2960',
        ports: [
          {
            id: 'con',
            label: 'CONSOLE',
            sub: 'biru · mgmt',
            valid: false,
            errorHint: 'Port CONSOLE (biru muda) khusus kabel Console Rollover untuk CLI, bukan untuk uplink LAN!',
            colorClass: 'bg-sky-600',
          },
          {
            id: 'fa1',
            label: 'Fa0/1',
            sub: 'Finance · terpakai',
            valid: false,
            errorHint: 'Fa0/1 sudah terpakai untuk PC-SARI Divisi Finance! Jangan cabut kabel orang lain.',
            colorClass: 'bg-stone-600',
          },
          {
            id: 'fa3',
            label: 'Fa0/3',
            sub: 'kosong · AP',
            valid: true,
            errorHint: '',
            colorClass: 'bg-amber-500',
          },
          {
            id: 'g01',
            label: 'G0/1',
            sub: 'trunk → R1',
            valid: false,
            errorHint: 'G0/1 adalah port trunk gigabit menuju Router R1! Jangan colok Access Point ke sana.',
            colorClass: 'bg-emerald-700',
          },
        ],
      };
    case 'pc-sari':
    case 'pc-dimas':
    case 'pc-work':
      return {
        title: `${deviceId === 'pc-work' ? 'PC Admin' : 'PC Desktop'} — Panel Belakang`,
        subtitle: 'PC generik lab · panel I/O motherboard, bukan replika model tertentu',
        ports: [
          {
            id: 'eth',
            label: 'ETHERNET',
            sub: 'RJ45 GbE',
            valid: true,
            errorHint: '',
            colorClass: 'bg-amber-600',
          },
          {
            id: 'usb',
            label: 'USB-A',
            sub: 'periferal',
            valid: false,
            errorHint: 'Itu port USB untuk keyboard/mouse, bukan untuk kabel LAN!',
            colorClass: 'bg-sky-800',
          },
          { id: 'hdmi', label: 'HDMI', sub: 'video/audio digital', valid: false, errorHint: 'HDMI membawa video dan audio ke layar, bukan koneksi Ethernet.', colorClass: 'bg-stone-700' },
          { id: 'audio', label: 'LINE OUT', sub: 'audio 3,5 mm', valid: false, errorHint: 'Ini jack audio 3,5 mm untuk keluaran suara, bukan Ethernet.', colorClass: 'bg-emerald-700' },
        ],
      };
    default:
      return {
        title: 'Panel Perangkat',
        subtitle: '',
        ports: [
          {
            id: 'eth',
            label: 'ETHERNET',
            sub: 'RJ45',
            valid: true,
            errorHint: '',
            colorClass: 'bg-amber-600',
          },
        ],
      };
  }
}

export const HardwarePlugModal: React.FC<HardwarePlugModalProps> = ({
  device,
  mode,
  inventory,
  cableRun,
  requiredMeters,
  targetRouteMeters,
  counterpartName,
  onPlugSource,
  onPlugTarget,
  onMistake,
  onClose,
}) => {
  const hw = getPortsForDevice(device.id);
  const [selectedCableId, setSelectedCableId] = useState<string | null>(
    () => inventory.cables[0]?.id ?? null
  );
  const [error, setError] = useState<string | null>(null);

  const selectedCable: CraftedCableItem | null =
    inventory.cables.find((c) => c.id === selectedCableId) ?? null;

  const isSourceDevice = mode === 'source';

  const handlePortClick = (port: PortDef) => {
    if (isSourceDevice) {
      if (!selectedCable) {
        sound.playError();
        setError('Pilih dulu kabel dari tas teknisi! Tas kosong = pulang ke Kantor & bikin kabel dulu.');
        return;
      }
      if (!port.valid) {
        sound.playError();
        onMistake?.();
        setError(port.errorHint);
        return;
      }
      sound.playCablePlug();
      onPlugSource(selectedCable, port.label);
    } else {
      if (!cableRun) {
        sound.playError();
        setError('Tidak ada tarikan kabel aktif.');
        return;
      }
      if (!port.valid) {
        sound.playError();
        onMistake?.();
        setError(port.errorHint);
        return;
      }
      sound.playCablePlug();
      const rejection = onPlugTarget(port.label);
      setError(rejection || null);
    }
  };

  const socketKind = (id: string): SocketKind => id === 'usb' ? 'usb-a' : id === 'hdmi' ? 'hdmi' : id === 'con' ? 'console' : id === 'pwr' || id === 'dc' ? 'dc' : id === 'audio' ? 'audio' : 'ethernet';
  const portLink = (id: string) => {
    const key = id === 'eth' ? 'Ethernet0' : id === 'fa1' ? 'FastEthernet0/1' : id === 'fa3' ? 'FastEthernet0/3' : id === 'g01' ? 'GigabitEthernet0/1' : id === 'wan' ? 'Ethernet0' : id === 'lan1' ? 'LAN 1' : id === 'lan2' ? 'LAN 2' : '';
    const port = device.interfaces[key];
    return Boolean(port?.adminUp && port.lineProtocolUp);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-950/70 p-3 backdrop-blur-sm sm:p-5">
      <div role="dialog" aria-modal="true" aria-label="Inspeksi port perangkat" className="nq-hardware-modal w-full max-w-3xl overflow-hidden rounded-3xl border border-stone-200 bg-[#FBF7EF] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 bg-[#F4EDE1] px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-800 text-amber-300">
              {device.id === 'rt-ratna' ? (
                <RouterIcon className="h-5 w-5" />
              ) : device.id === 'sw1' ? (
                <Cpu className="h-5 w-5" />
              ) : device.id === 'ap-lounge' ? (
                <Wifi className="h-5 w-5" />
              ) : (
                <Laptop className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-stone-800">
                {isSourceDevice ? 'Colok Ujung A' : 'Colok Ujung B'} — {device.name}
              </h3>
              <p className="text-[11px] text-stone-500">
                {isSourceDevice
                  ? `Pilih kabel, colok ke port yang benar, lalu JALAN FISIK ke ${counterpartName}`
                  : `Kabel sudah ditarik fisik dari ${counterpartName}. Colok ke port yang benar untuk menyelesaikan!`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          {/* Cable selection (source only) */}
          {isSourceDevice && (
            <div className="rounded-2xl border border-stone-200 bg-white p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-stone-800">
                  Kabel di tas ({inventory.cables.length})
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-800">
                  <Ruler className="h-3 w-3" />{' '}
                  {requiredMeters !== null
                    ? `Hasil ukur: ${requiredMeters.toFixed(1)}m ke ${counterpartName}`
                    : `Jarak ke ${counterpartName} belum diukur (pakai meteran)`}
                </span>
              </div>
              {inventory.cables.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  Tas kabel kosong! Di lokasi klien tidak ada roll kabel & crimper. Pulang ke{' '}
                  <strong>Kantor NetQuest → Meja Toolbench</strong> untuk bikin kabel dulu.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {inventory.cables.map((c, idx) => {
                    const active = c.id === selectedCableId;
                    const enough = requiredMeters === null ? null : c.lengthMeters >= requiredMeters;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setSelectedCableId(c.id);
                          setError(null);
                        }}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition ${
                          active
                            ? 'border-[#0F766E] bg-teal-50 ring-2 ring-teal-600/20'
                            : 'border-stone-200 bg-stone-50 hover:border-stone-300'
                        }`}
                      >
                        <Cable
                          className={`h-4 w-4 ${c.type === 'straight' ? 'text-teal-700' : 'text-orange-600'}`}
                        />
                        <span>
                          <span className="block font-bold text-stone-800">
                            #{idx + 1} {c.type === 'straight' ? 'Straight' : 'Crossover'}
                            {c.tested && c.faulty && <span className="ml-1 text-rose-600">· RUSAK</span>}
                            {c.tested === false && <span className="ml-1 text-amber-600">· belum diuji</span>}
                          </span>
                          <span
                            className={`font-mono text-[10px] font-bold ${
                              enough === null
                                ? 'text-stone-500'
                                : enough
                                ? 'text-emerald-700'
                                : 'text-rose-600'
                            }`}
                          >
                            {c.lengthMeters}m{' '}
                            {enough === null ? '· belum diukur' : enough ? '· cukup' : '· KEPENDEKAN!'}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedCable && requiredMeters !== null && selectedCable.lengthMeters < requiredMeters && (
                <div className="mt-2 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-[11px] text-rose-700">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Kabel ini ({selectedCable.lengthMeters}m) lebih pendek dari hasil ukur {requiredMeters.toFixed(1)}m!
                  Kalau dipaksa, kabel akan mentok di tengah jalan.
                </div>
              )}
              {selectedCable && requiredMeters === null && (
                <div className="mt-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900">
                  <Ruler className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Kamu belum mengukur rute ini. Tanpa meteran kamu cuma menebak — kalau kurang, kabel mentok di
                  tengah jalan dan harus diulang.
                </div>
              )}
            </div>
          )}

          {/* Target run info */}
          {!isSourceDevice && cableRun && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-3.5 py-2.5 text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-teal-900">
                <Cable className="h-4 w-4" />
                Menarik: {cableRun.cableType === 'straight' ? 'Straight' : 'Crossover'} · {cableRun.lengthMeters}m
              </span>
              <span className="font-mono font-bold text-teal-900">
                Sampai pemain: {cableRun.usedMeters.toFixed(1)}m / {cableRun.lengthMeters}m
              </span>
            </div>
          )}

          {!isSourceDevice && cableRun && targetRouteMeters !== undefined && (
            <div data-testid="target-route-length" className="rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs text-stone-700">
              Total sampai port: <strong>{(Math.ceil(targetRouteMeters * 100) / 100).toFixed(2)}m / {cableRun.lengthMeters}m</strong>
              {' · '}Jarak terakhir ke perangkat: {Math.max(0, targetRouteMeters - cableRun.usedMeters).toFixed(2)}m
            </div>
          )}

          {/* Hardware close-up chassis */}
          <div className="overflow-hidden rounded-2xl border-2 border-stone-700 bg-gradient-to-b from-stone-800 to-stone-900 shadow-lg">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
              <div>
                <div className="font-mono text-[11px] font-bold text-amber-300">{hw.title}</div>
                <div className="text-[10px] text-stone-400">{hw.subtitle}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-stone-500" />
                <span className="font-mono text-[9px] text-stone-400">SKEMA</span>
              </div>
            </div>

            <div className="flex flex-wrap items-stretch justify-center gap-3 p-4">
              {hw.ports.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePortClick(p)}
                  className="nq-port-button group flex w-28 flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-black/40 p-3 transition hover:-translate-y-0.5 hover:border-amber-400 hover:bg-black/60"
                >
                  <PhysicalSocket kind={socketKind(p.id)} link={portLink(p.id)} />
                  <span className="font-mono text-[11px] font-extrabold text-white">{p.label}</span>
                  <span className="text-[9px] text-stone-400">{p.sub}</span>
                  <span className="mt-0.5 inline-flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-200 opacity-0 transition group-hover:opacity-100">
                    <Plug className="h-2.5 w-2.5" /> Colok
                  </span>
                </button>
              ))}
            </div>

            <div className="border-t border-white/10 bg-black/30 px-4 py-2 text-center font-mono text-[9px] uppercase tracking-widest text-stone-500">
              Bentuk soket diperbesar · bukan diagram pinout atau gambar berskala
            </div>
          </div>

          <div className="nq-hardware-note"><strong>Membaca panel</strong><p>Ethernet dan console serial dapat menggunakan soket 8P8C yang sama bentuknya. Baca label: console bukan jalur data Ethernet. Warna jack bukan standar universal.</p><p>Pada ilustrasi Ethernet ini, LED kiri menunjukkan link; LED kanan tidak menyimulasikan aktivitas. Link aktif belum membuktikan IP, gateway, atau internet benar.</p></div>
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span>
            </div>
          )}

          {!isSourceDevice && (
            <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white p-3 text-[11px] text-stone-500">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-700" />
              Setelah ujung B tertancap di port yang benar, game akan menjalankan auto-negotiation & menyalakan Link
              LED hijau — persis seperti aslinya.
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50"
            >
              {isSourceDevice ? 'Batal' : 'Tutup'} <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
