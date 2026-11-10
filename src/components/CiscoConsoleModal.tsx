import { setInterfaceAdmin } from '../game/hardwareLink';
import { PhysicalSocket } from './PhysicalSocket';
import { isIPv4, isSubnetMask } from '../game/network';
import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Cable,
  CheckCircle2,
  Cpu,
  HelpCircle,
  Network,
  Play,
  Plug,
  Router as RouterIcon,
  Server,
  Terminal,
  X,
} from 'lucide-react';
import {
  DeviceId,
  NetworkDevice,
  TechnicianInventory,
} from '../game/types';
import { sound } from '../game/sound';

interface CiscoConsoleModalProps {
  device: NetworkDevice;
  allDevices: Record<string, NetworkDevice>;
  inventory: TechnicianInventory;
  onUpdateDevices: (
    updater: (prev: Record<string, NetworkDevice>) => Record<string, NetworkDevice>
  ) => void;
  onTriggerPacketFlow: (fromId: DeviceId, toId: DeviceId, color: string, label: string) => void;
  onPingSuccess: (fromId: DeviceId, targetIp: string) => void;
  onClose: () => void;
}

type IosMode = 'user' | 'priv' | 'config' | 'config-if' | 'config-vlan';

export const CiscoConsoleModal: React.FC<CiscoConsoleModalProps> = ({
  device,
  allDevices,
  inventory,
  onUpdateDevices,
  onTriggerPacketFlow,
  onPingSuccess,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'module' | 'cli' | 'guide'>('module');

  // Cisco IOS CLI State
  const [iosMode, setIosMode] = useState<IosMode>('user');
  const [selectedIf, setSelectedIf] = useState<string | null>(null);
  const [selectedVlan, setSelectedVlan] = useState<number | null>(null);
  const [iosLines, setIosLines] = useState<string[]>(() => [
    `NetQuest IOS simulation, ${
      device.type === 'switch'
        ? 'Catalyst 2960-24PC-L lab profile'
        : 'Cisco 1941 lab profile'
    }`,
    `Serial Console Baudrate: 9600 bps (8-N-1)`,
    ``,
    `Press RETURN or ketik perintah untuk memulai...`,
    ``,
  ]);
  const [iosInput, setIosInput] = useState('');
  const [consoleMsg, setConsoleMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const pane = terminalEndRef.current?.parentElement;
    if (pane) pane.scrollTop = pane.scrollHeight;
  }, [iosLines]);

  const handleToggleConsoleCable = () => {
    if (device.consoleConnected) {
      sound.playClick();
      onUpdateDevices((prev) => ({
        ...prev,
        [device.id]: { ...prev[device.id], consoleConnected: false },
      }));
      setConsoleMsg({
        ok: true,
        text: `Kabel Console dicabut dari port CONSOLE ${device.hostname}.`,
      });
      return;
    }

    if (!inventory.hasConsoleCable) {
      sound.playError();
      setConsoleMsg({
        ok: false,
        text: 'Kit console serial belum tersedia. Periksa inventory.',
      });
      return;
    }

    sound.playCablePlug();
    onUpdateDevices((prev) => ({
      ...prev,
      [device.id]: { ...prev[device.id], consoleConnected: true },
    }));
    setConsoleMsg({
      ok: true,
      text: `Terminal teknisi → adaptor USB–serial → rollover RJ45 → CONSOLE ${device.hostname}. Serial 9600, 8-N-1, tanpa flow control.`,
    });
  };

  const getIosPrompt = () => {
    const host = device.hostname;
    switch (iosMode) {
      case 'user':
        return `${host}>`;
      case 'priv':
        return `${host}#`;
      case 'config':
        return `${host}(config)#`;
      case 'config-if':
        return `${host}(config-if)#`;
      case 'config-vlan':
        return `${host}(config-vlan)#`;
    }
  };

  const executeIosCommand = (rawCommand: string) => {
    const cmd = rawCommand.trim();
    const prompt = getIosPrompt();
    if (!cmd) {
      setIosLines((prev) => [...prev, prompt]);
      return;
    }

    sound.playTerminalBeep();
    const lower = cmd.toLowerCase();
    const out: string[] = [`${prompt} ${cmd}`];

    if (lower === '?' || lower === 'help') {
      if (iosMode === 'user') {
        out.push(
          '  enable   - Masuk ke Privileged EXEC mode (#)',
          '  ping     - Kirim paket ICMP ping',
          '  show     - Tampilkan informasi sistem'
        );
      } else if (iosMode === 'priv') {
        out.push(
          '  configure terminal (conf t) - Masuk ke Global Configuration mode',
          '  show ip interface brief     - Cek status & IP semua interface',
          '  show vlan brief             - Cek daftar VLAN (pada Switch)',
          '  ping <ip>                   - Uji konektivitas ICMP',
          '  disable                     - Kembali ke User EXEC mode'
        );
      } else if (iosMode === 'config') {
        out.push(
          '  interface <nama> (int g0/1, int fa0/1) - Konfigurasi interface',
          '  vlan <nomor> (vlan 10, vlan 20)        - Buat/edit VLAN',
          '  hostname <nama>                        - Ubah hostname perangkat',
          '  exit / end                             - Keluar dari mode konfigurasi'
        );
      } else if (iosMode === 'config-if') {
        out.push(
          '  ip address <ip> <mask>        - Atur alamat IPv4 interface',
          '  no shutdown                   - Aktifkan interface (UP)',
          '  shutdown                      - Matikan interface (DOWN)',
          '  switchport mode access        - Set port switch menjadi mode access',
          '  switchport access vlan <id>   - Masukkan port ke VLAN tertentu',
          '  exit                          - Kembali ke Global Config'
        );
      } else if (iosMode === 'config-vlan') {
        out.push(
          '  name <nama-vlan>  - Beri nama VLAN (misal: FINANCE)',
          '  exit              - Simpan & kembali ke Global Config'
        );
      }
      setIosLines((prev) => [...prev, ...out]);
      return;
    }

    if (lower === 'enable' || lower === 'en') {
      if (iosMode === 'user') setIosMode('priv');
      setIosLines((prev) => [...prev, ...out]);
      return;
    }

    if (lower === 'disable') {
      setIosMode('user');
      setSelectedIf(null);
      setSelectedVlan(null);
      setIosLines((prev) => [...prev, ...out]);
      return;
    }

    if (lower === 'end') {
      if (iosMode !== 'user') {
        setIosMode('priv');
        setSelectedIf(null);
        setSelectedVlan(null);
        out.push('%SYS-5-CONFIG_I: Configured from console by console');
      }
      setIosLines((prev) => [...prev, ...out]);
      return;
    }

    if (lower === 'exit') {
      if (iosMode === 'config-if' || iosMode === 'config-vlan') {
        setIosMode('config');
        setSelectedIf(null);
        setSelectedVlan(null);
      } else if (iosMode === 'config') {
        setIosMode('priv');
      } else if (iosMode === 'priv') {
        setIosMode('user');
      }
      setIosLines((prev) => [...prev, ...out]);
      return;
    }

    if (lower === 'configure terminal' || lower === 'conf t' || lower === 'config t') {
      if (iosMode === 'priv') {
        setIosMode('config');
        out.push('Enter configuration commands, one per line.  End with CNTL/Z.');
      } else if (iosMode === 'user') {
        sound.playError();
        out.push('% Invalid input detected. Ketik "enable" dulu untuk masuk ke Privileged mode (#).');
      }
      setIosLines((prev) => [...prev, ...out]);
      return;
    }

    if (
      lower === 'show ip interface brief' ||
      lower === 'sh ip int br' ||
      lower === 'show ip int brief'
    ) {
      out.push('Interface              IP-Address      OK? Method Status                Protocol');
      Object.values(device.interfaces).forEach((iface) => {
        const ip = (iface.ipAddress || 'unassigned').padEnd(15, ' ');
        const status = (iface.adminUp ? 'up' : 'administratively down').padEnd(21, ' ');
        const proto = iface.adminUp && iface.lineProtocolUp ? 'up' : 'down';
        out.push(`${iface.name.padEnd(22, ' ')} ${ip} YES manual ${status} ${proto}`);
      });
      setIosLines((prev) => [...prev, ...out]);
      return;
    }

    if (lower === 'show vlan brief' || lower === 'sh vlan br' || lower === 'show vlan') {
      if (device.type !== 'switch') {
        out.push('% Perintah "show vlan brief" hanya berlaku pada Cisco Switch.');
      } else {
        out.push(
          'VLAN Name                             Status    Ports',
          '---- -------------------------------- --------- -------------------------------'
        );
        const vlans = device.vlans || {};
        Object.values(vlans).forEach((v) => {
          const assignedPorts = Object.values(device.interfaces)
            .filter((i) => (i.vlan || 1) === v.id)
            .map((i) => i.shortName)
            .join(', ');
          out.push(`${String(v.id).padEnd(4, ' ')} ${v.name.padEnd(32, ' ')} active    ${assignedPorts}`);
        });
      }
      setIosLines((prev) => [...prev, ...out]);
      return;
    }

    if (lower.startsWith('ping ')) {
      const targetIp = cmd.split(/\s+/)[1];
      out.push(
        `Type escape sequence to abort.`,
        `Sending 5, 100-byte ICMP Echos to ${targetIp}, timeout is 2 seconds:`
      );
      const r1G0 = allDevices['r1']?.interfaces['GigabitEthernet0/0'];
      const r1G1 = allDevices['r1']?.interfaces['GigabitEthernet0/1'];
      const reachable =
        targetIp === '192.168.10.1' ||
        targetIp === '192.168.10.100' ||
        (targetIp === '192.168.20.1' && r1G1?.adminUp) ||
        (targetIp === '192.168.20.25' && r1G1?.adminUp) ||
        (targetIp === '192.168.10.15' && allDevices['pc-sari']?.cableConnected && r1G0?.adminUp);

      if (reachable) {
        sound.playPingSuccess();
        out.push('!!!!!', 'Success rate is 100 percent (5/5), round-trip min/avg/max = 1/1/4 ms');
        onTriggerPacketFlow(device.id, 'srv-fin', '#0F766E', `IOS Ping ${targetIp}`);
        onPingSuccess(device.id, targetIp);
      } else {
        sound.playError();
        out.push('.....', 'Success rate is 0 percent (0/5)');
      }
      setIosLines((prev) => [...prev, ...out]);
      return;
    }

    if (iosMode === 'config' || iosMode === 'config-if' || iosMode === 'config-vlan') {
      if (lower.startsWith('hostname ')) {
        const newHost = cmd.split(/\s+/)[1];
        if (newHost) {
          onUpdateDevices((prev) => ({
            ...prev,
            [device.id]: { ...prev[device.id], hostname: newHost },
          }));
        }
        setIosLines((prev) => [...prev, ...out]);
        return;
      }

      if (lower.startsWith('vlan ')) {
        const vid = parseInt(cmd.split(/\s+/)[1], 10);
        if (device.type !== 'switch') {
          sound.playError();
          out.push('% Konfigurasi VLAN dilakukan pada Cisco Catalyst Switch (SW1).');
        } else if (!isNaN(vid) && vid > 0 && vid < 4095) {
          setSelectedVlan(vid);
          setIosMode('config-vlan');
          onUpdateDevices((prev) => {
            const sw = { ...prev[device.id] };
            const vlans = { ...(sw.vlans || {}) };
            if (!vlans[vid]) {
              vlans[vid] = { id: vid, name: `VLAN${String(vid).padStart(4, '0')}`, ports: [] };
            }
            sw.vlans = vlans;
            return { ...prev, [device.id]: sw };
          });
        } else {
          sound.playError();
          out.push('% Invalid VLAN ID.');
        }
        setIosLines((prev) => [...prev, ...out]);
        return;
      }

      if (lower.startsWith('interface ') || lower.startsWith('int ')) {
        const arg = lower.replace(/^(interface|int)\s+/, '').trim();
        const matchedKey = Object.keys(device.interfaces).find((k) => {
          const kl = k.toLowerCase();
          const sl = device.interfaces[k].shortName.toLowerCase();
          return kl === arg || sl === arg || kl.replace(/\s+/g, '') === arg.replace(/\s+/g, '');
        });

        if (matchedKey) {
          setSelectedIf(matchedKey);
          setIosMode('config-if');
        } else {
          sound.playError();
          const avail = Object.values(device.interfaces)
            .map((i) => i.shortName)
            .join(', ');
          out.push(`% Invalid interface. Interface tersedia di ${device.hostname}: ${avail}`);
        }
        setIosLines((prev) => [...prev, ...out]);
        return;
      }
    }

    if (iosMode === 'config-vlan' && selectedVlan !== null) {
      if (lower.startsWith('name ')) {
        const vname = cmd.split(/\s+/)[1];
        if (vname) {
          onUpdateDevices((prev) => {
            const sw = { ...prev[device.id] };
            const vlans = { ...(sw.vlans || {}) };
            vlans[selectedVlan] = {
              ...(vlans[selectedVlan] || { id: selectedVlan, ports: [] }),
              name: vname.toUpperCase(),
            };
            sw.vlans = vlans;
            return { ...prev, [device.id]: sw };
          });
          out.push(`% VLAN ${selectedVlan} dinamai "${vname.toUpperCase()}"`);
        }
        setIosLines((prev) => [...prev, ...out]);
        return;
      }
    }

    if (iosMode === 'config-if' && selectedIf) {
      if (lower.startsWith('ip address ')) {
        const parts = cmd.split(/\s+/);
        const ip = parts[2];
        const mask = parts[3];
        if (isIPv4(ip || '') && isSubnetMask(mask || '') && parts.length === 4) {
          onUpdateDevices((prev) => {
            const dev = { ...prev[device.id] };
            const ifs = { ...dev.interfaces };
            ifs[selectedIf] = { ...ifs[selectedIf], ipAddress: ip, subnetMask: mask };
            dev.interfaces = ifs;
            return { ...prev, [device.id]: dev };
          });
          out.push(`% IP Address ${ip} ${mask} diterapkan pada ${selectedIf}`);
        } else {
          sound.playError();
          out.push('% Invalid IP/mask or command. Contoh: ip address 192.168.20.1 255.255.255.0');
        }
        setIosLines((prev) => [...prev, ...out]);
        return;
      }

      if (lower === 'no shutdown' || lower === 'no shut') {
        sound.playCablePlug();
        onUpdateDevices(prev => setInterfaceAdmin(prev, device.id, selectedIf, true));
        out.push(`% Interface ${selectedIf}: administrative state enabled.`);
        setIosLines((prev) => [...prev, ...out]);
        return;
      }

      if (lower === 'shutdown' || lower === 'shut') {
        onUpdateDevices(prev => setInterfaceAdmin(prev, device.id, selectedIf, false));
        out.push(`%LINK-5-CHANGED: Interface ${selectedIf}, changed state to administratively down`);
        setIosLines((prev) => [...prev, ...out]);
        return;
      }

      if (lower === 'switchport mode access') {
        out.push(`% Port ${selectedIf} diatur ke mode static access.`);
        setIosLines((prev) => [...prev, ...out]);
        return;
      }

      if (lower.startsWith('switchport access vlan ')) {
        const vid = parseInt(cmd.split(/\s+/)[3], 10);
        if (!isNaN(vid)) {
          sound.playCablePlug();
          onUpdateDevices((prev) => {
            const sw = { ...prev[device.id] };
            const ifs = { ...sw.interfaces };
            ifs[selectedIf] = { ...ifs[selectedIf], vlan: vid };
            const vlans = { ...(sw.vlans || {}) };
            if (!vlans[vid]) {
              vlans[vid] = { id: vid, name: `VLAN${String(vid).padStart(4, '0')}`, ports: [] };
            }
            sw.interfaces = ifs;
            sw.vlans = vlans;
            return { ...prev, [device.id]: sw };
          });
          onTriggerPacketFlow('sw1', vid === 10 ? 'pc-sari' : 'pc-dimas', '#0F766E', `VLAN ${vid}`);
          out.push(`% Port ${selectedIf} berhasil dimasukkan ke VLAN ${vid}!`);
        }
        setIosLines((prev) => [...prev, ...out]);
        return;
      }
    }

    sound.playError();
    out.push(`% Invalid input detected at '^' marker. Ketik "?" untuk bantuan perintah pada mode ini.`);
    setIosLines((prev) => [...prev, ...out]);
  };

  const handleIosSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = iosInput;
    setIosInput('');
    executeIosCommand(val);
  };

  const getQuickChips = (): string[] => {
    if (device.type === 'router') {
      if (iosMode === 'user') return ['enable', 'show ip interface brief'];
      if (iosMode === 'priv')
        return ['configure terminal', 'show ip interface brief', 'ping 192.168.10.100'];
      if (iosMode === 'config') return ['interface g0/1', 'exit'];
      if (iosMode === 'config-if')
        return ['ip address 192.168.20.1 255.255.255.0', 'no shutdown', 'end'];
    }
    if (device.type === 'switch') {
      if (iosMode === 'user') return ['enable', 'show vlan brief'];
      if (iosMode === 'priv')
        return ['configure terminal', 'show vlan brief', 'show ip interface brief'];
      if (iosMode === 'config')
        return ['vlan 10', 'vlan 20', 'interface fa0/1', 'interface fa0/2', 'end'];
      if (iosMode === 'config-vlan')
        return [selectedVlan === 10 ? 'name FINANCE' : 'name MARKETING', 'exit'];
      if (iosMode === 'config-if')
        return [
          'switchport mode access',
          selectedIf === 'FastEthernet0/1'
            ? 'switchport access vlan 10'
            : 'switchport access vlan 20',
          'exit',
        ];
    }
    return ['help'];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/65 p-3 backdrop-blur-sm sm:p-5">
      <div className="flex h-[88vh] max-h-[700px] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-stone-200 bg-[#FBF7EF] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 bg-[#F4EDE1] px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F766E] text-white">
              {device.type === 'router' ? (
                <RouterIcon className="h-5 w-5" />
              ) : device.type === 'switch' ? (
                <Network className="h-5 w-5" />
              ) : (
                <Server className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-bold text-stone-800">{device.name}</h2>
                <span className="rounded bg-stone-200 px-2 py-0.5 font-mono text-xs font-bold text-stone-700">
                  {device.hostname}
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Lokasi: {device.zone} · Console:{' '}
                <strong className={device.consoleConnected ? 'text-emerald-700' : 'text-amber-700'}>
                  {device.consoleConnected ? 'Serial terhubung' : 'Belum dicolokkan'}
                </strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-stone-400 hover:bg-stone-200 hover:text-stone-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-stone-200 bg-[#F4EDE1]/60 px-5 pt-2">
          <button
            onClick={() => setActiveTab('module')}
            className={`flex items-center gap-2 rounded-t-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === 'module'
                ? 'border-x border-t border-stone-200 bg-white text-[#0F766E]'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Cpu className="h-4 w-4" />
            Modul Hardware & Port Cisco
          </button>

          <button
            onClick={() => setActiveTab('cli')}
            className={`flex items-center gap-2 rounded-t-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === 'cli'
                ? 'border-x border-t border-stone-200 bg-white text-[#0F766E]'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Terminal className="h-4 w-4" />
            Terminal teknisi · Cisco IOS
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 rounded-t-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === 'guide'
                ? 'border-x border-t border-stone-200 bg-white text-[#0F766E]'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <HelpCircle className="h-4 w-4" />
            Catatan Perintah IOS
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto bg-white p-5">
          {activeTab === 'module' && (
            <div className="space-y-5">
              {/* REALISTIC CISCO CHASSIS & MODULE FACEPLATE */}
              <div
                className={`rounded-2xl border-2 p-4 text-white shadow-lg ${
                  device.type === 'switch'
                    ? 'border-cyan-800 bg-gradient-to-b from-[#0E5A6D] to-[#08333E]'
                    : 'border-stone-700 bg-gradient-to-b from-stone-800 to-stone-900'
                }`}
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/15 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-white/15 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-amber-300">
                      {device.type === 'switch' ? 'CISCO CATALYST 2960-24PC-L' : 'CISCO 1941/K9'}
                    </span>
                    <span className="font-mono text-xs font-bold">{device.hostname}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-[10px]">
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                      SYST
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      STAT
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          device.consoleConnected ? 'bg-sky-400 shadow-[0_0_6px_#38bdf8]' : 'bg-stone-500'
                        }`}
                      />
                      SESSION
                    </span>
                  </div>
                </div>

                {/* Hardware Modules & RJ45 Ports Grid */}
                <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                  {/* Main Interface Module Bay */}
                  <div className="rounded-xl border border-white/15 bg-black/30 p-3">
                    <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-stone-300">
                      {device.type === 'switch'
                        ? 'Port lab terpilih · bukan panel lengkap 24 port'
                        : 'Port GigabitEthernet onboard · skema, bukan replika panel'}
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {Object.values(device.interfaces).map((iface) => {
                        const isUp = iface.adminUp && iface.lineProtocolUp;
                        return (
                          <div
                            key={iface.name}
                            className="flex flex-col justify-between rounded-lg border border-stone-600 bg-stone-900/90 p-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-white">
                                {iface.shortName}
                              </span>
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${
                                  isUp
                                    ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                                    : 'bg-stone-600'
                                }`}
                              />
                            </div>
                            <PhysicalSocket kind="ethernet" link={isUp}/>
                            <div className="font-mono text-[9px] text-stone-300 truncate">
                              {isUp ? 'LINK UP' : iface.adminUp ? 'NO LINK' : 'ADMIN DOWN'}
                            </div>
                            {iface.ipAddress && iface.ipAddress !== 'unassigned' && (
                              <div className="font-mono text-[9px] text-amber-300 truncate">
                                {iface.ipAddress}
                              </div>
                            )}
                            {typeof iface.vlan === 'number' && (
                              <div className="font-mono text-[9px] text-teal-300">
                                VLAN {iface.vlan}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Management Console Port Bay */}
                  <div className="flex flex-col justify-between rounded-xl border border-sky-400/30 bg-sky-950/50 p-3">
                    <div>
                      <div className="font-mono text-[10px] font-bold uppercase text-sky-300">
                        Serial console
                      </div>
                      <p className="mt-1 text-[10px] leading-snug text-stone-300">
                        Terminal teknisi · USB–serial + rollover RJ45 · 9600 bps, 8-N-1, flow control: none.
                      </p>
                    </div>

                    <PhysicalSocket kind="console"/>
                    <button
                      type="button"
                      onClick={handleToggleConsoleCable}
                      className={`mt-3 flex items-center justify-between rounded-xl border-2 px-3 py-2.5 font-mono text-xs font-bold transition ${
                        device.consoleConnected
                          ? 'border-sky-300 bg-sky-500 text-stone-950 shadow-lg'
                          : 'border-sky-400/70 bg-sky-900/80 text-sky-200 hover:bg-sky-800'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Plug className="h-4 w-4" />
                        CONSOLE
                      </span>
                      <span className="text-[10px]">
                        {device.consoleConnected ? 'TERCOLOK' : 'COLOKKAN'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {consoleMsg && (
                <div
                  className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${
                    consoleMsg.ok
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-rose-200 bg-rose-50 text-rose-700'
                  }`}
                >
                  {consoleMsg.ok ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <span>{consoleMsg.text}</span>
                </div>
              )}

              {/* Detailed Interface Table */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {Object.values(device.interfaces).map((iface) => {
                  const isUp = iface.adminUp && iface.lineProtocolUp;
                  return (
                    <div
                      key={iface.name}
                      className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 p-3"
                    >
                      <div>
                        <div className="font-mono text-xs font-bold text-stone-800">
                          {iface.name} ({iface.shortName})
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {iface.description || iface.connectedTo || 'Port tersedia'}
                        </div>
                      </div>
                      <div className="text-right font-mono text-[11px]">
                        <div className={isUp ? 'font-bold text-emerald-700' : 'font-bold text-rose-600'}>
                          {isUp ? 'UP / UP' : iface.adminUp ? 'DOWN' : 'ADMIN DOWN'}
                        </div>
                        {iface.ipAddress && iface.ipAddress !== 'unassigned' && (
                          <div className="text-stone-600">{iface.ipAddress}</div>
                        )}
                        {typeof iface.vlan === 'number' && (
                          <div className="text-[#B45309]">VLAN {iface.vlan}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {device.type === 'switch' && device.vlans && (
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5">
                  <div className="mb-2 font-mono text-xs font-bold text-stone-700">
                    VLAN Database Aktif ({device.hostname})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(device.vlans).map((v) => (
                      <span
                        key={v.id}
                        className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 font-mono text-xs text-stone-700"
                      >
                        <strong>VLAN {v.id}</strong>: {v.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'cli' && (
            <div className="flex h-full flex-col space-y-3">
              {!device.consoleConnected ? (
                <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-stone-200 bg-stone-50 p-6 text-center space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <Cable className="h-6 w-6" />
                  </div>
                  <h4 className="font-serif text-lg font-bold text-stone-800">
                    Kabel Console Belum Terpasang
                  </h4>
                  <p className="max-w-md text-xs leading-relaxed text-stone-600">
                    Untuk mengakses terminal serial Cisco IOS pada <strong>{device.hostname}</strong>, colokkan{' '}
                    <strong>kit USB–serial dan kabel rollover RJ45</strong> ke port CONSOLE terlebih dahulu.
                  </p>
                  {inventory.hasConsoleCable ? (
                    <button
                      type="button"
                      onClick={handleToggleConsoleCable}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#0F766E] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#115E59]"
                    >
                      <Plug className="h-4 w-4" /> Colokkan Kabel Console Sekarang
                    </button>
                  ) : (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
                      Kit console belum ada di tas.
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex-1 min-h-[240px] overflow-y-auto rounded-xl border border-stone-800 bg-[#141210] p-4 font-mono text-xs leading-relaxed text-emerald-300 shadow-inner">
                    {iosLines.map((line, i) => (
                      <div key={i} className="whitespace-pre-wrap">
                        {line || '\u00A0'}
                      </div>
                    ))}
                    <div ref={terminalEndRef} />
                  </div>

                  <form
                    onSubmit={handleIosSubmit}
                    className="flex items-center gap-2 rounded-xl border border-stone-300 bg-stone-900 px-3.5 py-2"
                  >
                    <span className="font-mono text-xs font-bold text-amber-300 select-none">
                      {getIosPrompt()}
                    </span>
                    <input
                      type="text"
                      autoFocus
                      value={iosInput}
                      onChange={(e) => setIosInput(e.target.value)}
                      placeholder="Ketik perintah Cisco IOS (atau klik tombol bantu di bawah)..."
                      className="flex-1 bg-transparent font-mono text-xs text-white focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="flex items-center gap-1 rounded-lg bg-[#0F766E] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#115E59]"
                    >
                      <Play className="h-3.5 w-3.5" /> Enter
                    </button>
                  </form>

                  <div className="space-y-1.5">
                    <div className="text-[11px] font-medium text-stone-500">
                      Bantuan Perintah Mode Saat Ini:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {getQuickChips().map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => executeIosCommand(chip)}
                          className="rounded-lg border border-stone-300 bg-stone-100 px-2.5 py-1 font-mono text-[11px] font-semibold text-stone-700 hover:border-[#0F766E] hover:bg-teal-50 hover:text-[#0F766E] transition"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs leading-relaxed text-stone-600">
              <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
                <h4 className="mb-1.5 font-serif text-sm font-bold text-teal-900">
                  Catatan Topologi Gedung PT Nusantara Tech
                </h4>
                <ul className="space-y-1 font-mono text-[11px] text-stone-700">
                  <li>• Divisi Finance (VLAN 10)  : 192.168.10.0/24 · Gateway R1 G0/0 = 192.168.10.1</li>
                  <li>• Server Finance            : 192.168.10.100/24</li>
                  <li>• Divisi Marketing (VLAN 20): 192.168.20.0/24 · Gateway R1 G0/1 = 192.168.20.1</li>
                  <li>• Switch SW1 Ports          : Fa0/1 (Finance), Fa0/2 (Marketing), Fa0/3 (Wi-Fi AP)</li>
                </ul>
              </div>
              <pre className="overflow-x-auto rounded-xl bg-stone-800 p-3.5 font-mono text-[11px] text-stone-100">
{`! Contoh aktifkan interface Router:
Router> enable
Router# configure terminal
Router(config)# interface gigabitEthernet 0/1
Router(config-if)# ip address 192.168.20.1 255.255.255.0
Router(config-if)# no shutdown
Router(config-if)# end`}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
