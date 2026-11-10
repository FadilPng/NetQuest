import { desktopProfiles, defaultDesktopProfile } from '../game/desktopProfiles';
import { BrowserApp } from './BrowserApp';
import { isIPv4, isSubnetMask, canPing } from '../game/network';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BatteryFull,
  Cable,
  CheckCircle2,
  Search,
  Grid2X2,
  Folder,
  FileText,
  Trash2,
  Globe2,
  Info,
  Monitor,
  Network,
  Settings,
  Terminal,
  Wifi,
  X,
  XCircle,
  Plug,
} from 'lucide-react';
import {
  DeviceId,
  NetworkDevice,
  TechnicianInventory,
} from '../game/types';
import { sound } from '../game/sound';

type AppId = 'settings' | 'cmd' | 'network' | 'cable' | 'browser' | 'about';

interface PCDesktopModalProps {
  device: NetworkDevice;
  allDevices: Record<string, NetworkDevice>;
  inventory: TechnicianInventory;
  targetDeviceName: string;
  cableRunActive: boolean;
  measuredMeters: number | null;
  onRequestPhysicalPlug: (deviceId: DeviceId) => void;
  onRequestMeasure: (deviceId: DeviceId) => void;
  onUpdateDevice: (updated: NetworkDevice) => void;
  onPingSuccess: (fromId: DeviceId, targetIp: string) => void;
  onClose: () => void;
}

