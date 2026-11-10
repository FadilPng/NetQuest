import {drawOrder} from './game/propAttachments';
import { playerHitsWalls } from './game/wallGeometry';
import { drawThinWalls } from './game/rendering/thinWalls';
import { frameDeltaSeconds, packetPosition } from './game/animation';
import { advanceCableRoute, cableFits, completedCableRoute, measuredCableMeters, routeMeters } from './game/cableRoute';
import { hasPhysicalFloorCable } from './game/floorCable';
import { NetworkApplianceModal } from './components/NetworkApplianceModal';
import { installPhysicalCable } from './game/physicalLink';
import { getMarketingJobStatus } from './game/missionChecks';
import { canPing } from './game/network';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Backpack,
  Cable,
  CheckCircle2,
  ChevronRight,
  Coffee,
  Compass,
  MapPin,
  MessageSquare,
  Phone,
  Play,
  RotateCcw,
  Ruler,
  Star,
  Volume2,
  Wallet,
  VolumeX,
  Wrench,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import {
  drawCharacter,
  drawFloorTile,
  drawMapProp,
  drawWallTile,
  roundRect,
  TILE_SIZE,
} from './game/sprites';
import {
  ALL_NPCS,
  createInitialDevices,
  createInitialInventory,
  getMissionRequester,
  LOCATIONS,
  MISSIONS,
  SHOP_ITEMS,
  STARTING_BALANCE,
} from './game/worldData';
import {
  CableType,
  CraftedCableItem,
  DeviceId,
  DialogueBoxState,
  Direction,
  LocationId,
  NetworkDevice,
  NPC,
  PacketVisual,
  PlayerAvatar,
  ShopItem,
  TechnicianInventory,
} from './game/types';
import { sound } from './game/sound';
import { CiscoConsoleModal } from './components/CiscoConsoleModal';
import { PCDesktopModal } from './components/PCDesktopModal';
import { CableCraftModal } from './components/CableCraftModal';
import { HardwarePlugModal } from './components/HardwarePlugModal';
import { PhoneModal, PhoneChatState } from './components/PhoneModal';
import { InventoryModal } from './components/InventoryModal';
import { CertificateModal, CiscoHandbookModal } from './components/InfoModals';

interface Waypoint {
  x: number;
  y: number;
  autoInteractDeviceId?: DeviceId;
  autoInteractNpcId?: string;
}

const money = (value: number) =>
  'Rp ' + value.toLocaleString('id-ID', { maximumFractionDigits: 0 });



interface WorldTestFixture {
  jobAccepted?: boolean;
  location: LocationId;
  position: { x: number; y: number };
  inventory: TechnicianInventory;
}
export function App({ devFixture }: { devFixture?: WorldTestFixture } = {}) {
  // Test entry can seed a session in development only; production has no fixture route.
  const fixture = import.meta.env.DEV ? devFixture : undefined;
  // ── Session ───────────────────────────────────────────────
  const [started, setStarted] = useState(Boolean(fixture));
  const [avatar, setAvatar] = useState<PlayerAvatar>('raka');
  const [playerName, setPlayerName] = useState('Raka');
  const [muted, setMuted] = useState(false);

  // ── Freelance progression ────────────────────────────────
  const [location, setLocation] = useState<LocationId>(fixture?.location ?? 'base');
  const [currentMissionIndex, setCurrentMissionIndex] = useState(0);
  const [jobAccepted, setJobAccepted] = useState(fixture?.jobAccepted ?? false);
  const [xp, setXp] = useState(0);
  const [inventory, setInventory] = useState<TechnicianInventory>(() =>
    fixture?.inventory ?? createInitialInventory()
  );
  const [equippedCable, setEquippedCable] = useState<CableType>('none');
  const [verifiedPings, setVerifiedPings] = useState<string[]>([]);
  const [coffeeBoostUntil, setCoffeeBoostUntil] = useState(0);
  const [devices, setDevices] = useState<Record<string, NetworkDevice>>(() =>
    createInitialDevices()
  );

  // ── Physical cable pulling (colok ujung A → jalan → colok ujung B) ──
  // mode 'measure' = menarik meteran (tanpa batas panjang), 'cable' = menarik kabel asli
  const [cableRun, setCableRun] = useState<{
    mode: 'cable' | 'measure';
    cableId: string;
    cableType: 'straight' | 'crossover';
    lengthMeters: number;
    sourceDeviceId: DeviceId;
    sourcePort: string;
    usedMeters: number;
  } | null>(null);
  // Hasil ukur meteran per perangkat sumber (laptop-ratna → 6.5 m, dst)
  const [measuredRoutes, setMeasuredRoutes] = useState<Record<string, number>>({});
  // Ekonomi freelancer: saldo = modal awal + fee job − belanja (belanja via Toko Online di HP)
  const [spent, setSpent] = useState(0);
  const [craftFromBag, setCraftFromBag] = useState(false);
  const [phoneInitialTab, setPhoneInitialTab] = useState<'job' | 'chat' | 'toko' | 'riwayat'>('job');
  const [plugModal, setPlugModal] = useState<{
    deviceId: DeviceId;
    mode: 'source' | 'target';
  } | null>(null);
  const [cableTaut, setCableTaut] = useState(false);
  const cableTrailRef = useRef<Array<{ x: number; y: number }>>([]);
  const cableRunRef = useRef<typeof cableRun | null>(null);
  const tautRef = useRef(false);
  // Jalur kabel ASLI yang digelar pemain (disimpan permanen setelah ujung B tercolok)
  const installedRoutesRef = useRef<Record<string, Array<{ x: number; y: number }>>>({});
  // Kamera halus berbasis koordinat dunia + guard UI (zoom terkunci saat dialog/modal terbuka)
  const uiBlockedRef = useRef(true);
  const smoothZoomRef = useRef(1);
  const camInitRef = useRef(false);

  useEffect(() => {
    cableRunRef.current = cableRun;
  }, [cableRun]);

  const routeKey = (a: string, b: string) => [a, b].sort().join('::');

  // ── UI overlays ──────────────────────────────────────────
  const [activeDeviceId, setActiveDeviceId] = useState<DeviceId | null>(null);
  const [dialogue, setDialogue] = useState<DialogueBoxState | null>(null);
  const [showPhone, setShowPhone] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showTravelMenu, setShowTravelMenu] = useState(false);
  const [showHandbook, setShowHandbook] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [missionBriefExpanded, setMissionBriefExpanded] = useState(false);
  const [completedMissionCard, setCompletedMissionCard] = useState<(typeof MISSIONS)[number] | null>(null);
  const [coffeeOpen, setCoffeeOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Commit the input lock with the overlay, not on the next animation frame.
  // Otherwise closing a mission card can leave zoom input using the old lock.
  const worldUiBlocked = !started || Boolean(activeDeviceId) || Boolean(dialogue) ||
    Boolean(completedMissionCard) || Boolean(plugModal) || showPhone || craftFromBag ||
    showInventory || showTravelMenu || showHandbook || showCertificate || coffeeOpen;
  useLayoutEffect(() => {
    uiBlockedRef.current = worldUiBlocked;
  }, [worldUiBlocked]);

  // ── Camera ───────────────────────────────────────────────
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const cameraRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });

  // ── World refs ───────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentLocation = LOCATIONS[location];
  const currentMission =
    currentMissionIndex < MISSIONS.length ? MISSIONS[currentMissionIndex] : null;
  const coffeeBoostActive = Date.now() < coffeeBoostUntil;

  const playerRef = useRef({
    x: fixture?.position.x ?? currentLocation.spawn.x,
    y: fixture?.position.y ?? currentLocation.spawn.y,
    direction: 'down' as Direction,
    walkPhase: 0,
    isMoving: false,
    stepSoundTimer: 0,
  });
  const keysRef = useRef<Record<string, boolean>>({});
  const waypointRef = useRef<Waypoint | null>(null);
  const packetsRef = useRef<PacketVisual[]>([]);
  const nearbyTargetRef = useRef<{ type: 'device' | 'npc'; id: string; label: string } | null>(null);
  const [nearbyPrompt, setNearbyPrompt] = useState<{ type: 'device' | 'npc'; id: string; label: string } | null>(null);

  const completedCount = currentMissionIndex;
  const earnings = useMemo(
    () =>
      MISSIONS.slice(0, currentMissionIndex).reduce(
        (sum, m) => sum + parseInt(m.fee.replace(/\D/g, ''), 10),
        0
      ),
    [currentMissionIndex]
  );

  const balance = STARTING_BALANCE + earnings - spent;

  // Riwayat chat HP (disimpan di sini agar template yang sudah dipakai tidak muncul lagi)
  const [phoneChat, setPhoneChat] = useState<PhoneChatState>({ threads: {}, read: [] });

  const handleBuy = (item: ShopItem, qty: number) => {
    const total = item.price * qty;
    if (total > balance) return;
    setSpent((prev) => prev + total);
    setInventory((prev) => {
      const next = { ...prev };
      switch (item.id) {
        case 'crimper':
          next.hasCrimper = true;
          break;
        case 'tester':
          next.hasLanTester = true;
          break;
        case 'tape':
          next.hasMeasuringTape = true;
          break;
        case 'console':
          next.hasConsoleCable = true;
          break;
        case 'utp5':
          next.utpRollMeters = prev.utpRollMeters + (item.unitAmount || 5) * qty;
          break;
        case 'rj45x10':
          next.rj45Connectors = prev.rj45Connectors + (item.unitAmount || 10) * qty;
          break;
      }
      return next;
    });
  };

  // Rating dihitung dari job yang BENAR-BENAR selesai (belum ada job = belum ada rating)
  const [jobRatings, setJobRatings] = useState<number[]>([]);
  const mistakeCountRef = useRef(0);
  const rating = useMemo(() => {
    if (jobRatings.length === 0) return null;
    return jobRatings.reduce((a, b) => a + b, 0) / jobRatings.length;
  }, [jobRatings]);
  const registerMistake = useCallback(() => {
    mistakeCountRef.current += 1;
  }, []);

  // Apakah klien job aktif sedang berada satu ruangan dengan pemain?
  const clientOnSite = Boolean(currentMission && location === currentMission.location);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((prev) => (prev === message ? null : prev)), 3200);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    sound.muted = next;
  };

  const setZoomSafe = useCallback((next: number) => {
    const clamped = Math.max(0.9, Math.min(2.1, Number(next.toFixed(2))));
    zoomRef.current = clamped;
    setZoom(clamped);
  }, []);

  // ── Packets on the floor ─────────────────────────────────
  const triggerPacketFlow = useCallback(
    (fromId: DeviceId, toId: DeviceId, color: string, label: string) => {
      const fromDev = devices[fromId];
      const toDev = devices[toId];
      if (!fromDev || !toDev) return;
      const start = {
        x: fromDev.x + fromDev.widthTiles / 2,
        y: fromDev.y + fromDev.heightTiles / 2,
      };
      const end = {
        x: toDev.x + toDev.widthTiles / 2,
        y: toDev.y + toDev.heightTiles / 2,
      };
      const hub = devices['sw1'];
      const hubPt = hub ? { x: hub.x + hub.widthTiles / 2, y: hub.y + hub.heightTiles / 2 } : start;
      // Kalau ada jalur kabel asli buatan pemain, paket mengalir di jalur itu!
      const customRoute = installedRoutesRef.current[routeKey(fromId, toId)];
      let path: Array<{ x: number; y: number }>;
      if (customRoute && customRoute.length >= 2) {
        const first = customRoute[0];
        const startNearFirst =
          Math.hypot(first.x - start.x, first.y - start.y) <=
          Math.hypot(first.x - end.x, first.y - end.y);
        path = startNearFirst ? [...customRoute] : [...customRoute].reverse();
      } else {
        path = fromId === 'sw1' || toId === 'sw1' ? [start, end] : [start, hubPt, end];
      }
      packetsRef.current.push({
        id: `${Date.now()}-${Math.random()}`,
        path,
        progress: 0,
        speed: 0.55,
        color,
        label,
      });
    },
    [devices]
  );

  const handlePingSuccess = useCallback((fromId: DeviceId, targetIp: string) => {
    const key = `${fromId}:${targetIp}`;
    setVerifiedPings((prev) => (prev.includes(key) ? prev : [...prev, key]));
  }, []);

  // ── Installing a cable from the mini-game ────────────────
  const handleInstallCable = useCallback(
    (deviceId: DeviceId, cable: CraftedCableItem, destinationId: DeviceId, destinationPort: string) => {
      sound.playCablePlug();
      const type = cable.type;
      setVerifiedPings([]);
      setDevices(prev => installPhysicalCable(prev, deviceId, cable, destinationId, destinationPort));

      {
        // Kabel terpakai (terpasang di dinding), baik bagus maupun rusak
        setInventory((prev) => ({
          ...prev,
          cables: prev.cables.filter((c) => c.id !== cable.id),
        }));
      }
      if (cable.faulty) registerMistake();

      showToast(`Kabel ${type === 'straight' ? 'Straight' : 'Crossover'} (${cable.lengthMeters}m) terpasang. Periksa indikator port.`);
    },
    [registerMistake]
  );

  const handleCraftCable = (item: CraftedCableItem) => {
    setInventory((prev) => ({
      ...prev,
      cables: [...prev.cables, item],
    }));
    setEquippedCable(item.type);
    showToast(
      `Kabel ${item.type === 'straight' ? 'Straight' : 'Crossover'} (${item.lengthMeters}m) masuk ke Tas Teknisi!`
    );
  };

  // ── Physical cable run helpers (1 tile = 0.5 meter) ────
  const getCounterpart = (sourceId: DeviceId): { id: DeviceId; name: string } | null => {
    if (sourceId === 'laptop-ratna') return { id: 'rt-ratna', name: devices['rt-ratna']?.name || 'Router Wi-Fi Rumah' };
    if (sourceId === 'rt-ratna') return { id: 'laptop-ratna', name: devices['laptop-ratna']?.name || 'Laptop Bu Ratna' };
    if (sourceId === 'ap-lounge') return { id: 'sw1', name: 'Cisco Switch SW1 (Fa0/3)' };
    if (sourceId === 'pc-sari' || sourceId === 'pc-dimas') return { id: 'sw1', name: 'Cisco Switch SW1' };
    return null;
  };

  const handleOpenSourcePlug = (deviceId: DeviceId) => {
    // Hanya perangkat ujung (laptop/AP/PC) yang bisa jadi titik awal tarikan
    if (deviceId === 'rt-ratna' || deviceId === 'sw1' || deviceId === 'r1' || deviceId === 'srv-fin') {
      showToast('Mulai tarikan dari perangkat klien (Laptop / AP) dulu, baru jalan ke router/switch!');
      return;
    }
    setActiveDeviceId(null);
    setPlugModal({ deviceId, mode: 'source' });
  };

  // Mulai mengukur rute dengan meteran: tarik dari perangkat ini sampai tujuan
  const handleStartMeasure = (deviceId: DeviceId) => {
    if (!inventory.hasMeasuringTape) {
      sound.playError();
      showToast('Kamu belum punya meteran. Beli di Toko Online (tab Toko di HP).');
      return;
    }
    const counterpart = getCounterpart(deviceId);
    if (!counterpart) return;
    const sourceDev = devices[deviceId];
    cableTrailRef.current = [
      { x: sourceDev.x + sourceDev.widthTiles / 2, y: sourceDev.y + sourceDev.heightTiles / 2 },
      { x: playerRef.current.x, y: playerRef.current.y },
    ];
    setActiveDeviceId(null);
    setCableRun({
      mode: 'measure',
      cableId: 'tape',
      cableType: 'straight',
      lengthMeters: 999,
      sourceDeviceId: deviceId,
      sourcePort: 'meteran',
      usedMeters: routeMeters(cableTrailRef.current),
    });
    tautRef.current = false;
    setCableTaut(false);
    sound.playClick();
    showToast(`Meteran dikaitkan di ${sourceDev.name}. Jalan ke ${counterpart.name} lalu tekan E untuk membaca hasilnya.`);
  };

  const handleFinishMeasure = () => {
    if (!cableRun || cableRun.mode !== 'measure') return;
    const counterpart = getCounterpart(cableRun.sourceDeviceId);
    if (!counterpart) return;
    const target = devices[counterpart.id];
    const measured = measuredCableMeters(completedCableRoute(cableTrailRef.current, playerRef.current, { x: target.x + target.widthTiles / 2, y: target.y + target.heightTiles / 2 }));
    setMeasuredRoutes((prev) => ({ ...prev, [cableRun.sourceDeviceId]: measured }));
    setCableRun(null);
    cableTrailRef.current = [];
    tautRef.current = false;
    setCableTaut(false);
    sound.playPingSuccess();
    showToast(
      `Hasil ukur ${devices[cableRun.sourceDeviceId]?.name} → ${counterpart?.name}: ${measured.toFixed(1)} m. Siapkan kabel ≥ ${Math.ceil(measured + 1)} m.`
    );
  };

  const finishMeasureRef = useRef<() => void>(() => {});
  useEffect(() => {
    finishMeasureRef.current = handleFinishMeasure;
  });

  const measuredLabelMap = (): Record<string, number> => {
    const out: Record<string, number> = {};
    Object.entries(measuredRoutes).forEach(([devId, m]) => {
      const cp = getCounterpart(devId as DeviceId);
      out[`${devices[devId]?.name || devId} → ${cp?.name || 'tujuan'}`] = m;
    });
    return out;
  };

  const handlePlugSource = (cable: CraftedCableItem, portLabel: string) => {
    const sourceDev = devices[plugModal?.deviceId || 'laptop-ratna'];
    const sx = sourceDev.x + sourceDev.widthTiles / 2;
    const sy = sourceDev.y + sourceDev.heightTiles / 2;
    const initialTrail = [{ x: sx, y: sy }, { x: playerRef.current.x, y: playerRef.current.y }];
    if (!cableFits(initialTrail, cable.lengthMeters)) {
      sound.playError();
      showToast('Kabel tidak cukup menjangkau posisi berdirimu. Dekati port atau gunakan kabel lebih panjang.');
      return;
    }
    cableTrailRef.current = initialTrail;
    setCableRun({
      mode: 'cable',
      cableId: cable.id,
      cableType: cable.type,
      lengthMeters: cable.lengthMeters,
      sourceDeviceId: sourceDev.id,
      sourcePort: portLabel,
      usedMeters: routeMeters(cableTrailRef.current),
    });
    tautRef.current = false;
    setEquippedCable(cable.type);
    setPlugModal(null);
    setCableTaut(false);
    sound.playCablePlug();
    const target = getCounterpart(sourceDev.id);
    showToast(
      target
        ? `Ujung A tertancap di ${portLabel}! Sekarang JALAN ke ${target.name} — kabel akan terseret di lantai.`
        : 'Ujung A tertancap! Jalan ke perangkat tujuan.'
    );
  };

  const handlePlugTarget = (portLabel: string) => {
    if (!cableRun || !plugModal) return;
    const runCable = inventory.cables.find(c => c.id === cableRun.cableId);
    if (!runCable) {
      sound.playError();
      return 'Kabel tidak ditemukan di tas. Batalkan tarikan dan pilih ulang kabel.';
    }
    const target = devices[plugModal.deviceId];
    const fullRoute = completedCableRoute(cableTrailRef.current, playerRef.current, {
      x: target.x + target.widthTiles / 2, y: target.y + target.heightTiles / 2,
    });
    const fullMeters = routeMeters(fullRoute);
    if (!cableFits(fullRoute, cableRun.lengthMeters)) {
      sound.playError();
      registerMistake();
      return `Kabel kurang panjang! Rute sampai port ${(Math.ceil(fullMeters * 100) / 100).toFixed(2)}m, kabel ${cableRun.lengthMeters}m. Tutup panel untuk mendekat atau pilih rute lebih pendek; kabel tetap di tas.`;
    }
    sound.playCablePlug();
    setPlugModal(null);
    // Selesaikan instalasi pada perangkat sumber
    handleInstallCable(cableRun.sourceDeviceId, runCable, plugModal.deviceId, portLabel);
    // Simpan jalur kabel ASLI yang digelar pemain (bukan jalur template!)
    const counterpart = getCounterpart(cableRun.sourceDeviceId);
    if (counterpart) {
      installedRoutesRef.current[routeKey(cableRun.sourceDeviceId, counterpart.id)] = fullRoute;
      // Animasi paket mengikuti jalur asli pemain
      if (!runCable.faulty) {
        triggerPacketFlow(cableRun.sourceDeviceId, counterpart.id, '#16A34A', `LINK UP ${portLabel}`);
      }
    }
    setCableRun(null);
    cableTrailRef.current = [];
    tautRef.current = false;
    setEquippedCable('none');
    setCableTaut(false);
  };

  const handleCancelCableRun = () => {
    if (!cableRun) return;
    sound.playClick();
    const wasMeasure = cableRun.mode === 'measure';
    setCableRun(null);
    cableTrailRef.current = [];
    tautRef.current = false;
    setEquippedCable('none');
    setCableTaut(false);
    showToast(
      wasMeasure
        ? 'Pengukuran dibatalkan — meteran digulung kembali.'
        : 'Tarikan dibatalkan — kabel digulung kembali ke tas (tidak hilang).'
    );
  };

  // ── Mission completion detection ─────────────────────────
  useEffect(() => {
    if (!started || !currentMission || completedMissionCard || !jobAccepted) return;
    if (location !== currentMission.location) return;

    let done = false;
    if (currentMission.id === 1) {
      const laptop = devices['laptop-ratna'];
      done = Boolean(laptop?.cableConnected);
    } else if (currentMission.id === 2) {
      const laptop = devices['laptop-ratna'];
      done = Boolean(
        laptop?.cableConnected &&
          laptop?.ipAddress === '192.168.1.20' &&
          laptop?.subnetMask === '255.255.255.0' &&
          laptop?.defaultGateway === '192.168.1.1' &&
          verifiedPings.includes('laptop-ratna:192.168.1.1') &&
          canPing(devices['laptop-ratna'], '192.168.1.1', devices)
      );
    } else if (currentMission.id === 3) {
      done = getMarketingJobStatus(devices, verifiedPings) === 'complete';
    } else if (currentMission.id === 4) {
      const sw = devices['sw1'];
      done = Boolean(
        sw?.vlans?.[10] &&
          sw?.vlans?.[20] &&
          sw?.interfaces['FastEthernet0/1']?.vlan === 10 &&
          sw?.interfaces['FastEthernet0/2']?.vlan === 20
      );
    } else if (currentMission.id === 5) {
      const ap = devices['ap-lounge'];
      done = Boolean(ap?.cableConnected);
    }

    if (done) {
      sound.playMissionComplete();
      setXp((prev) => prev + currentMission.xpReward);
      // Ulasan klien: makin sedikit salah langkah, makin tinggi bintangnya
      const score = Math.max(3.5, 5 - mistakeCountRef.current * 0.3);
      mistakeCountRef.current = 0;
      setJobRatings((prev) => [...prev, Math.round(score * 10) / 10]);
      setActiveDeviceId(null);
      setCompletedMissionCard(currentMission);
    }
  }, [devices, currentMission, completedMissionCard, jobAccepted, location, started, verifiedPings]);

  // ── Flow handlers ────────────────────────────────────────
  // faceToFace = pemain sudah berdiri di depan klien (bukan nelepon)
  const openMissionBriefing = (missionIndex: number, faceToFace = false) => {
    const mission = MISSIONS[missionIndex];
    if (!mission) return;
    const speaker = getMissionRequester(mission.requesterNpcId);
    setDialogue({
      speakerName: speaker.name,
      speakerRole: faceToFace ? `${speaker.role} · di depanmu` : `${speaker.role} · via telepon`,
      speakerId: speaker.id,
      lines: faceToFace
        ? [
            ...mission.briefing,
            'Silakan langsung dicek ya Mas, saya tunggu di sini.',
          ]
        : [
            ...mission.briefing,
            `Lokasi saya: ${mission.locationLabel}. Bayaran ${mission.fee}. Ditunggu kedatangannya ya Mas!`,
          ],
      currentLineIndex: 0,
    });
  };

  // Klien satu ruangan: tutup HP, jalan mendekat, lalu bicara tatap muka (bukan nelepon)
  const handleTalkToClientOnSite = () => {
    if (!currentMission) return;
    sound.playClick();
    setShowPhone(false);
    const npc = currentLocation.npcs.find((n) => n.id === currentMission.requesterNpcId);
    if (npc) {
      const dist = Math.hypot(playerRef.current.x - npc.x, playerRef.current.y - npc.y);
      if (dist > 1.7) {
        waypointRef.current = { x: npc.x, y: npc.y + 0.9, autoInteractNpcId: npc.id };
        showToast(`Berjalan menghampiri ${npc.name}...`);
        return;
      }
    }
    if (!jobAccepted) setJobAccepted(true);
    openMissionBriefing(currentMissionIndex, true);
  };

  const handleStartGame = () => {
    sound.playClick();
    setStarted(true);
    setLocation('base');
    playerRef.current = {
      ...playerRef.current,
      x: LOCATIONS.base.spawn.x,
      y: LOCATIONS.base.spawn.y,
      direction: 'down',
    };
    setDialogue({
      speakerName: 'Nadia',
      speakerRole: 'Koordinator Lapangan NetQuest',
      speakerId: 'npc-nadia',
      lines: [
        `Selamat datang di NetQuest, ${playerName || 'Raka'}! Hari pertama kamu sebagai IT Support Freelancer.`,
        `Tasmu masih kosong. Aku pinjami modal awal ${money(STARTING_BALANCE)} — belanja alat lewat Toko Online di HP. Apa saja yang perlu dibawa, kamu yang tentukan dari keluhan kliennya.`,
        'Aku nggak akan memandu langkah demi langkah. Klien cuma tahu gejalanya, bukan penyebabnya. Kalau butuh referensi, baca buku di rak kantor. Sisanya kamu cari tahu sendiri.',
        'Ada panggilan masuk dari Bu Ratna di HP-mu. Selamat bekerja!',
      ],
      currentLineIndex: 0,
      actionButtonText: 'Buka HP & Lihat Panggilan',
      onAction: () => {
        setDialogue(null);
        setShowPhone(true);
      },
    });
  };

  const handleAcceptJob = () => {
    if (!currentMission) return;
    setJobAccepted(true);
    sound.playPingSuccess();
    // The call lives inside Supdawg; acceptance records the job without closing HP.
    setPhoneInitialTab('job');

  };

  const handleTravel = (target: LocationId) => {
    setShowTravelMenu(false);
    keysRef.current = {};
    sound.playClick();
    // Batalkan tarikan kabel kalau pindah lokasi (kabel tidak bisa dibawa antar gedung)
    if (cableRun) {
      setCableRun(null);
      cableTrailRef.current = [];
      tautRef.current = false;
      setEquippedCable('none');
      setCableTaut(false);
    }
    setPlugModal(null);
    const map = LOCATIONS[target];
    setLocation(target);
    camInitRef.current = false; // snap kamera ke peta baru (bukan pan lintas gedung)
    playerRef.current = {
      ...playerRef.current,
      x: map.spawn.x,
      y: map.spawn.y,
      direction: 'down',
      isMoving: false,
    };
    waypointRef.current = null;
    nearbyTargetRef.current = null;
    setNearbyPrompt(null);
    setShowPhone(false);
    setActiveDeviceId(null);
    setMissionBriefExpanded(false);
    // Tidak ada telepon/dialog otomatis — pemain langsung sapa klien di depannya
    if (currentMission && target === currentMission.location && jobAccepted) {
      showToast(`Tiba di ${map.name}. Sapa klien di depanmu — tidak perlu menelepon lagi.`);
    } else {
      showToast(`Tiba di ${map.name}`);
    }
  };

  const handleNextMission = () => {
    sound.playClick();
    setCompletedMissionCard(null);
    const next = currentMissionIndex + 1;
    setCurrentMissionIndex(next);
    setJobAccepted(false);
    if (next >= MISSIONS.length) {
      setShowCertificate(true);
      return;
    }
    const nextMission = MISSIONS[next];
    const requester = getMissionRequester(nextMission.requesterNpcId);
    // Klien berikutnya ada di ruangan yang sama? Jangan pakai telepon.
    if (nextMission.location === location) {
      setShowPhone(false);
      showToast(`${requester.name} masih di ruangan ini — sapa langsung, tidak perlu menelepon.`);
    } else {
      setShowPhone(true);
      sound.playPingSuccess();
      showToast(`Panggilan baru dari ${requester.name} (${LOCATIONS[nextMission.location].name}).`);
    }
  };

  const handleDrinkCoffee = () => {
    sound.playPingSuccess();
    setCoffeeBoostUntil(Date.now() + 90_000);
    setCoffeeOpen(false);
    showToast('Kopi diseruput. Kecepatan jalan +30% selama 90 detik.');
  };

  // Interacting with the coffee prop shows the warm break modal
  useEffect(() => {
    if (activeDeviceId === 'coffee-machine') {
      setCoffeeOpen(true);
      setActiveDeviceId(null);
    }
    // Rak buku kantor = satu-satunya tempat membaca referensi jaringan
    if (activeDeviceId === 'bookshelf') {
      setShowHandbook(true);
      setActiveDeviceId(null);
    }
  }, [activeDeviceId]);

  // Expire the coffee speed boost cleanly
  useEffect(() => {
    if (!coffeeBoostUntil) return;
    const remaining = Math.max(0, coffeeBoostUntil - Date.now());
    const timer = window.setTimeout(() => setCoffeeBoostUntil(0), remaining + 50);
    return () => window.clearTimeout(timer);
  }, [coffeeBoostUntil]);

  // ── NPC interaction (User awam: hanya ceritakan gejala!) ─
  const interactWithNpc = useCallback(
    (npc: NPC) => {
      sound.playClick();
      const p = playerRef.current;
      const dx = p.x - npc.x;
      const dy = p.y - npc.y;
      npc.direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';

      if (npc.id === 'npc-nadia') {
        setDialogue({
          speakerName: npc.name,
          speakerRole: npc.role,
          speakerId: npc.id,
          lines: currentMission
            ? [
                jobAccepted
                  ? `Job aktif: ${currentMission.title.replace(/^Job #\d+ — /, '')}. Cek Tas Alat sebelum berangkat ke ${currentMission.locationLabel}.`
                  : location === currentMission.location
                  ? 'Kliennya ada di lokasi yang sama denganmu. Nggak usah lewat HP — sapa langsung orangnya.'
                  : 'Ada panggilan masuk di HP-mu. Buka HP untuk menerima orderan klien.',
                'Ingat ya, klien rumahan biasanya nggak paham istilah jaringan. Kamu harus cek langsung kondisi fisik & pengaturannya.',
              ]
            : [
                `Semua job minggu ini beres! Ratingmu ${rating?.toFixed(1) ?? '-'} dari ${completedCount} klien, total fee ${money(earnings)}.`,
                'Sertifikat freelance-mu bisa diambil lewat menu di kanan atas.',
              ],
          currentLineIndex: 0,
          actionButtonText: 'Buka HP',
          onAction: () => {
            setDialogue(null);
            setShowPhone(true);
          },
        });
        return;
      }

      // Terima job langsung di depan klien — tanpa perlu telepon lagi
      const isRequester = currentMission?.requesterNpcId === npc.id;
      if (isRequester && !jobAccepted && currentMission) {
        setDialogue({
          speakerName: npc.name,
          speakerRole: npc.role,
          speakerId: npc.id,
          lines: [...currentMission.briefing],
          currentLineIndex: 0,
          actionButtonText: 'Terima Job Ini Langsung',
          onAction: () => {
            setDialogue(null);
            setJobAccepted(true);
            sound.playPingSuccess();
            showToast('Job diterima langsung di lokasi — tidak perlu menelepon. Cek Tas Alat & mulai kerja!');
          },
        });
        return;
      }

      if (npc.id === 'npc-ratna') {
        const cableDone = devices['laptop-ratna']?.cableConnected;
        const internetDone =
          cableDone &&
          devices['laptop-ratna']?.ipAddress === '192.168.1.20' &&
          verifiedPings.includes('laptop-ratna:192.168.1.1') &&
          canPing(devices['laptop-ratna'], '192.168.1.1', devices);

        setDialogue({
          speakerName: npc.name,
          speakerRole: 'Pemilik Rumah',
          speakerId: npc.id,
          lines: internetDone
            ? [
                'Alhamdulillah, internet di laptop saya sudah jalan lagi! Terima kasih banyak ya Mas, nanti saya transfer fee-nya dan kasih bintang lima!',
              ]
            : cableDone
            ? [
                'Kabelnya udah nyolok rapi ya Mas? Tapi barusan saya coba buka browser masih muter-muter aja tulisannya "No Internet".',
                'Dulu keponakan saya pernah utak-atik pengaturan di laptop itu, saya nggak ngerti angka-angka komputer Mas.',
              ]
            : [
                'Laptop saya yang di meja dekat jendela itu nggak bisa internetan dari tadi pagi Mas. Padahal TV sama HP di ruang tamu lancar.',
                'Kemarin area pojok dapur dekat kotak Wi-Fi habis disapu anak saya. Jaraknya berapa meter saya nggak tau Mas, silakan diukur sendiri aja ya.',
              ],
          currentLineIndex: 0,
          actionButtonText: 'Periksa Laptop Bu Ratna',
          onAction: () => {
            setDialogue(null);
            setActiveDeviceId('laptop-ratna');
          },
        });
        return;
      }

      if (npc.id === 'npc-budi') {
        const apDone = devices['ap-lounge']?.cableConnected;
        setDialogue({
          speakerName: npc.name,
          speakerRole: npc.role,
          speakerId: npc.id,
          lines: apDone
            ? [
                'Mantap Mas, Sambungan jaringan AP sudah aktif lagi!',
              ]
            : [
                'Selamat datang di PT Nusantara Tech Mas. Tamu-tamu yang nunggu di sofa lounge ngeluh Wi-Fi bisa dipilih, tetapi akses jaringan gagal dari kemarin.',
                'Kemarin ada tukang harian yang narik kabel ke alat Wi-Fi putih di sana dari ruang server, tapi habis dipasang malah tidak bisa dipakai akses jaringan. Jaraknya saya nggak hafal Mas.',
              ],
          currentLineIndex: 0,
        });
        return;
      }

      if (npc.id === 'npc-dimas') {
        const status = getMarketingJobStatus(devices, verifiedPings);
        setDialogue({
          speakerName: npc.name,
          speakerRole: npc.role,
          speakerId: npc.id,
          lines: status === 'complete'
            ? ['Koneksi dari komputer saya ke server sudah berhasil diuji. Makasih Mas!']
            : status === 'needs-verification'
            ? ['Perbaikannya sudah dicoba ya, Mas? Tolong pastikan koneksi ke server dari komputer saya juga, bukan cuma website.', 'Verifikasi job: buka Start di PC Dimas, cari cmd, lalu jalankan ping 192.168.10.100. Setelah berhasil, job akan ditandai selesai.']
            : [
                'Mas teknisi! Komputer saya di Marketing dari pagi nggak bisa buka folder laporan di server pusat, muter terus lalu gagal.',
                'Saya baru mencoba folder laporan. Website belum saya cek hari ini, jadi belum tahu apakah ikut terganggu. Kata staf gedung sih habis ada perapihan di ruang server kaca sebelah.',
              ],
          currentLineIndex: 0,
        });
        return;
      }

      if (npc.id === 'npc-kevin') {
        setDialogue({
          speakerName: npc.name,
          speakerRole: npc.role,
          speakerId: npc.id,
          lines: [
            'Halo Mas! Ini ruang server kantor. Kemarin habis dirapikan raknya, tapi saya belum sempat cek konfigurasi di dalam perangkat Cisco-nya.',
            'Manajer juga minta jalur Divisi Finance dan Divisi Marketing dipisah biar data gaji nggak campur sama trafik promosi.',
          ],
          currentLineIndex: 0,
        });
        return;
      }

      if (npc.id === 'npc-sari') {
        setDialogue({
          speakerName: npc.name,
          speakerRole: npc.role,
          speakerId: npc.id,
          lines: [
            'Halo Mas teknisi, komputer akuntansi saya aman kok, tapi kata manajer jalur jaringan divisi kami mau dipisah biar lebih aman.',
          ],
          currentLineIndex: 0,
        });
      }
    },
    [devices, currentMission, jobAccepted, verifiedPings, location, rating, completedCount, earnings]
  );

  // ── Interaction trigger (mendukung tarikan kabel fisik) ──
  const triggerInteract = useCallback(() => {
    if (plugModal) {
      return;
    }
    if (dialogue) {
      if (dialogue.currentLineIndex < dialogue.lines.length - 1) {
        sound.playClick();
        setDialogue((prev) => (prev ? { ...prev, currentLineIndex: prev.currentLineIndex + 1 } : null));
      } else {
        sound.playClick();
        const action = dialogue.onAction;
        setDialogue(null);
        action?.();
      }
      return;
    }
    if (
      activeDeviceId ||
      showPhone ||
      craftFromBag ||
      showInventory ||
      showTravelMenu ||
      showHandbook ||
      showCertificate ||
      completedMissionCard ||
      coffeeOpen
    )
      return;

    const target = nearbyTargetRef.current;
    if (!target) return;
    if (target.type === 'device') {
      const devId = target.id as DeviceId;
      // Kalau sedang menarik kabel fisik / meteran → tangani di perangkat tujuan
      if (cableRun) {
        const counterpart = getCounterpart(cableRun.sourceDeviceId);
        if (counterpart && devId === counterpart.id) {
          if (cableRun.mode === 'measure') {
            handleFinishMeasure();
          } else {
            sound.playClick();
            setPlugModal({ deviceId: devId, mode: 'target' });
          }
          return;
        }
        if (devId === cableRun.sourceDeviceId) {
          showToast(`Ujung A sudah tertancap di sini. Bawa ujung B ke ${counterpart?.name || 'perangkat tujuan'}!`);
          return;
        }
        showToast('Selesaikan tarikan kabel dulu sebelum buka perangkat lain! (Batalkan lewat banner kabel)');
        return;
      }
      sound.playClick();
      setActiveDeviceId(devId);
    } else {
      const npc = ALL_NPCS.find((n) => n.id === target.id);
      if (npc) interactWithNpc(npc);
    }
  }, [
    activeDeviceId,
    cableRun,
    coffeeOpen,
    completedMissionCard,
    dialogue,
    interactWithNpc,
    plugModal,
    showCertificate,
    showHandbook,
    showInventory,
    showTravelMenu,
    showPhone,
    craftFromBag,
  ]);

  // ── Keyboard ─────────────────────────────────────────────
  const phoneShortcutBlocked = Boolean(
    activeDeviceId ||
      dialogue ||
      plugModal ||
      craftFromBag ||
      showInventory ||
      showTravelMenu ||
      showHandbook ||
      showCertificate ||
      completedMissionCard ||
      coffeeOpen
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const focused = document.activeElement;
      if (
        focused?.tagName === 'INPUT' ||
        focused?.tagName === 'TEXTAREA' ||
        focused?.tagName === 'SELECT' ||
        (focused instanceof HTMLElement && focused.isContentEditable)
      ) {
        if (e.key === 'Escape') setActiveDeviceId(null);
        return;
      }
      const key = e.key.toLowerCase();
      keysRef.current[key] = true;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
        waypointRef.current = null;
      }
      if (key === 'e' || key === ' ' || key === 'enter') {
        if (started) {
          e.preventDefault();
          triggerInteract();
        }
      }
      if (key === 'escape') {
        // Jangan langsung tutup meja crimping saat merakit kabel (hindari kehilangan progres tanpa konfirmasi)
        if (activeDeviceId === 'toolbench' || craftFromBag) {
          showToast('Tekan tombol X di pojok meja crimping untuk menyimpan potongan & keluar.');
          return;
        }
        setActiveDeviceId(null);
        setPlugModal(null);
        setShowPhone(false);
        setShowInventory(false);
        setShowTravelMenu(false);
        setShowHandbook(false);
        setDialogue(null);
        setCoffeeOpen(false);
      }
      if (key === 'q' && started && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (showPhone) {
          setShowPhone(false);
        } else if (!phoneShortcutBlocked) {
          setPhoneInitialTab('job');
          setShowPhone(true);
        }
        return;
      }
      if (key === 'r' && started && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (showInventory) {
          setShowInventory(false);
        setShowTravelMenu(false);
        } else if (!phoneShortcutBlocked && !showPhone) {
          setShowInventory(true);
        }
        return;
      }
      // Zoom hanya saat benar-benar bermain (bukan saat dialog/modal terbuka)
      if (!uiBlockedRef.current && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (key === '=' || key === '+') setZoomSafe(zoomRef.current + 0.15);
        if (key === '-') setZoomSafe(zoomRef.current - 0.15);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [activeDeviceId, craftFromBag, phoneShortcutBlocked, setZoomSafe, showPhone, started, triggerInteract]);

  // Zoom with mouse wheel over canvas — HANYA saat bermain.
  // Saat dialog/kartu misi/HP terbuka, scroll TIDAK boleh mengubah kamera.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      if (uiBlockedRef.current) return; // kunci zoom selama UI terbuka
      // Proporsional terhadap delta (pinch trackpad mengirim banyak event kecil)
      const step = Math.max(-0.2, Math.min(0.2, -e.deltaY * 0.0015));
      if (Math.abs(step) < 0.002) return;
      setZoomSafe(zoomRef.current + step);
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [setZoomSafe]);

  // Release held keys when a keyup event is lost while switching windows.
  useEffect(() => {
    const resetInput = () => { keysRef.current = {}; waypointRef.current = null; };
    window.addEventListener('blur', resetInput);
    document.addEventListener('visibilitychange', resetInput);
    return () => {
      window.removeEventListener('blur', resetInput);
      document.removeEventListener('visibilitychange', resetInput);
    };
  }, []);

  // ── Collision ────────────────────────────────────────────
  const canMoveTo = useCallback(
    (nx: number, ny: number): boolean => {
      if (currentLocation.walls && playerHitsWalls(nx, ny, currentLocation.walls)) return false;
      const radius = 0.28;
      const points = [
        { x: nx - radius, y: ny - radius * 0.5 },
        { x: nx + radius, y: ny - radius * 0.5 },
        { x: nx - radius, y: ny + radius },
        { x: nx + radius, y: ny + radius },
      ];
      for (const pt of points) {
        const gx = Math.floor(pt.x);
        const gy = Math.floor(pt.y);
        if (gx < 0 || gy < 0 || gx >= currentLocation.cols || gy >= currentLocation.rows) return false;
        const tile = currentLocation.tiles[gy][gx];
        if (tile === 1 || tile === 5) return false;
        for (const prop of currentLocation.props) {
          if (!prop.solid) continue;
          if (
            pt.x > prop.x &&
            pt.x < prop.x + prop.w &&
            pt.y > prop.y &&
            pt.y < prop.y + prop.h
          ) {
            return false;
          }
        }
      }
      for (const npc of currentLocation.npcs) {
        if (Math.hypot(nx - npc.x, ny - npc.y) < 0.62) return false;
      }
      return true;
    },
    [currentLocation]
  );

  // ── Canvas click (world → screen aware) ──────────────────
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!started || activeDeviceId || dialogue || completedMissionCard || showCertificate || showPhone || plugModal) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cam = cameraRef.current;
    const worldX = (e.clientX - rect.left - cam.offsetX) / (cam.scale * TILE_SIZE);
    const worldY = (e.clientY - rect.top - cam.offsetY) / (cam.scale * TILE_SIZE);
    if (worldX < 0 || worldY < 0 || worldX >= currentLocation.cols || worldY >= currentLocation.rows) return;

      for (const prop of currentLocation.props) {
        if (!prop.deviceId) continue;
        if (
          worldX >= prop.x - 0.3 &&
          worldX <= prop.x + prop.w + 0.3 &&
          worldY >= prop.y - 0.3 &&
          worldY <= prop.y + prop.h + 0.4
        ) {
          const cx = prop.x + prop.w / 2;
          const surface = currentLocation.props.find(p=>p.id===prop.parentId) || prop;
          const cy = surface.y + surface.h + 0.45;
          if (Math.hypot(playerRef.current.x - cx, playerRef.current.y - cy) < 1.6) {
            sound.playClick();
            // Saat menarik kabel fisik, klik perangkat tujuan langsung buka close-up hardware
            if (cableRun) {
              const counterpart = getCounterpart(cableRun.sourceDeviceId);
              if (counterpart && prop.deviceId === counterpart.id) {
                if (cableRun.mode === 'measure') handleFinishMeasure();
                else setPlugModal({ deviceId: prop.deviceId, mode: 'target' });
              } else if (prop.deviceId === cableRun.sourceDeviceId) {
                showToast(`Ujung A sudah di sini. Bawa ujung B ke ${counterpart?.name || 'tujuan'}!`);
              } else {
                showToast('Selesaikan tarikan kabel dulu!');
              }
            } else {
              setActiveDeviceId(prop.deviceId);
            }
          } else {
            waypointRef.current = { x: cx, y: Math.min(currentLocation.rows - 1.3, cy), autoInteractDeviceId: prop.deviceId };
          }
          return;
        }
      }
    for (const npc of currentLocation.npcs) {
      if (Math.hypot(worldX - npc.x, worldY - npc.y) < 0.9) {
        if (Math.hypot(playerRef.current.x - npc.x, playerRef.current.y - npc.y) < 1.6) interactWithNpc(npc);
        else waypointRef.current = { x: npc.x, y: npc.y + 0.85, autoInteractNpcId: npc.id };
        return;
      }
    }
    waypointRef.current = { x: worldX, y: worldY };
  };

  // ── Main render loop ─────────────────────────────────────
  useEffect(() => {
    let animId = 0;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = frameDeltaSeconds(now, lastTime);
      lastTime = now;
      const elapsed = now / 1000;
      const p = playerRef.current;
      const modalBlocking = uiBlockedRef.current;

      let vx = 0;
      let vy = 0;
      if (!modalBlocking) {
        const keys = keysRef.current;
        if (keys['w'] || keys['arrowup']) vy -= 1;
        if (keys['s'] || keys['arrowdown']) vy += 1;
        if (keys['a'] || keys['arrowleft']) vx -= 1;
        if (keys['d'] || keys['arrowright']) vx += 1;

        if (vx === 0 && vy === 0 && waypointRef.current) {
          const wp = waypointRef.current;
          const dx = wp.x - p.x;
          const dy = wp.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 0.18) {
            waypointRef.current = null;
            if (wp.autoInteractDeviceId) {
              // Waypoint ke perangkat saat tarikan aktif → buka close-up target
              if (cableRunRef.current) {
                const run = cableRunRef.current;
                const cp = getCounterpart(run.sourceDeviceId);
                if (cp && wp.autoInteractDeviceId === cp.id) {
                  if (run.mode === 'measure') finishMeasureRef.current();
                  else setPlugModal({ deviceId: wp.autoInteractDeviceId, mode: 'target' });
                } else {
                  setActiveDeviceId(wp.autoInteractDeviceId);
                }
              } else {
                setActiveDeviceId(wp.autoInteractDeviceId);
              }
            } else if (wp.autoInteractNpcId) {
              const npc = currentLocation.npcs.find((n) => n.id === wp.autoInteractNpcId);
              if (npc) interactWithNpc(npc);
            }
          } else {
            vx = dx / dist;
            vy = dy / dist;
          }
        }
      }

      if (vx !== 0 || vy !== 0) {
        const len = Math.hypot(vx, vy);
        vx /= len;
        vy /= len;
        // Sedikit lebih lambat saat menyeret kabel fisik
        const carrying = cableRunRef.current ? 0.82 : 1;
        const baseSpeed = (Date.now() < coffeeBoostUntil ? 5.5 : 4.1) * carrying;
        const stepX = vx * baseSpeed * dt;
        const stepY = vy * baseSpeed * dt;

        // Cek kabel mentok SEBELUM bergerak (panjang fisik!)
        let blockedByCable = false;
        if (cableRunRef.current) {
          const run = cableRunRef.current;
          const nx = canMoveTo(p.x + stepX, p.y) ? p.x + stepX : p.x;
          const ny = canMoveTo(nx, p.y + stepY) ? p.y + stepY : p.y;
          const nextTrail = advanceCableRoute(cableTrailRef.current, { x: nx, y: ny });
          if (run.mode === 'cable' && !cableFits(nextTrail, run.lengthMeters)) {
            blockedByCable = true;
            if (!tautRef.current) {
              tautRef.current = true;
              setCableTaut(true);
              sound.playError();
            }
            waypointRef.current = null;
          } else {
            if (tautRef.current) {
              tautRef.current = false;
              setCableTaut(false);
            }
          }
        }

        if (!blockedByCable) {
          if (canMoveTo(p.x + stepX, p.y)) p.x += stepX;
          else waypointRef.current = null;
          if (canMoveTo(p.x, p.y + stepY)) p.y += stepY;
          else waypointRef.current = null;
        }

        if (Math.abs(vx) > Math.abs(vy)) p.direction = vx > 0 ? 'right' : 'left';
        else p.direction = vy > 0 ? 'down' : 'up';
        p.isMoving = !blockedByCable;
        if (!blockedByCable) {
          p.walkPhase += dt * 1.3;
          p.stepSoundTimer += dt;
          if (p.stepSoundTimer > 0.28) {
            p.stepSoundTimer = 0;
            sound.playStep();
          }
          // Rekam jejak kabel yang digelar di lantai
          if (cableRunRef.current) {
            const trail = advanceCableRoute(cableTrailRef.current, { x: p.x, y: p.y });
            cableTrailRef.current = trail;
            const used = routeMeters(trail);
            setCableRun(prev => prev && Math.abs(prev.usedMeters-used)>0.001 ? { ...prev, usedMeters: used } : prev);
          }
        }
      } else {
        p.isMoving = false;
      }

      // Nearby interactive target
      let closest: { type: 'device' | 'npc'; id: string; label: string; dist: number } | null = null;
      for (const prop of currentLocation.props) {
        if (!prop.deviceId) continue;
        const cx = prop.x + prop.w / 2;
        const cy = prop.y + prop.h / 2;
        const d = Math.hypot(p.x - cx, p.y - cy);
        if (d < 1.9 && (!closest || d < closest.dist)) {
          closest = { type: 'device', id: prop.deviceId, label: prop.label || prop.deviceId, dist: d };
        }
      }
      for (const npc of currentLocation.npcs) {
        const d = Math.hypot(p.x - npc.x, p.y - npc.y);
        if (d < 1.65 && (!closest || d < closest.dist)) {
          closest = { type: 'npc', id: npc.id, label: `${npc.name} · ${npc.division}`, dist: d };
        }
      }
      const nextNearby = closest ? { type: closest.type, id: closest.id, label: closest.label } : null;
      if (
        nextNearby?.id !== nearbyTargetRef.current?.id ||
        nextNearby?.type !== nearbyTargetRef.current?.type
      ) {
        nearbyTargetRef.current = nextNearby;
        setNearbyPrompt(nextNearby);
      }

      packetsRef.current = packetsRef.current
        .map((pkt) => ({ ...pkt, progress: pkt.progress + pkt.speed * dt }))
        .filter((pkt) => pkt.progress < 1);

      // ── Draw ──
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
          canvas.width = Math.floor(rect.width * dpr);
          canvas.height = Math.floor(rect.height * dpr);
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.scale(dpr, dpr);
          ctx.fillStyle = '#E9E2D5';
          ctx.fillRect(0, 0, rect.width, rect.height);

          const worldW = currentLocation.cols * TILE_SIZE;
          const worldH = currentLocation.rows * TILE_SIZE;
          const baseScale = Math.min(rect.width / worldW, rect.height / worldH);

          // Zoom dihaluskan (tidak.snap) — mengikuti target zoomRef
          const zk = 1 - Math.exp(-dt * 10);
          smoothZoomRef.current += (zoomRef.current - smoothZoomRef.current) * zk;
          if (Math.abs(zoomRef.current - smoothZoomRef.current) < 0.001) {
            smoothZoomRef.current = zoomRef.current;
          }
          const scale = baseScale * smoothZoomRef.current;
          const scaledW = worldW * scale;
          const scaledH = worldH * scale;

          const playerPx = p.x * TILE_SIZE * scale;
          const playerPy = p.y * TILE_SIZE * scale;
          const targetOffsetX =
            scaledW <= rect.width
              ? (rect.width - scaledW) / 2
              : Math.min(0, Math.max(rect.width - scaledW, rect.width / 2 - playerPx));
          const targetOffsetY =
            scaledH <= rect.height
              ? (rect.height - scaledH) / 2
              : Math.min(0, Math.max(rect.height - scaledH, rect.height / 2 - playerPy));

          // Kamera follow dihaluskan; snap hanya saat pertama kali / pindah lokasi
          if (!camInitRef.current) {
            cameraRef.current = { scale, offsetX: targetOffsetX, offsetY: targetOffsetY };
            camInitRef.current = true;
          } else {
            const ck = 1 - Math.exp(-dt * 9);
            cameraRef.current.offsetX += (targetOffsetX - cameraRef.current.offsetX) * ck;
            cameraRef.current.offsetY += (targetOffsetY - cameraRef.current.offsetY) * ck;
            cameraRef.current.scale = scale;
          }
          if (fixture) canvas.dataset.world = JSON.stringify({ player: {x:p.x, y:p.y}, camera: cameraRef.current, trail: cableTrailRef.current, installed: installedRoutesRef.current });
          const offsetX = cameraRef.current.offsetX;
          const offsetY = cameraRef.current.offsetY;

          // Soft floor shadow frame
          ctx.fillStyle = 'rgba(120, 100, 75, 0.16)';
          roundRect(ctx, offsetX - 10, offsetY - 10, scaledW + 20, scaledH + 20, 16);
          ctx.fill();

          ctx.translate(offsetX, offsetY);
          ctx.scale(scale, scale);

          for (let gy = 0; gy < currentLocation.rows; gy++) {
            for (let gx = 0; gx < currentLocation.cols; gx++) {
              const tile = currentLocation.tiles[gy][gx];
              if (tile === 1 || tile === 5) drawWallTile(ctx, gx, gy, tile === 5, currentLocation.tiles);
              else drawFloorTile(ctx, gx, gy, tile, currentLocation.tiles);
            }
          }

          if (currentLocation.walls) drawThinWalls(ctx, currentLocation.walls);

          // Area labels
          ctx.save();
          ctx.font = '800 11px "Plus Jakarta Sans", sans-serif';
          if (location === 'base') {
            ctx.fillStyle = 'rgba(62, 39, 24, 0.26)';
            ctx.fillText('NETQUEST FREELANCE HQ', 2 * TILE_SIZE, 4.4 * TILE_SIZE);
            ctx.fillText('RUANG KERJA', 10.5 * TILE_SIZE, 4 * TILE_SIZE);
          } else if (currentLocation.roomLabels) {
            ctx.fillStyle = 'rgba(62, 39, 24, 0.38)';
            for (const label of currentLocation.roomLabels) ctx.fillText(label.text, label.x * TILE_SIZE, label.y * TILE_SIZE);
          } else {
            ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
            ctx.fillText('IT HELPDESK & TOOLBENCH', 2.2 * TILE_SIZE, 4.2 * TILE_SIZE);
            ctx.fillText('DIVISI MARKETING', 2.5 * TILE_SIZE, 8.2 * TILE_SIZE);
            ctx.fillText('DIVISI FINANCE', 2.5 * TILE_SIZE, 13.3 * TILE_SIZE);
            ctx.fillStyle = 'rgba(15, 118, 110, 0.3)';
            ctx.fillText('RUANG SERVER (NOC)', 14.6 * TILE_SIZE, 1.55 * TILE_SIZE);
            ctx.fillStyle = 'rgba(62, 39, 24, 0.22)';
            ctx.fillText('LOUNGE & PANTRY', 17.5 * TILE_SIZE, 14.3 * TILE_SIZE);
          }
          ctx.restore();

          // Draw installed cables, including down links; omit uninstalled route guides.
          currentLocation.floorCables.forEach((seg) => {
            const custom = installedRoutesRef.current[routeKey(seg.fromDevice, seg.toDevice)];
            const hasPlayerRoute = Boolean(custom && custom.length >= 2);
            if (!hasPlayerRoute && !hasPhysicalFloorCable(devices[seg.fromDevice], devices[seg.toDevice])) return;
            const pts = hasPlayerRoute ? custom : seg.points;
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = 'rgba(62, 39, 24, 0.4)';
            ctx.lineWidth = 6;
            ctx.beginPath();
            pts.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x * TILE_SIZE, pt.y * TILE_SIZE) : ctx.lineTo(pt.x * TILE_SIZE, pt.y * TILE_SIZE)));
            ctx.stroke();
            ctx.strokeStyle = '#64748B';
            ctx.lineWidth = 3;
            ctx.setLineDash([]);
            ctx.beginPath();
            pts.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x * TILE_SIZE, pt.y * TILE_SIZE) : ctx.lineTo(pt.x * TILE_SIZE, pt.y * TILE_SIZE)));
            ctx.stroke();
            ctx.restore();
          });

          // Mission beacons
          if (currentMission && jobAccepted) {
            currentMission.targetDeviceIds.forEach((tid) => {
              const prop = currentLocation.props.find((m) => m.deviceId === tid);
              if (!prop) return;
              const bx = (prop.x + prop.w / 2) * TILE_SIZE;
              const by = (prop.y + prop.h / 2) * TILE_SIZE;
              const pulse = (elapsed * 0.9) % 1;
              ctx.save();
              ctx.strokeStyle = `rgba(180, 83, 9, ${0.7 * (1 - pulse)})`;
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.arc(bx, by, 22 + pulse * 26, 0, Math.PI * 2);
              ctx.stroke();
              ctx.restore();
            });
          }

          // Waypoint
          if (waypointRef.current) {
            ctx.save();
            ctx.strokeStyle = '#0F766E';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(waypointRef.current.x * TILE_SIZE, waypointRef.current.y * TILE_SIZE, 8 + Math.sin(elapsed * 8) * 3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }

          type RenderItem = { sortY: number; draw: () => void };
          const renderables: RenderItem[] = [];
          for (const prop of drawOrder(currentLocation.props)) {
            const dev = prop.deviceId ? devices[prop.deviceId] : undefined;
            const highlighted =
              nearbyTargetRef.current?.type === 'device' && nearbyTargetRef.current?.id === prop.deviceId;
            renderables.push({
              sortY: (()=>{const parent=currentLocation.props.find(p=>p.id===prop.parentId);return parent?(parent.y+parent.h)*TILE_SIZE+.01:(prop.y+prop.h)*TILE_SIZE;})(),
              draw: () => drawMapProp(ctx, prop, dev, elapsed, highlighted),
            });
          }
          for (const npc of currentLocation.npcs) {
            const quest = currentMission?.requesterNpcId === npc.id;
            renderables.push({
              sortY: npc.y * TILE_SIZE + 14,
              draw: () =>
                drawCharacter(ctx, {
                  x: npc.x * TILE_SIZE,
                  y: npc.y * TILE_SIZE,
                  direction: npc.direction,
                  walkPhase: 0,
                  isMoving: false,
                  shirtColor: npc.shirtColor,
                  accentColor: npc.accentColor,
                  hairColor: npc.hairColor,
                  hasGlasses: npc.hasGlasses,
                  hasHeadset: npc.hasHeadset,
                  isFemale: npc.isFemale,
                  nameTag: npc.name,
                  questBadge: quest ? (jobAccepted ? '?' : '!') : null,
                  time: elapsed,
                }),
            });
          }
          renderables.push({
            sortY: p.y * TILE_SIZE + 14,
            draw: () =>
              drawCharacter(ctx, {
                x: p.x * TILE_SIZE,
                y: p.y * TILE_SIZE,
                direction: p.direction,
                walkPhase: p.walkPhase,
                isMoving: p.isMoving,
                shirtColor: avatar === 'raka' ? '#115E59' : '#9A3412',
                accentColor: '#FBBF24',
                hairColor: '#1C1917',
                hasLanyard: true,
                hasGlasses: avatar === 'rina',
                isFemale: avatar === 'rina',
                equippedCable: cableRunRef.current?.cableType ?? equippedCable,
                nameTag: playerName.split(' ')[0] || 'Teknisi',
                time: elapsed,
              }),
          });
          renderables.sort((a, b) => a.sortY - b.sortY);
          renderables.forEach((r) => r.draw());

          // ── Physical cable being pulled (Ujung A → pemain) ──
          const liveRun = cableRunRef.current;
          if (liveRun) {
            const trail = cableTrailRef.current;
            const cableColor =
              liveRun.mode === 'measure'
                ? '#F59E0B'
                : liveRun.cableType === 'straight'
                ? '#0D9488'
                : '#EA580C';
            if (liveRun.mode === 'measure') ctx.setLineDash([6, 4]);
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            // Bayangan kabel di lantai
            ctx.strokeStyle = 'rgba(28,25,23,0.25)';
            ctx.lineWidth = 5;
            ctx.beginPath();
            trail.forEach((pt, i) => {
              if (i === 0) ctx.moveTo(pt.x * TILE_SIZE, pt.y * TILE_SIZE);
              else ctx.lineTo(pt.x * TILE_SIZE, pt.y * TILE_SIZE);
            });
            ctx.lineTo(p.x * TILE_SIZE, p.y * TILE_SIZE + 4);
            ctx.stroke();
            // Jaket kabel UTP
            ctx.strokeStyle = cableColor;
            ctx.lineWidth = 3;
            ctx.beginPath();
            trail.forEach((pt, i) => {
              if (i === 0) ctx.moveTo(pt.x * TILE_SIZE, pt.y * TILE_SIZE);
              else ctx.lineTo(pt.x * TILE_SIZE, pt.y * TILE_SIZE);
            });
            ctx.lineTo(p.x * TILE_SIZE, p.y * TILE_SIZE + 4);
            ctx.stroke();
            // Konektor RJ45 di tangan pemain
            ctx.fillStyle = '#FBBF24';
            ctx.strokeStyle = '#92400E';
            ctx.lineWidth = 1.5;
            roundRect(ctx, p.x * TILE_SIZE - 5, p.y * TILE_SIZE - 2, 10, 7, 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }

          // Packets
          packetsRef.current.forEach((pkt) => {
            const point = packetPosition(pkt.path, pkt.progress);
            if (!point) return;
            const px = point.x * TILE_SIZE;
            const py = point.y * TILE_SIZE;
            ctx.save();
            ctx.fillStyle = pkt.color;
            ctx.shadowColor = pkt.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(px, py, 5.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.font = '700 9px "JetBrains Mono", monospace';
            const tw = ctx.measureText(pkt.label).width;
            ctx.fillStyle = 'rgba(41, 37, 36, 0.92)';
            roundRect(ctx, px - tw / 2 - 4, py - 19, tw + 8, 13, 4);
            ctx.fill();
            ctx.fillStyle = '#FBF7EF';
            ctx.fillText(pkt.label, px - tw / 2, py - 10);
            ctx.restore();
          });

          ctx.restore();
        }
      }
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [
    activeDeviceId,
    avatar,
    canMoveTo,
    coffeeBoostUntil,
    coffeeOpen,
    completedMissionCard,
    currentLocation,
    currentMission,
    devices,
    dialogue,
    equippedCable,
    interactWithNpc,
    jobAccepted,
    location,
    playerName,
    plugModal,
    showCertificate,
    showHandbook,
    showInventory,
    showTravelMenu,
    showPhone,
    craftFromBag,
    started,
  ]);

  const activeDevice = activeDeviceId ? devices[activeDeviceId] : null;
  const activeDeviceTarget =
    activeDeviceId === 'laptop-ratna'
      ? 'Router Wi-Fi Bu Ratna'
      : activeDeviceId === 'ap-lounge'
      ? 'Switch SW1 (Fa0/3)'
      : activeDeviceId === 'pc-sari' || activeDeviceId === 'pc-dimas'
      ? 'Switch SW1'
      : 'Router / Modem';

  return (
    <div className="relative h-screen w-screen select-none overflow-hidden bg-[#E9E2D5]">
      {fixture && <output data-testid="world-state" hidden>{JSON.stringify({ location, inventory, measuredRoutes, cableRun, cableTaut, devices, plugModal, activeDeviceId, currentMissionIndex, jobAccepted, completedMissionId: completedMissionCard?.id })}</output>}
      <canvas ref={canvasRef} onClick={handleCanvasClick} className="block h-full w-full cursor-pointer" />

      {/* ── TITLE SCREEN ─────────────────────────────────── */}
      {!started && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-stone-900/35 p-4 backdrop-blur-[2px]">
          <div className="max-h-[92vh] w-full max-w-xl space-y-5 overflow-y-auto rounded-3xl border border-stone-200 bg-[#FBF7EF]/97 p-6 shadow-[0_20px_60px_rgba(62,39,24,0.28)] sm:p-7">
            <div className="space-y-2 text-center">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[11px] font-bold text-teal-800">
                <MapPin className="h-3.5 w-3.5" /> EDU-GAME JARINGAN · FREELANCE IT SUPPORT
              </div>
              <h1 className="font-serif text-3xl font-black tracking-tight text-stone-800 sm:text-4xl">
                NetQuest
              </h1>
              <p className="text-sm font-semibold text-[#B45309]">Hari Pertama Jadi IT Support Freelancer</p>
              <p className="mx-auto max-w-md text-xs leading-relaxed text-stone-600">
                Terima panggilan klien dari HP-mu, berangkat ke rumah atau kantor mereka, bikin kabel UTP sendiri,
                pasang konektor, dan perbaiki jaringan dari Layer 1 sampai Cisco IOS.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'raka' as const, label: 'Raka', initial: 'RK', bg: 'bg-[#0F766E]' },
                { id: 'rina' as const, label: 'Rina', initial: 'RN', bg: 'bg-[#9A3412]' },
              ].map((char) => (
                <button
                  key={char.id}
                  onClick={() => {
                    setAvatar(char.id);
                    setPlayerName(char.label);
                  }}
                  className={`flex items-center gap-2.5 rounded-2xl border p-3 text-left transition ${
                    avatar === char.id
                      ? 'border-[#0F766E] bg-teal-50 ring-2 ring-teal-700/15'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-white ${char.bg}`}>
                    {char.initial}
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-stone-800">{char.label}</span>
                    <span className="block text-[11px] text-stone-500">Teknisi Lapangan</span>
                  </span>
                </button>
              ))}
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold text-stone-500">
                Nama teknisi (muncul di HP & sertifikat)
              </label>
              <input
                value={playerName}
                maxLength={24}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Nama kamu..."
                className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-stone-800 focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-teal-700/15"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-stone-500">
              {[
                ['Bikin Kabel', 'Crimp RJ45'],
                ['Desktop PC', 'IP & Ping'],
                ['Cisco CLI', 'Router & VLAN'],
              ].map(([a, b]) => (
                <div key={a} className="rounded-xl border border-stone-200 bg-white/70 px-2 py-2">
                  <div className="font-bold text-stone-700">{a}</div>
                  <div>{b}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={handleStartGame}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0F766E] px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#115E59]"
              >
                <Play className="h-4 w-4 fill-current" /> Mulai Hari Pertama
              </button>
            </div>
            <p className="text-center text-[10px] text-stone-400">
              WASD / panah untuk jalan · E untuk interaksi · Q untuk HP · R untuk tas · scroll untuk zoom kamera
            </p>
            <p className="text-center text-[10px] italic text-stone-400">
              Tidak ada panduan langkah. Referensi jaringan hanya ada di rak buku kantor — selebihnya kamu cari tahu sendiri.
            </p>
          </div>
        </div>
      )}

      {/* ── HUD ─────────────────────────────────────────── */}
      {started && !showPhone && (
        <header className="pointer-events-none absolute inset-x-2 top-2 z-20 flex flex-wrap items-start justify-between gap-2 sm:inset-x-3 sm:top-3">
          {/* Profile card */}
          <div className="pointer-events-auto flex items-center gap-2.5 rounded-2xl border border-stone-200/90 bg-[#FBF7EF]/95 px-3 py-2 shadow-[0_8px_24px_rgba(62,39,24,0.14)] backdrop-blur">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F766E] text-xs font-extrabold text-white">
              {(playerName || 'IT').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-xs font-bold text-stone-800">{playerName || 'Teknisi'}</span>
                {rating === null ? (
                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-stone-200 px-1.5 py-0.5 text-[9px] font-bold text-stone-600">
                    Teknisi Baru
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                    <Star className="h-2.5 w-2.5 fill-amber-600 text-amber-600" /> {rating.toFixed(1)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-stone-500">
                <span className="inline-flex items-center gap-1 font-semibold">
                  <Wallet className="h-3 w-3 text-[#0F766E]" />
                  {money(balance)}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-[9px] text-stone-400">
                  {completedCount}/{MISSIONS.length} job · {xp} XP
                </span>
              </div>
            </div>
          </div>

          {/* Work order slip */}
          <div className="pointer-events-auto order-3 mx-auto w-full max-w-lg flex-1 sm:order-2">
            <div className="rounded-2xl border border-stone-200/90 bg-[#FBF7EF]/95 px-3.5 py-2 shadow-[0_8px_24px_rgba(62,39,24,0.14)] backdrop-blur">
              {!currentMission ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-teal-800">
                    <CheckCircle2 className="h-4 w-4" /> Semua job selesai — mode eksplorasi bebas
                  </div>
                  <button
                    onClick={() => setShowCertificate(true)}
                    className="rounded-lg bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800 hover:bg-amber-200"
                  >
                    Sertifikat
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0F766E]/10 text-[#0F766E]">
                        <Wrench className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-stone-500">
                            {jobAccepted ? 'Work order aktif' : 'Panggilan baru'}
                          </span>
                          <span className="truncate text-[10px] font-semibold text-stone-500">{currentMission.fee}</span>
                        </div>
                        <div className="truncate text-xs font-bold text-stone-800">
                          {currentMission.title}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setMissionBriefExpanded((v) => !v)}
                      className="shrink-0 rounded-lg border border-stone-200 bg-white px-2 py-1 text-[10px] font-bold text-stone-600 hover:bg-stone-50"
                    >
                      {missionBriefExpanded ? 'Tutup' : 'Detail'}
                    </button>
                  </div>
                  <div className={`${missionBriefExpanded ? "flex" : "hidden"} mt-1 items-center justify-between gap-2}`}>
                    <p className="truncate text-[10px] text-stone-500">
                      {jobAccepted ? currentMission.shortTask : 'Terima job dari HP untuk melihat detail pekerjaan.'}
                    </p>
                    <span className="flex shrink-0 items-center gap-0.5 text-[9px] font-semibold text-stone-500">
                      <MapPin className="h-3 w-3" />
                      {LOCATIONS[currentMission.location].name}
                    </span>
                  </div>
                  {!jobAccepted && (
                    <button onClick={() => clientOnSite ? handleTalkToClientOnSite() : setShowPhone(true)}
                      className="mt-1 text-[10px] font-bold text-[#0F766E] hover:underline">
                      {clientOnSite ? 'Sapa klien untuk menerima job →' : 'Buka panggilan di HP →'}
                    </button>
                  )}
                  {jobAccepted && location !== currentMission.location && (
                    <button
                      onClick={() => handleTravel(currentMission.location)}
                      className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#B45309] px-2 py-1.5 text-[10px] font-bold text-white transition hover:bg-[#92400E]"
                    >
                      <MapPin className="h-3 w-3" /> Berangkat ke {LOCATIONS[currentMission.location].name}
                    </button>
                  )}
                  {missionBriefExpanded && (
                    <div className="mt-2 space-y-1 rounded-xl border border-stone-200 bg-white p-2.5 text-[10px] leading-relaxed text-stone-700">
                      <div className="font-bold text-stone-500">
                        Keluhan klien · {currentMission.locationLabel}
                      </div>
                      {currentMission.briefing.map((line, i) => (
                        <p key={i}>“{line}”</p>
                      ))}
                      <p className="pt-1 text-[9px] italic text-stone-400">
                        Tidak ada panduan langkah. Diagnosis sendiri: periksa fisik, perangkat, lalu konfigurasi.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="pointer-events-auto order-2 flex items-center gap-1 rounded-2xl border border-stone-200/90 bg-[#FBF7EF]/95 p-1.5 shadow-[0_8px_24px_rgba(62,39,24,0.14)] backdrop-blur sm:order-3">
            <button
              onClick={() => {
                setPhoneInitialTab('job');
                setShowPhone(true);
              }}
              title="HP Freelancer (Q)"
              aria-label="Buka HP (Q)"
              aria-keyshortcuts="Q"
              className="relative flex items-center gap-1.5 rounded-xl bg-[#0F766E] px-2.5 py-2 text-[11px] font-bold text-white hover:bg-[#115E59]"
            >
              <Phone className="h-4 w-4" />
              <span className="hidden md:inline">HP</span>
              {currentMission && !jobAccepted && (
                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#FBF7EF] bg-rose-500" />
              )}
            </button>
            <button
              onClick={() => setShowInventory(true)}
              title="Tas Perlengkapan Teknisi (R)"
              aria-keyshortcuts="R"
              className="relative flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-2.5 py-2 text-[11px] font-bold text-stone-700 hover:bg-stone-50"
            >
              <Backpack className="h-4 w-4 text-[#B45309]" />
              <span className="hidden md:inline">Tas</span>
              <span className="rounded bg-amber-100 px-1 font-mono text-[9px] text-amber-900">
                {inventory.cables.length}
              </span>
            </button>
            <button
              onClick={() => setShowTravelMenu(true)}
              title="Pindah tempat"
              aria-haspopup="dialog"
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[11px] font-bold text-stone-700 hover:bg-stone-100"
            >
              <MapPin className="h-4 w-4 text-[#B45309]" /> Pindah
            </button>
            <button onClick={toggleMute} title="Suara" className="rounded-xl p-2 text-stone-600 hover:bg-stone-100">
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>
        </header>
      )}

      {/* Compact location and optional keyboard reference; bag contents live in Tas. */}
      {started && !showPhone && (
        <div className="absolute bottom-3 left-3 z-20 flex items-end gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-[#FBF7EF]/95 px-3 py-2 text-[11px] font-semibold text-stone-700 shadow-sm">
            <MapPin className="h-3.5 w-3.5 text-[#B45309]" /> {currentLocation.name}
            {coffeeBoostActive && <span title="Boost kopi aktif">☕</span>}
          </div>
          <details className="relative rounded-xl border border-stone-200 bg-[#FBF7EF]/95 px-3 py-2 text-[11px] text-stone-600 shadow-sm">
            <summary className="cursor-pointer">Kontrol</summary>
            <div className="absolute bottom-10 left-0 w-52 rounded-xl border border-stone-200 bg-[#FBF7EF] p-3 leading-6 shadow-lg">
              WASD / panah · Jalan<br />E · Interaksi<br />Klik · Perangkat / jalan<br />Q · HP & toko<br />R · Tas<br />Scroll / + / − · Zoom
            </div>
          </details>
        </div>
      )}

      {showTravelMenu && (
        <div className="fixed inset-0 z-50 bg-stone-950/25" onClick={() => setShowTravelMenu(false)}>
          <section role="dialog" aria-modal="true" aria-label="Pindah tempat" onClick={e => e.stopPropagation()}
            className="absolute right-3 top-16 w-80 rounded-2xl border border-stone-200 bg-[#FBF7EF] p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-stone-800">Pindah tempat</h2>
              <button autoFocus onClick={() => setShowTravelMenu(false)} className="rounded-lg px-2 py-1 text-xs text-stone-600 hover:bg-stone-200">Tutup</button>
            </div>
            <p className="mb-3 text-xs text-stone-500">Sekarang: {currentLocation.name}</p>
            <button disabled={location === 'base'} onClick={() => handleTravel('base')}
              className="mb-2 w-full rounded-xl bg-[#0F766E] px-3 py-3 text-left text-xs font-bold text-white disabled:bg-stone-200 disabled:text-stone-500">
              {location === 'base' ? 'Sudah di kantor' : 'Kembali ke kantor'}
            </button>
            {currentMission && currentMission.location !== location && (
              <button onClick={() => handleTravel(currentMission.location)}
                className="mb-2 w-full rounded-xl border border-stone-200 bg-white px-3 py-3 text-left text-xs font-semibold text-stone-700 hover:bg-stone-100">
                Ke {LOCATIONS[currentMission.location].name}
              </button>
            )}
            <button onClick={() => handleTravel(location)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-stone-500 hover:bg-stone-100">
              <RotateCcw className="h-3.5 w-3.5" /> Kembali ke titik awal lokasi
            </button>
            {cableRun && <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">Pindah tempat membatalkan tarikan. Kabel tetap di tas.</p>}
          </section>
        </div>
      )}

      {/* Zoom controls */}
      {started && (
        <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1 rounded-2xl border border-stone-200/90 bg-[#FBF7EF]/95 p-1.5 shadow-md backdrop-blur">
          <button
            onClick={() => setZoomSafe(zoom + 0.15)}
            title="Zoom in"
            className="rounded-lg p-1.5 text-stone-600 hover:bg-stone-100"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <span className="font-mono text-[9px] font-bold text-stone-500">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoomSafe(zoom - 0.15)}
            title="Zoom out"
            className="rounded-lg p-1.5 text-stone-600 hover:bg-stone-100"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={() => setZoomSafe(1)}
            title="Reset zoom"
            className="rounded-lg border-t border-stone-200 p-1.5 text-stone-500 hover:bg-stone-100"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Interaction bar (kontekstual saat bawa kabel) */}
      {started && nearbyPrompt && !activeDeviceId && !dialogue && !completedMissionCard && !showPhone && !plugModal && (
        <div className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 animate-float-slow">
          <button
            onClick={triggerInteract}
            className="flex items-center gap-2.5 rounded-2xl border border-stone-200 bg-[#FBF7EF]/97 px-4 py-2.5 text-xs font-bold text-stone-800 shadow-[0_10px_30px_rgba(62,39,24,0.2)] backdrop-blur hover:bg-white"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0F766E] font-mono text-[11px] font-extrabold text-white">
              E
            </span>
            {nearbyPrompt.type === 'npc' ? (
              <MessageSquare className="h-4 w-4 text-[#B45309]" />
            ) : (
              <Wrench className="h-4 w-4 text-[#0F766E]" />
            )}
            <span>
              {nearbyPrompt.type === 'npc'
                ? cableRun
                  ? 'Fokus tarikan dulu — '
                  : 'Bicara dengan'
                : cableRun
                ? (() => {
                    const cp = getCounterpart(cableRun.sourceDeviceId);
                    return nearbyPrompt.id === cp?.id
                      ? 'Colok Ujung B ke '
                      : 'Bukan tujuan — ke ';
                  })()
                : 'Buka'}{' '}
              <strong className="text-[#0F766E]">
                {cableRun && nearbyPrompt.type === 'device'
                  ? getCounterpart(cableRun.sourceDeviceId)?.id === nearbyPrompt.id
                    ? nearbyPrompt.label
                    : getCounterpart(cableRun.sourceDeviceId)?.name || nearbyPrompt.label
                  : nearbyPrompt.label}
              </strong>
            </span>
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="absolute left-1/2 top-24 z-30 -translate-x-1/2 rounded-xl border border-stone-700/20 bg-stone-800 px-4 py-2 text-[11px] font-semibold text-stone-50 shadow-lg">
          {toast}
        </div>
      )}

      {/* Dialogue */}
      {started && dialogue && (
        <div className="absolute bottom-4 left-1/2 z-30 w-[95%] max-w-2xl -translate-x-1/2 rounded-2xl border border-stone-200 bg-[#FBF7EF]/97 p-4 shadow-[0_16px_50px_rgba(62,39,24,0.3)] backdrop-blur">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0F766E] text-sm font-bold text-white">
              {dialogue.speakerName.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2">
                <span className="font-serif text-sm font-bold text-stone-800">{dialogue.speakerName}</span>
                <span className="text-[10px] text-stone-500">{dialogue.speakerRole}</span>
                <span className="ml-auto font-mono text-[9px] text-stone-400">
                  {dialogue.currentLineIndex + 1}/{dialogue.lines.length}
                </span>
              </div>
              <p className="mt-1 min-h-[40px] text-[13px] leading-relaxed text-stone-700">
                "{dialogue.lines[dialogue.currentLineIndex]}"
              </p>
              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => setDialogue(null)}
                  className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-stone-500 hover:bg-stone-50"
                >
                  Tutup
                </button>
                <button
                  onClick={triggerInteract}
                  className="flex items-center gap-1 rounded-lg bg-[#0F766E] px-3.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#115E59]"
                >
                  {dialogue.currentLineIndex < dialogue.lines.length - 1 ? 'Lanjut' : dialogue.actionButtonText || 'Siap, mengerti'}
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Job completed */}
      {completedMissionCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg space-y-4 rounded-3xl border border-stone-200 bg-[#FBF7EF] p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Job selesai · +{completedMissionCard.fee}</div>
                <h3 className="font-serif text-lg font-bold text-stone-800">{completedMissionCard.title}</h3>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-stone-200 bg-white px-2 py-2">
                <div className="text-lg font-extrabold text-[#0F766E]">+{completedMissionCard.xpReward}</div>
                <div className="text-[10px] text-stone-500">XP</div>
              </div>
              <div className="rounded-xl border border-stone-200 bg-white px-2 py-2">
                <div className="text-sm font-extrabold leading-7 text-[#B45309]">{completedMissionCard.fee}</div>
                <div className="text-[10px] text-stone-500">Fee</div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-2 py-2">
                <div className="flex items-center justify-center gap-0.5 text-lg font-extrabold text-amber-700">
                  {(jobRatings[jobRatings.length - 1] ?? 5).toFixed(1)}
                  <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                </div>
                <div className="text-[10px] text-amber-700">Ulasan klien</div>
              </div>
            </div>
            <div className="space-y-1.5 rounded-2xl border border-teal-200 bg-teal-50/70 p-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
                <Compass className="h-4 w-4" /> Catatan belajar: {completedMissionCard.ciscoConceptTitle}
              </div>
              <p className="text-[11px] leading-relaxed text-stone-700">{completedMissionCard.ciscoConceptBody}</p>
            </div>
            <button
              onClick={handleNextMission}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0F766E] px-5 py-3 text-sm font-extrabold text-white hover:bg-[#115E59]"
            >
              {currentMissionIndex + 1 < MISSIONS.length ? 'Lihat Job Berikutnya di HP' : 'Ambil Sertifikat Freelance'}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Phone */}
      {showPhone && (
        <PhoneModal
          missions={MISSIONS}
          currentMissionIndex={currentMissionIndex}
          jobAccepted={jobAccepted}
          currentLocation={location}
          playerName={playerName}
          completedCount={completedCount}
          rating={rating}
          earnings={balance}
          chat={phoneChat}
          onChatChange={setPhoneChat}
          initialTab={phoneInitialTab}
          onTabChange={setPhoneInitialTab}
          shopItems={SHOP_ITEMS}
          inventory={inventory}
          balance={balance}
          onBuy={handleBuy}
          onAcceptJob={handleAcceptJob}
          onTalkToClient={handleTalkToClientOnSite}
          onTravel={handleTravel}
          onClose={() => setShowPhone(false)}
        />
      )}

      {/* Device: cable craft (Meja Crimping kantor) atau rakit di lokasi pakai toolkit tas */}
      {((activeDevice && activeDevice.type === 'toolbench') || craftFromBag) && (
        <CableCraftModal
          inventory={inventory}
          onUpdateInventory={setInventory}
          onCraftCable={handleCraftCable}
          measuredRoutes={measuredLabelMap()}
          context={craftFromBag ? 'field' : 'bench'}
          onClose={() => {
            setActiveDeviceId(null);
            setCraftFromBag(false);
          }}
        />
      )}

      {/* Device: coffee */}
      {coffeeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm space-y-4 rounded-3xl border border-stone-200 bg-[#FBF7EF] p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-[#B45309]">
              <Coffee className="h-7 w-7" />
            </div>
            <h3 className="font-serif text-xl font-bold text-stone-800">Kopi gratis di kantor</h3>
            <p className="text-xs leading-relaxed text-stone-600">
              Seduh espresso dulu sebelum keliling. Kecepatan jalan teknisi +30% selama 90 detik.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setCoffeeOpen(false)} className="flex-1 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-bold text-stone-600">
                Nanti
              </button>
              <button onClick={handleDrinkCoffee} className="flex-1 rounded-xl bg-[#B45309] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#92400E]">
                {coffeeBoostActive ? 'Tambah Kopi' : 'Seduh & Minum'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner tarikan kabel fisik aktif */}
      {cableRun && (
        <div className="absolute left-1/2 top-[74px] z-30 w-[94%] max-w-xl -translate-x-1/2 sm:top-[86px]">
          <div
            className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5 shadow-lg backdrop-blur ${
              cableTaut
                ? 'border-rose-300 bg-rose-50/97'
                : 'border-teal-200 bg-[#FBF7EF]/97'
            }`}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white ${
                  cableRun.mode === 'measure' ? 'bg-[#B45309]' : 'bg-[#0F766E]'
                }`}
              >
                {cableRun.mode === 'measure' ? <Ruler className="h-4 w-4" /> : <Cable className="h-4 w-4" />}
              </span>
              <div className="min-w-0">
                <div className="truncate text-[11px] font-bold text-stone-800">
                  {cableRun.mode === 'measure'
                    ? `Mengukur rute dengan meteran → ${getCounterpart(cableRun.sourceDeviceId)?.name || 'tujuan'}`
                    : `Menarik ${cableRun.cableType === 'straight' ? 'Straight' : 'Crossover'} ${cableRun.lengthMeters}m → ${
                        getCounterpart(cableRun.sourceDeviceId)?.name || 'tujuan'
                      }`}
                </div>
                <div className="font-mono text-[10px] text-stone-500">
                  {cableRun.mode === 'measure'
                    ? `Terukur ${cableRun.usedMeters.toFixed(1)} m · Jalan ke tujuan & tekan E untuk membaca hasil`
                    : `Terpakai ${cableRun.usedMeters.toFixed(1)}m / ${cableRun.lengthMeters}m${
                        cableTaut ? ' · KABEL MENTOK! Mundur / ganti kabel lebih panjang!' : ' · Jalan ke perangkat tujuan & tekan E'
                      }`}
                </div>
                {cableRun.mode === 'cable' && (
                  <div className="mt-1 h-1.5 w-44 overflow-hidden rounded-full bg-stone-200">
                    <div
                      className={`h-full rounded-full transition-all ${cableTaut ? 'bg-rose-500' : 'bg-[#0F766E]'}`}
                      style={{ width: `${Math.min(100, (cableRun.usedMeters / cableRun.lengthMeters) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleCancelCableRun}
              className="shrink-0 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-[10px] font-bold text-stone-600 hover:bg-stone-50"
            >
              Batal & Gulung
            </button>
          </div>
        </div>
      )}

      {/* Hardware close-up: colok ujung A / B */}
      {plugModal && devices[plugModal.deviceId] && (
        <HardwarePlugModal
          device={devices[plugModal.deviceId]}
          mode={plugModal.mode}
          inventory={inventory}
          cableRun={cableRun}
          targetRouteMeters={plugModal.mode === 'target' ? routeMeters(completedCableRoute(
            cableTrailRef.current, playerRef.current, {
              x: devices[plugModal.deviceId].x + devices[plugModal.deviceId].widthTiles / 2,
              y: devices[plugModal.deviceId].y + devices[plugModal.deviceId].heightTiles / 2,
            }
          )) : undefined}
          requiredMeters={
            plugModal.mode === 'source'
              ? measuredRoutes[plugModal.deviceId] ?? null
              : measuredRoutes[cableRun?.sourceDeviceId || plugModal.deviceId] ?? null
          }
          counterpartName={
            plugModal.mode === 'source'
              ? getCounterpart(plugModal.deviceId)?.name || 'perangkat tujuan'
              : devices[cableRun?.sourceDeviceId || 'laptop-ratna']?.name || 'perangkat sumber'
          }
          onPlugSource={handlePlugSource}
          onPlugTarget={handlePlugTarget}
          onMistake={registerMistake}
          onClose={() => setPlugModal(null)}
        />
      )}

      {/* Network appliances have physical inspection, never a Windows desktop. */}
      {activeDevice?.type === 'ap' && (
        <NetworkApplianceModal device={activeDevice} hasTape={inventory.hasMeasuringTape}
          measuredMeters={measuredRoutes[activeDevice.id] ?? null}
          onMeasure={handleStartMeasure} onPlug={handleOpenSourcePlug}
          onClose={() => setActiveDeviceId(null)} />
      )}

      {/* Device: computers only */}
      {activeDevice && (activeDevice.type === 'pc' || activeDevice.type === 'server') && (
          <PCDesktopModal
            device={activeDevice}
            allDevices={devices}
            inventory={inventory}
            targetDeviceName={activeDeviceTarget}
            cableRunActive={Boolean(cableRun)}
            measuredMeters={measuredRoutes[activeDevice.id] ?? null}
            onRequestPhysicalPlug={handleOpenSourcePlug}
            onRequestMeasure={handleStartMeasure}
            onUpdateDevice={(updated) => { setVerifiedPings([]); setDevices((prev) => ({ ...prev, [updated.id]: updated })); }}
            onPingSuccess={handlePingSuccess}
            onClose={() => setActiveDeviceId(null)}
          />
        )}

      {/* Device: Cisco IOS console */}
      {activeDevice && (activeDevice.type === 'switch' || activeDevice.type === 'router') && (
        <CiscoConsoleModal
          device={activeDevice}
          allDevices={devices}
          inventory={inventory}
          onUpdateDevices={(updater) => { setVerifiedPings([]); setDevices(updater); }}
          onTriggerPacketFlow={triggerPacketFlow}
          onPingSuccess={handlePingSuccess}
          onClose={() => setActiveDeviceId(null)}
        />
      )}

      {showInventory && (
        <InventoryModal
          inventory={inventory}
          currentLocation={location}
          balance={balance}
          measuredRoutes={measuredLabelMap()}
          onTravelToBase={() => handleTravel('base')}
          onCraftHere={() => setCraftFromBag(true)}
          onClose={() => setShowInventory(false)}
        />
      )}

      {showHandbook && <CiscoHandbookModal onClose={() => setShowHandbook(false)} />}
      {showCertificate && (
        <CertificateModal
          playerName={playerName}
          avatar={avatar}
          xp={xp}
          rating={rating}
          earnings={balance}
          onContinueSandbox={() => setShowCertificate(false)}
        />
      )}

    </div>
  );
}

export default App;