export const PCDesktopModal: React.FC<PCDesktopModalProps> = ({
  device,
  allDevices,
  inventory,
  targetDeviceName,
  cableRunActive,
  measuredMeters,
  onRequestPhysicalPlug,
  onRequestMeasure,
  onUpdateDevice,
  onPingSuccess,
  onClose,
}) => {
  const initialApp: AppId | null = null;
  const [startOpen, setStartOpen] = useState(false);
  const [startQuery, setStartQuery] = useState('');
  const [networkPanel, setNetworkPanel] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [openApps, setOpenApps] = useState<AppId[]>(initialApp ? [initialApp] : []);
  const [activeApp, setActiveApp] = useState<AppId | null>(initialApp);
  const [clock, setClock] = useState(new Date());

  // Network settings form
  const [ipInput, setIpInput] = useState(device.ipAddress || '');
  const [maskInput, setMaskInput] = useState(device.subnetMask || '255.255.255.0');
  const [gwInput, setGwInput] = useState(device.defaultGateway || '');
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Command prompt
  const [history, setHistory] = useState<string[]>([
    `NetQuest OS [Versi 11.2.1]`,
    `Perangkat: ${device.hostname} · ${device.name}`,
    `Ketik "help" untuk melihat perintah yang tersedia.`,
    '',
  ]);
  const [cmdValue, setCmdValue] = useState('');
  const terminalScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIpInput(device.ipAddress || '');
    setMaskInput(device.subnetMask || '255.255.255.0');
    setGwInput(device.defaultGateway || '');
    setSaveMsg(null);
  }, [device.id]);

  useEffect(() => {
    const t = window.setInterval(() => setClock(new Date()), 15000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const terminal = terminalScrollRef.current;
    if (terminal) terminal.scrollTop = terminal.scrollHeight;
  }, [history, activeApp]);

  const launch = (app: AppId) => {
    setStartOpen(false);
    setNetworkPanel(false);
    setStartQuery('');
    sound.playClick();
    setOpenApps((prev) => (prev.includes(app) ? prev : [...prev, app]));
    setActiveApp(app);
  };

  const minimizeApp = () => setActiveApp(null);
  const closeApp = () => {
    setOpenApps(prev => prev.filter(app => app !== activeApp));
    setActiveApp(null);
  };

  const cableLabel =
    device.cableType === 'none' ? 'Tidak ada kabel' : device.cableType === 'straight' ? 'UTP Straight-Through' : 'UTP Crossover';

  const saveIp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isIPv4(ipInput.trim()) || !isSubnetMask(maskInput.trim()) || (gwInput.trim() !== '' && !isIPv4(gwInput.trim()))) {
      sound.playError();
      setSaveMsg({ ok: false, text: 'Format IPv4, subnet mask, atau gateway tidak valid.' });
      return;
    }
    sound.playClick();
    onUpdateDevice({
      ...device,
      ipAddress: ipInput.trim(),
      subnetMask: maskInput.trim(),
      defaultGateway: gwInput.trim(),
      interfaces: {
        ...device.interfaces,
        Ethernet0: {
          ...device.interfaces['Ethernet0'],
          ipAddress: ipInput.trim(),
          subnetMask: maskInput.trim(),
        },
      },
    });
    setSaveMsg({ ok: true, text: `IPv4 tersimpan: ${ipInput.trim()} / ${maskInput.trim()}` });
  };

  const pingTarget = (target: string): { ok: boolean; lines: string[] } => {
    const lines: string[] = [];
    const ok = canPing(device, target, allDevices);

    if (ok) {
      lines.push(`Pinging ${target} with 32 bytes of data:`);
      for (let i = 0; i < 4; i++) lines.push(`Reply from ${target}: bytes=32 time<1ms TTL=128`);
      lines.push(`Ping statistics: Sent = 4, Received = 4, Lost = 0 (0% loss)`);
    } else {
      lines.push(
        `Pinging ${target} with 32 bytes of data:`,
        'Request timed out.',
        'Request timed out.',
        !isIPv4(target) ? 'Alamat tujuan bukan IPv4 yang valid.' :
        !device.cableConnected ? 'Media disconnected. Amati LED dan sambungan kabel terlebih dahulu.' :
        'Link fisik aktif, tetapi tujuan belum membalas. Bandingkan ipconfig dengan konfigurasi gateway; periksa interface dan VLAN. Timeout saja belum membuktikan penyebabnya.'
      );
    }
    return { ok, lines };
  };

  const runCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = cmdValue.trim();
    setCmdValue('');
    if (!raw) return;
    sound.playTerminalBeep();
    const out = [`${device.hostname}> ${raw}`];
    const lower = raw.toLowerCase();

    if (lower === 'cls' || lower === 'clear') {
      setHistory([]);
      return;
    }
    if (lower === 'help' || lower === '?') {
      out.push(
        'Perintah tersedia:',
        '  ipconfig             Tampilkan konfigurasi IPv4',
        '  ping <ip>            Uji konektivitas ICMP',
        '  netstat              Ringkasan status link',
        '  cls                  Bersihkan layar',
        ''
      );
    } else if (lower === 'ipconfig') {
      out.push(
        '',
        `Ethernet adapter Ethernet0:`,
        `   Deskripsi . . . . . : Realtek PCIe GbE Family Controller`,
        `   Status . . . . . . : ${device.cableConnected ? 'Media connected (Link UP)' : 'Media disconnected (kabel lepas)'}`,
        `   IPv4 Address . . . : ${device.ipAddress || '0.0.0.0'}`,
        `   Subnet Mask . . . . : ${device.subnetMask || '0.0.0.0'}`,
        `   Default Gateway . . : ${device.defaultGateway || '(belum diatur)'}`,
        ''
      );
    } else if (lower === 'netstat') {
      out.push(
        `Link Ethernet0 : ${device.cableConnected ? 'UP' : 'DOWN'}`,
        `Kabel         : ${cableLabel}`,
        `Kecepatan     : ${device.cableConnected ? '1000 Mbps Full Duplex' : '-'}`,
        '',
      );
    } else if (lower.startsWith('ping ')) {
      const target = raw.split(/\s+/)[1];
      const result = pingTarget(target);
      out.push(...result.lines, '');
      if (result.ok) {
        sound.playPingSuccess();
        onPingSuccess(device.id, target);
      } else {
        sound.playError();
      }
    } else {
      sound.playError();
      out.push(`'${raw}' bukan perintah yang dikenal. Ketik "help".`, '');
    }
    setHistory((prev) => [...prev, ...out]);
  };

  const quickPing = useMemo(() => {
    if (device.id === 'laptop-ratna') return '192.168.1.1';
    if (device.id === 'rt-ratna') return '192.168.1.1';
    if (device.id === 'srv-fin') return '192.168.10.1';
    return '192.168.10.100';
  }, [device.id]);

  const desktopIcons: Array<{
    app: AppId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bg: string;
  }> = [
    { app: 'network', label: 'Jaringan', icon: Network, color: 'text-sky-700', bg: 'bg-sky-100' },
    { app: 'settings', label: 'Pengaturan\nJaringan', icon: Settings, color: 'text-[#0F766E]', bg: 'bg-teal-100' },
    { app: 'cable', label: 'Kabel & Port', icon: Cable, color: 'text-amber-700', bg: 'bg-amber-100' },
    { app: 'cmd', label: 'Command\nPrompt', icon: Terminal, color: 'text-stone-700', bg: 'bg-stone-200' },
    { app: 'browser', label: 'Browser', icon: Globe2, color: 'text-blue-700', bg: 'bg-blue-100' },
    { app: 'about', label: 'Info\nPerangkat', icon: Info, color: 'text-stone-600', bg: 'bg-stone-100' },
  ];

  const appTitles: Record<AppId, string> = {
    settings: 'Pengaturan Jaringan',
    cmd: 'Command Prompt',
    network: 'Network & Sharing Center',
    cable: 'Inspeksi fisik perangkat · di luar OS',
    browser: 'NetQuest Browser',
    about: 'Tentang Perangkat',
  };

  const profile = desktopProfiles[device.id] || defaultDesktopProfile;
  const personalIcons = { bin: Trash2, folder: Folder, document: FileText, browser: Globe2 };
  const personalColors = { bin: '#d5e7ef', folder: '#ffd36c', document: '#8ac0ff', browser: '#69ded7' };

  const activeIcon = desktopIcons.find((i) => i.app === activeApp);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 p-2 backdrop-blur-sm sm:p-5">
      {/* Monitor bezel */}
      <div role="dialog" aria-modal="true" aria-label={`Komputer ${device.hostname}`} className="nq-monitor flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border-4 border-stone-700 bg-stone-800 shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between bg-stone-900 px-4 py-1.5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">{device.id === 'laptop-ratna' ? 'NETQUEST · NOTEBOOK 14' : 'NETQUEST · DISPLAY 24'}</span>
          <button onClick={() => launch('cable')} className="nq-physical-button"><Plug size={12}/> Periksa fisik perangkat</button>
          <button onClick={onClose} aria-label="Tutup komputer" className="rounded p-1 text-stone-400 transition hover:bg-stone-700 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Screen */}
        <div
          className={`nq-desktop relative flex h-[68vh] min-h-[300px] flex-col overflow-hidden sm:h-[74vh] ${profile.wallpaper ? 'nq-personal-desktop' : ''}`}
          style={{
            backgroundImage: profile.wallpaper ? `url("${profile.wallpaper}")` : 'linear-gradient(125deg, #07192e, #163e6b)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: '#101820',
          }}
        >
          {/* Client-owned desktop: decorative apps are intentionally unavailable. */}
          <div className={`nq-client-desktop nq-profile-icons profile-${profile.layout}`} aria-label={`Desktop ${profile.owner}`}>
            {profile.items.map(item => {
              const Icon = personalIcons[item.kind];
              return <button disabled={item.kind !== 'browser'} onClick={() => launch('browser')} key={item.name} title={item.kind === 'browser' ? 'Buka Browser' : `${item.name} — dekorasi, belum tersedia`} className="nq-dummy-icon" style={{ gridColumn: item.col, gridRow: item.row }}><Icon size={33} color={personalColors[item.kind]} strokeWidth={1.5}/><span>{item.name}</span></button>;
            })}
          </div>
          {!activeApp && <div className="nq-desktop-hint"><span>NETQUEST · SIMULASI DESKTOP</span><p>Mulai pemeriksaan melalui Start atau ikon jaringan.</p><small>Browser aktif · ikon desktop lainnya masih dekorasi.</small></div>}

          {/* App window */}
          {activeApp && (
            <div className={`nq-app-window absolute bottom-14 mx-auto flex flex-col overflow-hidden rounded-xl border border-stone-300 bg-white shadow-2xl ${maximized ? "inset-x-0 top-0 max-w-none" : "inset-x-2 top-4 max-w-4xl sm:left-28 sm:right-5 sm:top-10"}`}>
              {/* Window titlebar */}
              <div className="flex items-center justify-between border-b border-stone-200 bg-stone-100 px-3 py-2">
                <div className="flex items-center gap-2">
                  {activeIcon && (
                    <span className={`flex h-6 w-6 items-center justify-center rounded ${activeIcon.bg}`}>
                      <activeIcon.icon className={`h-3.5 w-3.5 ${activeIcon.color}`} />
                    </span>
                  )}
                  <span className="text-xs font-semibold text-stone-700">{appTitles[activeApp]}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={minimizeApp}
                    className="flex h-8 w-9 items-center justify-center rounded text-stone-400 transition hover:bg-stone-200"
                    aria-label="Minimalkan" title="Minimalkan"
                  >
                    <span className="h-0.5 w-3 bg-current" />
                  </button>
                  <button
                    onClick={() => setMaximized(value => !value)}
                    className="flex h-8 w-9 items-center justify-center rounded text-stone-400 transition hover:bg-stone-200"
                    aria-label={maximized ? "Pulihkan ukuran" : "Maksimalkan"} title={maximized ? "Pulihkan ukuran" : "Maksimalkan"}
                  >
                    <span className="h-2.5 w-2.5 border border-current" />
                  </button>
                  <button
                    onClick={closeApp}
                    className="flex h-6 w-8 items-center justify-center rounded text-stone-500 transition hover:bg-red-500 hover:text-white"
                    aria-label="Tutup aplikasi" title="Tutup"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Window body */}
              <div className={`min-h-0 flex-1 bg-white ${activeApp === 'cmd' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                {activeApp === 'settings' && (
                  <div className="flex min-h-full flex-col sm:flex-row">
                    <aside className="w-full shrink-0 border-b border-stone-200 bg-stone-50 p-3 sm:w-48 sm:border-b-0 sm:border-r">
                      <div className="mb-3 px-2 pt-1">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0F766E] text-xs font-bold text-white">
                            {profile.owner.replace('Bu ', '').slice(0, 2)}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-[11px] font-bold text-stone-800">{device.hostname}</div>
                            <div className="text-[10px] text-stone-500">Lokal</div>
                          </div>
                        </div>
                      </div>
                      {['Status', 'Ethernet', 'Wi-Fi', 'IP & DNS'].map((label, i) => (
                        <div
                          key={label}
                          className={`mb-0.5 rounded-lg px-3 py-2 text-[11px] ${
                            i === 3 ? 'bg-teal-100 font-bold text-teal-900' : 'text-stone-500'
                          }`}
                        >
                          {label}
                        </div>
                      ))}
                    </aside>

                    <form onSubmit={saveIp} className="flex-1 space-y-4 p-4 sm:p-5">
                      <div>
                        <h4 className="text-base font-bold text-stone-800">Alamat IPv4</h4>
                        <p className="text-[11px] text-stone-500">Atur alamat IP secara manual (static).</p>
                      </div>

                      <div className="grid gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3 text-[11px] sm:grid-cols-2">
                        <div className="flex justify-between sm:block">
                          <span className="text-stone-500">Status link</span>
                          <div className={`font-semibold ${device.cableConnected ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {device.cableConnected ? '● Terhubung' : '● Kabel terputus'}
                          </div>
                        </div>
                        <div className="flex justify-between sm:block">
                          <span className="text-stone-500">Kabel terpasang</span>
                          <div className="font-mono font-semibold text-stone-700">{cableLabel}</div>
                        </div>
                      </div>

                      {[
                        { label: 'IPv4 Address', value: ipInput, set: setIpInput, ph: '192.168.1.20' },
                        { label: 'Subnet Mask', value: maskInput, set: setMaskInput, ph: '255.255.255.0' },
                        { label: 'Default Gateway', value: gwInput, set: setGwInput, ph: '192.168.1.1' },
                      ].map((f) => (
                        <div key={f.label}>
                          <label className="mb-1 block text-[11px] font-semibold text-stone-600">{f.label}</label>
                          <input
                            value={f.value}
                            onChange={(e) => f.set(e.target.value)}
                            placeholder={f.ph}
                            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-xs text-stone-800 focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                          />
                        </div>
                      ))}

                      {saveMsg && (
                        <div
                          className={`flex items-start gap-2 rounded-lg border p-2.5 text-[11px] ${
                            saveMsg.ok
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                              : 'border-rose-200 bg-rose-50 text-rose-700'
                          }`}
                        >
                          {saveMsg.ok ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5" /> : <XCircle className="mt-0.5 h-3.5 w-3.5" />}
                          {saveMsg.text}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onRequestPhysicalPlug(device.id);
                          }}
                          className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800 hover:bg-amber-100"
                        >
                          <Plug className="h-3.5 w-3.5" /> {cableRunActive ? 'Lihat tarikan kabel' : 'Colok & tarik kabel fisik'}
                        </button>
                        <button
                          type="submit"
                          className="rounded-lg bg-[#0F766E] px-4 py-2 text-[11px] font-bold text-white hover:bg-[#115E59]"
                        >
                          Simpan
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {activeApp === 'cmd' && (
                  <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#0C0A09]">
                    <div ref={terminalScrollRef} role="log" aria-label="Hasil perintah CMD" className="min-h-0 flex-1 overflow-y-auto overscroll-contain break-words p-3 font-mono text-[11px] leading-relaxed text-stone-200 sm:p-4">
                      {history.map((line, i) => (
                        <div key={i} className="whitespace-pre-wrap">
                          {line || '\u00A0'}
                        </div>
                      ))}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1.5 border-t border-stone-800 px-3 py-2">
                      {['ipconfig', `ping ${quickPing}`, 'netstat', 'cls'].map((c) => (
                        <button
                          key={c}
                          onClick={() => setCmdValue(c)}
                          className="rounded border border-stone-700 bg-stone-800 px-2 py-1 font-mono text-[10px] text-teal-300 hover:border-teal-600"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                    <form onSubmit={runCommand} className="flex shrink-0 items-center gap-2 border-t border-stone-800 bg-black px-3 py-2">
                      <span className="font-mono text-[11px] text-teal-400">{device.hostname}&gt;</span>
                      <input
                        autoFocus
                        value={cmdValue}
                        onChange={(e) => setCmdValue(e.target.value)}
                        className="min-w-0 flex-1 bg-transparent font-mono text-[11px] text-white focus:outline-none"
                        placeholder="ketik perintah..."
                      />
                      <button type="submit" className="rounded bg-teal-600 px-2.5 py-1 font-mono text-[10px] font-bold text-white">
                        Enter
                      </button>
                    </form>
                  </div>
                )}

                {activeApp === 'network' && (
                  <div className="space-y-4 p-4 sm:p-5">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-12 w-12 items-center justify-center rounded-full ${device.cableConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {device.cableConnected ? <Wifi className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                      </span>
                      <div>
                        <div className="text-sm font-bold text-stone-800">
                          {device.cableConnected ? 'Terhubung ke jaringan' : 'Tidak ada koneksi jaringan'}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {device.cableConnected ? 'Akses jaringan lokal tersedia.' : 'Pasang kabel atau periksa switch/router.'}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {[
                        ['Nama perangkat', device.hostname],
                        ['Kabel', cableLabel],
                        ['IPv4', device.ipAddress || '-'],
                        ['Subnet', device.subnetMask || '-'],
                        ['Gateway', device.defaultGateway || '-'],
                        ['Zona', device.zone],
                      ].map(([k, v]) => (
                        <div key={k} className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
                          <div className="text-[10px] uppercase tracking-wide text-stone-400">{k}</div>
                          <div className="font-mono text-[11px] font-semibold text-stone-800">{v}</div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => {
                        onClose();
                        onRequestPhysicalPlug(device.id);
                      }} className="flex items-center gap-1.5 rounded-lg bg-[#0F766E] px-3 py-2 text-[11px] font-bold text-white">
                        <Cable className="h-3.5 w-3.5" /> {cableRunActive ? 'Lihat tarikan kabel' : 'Colok & tarik kabel fisik'}
                      </button>
                      <button onClick={() => launch('settings')} className="flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-2 text-[11px] font-semibold text-stone-600">
                        <Settings className="h-3.5 w-3.5" /> Ubah IP
                      </button>
                    </div>
                  </div>
                )}

                {activeApp === 'cable' && (
                  <div className="space-y-4 p-4 sm:p-5">
                    <div>
                      <h4 className="text-base font-bold text-stone-800">Port & Kabel</h4>
                      <p className="text-[11px] text-stone-500">
                        Perangkat: {device.name} · Tujuan kabel: {targetDeviceName}
                      </p>
                    </div>
                    <div className="rounded-xl border border-stone-300 bg-stone-100 p-4">
                      <div className="flex items-center justify-between rounded-lg bg-stone-800 p-3">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${device.cableConnected ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                          <span className="font-mono text-[11px] text-stone-200">Ethernet0</span>
                        </div>
                        <span className="font-mono text-[10px] text-stone-400">{cableLabel}</span>
                      </div>
                      <p className="mt-2 text-[11px] text-stone-600">
                        {device.cableConnected
                          ? 'Link aktif. Kabel sudah terpasang dan negosiasi berhasil.'
                          : 'Belum ada link yang valid. Pasang kabel dengan mini-game di bawah.'}
                      </p>
                    </div>
                    {/* Survei jarak dengan meteran (bukan menebak!) */}
                    <div
                      className={`rounded-xl border p-3 ${
                        measuredMeters !== null
                          ? 'border-teal-200 bg-teal-50'
                          : 'border-amber-200 bg-amber-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-[11px] font-bold text-stone-800">
                            {measuredMeters !== null
                              ? `Hasil ukur ke ${targetDeviceName}: ${measuredMeters.toFixed(1)} m`
                              : `Jarak ke ${targetDeviceName}: belum diukur`}
                          </div>
                          <p className="text-[10px] leading-snug text-stone-600">
                            {measuredMeters !== null
                              ? `Siapkan kabel minimal ${Math.ceil(measuredMeters + 1)} m (sudah termasuk toleransi).`
                              : inventory.hasMeasuringTape
                              ? 'Jalan dari perangkat ini ke tujuan sambil menarik meteran, lalu tekan E di tujuan.'
                              : 'Kamu belum punya meteran — beli di Toko Online HP (tab Toko), atau tebak sendiri (berisiko).'}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={!inventory.hasMeasuringTape || cableRunActive}
                          onClick={() => {
                            onClose();
                            onRequestMeasure(device.id);
                          }}
                          className="shrink-0 rounded-lg bg-[#B45309] px-3 py-2 text-[11px] font-bold text-white hover:bg-[#92400E] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {measuredMeters !== null ? 'Ukur ulang' : 'Ukur jarak dengan meteran'}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-stone-200 bg-white p-3">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-stone-700">
                        <span>Kabel di Tas Teknisi ({inventory.cables.length})</span>
                      </div>
                      {inventory.cables.length === 0 ? (
                        <p className="mt-1 text-[10px] text-rose-600">
                          Tas kabel kosong! Buat kabel di Meja Toolbench Kantor NetQuest terlebih dahulu.
                        </p>
                      ) : (
                        <div className="mt-1.5 flex flex-wrap gap-1.5 font-mono text-[10px] text-stone-600">
                          {inventory.cables.map((c, i) => (
                            <span key={c.id} className="rounded bg-stone-100 px-2 py-0.5">
                              #{i + 1} {c.type === 'straight' ? 'Straight' : 'Crossover'} ({c.lengthMeters}m)
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        onClose();
                        onRequestPhysicalPlug(device.id);
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F766E] px-4 py-3 text-sm font-bold text-white hover:bg-[#115E59]"
                    >
                      <Plug className="h-4 w-4" /> {cableRunActive ? 'Lihat Status Tarikan Fisik' : 'Colok Ujung A & Tarik Kabel Fisik'}
                    </button>
                    {cableRunActive && (
                      <p className="text-center text-[10px] leading-relaxed text-teal-800">
                        Tarikan aktif — tutup jendela ini lalu jalan ke {targetDeviceName} untuk mencolokkan ujung B.
                      </p>
                    )}
                  </div>
                )}

                {activeApp === 'browser' && <BrowserApp device={device} devices={allDevices}/>}

                {activeApp === 'about' && (
                  <div className="space-y-4 p-4 sm:p-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100 text-stone-600">
                        <Monitor className="h-6 w-6" />
                      </span>
                      <div>
                        <div className="text-sm font-bold text-stone-800">{device.name}</div>
                        <div className="font-mono text-[11px] text-stone-500">{device.hostname}</div>
                      </div>
                    </div>
                    <dl className="divide-y divide-stone-200 rounded-xl border border-stone-200 text-[11px]">
                      {[
                        ['Tipe perangkat', device.type === 'pc' ? 'Workstation / Laptop' : device.type === 'ap' ? 'Wireless Access Point' : device.type === 'server' ? 'Server Rack' : device.type],
                        ['Zona', device.zone],
                        ['IPv4', device.ipAddress || '-'],
                        ['Gateway', device.defaultGateway || '-'],
                        ['Kabel', cableLabel],
                        ['Link', device.cableConnected ? 'UP' : 'DOWN'],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between px-3 py-2">
                          <dt className="text-stone-500">{k}</dt>
                          <dd className="font-mono font-semibold text-stone-800">{v}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="rounded-lg bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800">
                      <strong>Tips:</strong> kabel yang di-crimp sendiri di toolkit lebih murah dan sesuai kebutuhan
                      panjang. Selalu uji dengan LAN tester sebelum dibawa ke klien.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {startOpen && <>
            <button className="nq-os-dismiss" aria-label="Tutup menu Start" onClick={() => setStartOpen(false)}/>
            <section className="nq-start-menu" aria-label="Menu Start">
              <label className="nq-start-search"><Search size={16}/><input autoFocus aria-label="Cari aplikasi" placeholder="Cari aplikasi, pengaturan…" value={startQuery} onChange={e => setStartQuery(e.target.value)}/></label>
              <div className="nq-start-label">{startQuery ? 'Hasil pencarian' : 'Disematkan'}<span>NetQuest OS</span></div>
              <div className="nq-start-apps">
                {desktopIcons.filter(item => item.app !== 'cable' && (item.label + ' ' + appTitles[item.app] + (item.app === 'cmd' ? ' cmd terminal' : item.app === 'settings' ? ' settings ethernet ip' : '')).toLowerCase().includes(startQuery.toLowerCase())).map(item => <button key={item.app} onClick={() => launch(item.app)}><span className={item.bg}><item.icon className={`h-6 w-6 ${item.color}`}/></span><span>{appTitles[item.app]}</span></button>)}
              </div>
              {startQuery && !desktopIcons.some(item => item.app !== 'cable' && (item.label + ' ' + appTitles[item.app] + (item.app === 'cmd' ? ' cmd terminal' : item.app === 'settings' ? ' settings ethernet ip' : '')).toLowerCase().includes(startQuery.toLowerCase())) && <p className="nq-search-empty">Aplikasi tidak ditemukan. Coba “cmd” atau “settings”.</p>}
              <footer><span className="nq-os-avatar" style={{ background: profile.accent, color: 'white' }}>{profile.owner.replace('Bu ', '').slice(0,1)}</span><span>{profile.owner}<small>Akun lokal · {device.hostname}</small></span><button onClick={() => setStartOpen(false)}>Kembali ke desktop</button></footer>
            </section>
          </>}
          {networkPanel && <>
            <button className="nq-os-dismiss" aria-label="Tutup status jaringan" onClick={() => setNetworkPanel(false)}/>
            <section className="nq-network-flyout" aria-label="Status Ethernet"><Network size={25}/><h3>Ethernet</h3><p>{device.cableConnected ? 'Link fisik terhubung' : 'Link fisik tidak terhubung'}</p><small>Link aktif belum memastikan akses jaringan berhasil.</small><button onClick={() => launch('settings')}>Pengaturan jaringan &amp; internet <span>›</span></button><button onClick={() => launch('network')}>Lihat detail koneksi <span>›</span></button></section>
          </>}

          {/* Taskbar */}
          <div className="nq-taskbar absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-white/60 bg-white/75 px-2 py-1.5 backdrop-blur-md">
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setStartOpen(v => !v); setNetworkPanel(false); }}
                aria-label="Start" aria-expanded={startOpen}
                className="nq-start-button"
              >
                <Grid2X2 className="h-6 w-6" />
              </button>
              <button className="nq-task-search" aria-label="Cari aplikasi" onClick={() => { setStartOpen(true); setNetworkPanel(false); }}><Search size={16}/><span>Cari</span></button>
              <div className="flex items-center gap-1 overflow-x-auto">
                {desktopIcons.filter(item => openApps.includes(item.app) && item.app !== 'cable').map((item) => (
                  <button
                    key={item.app}
                    onClick={() => launch(item.app)}
                    className={`rounded-lg p-1.5 transition hover:bg-white ${
                      openApps.includes(item.app) ? 'bg-white/80' : ''
                    }`}
                    title={appTitles[item.app]}
                  >
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 text-stone-600">
              <button aria-label="Status jaringan Ethernet" aria-expanded={networkPanel} onClick={() => { setNetworkPanel(v => !v); setStartOpen(false); }} className="rounded p-2 hover:bg-white" title={device.cableConnected ? "Ethernet: link aktif" : "Ethernet: link tidak aktif"}><Network className={`h-3.5 w-3.5 ${device.cableConnected ? "text-emerald-700" : "text-rose-600"}`} /></button>
              <BatteryFull className="h-4 w-4" />
              <div className="text-right text-[10px] leading-tight">
                <div className="font-semibold">
                  {clock.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div>{clock.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stand */}
        <div className="flex flex-col items-center bg-stone-800 py-1">
          <div className="h-2 w-16 rounded-b bg-stone-900" />
          <div className="h-1 w-24 rounded-full bg-stone-600" />
        </div>
      </div>
    </div>
  );
};
