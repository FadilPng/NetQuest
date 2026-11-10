import { evaluateCable, T568A, T568B, type CableTestResult } from '../game/cableTesting';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Backpack,
  Cable,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  RotateCcw,
  Ruler,
  Wrench,
  X,
} from 'lucide-react';
import { CraftedCableItem, TechnicianInventory, UnfinishedCableItem } from '../game/types';
import { sound } from '../game/sound';

/* ─────────────────────────── Data warna urat ─────────────────────────── */

interface WireColor {
  id: string;
  name: string;
  solid: string;
  stripedWith?: string;
}

const WIRES: Record<string, WireColor> = {
  wo: { id: 'wo', name: 'Putih-Oranye', solid: '#F8FAFC', stripedWith: '#F97316' },
  o: { id: 'o', name: 'Oranye', solid: '#F97316' },
  wg: { id: 'wg', name: 'Putih-Hijau', solid: '#F8FAFC', stripedWith: '#16A34A' },
  b: { id: 'b', name: 'Biru', solid: '#2563EB' },
  wb: { id: 'wb', name: 'Putih-Biru', solid: '#F8FAFC', stripedWith: '#2563EB' },
  g: { id: 'g', name: 'Hijau', solid: '#16A34A' },
  wbr: { id: 'wbr', name: 'Putih-Coklat', solid: '#F8FAFC', stripedWith: '#92400E' },
  br: { id: 'br', name: 'Coklat', solid: '#92400E' },
};

// Urutan urat saat baru keluar dari jaket (per pasangan pilin)
const PAIRS: Array<{ label: string; a: string; b: string }> = [
  { label: 'Oranye', a: 'wo', b: 'o' },
  { label: 'Hijau', a: 'wg', b: 'g' },
  { label: 'Biru', a: 'wb', b: 'b' },
  { label: 'Coklat', a: 'wbr', b: 'br' },
];
const NATURAL_ORDER = ['wo', 'o', 'wg', 'g', 'wb', 'b', 'wbr', 'br'];

// Posisi ujung urat yang berserakan setelah diurai (sengaja acak)
const SCATTER: Array<{ x: number; y: number }> = [
  { x: 430, y: 70 },
  { x: 500, y: 262 },
  { x: 455, y: 170 },
  { x: 520, y: 112 },
  { x: 420, y: 292 },
  { x: 540, y: 210 },
  { x: 470, y: 228 },
  { x: 505, y: 54 },
];
const SCATTER_ROT: Record<1 | 2, number> = { 1: 3, 2: 5 };

const TRIM_JITTER = [-14, 8, -4, 16, -10, 4, 12, -6];

type Phase = 'plan' | 'cut' | 'strip' | 'untwist' | 'arrange' | 'trim' | 'insert' | 'crimp' | 'test' | 'done';

const STEPS: Array<{ id: Phase; label: string }> = [
  { id: 'plan', label: 'Rencana' },
  { id: 'cut', label: 'Gunting' },
  { id: 'strip', label: 'Kupas' },
  { id: 'untwist', label: 'Urai' },
  { id: 'arrange', label: 'Susun' },
  { id: 'trim', label: 'Ratakan' },
  { id: 'insert', label: 'Masukkan' },
  { id: 'crimp', label: 'Crimp' },
  { id: 'test', label: 'Uji' },
];

interface EndData {
  order: string[];
  flipped: boolean;
}

type TestResult = CableTestResult;

/* ─────────────────────────── Geometri ─────────────────────────── */

const CUT_X0 = 60;
const PX_PER_M = 680 / 15;
const STRIP_END = 620; // ujung kabel di tahap kupas
const STRIP_CM = 40; // px per cm di tahap kupas
const TRIM_JX = 200; // tepi jaket di tahap ratakan
const TRIM_CM = 70; // px per cm di tahap ratakan / masukkan
const INS_JX = 260; // tepi jaket di tahap masukkan konektor
const SLOT_X = 610;
const slotY = (i: number) => 66 + i * 30;
const PORT_A = { x: 195, y: 213 };
const PORT_B = { x: 605, y: 213 };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/* ─────────────────────────── Komponen gambar urat ─────────────────────────── */

const WireStroke: React.FC<{ d: string; id: string; w?: number; opacity?: number }> = ({
  d,
  id,
  w = 7,
  opacity = 1,
}) => {
  const c = WIRES[id];
  return (
    <g opacity={opacity}>
      <path d={d} fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth={w + 1} strokeLinecap="round" />
      <path d={d} fill="none" stroke={c.solid} strokeWidth={w} strokeLinecap="round" />
      {c.stripedWith && (
        <path d={d} fill="none" stroke={c.stripedWith} strokeWidth={w * 0.6} strokeDasharray="10 16" strokeLinecap="butt" />
      )}
      <path d={d} fill="none" stroke="white" strokeOpacity={0.18} strokeWidth={Math.max(0.6, w * 0.16)} strokeLinecap="round" />
    </g>
  );
};

const Swatch: React.FC<{ id: string }> = ({ id }) => {
  const w = WIRES[id];
  return (
    <span
      className="inline-block h-5 w-3 shrink-0 rounded-[3px] border border-stone-400/70"
      style={{
        background: w.stripedWith
          ? `repeating-linear-gradient(135deg, ${w.solid} 0 3px, ${w.stripedWith} 3px 6px)`
          : w.solid,
      }}
    />
  );
};

// Pasangan pilin: 2 gelombang sinus berlawanan fase. tw=1 terpilin penuh, tw=0 lurus terpisah.
const helixPath = (x0: number, x1: number, y: number, tw: number, phase: number) => {
  let d = '';
  for (let x = x0; x <= x1; x += 3) {
    const t = ((x - x0) / 23) * Math.PI * 2 + phase;
    const yy = y + Math.sin(t) * 5 * tw + (phase === 0 ? -1 : 1) * (1 - tw) * 6;
    d += `${x === x0 ? 'M' : 'L'}${x} ${yy.toFixed(1)} `;
  }
  return d;
};

/* ─────────────────────────── Modal utama ─────────────────────────── */

export const CableCraftModal: React.FC<{
  inventory: TechnicianInventory;
  onUpdateInventory: (updater: (prev: TechnicianInventory) => TechnicianInventory) => void;
  onCraftCable: (item: CraftedCableItem) => void;
  measuredRoutes?: Record<string, number>;
  context?: 'bench' | 'field';
  onClose: () => void;
}> = ({ inventory, onUpdateInventory, onCraftCable, measuredRoutes = {}, context = 'bench', onClose }) => {
  const measuredList = Object.entries(measuredRoutes);
  const measuredMax = measuredList.length ? Math.max(...measuredList.map(([, m]) => m)) : null;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const workAreaRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    kind: string;
    id?: string;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    offX: number;
    moved: boolean;
  } | null>(null);

  const transitionTimers = useRef<Set<number>>(new Set());
  const delayTransition = (action: () => void, delay: number) => {
    // One transition at a time: repeated taps must not enqueue stage changes.
    if (transitionTimers.current.size) return;
    const timer = window.setTimeout(() => { transitionTimers.current.delete(timer); action(); }, delay);
    transitionTimers.current.add(timer);
  };
  const testTimerRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (testTimerRef.current !== null) window.clearInterval(testTimerRef.current);
    transitionTimers.current.forEach(timer => window.clearTimeout(timer));
    transitionTimers.current.clear();
  }, []);
  const [phase, setPhase] = useState<Phase>('plan');
  useEffect(() => () => {
    transitionTimers.current.forEach(timer => window.clearTimeout(timer));
    transitionTimers.current.clear();
  }, [phase]);
  const [plan, setPlan] = useState<'straight' | 'crossover'>('straight');
  const [end, setEnd] = useState<1 | 2>(1);
  const [ends, setEnds] = useState<{ 1?: EndData; 2?: EndData }>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // Keep the next tool visible without moving or resizing the modal itself.
    if (workAreaRef.current) workAreaRef.current.scrollTop = 0;
  }, [phase]);

  // ID potongan aktif di tas (diisi begitu digunting dari roll, dihapus saat selesai jadi kabel)
  const [activePieceId, setActivePieceId] = useState<string | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);

  // Gunting
  const [rollStart, setRollStart] = useState(0);
  const [scissorX, setScissorX] = useState(CUT_X0 + 7 * PX_PER_M);
  const [snipped, setSnipped] = useState(false);
  const [cutLen, setCutLen] = useState(0);

  // Kupas
  const [stripperX, setStripperX] = useState(560);
  const [jacketOff, setJacketOff] = useState(0);
  const [stripped, setStripped] = useState(false);
  const [stripCm, setStripCm] = useState(0);

  // Urai
  const [twist, setTwist] = useState([1, 1, 1, 1]);

  // Susun
  const [tips, setTips] = useState<Record<string, { x: number; y: number }>>({});
  const [slots, setSlots] = useState<(string | null)[]>(Array(8).fill(null));
  const [dragTip, setDragTip] = useState<{ id: string; x: number; y: number } | null>(null);

  // Ratakan
  const [wireLens, setWireLens] = useState<number[]>([]);
  const [trimX, setTrimX] = useState(360);

  // Masukkan konektor
  const [connX, setConnX] = useState(600);
  const [flipped, setFlipped] = useState(false);

  // Crimp
  const [squeeze, setSqueeze] = useState(0);
  const [crimped, setCrimped] = useState(false);
  const crimpedRef = useRef(false);

  // Uji
  const [plugA, setPlugA] = useState({ x: 150, y: 300 });
  const [plugB, setPlugB] = useState({ x: 650, y: 300 });
  const [testStep, setTestStep] = useState(-1);
  const [result, setResult] = useState<TestResult | null>(null);
  const [savedTested, setSavedTested] = useState(false);

  const say = (ok: boolean, text: string) => setMsg({ ok, text });

  /* ── helpers ── */
  const toSvg = (e: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };

  const targetFor = (e: 1 | 2) => (e === 1 ? (plan === 'straight' ? T568B : T568A) : T568B);

  const resetEndWork = () => {
    setStripperX(560);
    setJacketOff(0);
    setStripped(false);
    setStripCm(0);
    setTwist([1, 1, 1, 1]);
    setTips({});
    setSlots(Array(8).fill(null));
    setDragTip(null);
    setWireLens([]);
    setTrimX(360);
    setConnX(600);
    setFlipped(false);
    setSqueeze(0);
    setCrimped(false);
    crimpedRef.current = false;
  };

  /* ── TAHAP: rencana → gunting ── */
  const startJob = () => {
    if (!inventory.hasCrimper) {
      sound.playError();
      say(false, 'Kamu belum punya Tang Crimping (sekaligus pisau kupas). Beli di HP → tab Toko.');
      return;
    }
    if (inventory.rj45Connectors < 2) {
      sound.playError();
      say(false, '1 kabel butuh 2 konektor RJ45 (satu tiap ujung). Beli di HP → tab Toko sebelum memotong roll.');
      return;
    }
    if (inventory.utpRollMeters < 1) {
      sound.playError();
      say(false, 'Roll UTP di tas kosong. Beli di HP → tab Toko.');
      return;
    }
    sound.playClick();
    setRollStart(inventory.utpRollMeters);
    const maxCut = Math.min(15, inventory.utpRollMeters);
    const suggest = measuredMax !== null ? Math.min(maxCut, Math.ceil(measuredMax + 1)) : Math.min(maxCut, 7);
    setScissorX(CUT_X0 + suggest * PX_PER_M);
    setSnipped(false);
    setEnds({});
    setEnd(1);
    resetEndWork();
    setActivePieceId(null);
    setConfirmExit(false);
    setResult(null);
    setTestStep(-1);
    setMsg(null);
    setPhase('cut');
  };

  // Lanjutkan potongan setengah jadi yang tersimpan di tas (tidak perlu potong roll baru!)
  const resumePiece = (piece: UnfinishedCableItem) => {
    if (!inventory.hasCrimper) {
      sound.playError();
      say(false, 'Kamu belum punya Tang Crimping! Beli di HP → tab Toko.');
      return;
    }
    const doneEnds = (piece.end1 ? 1 : 0) + (piece.end2 ? 1 : 0);
    const neededPlugs = 2 - doneEnds;
    if (inventory.rj45Connectors < neededPlugs) {
      sound.playError();
      say(false, `Butuh ${neededPlugs} konektor RJ45 lagi untuk menyelesaikan potongan ini. Beli di HP → tab Toko.`);
      return;
    }
    sound.playClick();
    setPlan(piece.plan);
    setCutLen(piece.lengthMeters);
    setSnipped(true);
    setActivePieceId(piece.id);
    setConfirmExit(false);
    const restored: { 1?: EndData; 2?: EndData } = {
      1: piece.end1,
      2: piece.end2,
    };
    setEnds(restored);
    resetEndWork();
    setResult(null);
    setTestStep(-1);
    setMsg(null);
    if (restored[1] && restored[2]) {
      setPlugA({ x: 150, y: 300 });
      setPlugB({ x: 650, y: 300 });
      setPhase('test');
      say(true, `Melanjutkan potongan ${piece.lengthMeters} m — tinggal uji dengan LAN tester.`);
    } else {
      const nextEnd: 1 | 2 = restored[1] ? 2 : 1;
      setEnd(nextEnd);
      setPhase('strip');
      say(true, `Melanjutkan potongan ${piece.lengthMeters} m — kerjakan ujung ${nextEnd}.`);
    }
  };

  // Simpan progres ujung yang sudah di-crimp ke potongan di tas (agar tetap aman walau keluar)
  const syncPieceEnds = (id: string | null, nextEnds: { 1?: EndData; 2?: EndData }) => {
    if (!id) return;
    onUpdateInventory((prev) => ({
      ...prev,
      unfinishedCables: prev.unfinishedCables.map((u) =>
        u.id === id ? { ...u, end1: nextEnds[1], end2: nextEnds[2] } : u
      ),
    }));
  };

  const maxCutM = Math.min(15, rollStart || inventory.utpRollMeters);
  const scissorLen = Math.max(0.5, Math.round(((scissorX - CUT_X0) / PX_PER_M) * 2) / 2);

  const snip = () => {
    if (snipped || transitionTimers.current.size) return;
    const len = scissorLen;
    const pieceId = `piece-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    sound.playCablePlug();
    setSnipped(true);
    setCutLen(len);
    setActivePieceId(pieceId);
    // Roll berkurang & potongan langsung tercatat di tas sebagai kabel setengah jadi
    onUpdateInventory((prev) => ({
      ...prev,
      utpRollMeters: Math.max(0, prev.utpRollMeters - len),
      unfinishedCables: [
        ...prev.unfinishedCables,
        {
          id: pieceId,
          lengthMeters: len,
          plan,
          createdAt: Date.now(),
        },
      ],
    }));
    say(true, `Kabel terpotong ${len} m dan masuk tas sebagai potongan setengah jadi.`);
    delayTransition(() => {
      setMsg(null);
      setPhase('strip');
    }, 1100);
  };

  /* ── TAHAP: kupas ── */
  const finishJacketPull = () => {
    if (transitionTimers.current.size) return;
    if (jacketOff < 80) {
      setJacketOff(0);
      return;
    }
    const cm = (STRIP_END - stripperX) / STRIP_CM;
    if (cm < 2) {
      sound.playError();
      setJacketOff(0);
      say(false, `Hanya terkupas ${cm.toFixed(1)} cm — urat terlalu pendek untuk disusun. Geser stripper lebih ke kiri lalu tarik lagi.`);
      return;
    }
    sound.playCablePlug();
    setStripped(true);
    setStripCm(cm);
    say(
      true,
      cm > 4
        ? `Terkupas ${cm.toFixed(1)} cm (agak kepanjangan, nanti dirapikan saat meratakan).`
        : `Jaket terkupas ${cm.toFixed(1)} cm. 4 pasang pilin terlihat.`
    );
    delayTransition(() => {
      setMsg(null);
      setPhase('untwist');
    }, 900);
  };

  /* ── TAHAP: urai → susun ── */
  useEffect(() => {
    if (phase !== 'untwist' || !twist.every((t) => t <= 0)) return;
    sound.playCablePlug();
    const t = window.setTimeout(() => {
      const rot = SCATTER_ROT[end];
      const next: Record<string, { x: number; y: number }> = {};
      NATURAL_ORDER.forEach((id, i) => {
        next[id] = SCATTER[(i + rot) % SCATTER.length];
      });
      setTips(next);
      setSlots(Array(8).fill(null));
      setPhase('arrange');
    }, 600);
    return () => window.clearTimeout(t);
  }, [twist, phase, end]);

  const tipPos = (id: string) => {
    if (dragTip?.id === id) return { x: dragTip.x, y: dragTip.y };
    const s = slots.indexOf(id);
    if (s >= 0) return { x: SLOT_X, y: slotY(s) };
    return tips[id] || { x: 450, y: 170 };
  };

  const dropTip = (id: string, x: number, y: number) => {
    const target = slots.findIndex((_, i) => Math.abs(x - SLOT_X) < 50 && Math.abs(y - slotY(i)) < 15);
    const fromSlot = slots.indexOf(id);
    const next = [...slots];
    if (target >= 0) {
      const occupant = next[target];
      if (fromSlot >= 0) next[fromSlot] = occupant; // tukar posisi
      next[target] = id;
      if (occupant && fromSlot < 0) {
        // urat yang tergeser kembali ke posisi lepas
        setTips((prev) => ({ ...prev, [occupant]: { x: 470, y: clamp(y + 40, 40, 300) } }));
      }
      sound.playClick();
    } else {
      if (fromSlot >= 0) next[fromSlot] = null;
      setTips((prev) => ({ ...prev, [id]: { x: clamp(x, 330, 560), y: clamp(y, 40, 310) } }));
    }
    setSlots(next);
    setDragTip(null);
  };

  const goTrim = () => {
    if (slots.some((s) => !s)) {
      sound.playError();
      say(false, 'Masih ada urat yang belum dijepit di penjepit jari. Tarik semua 8 ujung urat ke slot.');
      return;
    }
    const base = stripCm * TRIM_CM;
    setWireLens(TRIM_JITTER.map((j) => base + j));
    setTrimX(TRIM_JX + base - 10);
    setMsg(null);
    setPhase('trim');
  };

  /* ── TAHAP: ratakan ── */
  const trimMax = wireLens.length ? TRIM_JX + Math.max(...wireLens) : 400;
  const snipTrim = () => {
    if (transitionTimers.current.size) return;
    const minLen = Math.min(...wireLens);
    const lenPx = trimX - TRIM_JX;
    if (lenPx > minLen) {
      sound.playError();
      say(false, 'Garis potong melewati ujung urat yang paling pendek — hasilnya tidak rata. Geser gunting lebih ke kiri.');
      return;
    }
    const cm = lenPx / TRIM_CM;
    sound.playCablePlug();
    setWireLens(wireLens.map(() => lenPx));
    if (cm < 1.1) {
      sound.playError();
      say(
        false,
        `Kependekan (${cm.toFixed(1)} cm)! Urat tidak akan sampai ke kontak logam. Ujung ini harus dipotong & dikupas ulang.`
      );
      delayTransition(() => {
        setStripperX(560);
        setJacketOff(0);
        setStripped(false);
        setTwist([1, 1, 1, 1]);
        setSlots(Array(8).fill(null));
        setPhase('strip');
      }, 1600);
      return;
    }
    if (cm > 1.5) {
      say(false, `Rata, tapi masih ${cm.toFixed(1)} cm — jaket tidak akan terjepit konektor. Potong lagi lebih pendek (rentang konektor lab 1,1–1,5 cm).`);
      setTrimX(TRIM_JX + lenPx - 14);
      return;
    }
    say(true, `Rata di ${cm.toFixed(1)} cm. Sesuai konektor tertutup pada lab ini.`);
    delayTransition(() => {
      setMsg(null);
      setConnX(600);
      setPhase('insert');
    }, 900);
  };

  /* ── TAHAP: masukkan konektor ── */
  const insertLen = wireLens[0] || 90;
  const connXmin = INS_JX + insertLen - 140;
  const fullyInserted = connX <= connXmin + 1;
  const jacketGripped = connX + 40 < INS_JX;

  /* ── TAHAP: crimp ── */
  const doCrimp = () => {
    if (crimpedRef.current || phase !== 'crimp' || !inventory.hasCrimper || !fullyInserted || !jacketGripped) return;
    if (inventory.rj45Connectors < 1) {
      sound.playError();
      say(false, 'Konektor RJ45 habis! Beli di HP → tab Toko.');
      return;
    }
    crimpedRef.current = true;
    setCrimped(true);
    sound.playCablePlug();
    const completedEnd: EndData = { order: [...slots] as string[], flipped };
    const completedEnds = { ...ends, [end]: completedEnd };
    setEnds(completedEnds);
    // Commit connector consumption and physical work together, not on the Next button.
    onUpdateInventory(prev => ({
      ...prev,
      rj45Connectors: Math.max(0, prev.rj45Connectors - 1),
      unfinishedCables: prev.unfinishedCables.map(piece => piece.id === activePieceId
        ? { ...piece, end1: completedEnds[1], end2: completedEnds[2] } : piece),
    }));
    say(true, `KLIK! Ujung ${end} ter-crimp. Kontak logam menembus isolasi urat & penjepit jaket terkunci.`);
  };

  const finishEnd = () => {
    const data: EndData = { order: slots as string[], flipped };
    const merged = { ...ends, [end]: data };
    setEnds(merged);
    syncPieceEnds(activePieceId, merged);
    setMsg(null);
    const other: 1 | 2 = end === 1 ? 2 : 1;
    if (merged[other]) {
      setPlugA({ x: 150, y: 300 });
      setPlugB({ x: 650, y: 300 });
      setTestStep(-1);
      setResult(null);
      setPhase('test');
    } else {
      setEnd(other);
      resetEndWork();
      setPhase('strip');
    }
  };

  /* ── TAHAP: uji ── */
  const evaluate = evaluateCable;

  const pluggedA = plugA.x === PORT_A.x && plugA.y === PORT_A.y;
  const pluggedB = plugB.x === PORT_B.x && plugB.y === PORT_B.y;
  const preview = useMemo(() => (ends[1] && ends[2] ? evaluate(ends) : null), [ends]); // eslint-disable-line react-hooks/exhaustive-deps

  const runTest = () => {
    if (!inventory.hasLanTester) return;
    if (!pluggedA || !pluggedB) {
      sound.playError();
      say(false, 'Colokkan kedua konektor ke port Master dan Remote dulu.');
      return;
    }
    if (testTimerRef.current !== null) return;
    setResult(null);
    sound.playClick();
    setMsg(null);
    let s = 0;
    setTestStep(0);
    const timer = window.setInterval(() => {
      s += 1;
      setTestStep(s);
      sound.playStep();
      if (s >= 8) {
        window.clearInterval(timer);
        testTimerRef.current = null;
        const r = evaluate(ends);
        setResult(r);
        if (r.testerOk) sound.playPingSuccess();
        else sound.playError();
      }
    }, 420);
    testTimerRef.current = timer;
  };

  const redoEnd = (k: 1 | 2) => {
    if (testTimerRef.current !== null) window.clearInterval(testTimerRef.current);
    testTimerRef.current = null;
    sound.playClick();
    const nextEnds = { ...ends, [k]: undefined };
    setEnds(nextEnds);
    syncPieceEnds(activePieceId, nextEnds);
    setEnd(k);
    resetEndWork();
    setResult(null);
    setTestStep(-1);
    say(false, `Konektor ujung ${k} dipotong & dibuang. Kupas ulang ujung ini (butuh 1 RJ45 baru).`);
    setPhase('strip');
  };

  const finalize = (tested: boolean) => {
    if (!activePieceId || !ends[1] || !ends[2]) return;
    setSavedTested(tested);
    const r = result || evaluate(ends);
    // Hapus dari daftar setengah jadi karena sekarang pindah ke daftar kabel siap pakai
    if (activePieceId) {
      onUpdateInventory((prev) => ({
        ...prev,
        unfinishedCables: prev.unfinishedCables.filter((u) => u.id !== activePieceId),
      }));
      setActivePieceId(null);
    }
    onCraftCable({
      id: `cable-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: r.kind === 'crossover' ? 'crossover' : 'straight',
      lengthMeters: cutLen,
      createdAt: Date.now(),
      faulty: !r.ok,
      faultReason: r.faultReason,
      tested,
    });
    sound.playPingSuccess();
    setResult(r);
    setPhase('done');
  };

  // Saat klik X: kalau ada potongan yang belum selesai, minta konfirmasi (potongan tetap tersimpan di tas)
  const requestClose = () => {
    const inProgress = phase !== 'plan' && phase !== 'done' && Boolean(activePieceId);
    if (inProgress && !confirmExit) {
      sound.playClick();
      setConfirmExit(true);
      return;
    }
    dragRef.current = null;
    if (testTimerRef.current !== null) window.clearInterval(testTimerRef.current);
    transitionTimers.current.forEach(timer => window.clearTimeout(timer));
    transitionTimers.current.clear();
    onClose();
  };

  /* ── pointer handling ── */
  const startDrag = (kind: string, id?: string, offX = 0) => (e: React.PointerEvent) => {
    e.stopPropagation();
    if (transitionTimers.current.size || confirmExit) return;
    if (kind === 'plugA' || kind === 'plugB') {
      if (testTimerRef.current !== null) window.clearInterval(testTimerRef.current);
      testTimerRef.current = null;
      setTestStep(-1);
      setResult(null);
    }
    const p = toSvg(e);
    svgRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = { kind, id, startX: p.x, startY: p.y, lastX: p.x, lastY: p.y, offX: p.x - offX, moved: false };
  };

  const onMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const p = toSvg(e);
    if (Math.hypot(p.x - d.startX, p.y - d.startY) > 4) d.moved = true;
    switch (d.kind) {
      case 'scissors':
        if (!snipped) setScissorX(clamp(p.x, CUT_X0 + 0.5 * PX_PER_M, CUT_X0 + maxCutM * PX_PER_M));
        break;
      case 'stripper':
        if (!stripped) setStripperX(clamp(p.x, 380, 600));
        break;
      case 'jacket':
        if (!stripped) setJacketOff(Math.max(0, p.x - d.startX));
        break;
      case 'pair': {
        const idx = Number(d.id);
        const dist = Math.abs(p.x - d.lastX) + Math.abs(p.y - d.lastY) * 0.6;
        setTwist((prev) => {
          const n = [...prev];
          n[idx] = Math.max(0, n[idx] - dist / 420);
          return n;
        });
        break;
      }
      case 'tip':
        if (d.id) setDragTip({ id: d.id, x: clamp(p.x, 300, 760), y: clamp(p.y, 24, 320) });
        break;
      case 'trim':
        setTrimX(clamp(p.x, TRIM_JX + 30, trimMax));
        break;
      case 'conn':
        if (!crimped) setConnX(clamp(p.x - d.offX, connXmin, 640));
        break;
      case 'handle': {
        const s = clamp((300 - p.y) / 150, 0, 1);
        setSqueeze(s);
        if (s >= 0.96) doCrimp();
        break;
      }
      case 'plugA':
        setPlugA({ x: clamp(p.x, 30, 380), y: clamp(p.y, 30, 320) });
        break;
      case 'plugB':
        setPlugB({ x: clamp(p.x, 420, 770), y: clamp(p.y, 30, 320) });
        break;
    }
    d.lastX = p.x;
    d.lastY = p.y;
  };

  const onUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (svgRef.current?.hasPointerCapture(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId);
    if (!d) return;
    const p = toSvg(e);
    switch (d.kind) {
      case 'scissors':
        if (!d.moved) snip();
        break;
      case 'jacket':
        finishJacketPull();
        break;
      case 'tip':
        if (d.id) dropTip(d.id, dragTip?.x ?? p.x, dragTip?.y ?? p.y);
        break;
      case 'trim':
        if (!d.moved) snipTrim();
        break;
      case 'handle':
        setSqueeze(0);
        break;
      case 'plugA':
        if (Math.hypot(plugA.x - PORT_A.x, plugA.y - PORT_A.y) < 40) {
          setPlugA(PORT_A);
          sound.playCablePlug();
        }
        break;
      case 'plugB':
        if (Math.hypot(plugB.x - PORT_B.x, plugB.y - PORT_B.y) < 40) {
          setPlugB(PORT_B);
          sound.playCablePlug();
        }
        break;
    }
  };

  /* ─────────────────────────── RENDER SVG PER TAHAP ─────────────────────────── */

  const Mat = (
    <g>
      <defs>
        <linearGradient id="craft-jacket" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#535f69"/><stop offset=".25" stopColor="#a9b4bd"/><stop offset=".55" stopColor="#808e99"/><stop offset="1" stopColor="#3c4852"/></linearGradient>
        <linearGradient id="craft-steel" x1="0" y1="0" x2="0.8" y2="1"><stop stopColor="#c0c8cc"/><stop offset=".35" stopColor="#6b7882"/><stop offset=".7" stopColor="#a8b4bb"/><stop offset="1" stopColor="#45545f"/></linearGradient>
        <linearGradient id="craft-grip" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#dd5c42"/><stop offset=".35" stopColor="#b83729"/><stop offset="1" stopColor="#6c211f"/></linearGradient>
        <linearGradient id="craft-plastic" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#e1eef3" stopOpacity=".48"/><stop offset=".5" stopColor="#bfd0db" stopOpacity=".12"/><stop offset="1" stopColor="#b6cbd5" stopOpacity=".4"/></linearGradient>
      </defs>
      <rect x={0} y={0} width={800} height={340} fill="#8B5E3C" />
      <rect x={10} y={10} width={780} height={320} rx={14} fill="#183f3a" />
      {Array.from({ length: 19 }).map((_, i) => (
        <line key={`v${i}`} x1={10 + (i + 1) * 40} y1={10} x2={10 + (i + 1) * 40} y2={330} stroke="rgba(255,255,255,0.05)" />
      ))}
      {Array.from({ length: 7 }).map((_, i) => (
        <line key={`h${i}`} x1={10} y1={10 + (i + 1) * 40} x2={790} y2={10 + (i + 1) * 40} stroke="rgba(255,255,255,0.05)" />
      ))}
      {phase !== 'cut' && phase !== 'test' && (
        <text x={24} y={32} fill="#FDE68A" fontSize={13} fontWeight={800} fontFamily="monospace">
          UJUNG {end} / 2
        </text>
      )}
    </g>
  );

  const renderCut = () => {
    const cableEnd = CUT_X0 + maxCutM * PX_PER_M;
    return (
      <g>
        {/* Spool di kanan */}
        <circle cx={752} cy={170} r={34} fill="#475569" stroke="#1E293B" strokeWidth={4} />
        {[26, 18, 10].map((r) => (
          <circle key={r} cx={752} cy={170} r={r} fill="none" stroke="#94A3B8" strokeWidth={3} />
        ))}
        <text x={752} y={222} textAnchor="middle" fill="#E2E8F0" fontSize={10}>
          Roll {rollStart}m
        </text>

        {/* Kabel yang ditarik dari roll */}
        {!snipped ? (
          <>
            <line x1={CUT_X0} y1={170} x2={718} y2={170} stroke="#64748B" strokeWidth={12} strokeLinecap="round" />
            <line x1={CUT_X0} y1={167} x2={718} y2={167} stroke="#CBD5E1" strokeWidth={2} opacity={0.6} />
          </>
        ) : (
          <>
            <line x1={scissorX + 6} y1={170} x2={718} y2={170} stroke="#64748B" strokeWidth={12} strokeLinecap="round" />
            <g style={{ transition: 'transform 0.6s' }} transform="translate(0,70)">
              <line x1={CUT_X0} y1={170} x2={scissorX - 6} y2={170} stroke="#0D9488" strokeWidth={12} strokeLinecap="round" />
              <text x={(CUT_X0 + scissorX) / 2} y={198} textAnchor="middle" fill="#99F6E4" fontSize={13} fontWeight={800}>
                Potongan {cutLen} m
              </text>
            </g>
          </>
        )}

        {/* Penggaris meteran */}
        <rect x={CUT_X0 - 6} y={196} width={cableEnd - CUT_X0 + 12} height={26} rx={4} fill="#FACC15" />
        {Array.from({ length: Math.floor(maxCutM * 2) + 1 }).map((_, i) => {
          const x = CUT_X0 + i * 0.5 * PX_PER_M;
          const major = i % 2 === 0;
          return (
            <g key={i}>
              <line x1={x} y1={196} x2={x} y2={major ? 210 : 204} stroke="#1C1917" strokeWidth={1.5} />
              {major && (
                <text x={x} y={219} textAnchor="middle" fontSize={9} fontWeight={700} fill="#1C1917">
                  {i / 2}
                </text>
              )}
            </g>
          );
        })}
        <text x={CUT_X0} y={238} fill="#FDE68A" fontSize={10}>
          meter →
        </text>

        {/* Penanda hasil ukur */}
        {measuredMax !== null && (
          <g>
            <line x1={CUT_X0 + measuredMax * PX_PER_M} y1={120} x2={CUT_X0 + measuredMax * PX_PER_M} y2={196} stroke="#34D399" strokeWidth={2} strokeDasharray="4 3" />
            <text x={CUT_X0 + measuredMax * PX_PER_M} y={114} textAnchor="middle" fill="#6EE7B7" fontSize={10} fontWeight={700}>
              ukur {measuredMax.toFixed(1)}m
            </text>
            <line x1={CUT_X0 + (measuredMax + 1) * PX_PER_M} y1={132} x2={CUT_X0 + (measuredMax + 1) * PX_PER_M} y2={196} stroke="#FDE68A" strokeWidth={2} strokeDasharray="2 3" />
            <text x={CUT_X0 + (measuredMax + 1) * PX_PER_M} y={128} textAnchor="middle" fill="#FDE68A" fontSize={9}>
              +1m toleransi
            </text>
          </g>
        )}

        {/* Gunting */}
        {!snipped || true ? (
          <g
            transform={`translate(${scissorX},170)`}
            onPointerDown={startDrag('scissors')}
            style={{ cursor: snipped ? 'default' : 'grab' }}
          >
            <rect x={-26} y={-86} width={52} height={104} fill="transparent" />
            <circle cx={-11} cy={-62} r={10} fill="none" stroke="#DC2626" strokeWidth={5} />
            <circle cx={11} cy={-62} r={10} fill="none" stroke="#DC2626" strokeWidth={5} />
            <polygon points={snipped ? '-4,-50 2,-50 1,10 -1,10' : '-6,-50 0,-50 12,8 8,10'} fill="#CBD5E1" stroke="#475569" />
            <polygon points={snipped ? '4,-50 -2,-50 -1,10 1,10' : '6,-50 0,-50 -12,8 -8,10'} fill="#E2E8F0" stroke="#475569" />
            <circle cx={0} cy={-38} r={3} fill="#1E293B" />
            {!snipped && (
              <g>
                <rect x={-34} y={-112} width={68} height={20} rx={6} fill="#0F172A" opacity={0.85} />
                <text x={0} y={-98} textAnchor="middle" fill="#FDE68A" fontSize={12} fontWeight={800} fontFamily="monospace">
                  {scissorLen.toFixed(1)} m
                </text>
              </g>
            )}
          </g>
        ) : null}

        <text x={400} y={300} textAnchor="middle" fill="#E2E8F0" fontSize={12}>
          {snipped
            ? 'Terpotong!'
            : 'Geser gunting di sepanjang meteran → KETUK guntingnya untuk memotong'}
        </text>
      </g>
    );
  };

  const renderStrip = () => (
    <g>
      {/* skala cm dari ujung kabel */}
      {Array.from({ length: 6 }).map((_, i) => (
        <g key={i}>
          <line x1={STRIP_END - i * STRIP_CM} y1={128} x2={STRIP_END - i * STRIP_CM} y2={146} stroke="#FDE68A" strokeWidth={1.5} />
          <text x={STRIP_END - i * STRIP_CM} y={122} textAnchor="middle" fill="#FDE68A" fontSize={10}>
            {i}cm
          </text>
        </g>
      ))}
      <rect x={STRIP_END - 3.5 * STRIP_CM} y={150} width={STRIP_CM} height={60} fill="#34D399" opacity={0.18} />
      <text x={STRIP_END - 3 * STRIP_CM} y={262} textAnchor="middle" fill="#6EE7B7" fontSize={10}>
        ideal 2,5–3,5 cm
      </text>

      {/* bagian kabel yang tetap berjaket */}
      <rect x={40} y={162} width={stripperX - 40} height={36} rx={8} fill="url(#craft-jacket)" />
      <rect x={40} y={166} width={stripperX - 40} height={6} rx={3} fill="#D1D5DB" opacity={0.7} />

      {/* pasangan pilin di dalam (terlihat setelah jaket dilepas) */}
      {stripped &&
        PAIRS.map((p, i) => {
          const y = 168 + i * 8;
          return (
            <g key={p.label}>
              <path d={helixPath(stripperX, STRIP_END, y, 1, 0)} stroke={WIRES[p.a].solid} strokeWidth={3} fill="none" />
              <path d={helixPath(stripperX, STRIP_END, y, 1, Math.PI)} stroke={WIRES[p.b].solid} strokeWidth={3} fill="none" />
            </g>
          );
        })}

      {/* potongan jaket yang ditarik lepas */}
      {!stripped && (
        <g onPointerDown={startDrag('jacket')} style={{ cursor: 'grab' }}>
          <rect x={stripperX + jacketOff} y={162} width={STRIP_END - stripperX} height={36} rx={8} fill="#A8AFB8" stroke="#6B7280" strokeDasharray={jacketOff > 0 ? '0' : '3 3'} />
          <text x={stripperX + jacketOff + (STRIP_END - stripperX) / 2} y={185} textAnchor="middle" fontSize={9} fill="#374151" fontWeight={700}>
            {jacketOff > 0 ? 'tarik →' : 'jaket'}
          </text>
        </g>
      )}

      {/* stripper */}
      {!stripped && (
        <g transform={`translate(${stripperX},180)`} onPointerDown={startDrag('stripper')} style={{ cursor: 'ew-resize' }}>
          <rect x={-22} y={-80} width={44} height={150} fill="transparent" />
          <rect x={-15} y={-64} width={30} height={47} rx={10} fill="url(#craft-grip)" stroke="#64261f"/>
          <rect x={-15} y={17} width={30} height={47} rx={10} fill="url(#craft-grip)" stroke="#64261f"/>
          <path d="M-12 -19 H12 V19 H-12 Z" fill="none" stroke="url(#craft-steel)" strokeWidth={4}/><path d="M-5 -19V19" stroke="#e0e5e7" strokeWidth={1.5}/>
          <circle cx={0} cy={-70} r={9} fill="#7F1D1D" />
          <text x={0} y={84} textAnchor="middle" fill="#FCA5A5" fontSize={10} fontWeight={700}>
            {((STRIP_END - stripperX) / STRIP_CM).toFixed(1)} cm
          </text>
        </g>
      )}

      <text x={400} y={305} textAnchor="middle" fill="#E2E8F0" fontSize={12}>
        {stripped
          ? 'Jaket terlepas!'
          : '1) Geser stripper merah ke titik kupas   2) Tarik potongan jaket ke kanan sampai lepas'}
      </text>
    </g>
  );

  const renderUntwist = () => (
    <g>
      <rect x={30} y={159} width={270} height={31} rx={5} fill="url(#craft-jacket)" stroke="#4c5c66"/>
      <ellipse cx={300} cy={174.5} rx={4} ry={14.5} fill="#33414a" stroke="#a0acb2" strokeWidth={1}/>
      <text x={74} y={179} fill="#354550" fontSize={8} letterSpacing={2}>UTP  ·  4 PAIR  ·  CAT 5e</text>
      {PAIRS.map((p, i) => {
        const y = 82 + i * 56;
        const jy = 165 + i * 6;
        const tw = twist[i];
        return (
          <g key={p.label}>
            <WireStroke d={`M300 ${jy-1.8} C 320 ${jy-1.8}, 323 ${y-5}, 340 ${y-5}`} id={p.a} w={3.6}/>
            <WireStroke d={`M300 ${jy+1.8} C 320 ${jy+1.8}, 323 ${y+5}, 340 ${y+5}`} id={p.b} w={3.6}/>
            <WireStroke d={helixPath(340, 620, y, tw, 0)} id={p.a} w={3.6} />
            <WireStroke d={helixPath(340, 620, y, tw, Math.PI)} id={p.b} w={3.6} />
            <text x={636} y={y + 4} fill={tw <= 0 ? '#6EE7B7' : '#FDE68A'} fontSize={11} fontWeight={700}>
              {tw <= 0 ? `✓ ${p.label}` : `${p.label} ${Math.round(tw * 100)}%`}
            </text>
            <rect
              x={330}
              y={y - 20}
              width={300}
              height={40}
              fill="transparent"
              style={{ cursor: 'grab' }}
              onPointerDown={startDrag('pair', String(i))}
            />
          </g>
        );
      })}
      <text x={400} y={318} textAnchor="middle" fill="#E2E8F0" fontSize={12}>
        Gosok/geser bolak-balik di atas tiap pasangan sampai pilinannya lurus
      </text>
    </g>
  );

  const renderArrange = () => {
    const ordered = [...NATURAL_ORDER].sort((a, b) => {
      const da = dragTip?.id === a ? 2 : slots.includes(a) ? 0 : 1;
      const db = dragTip?.id === b ? 2 : slots.includes(b) ? 0 : 1;
      return da - db;
    });
    return (
      <g>
        <rect x={20} y={150} width={200} height={44} rx={10} fill="url(#craft-jacket)" />
        {/* penjepit jari */}
        <rect x={SLOT_X - 30} y={44} width={60} height={250} rx={10} fill="#FED7AA" opacity={0.25} />
        {Array.from({ length: 8 }).map((_, i) => (
          <g key={i}>
            <rect x={SLOT_X - 24} y={slotY(i) - 10} width={48} height={20} rx={6} fill="rgba(15,23,42,0.55)" stroke={slots[i] ? '#34D399' : '#64748B'} strokeDasharray={slots[i] ? '0' : '4 3'} />
            <text x={SLOT_X + 40} y={slotY(i) + 4} fill="#FDE68A" fontSize={11} fontWeight={800} fontFamily="monospace">
              pin {i + 1}
            </text>
          </g>
        ))}
        {ordered.map((id) => {
          const k = NATURAL_ORDER.indexOf(id);
          const bx = 220;
          const by = 158 + k * 4;
          const t = tipPos(id);
          const d = `M${bx} ${by} C ${bx + 90} ${by}, ${t.x - 90} ${t.y}, ${t.x} ${t.y}`;
          return (
            <g key={id}>
              <WireStroke d={d} id={id} w={6} />
              <g data-wire={id} data-tip-x={t.x} data-tip-y={t.y} onPointerDown={startDrag('tip', id)} style={{ cursor: 'grab' }}>
                <circle cx={t.x} cy={t.y} r={14} fill="transparent" />
                <circle cx={t.x} cy={t.y} r={6} fill={WIRES[id].stripedWith ?? WIRES[id].solid} stroke="#0F172A" strokeWidth={2} />
              </g>
            </g>
          );
        })}
        <text x={300} y={318} textAnchor="middle" fill="#E2E8F0" fontSize={12}>
          Tarik ujung tiap urat ke penjepit pin 1–8 (atas = pin 1). Tukar posisi dengan menarik ke slot terisi.
        </text>
      </g>
    );
  };

  const renderTrim = () => (
    <g>
      <rect x={30} y={114} width={TRIM_JX - 30} height={92} rx={10} fill="url(#craft-jacket)" />
      <rect x={277} y={108} width={28} height={104} fill="#34D399" opacity={0.2} />
      <text x={291} y={102} textAnchor="middle" fill="#6EE7B7" fontSize={10}>
        ideal
      </text>
      {slots.map((id, i) =>
        id ? <WireStroke key={id} d={`M${TRIM_JX} ${124 + i * 10} L${TRIM_JX + (wireLens[i] ?? 100)} ${124 + i * 10}`} id={id} w={8} /> : null
      )}
      {/* penggaris */}
      <rect x={TRIM_JX} y={222} width={TRIM_CM * 3.3} height={22} rx={3} fill="#FACC15" />
      {Array.from({ length: 34 }).map((_, i) => (
        <line key={i} x1={TRIM_JX + i * 7} y1={222} x2={TRIM_JX + i * 7} y2={i % 10 === 0 ? 236 : i % 5 === 0 ? 232 : 228} stroke="#1C1917" />
      ))}
      {[0, 1, 2, 3].map((c) => (
        <text key={c} x={TRIM_JX + c * TRIM_CM} y={254} textAnchor="middle" fill="#FDE68A" fontSize={10}>
          {c}cm
        </text>
      ))}
      {/* gunting vertikal */}
      <g onPointerDown={startDrag('trim')} style={{ cursor: 'ew-resize' }}>
        <rect x={trimX - 18} y={64} width={36} height={160} fill="transparent" />
        <line x1={trimX} y1={96} x2={trimX} y2={214} stroke="#EF4444" strokeWidth={2} strokeDasharray="5 4" />
        <circle cx={trimX - 8} cy={74} r={7} fill="none" stroke="#DC2626" strokeWidth={4} />
        <circle cx={trimX + 8} cy={74} r={7} fill="none" stroke="#DC2626" strokeWidth={4} />
        <polygon points={`${trimX - 3},82 ${trimX + 3},82 ${trimX + 1},100 ${trimX - 1},100`} fill="#CBD5E1" />
        <text x={trimX} y={56} textAnchor="middle" fill="#FDE68A" fontSize={11} fontWeight={800} fontFamily="monospace">
          {((trimX - TRIM_JX) / TRIM_CM).toFixed(2)} cm
        </text>
      </g>
      <text x={400} y={300} textAnchor="middle" fill="#E2E8F0" fontSize={12}>
        Geser garis gunting ke zona hijau (1,1–1,5 cm dari jaket) → KETUK gunting untuk meratakan
      </text>
    </g>
  );

  const renderInsertBody = (x: number, pinsDown = 0) => (
    <g>
      <rect x={x} y={108} width={150} height={104} rx={8} fill="url(#craft-plastic)" stroke="#b6cbd5" strokeWidth={1.4} />
      {/* klip */}
      <rect x={x + 40} y={flipped ? 94 : 212} width={70} height={14} rx={4} fill="rgba(186,230,253,0.55)" stroke="#7DD3FC" />
      {/* penjepit jaket */}
      <rect x={x + 22} y={flipped ? 108 : 196} width={18} height={16} fill="rgba(56,189,248,0.5)" />
      {Array.from({ length: 8 }).map((_, i) => (
        <g key={i}>
          <rect x={x + 128} y={124 + i * 10 - 4 + pinsDown} width={14} height={7} rx={1} fill="#F59E0B" stroke="#B45309" strokeWidth={0.5} />
          <text x={x + 158} y={124 + i * 10 + 3} fill="#FDE68A" fontSize={8} fontFamily="monospace">
            {flipped ? 8 - i : i + 1}
          </text>
        </g>
      ))}
    </g>
  );

  const renderInsert = () => (
    <g>
      <rect x={30} y={114} width={INS_JX - 30} height={92} rx={10} fill="url(#craft-jacket)" />
      {slots.map((id, i) =>
        id ? <WireStroke key={id} d={`M${INS_JX} ${124 + i * 10} L${INS_JX + insertLen} ${124 + i * 10}`} id={id} w={8} /> : null
      )}
      <g onPointerDown={startDrag('conn', undefined, connX)} style={{ cursor: 'ew-resize' }}>
        {renderInsertBody(connX)}
        <rect x={connX} y={90} width={180} height={150} fill="transparent" />
      </g>
      <g>
        <text x={40} y={60} fill={fullyInserted ? '#6EE7B7' : '#FDE68A'} fontSize={12} fontWeight={700}>
          {fullyInserted ? '✓ Urat menyentuh kontak logam' : '• Dorong konektor sampai mentok ke urat'}
        </text>
        <text x={40} y={78} fill={jacketGripped ? '#6EE7B7' : '#FCA5A5'} fontSize={12} fontWeight={700}>
          {jacketGripped ? '✓ Jaket masuk ke penjepit konektor' : '• Jaket belum masuk penjepit'}
        </text>
        <text x={420} y={60} fill="#CBD5E1" fontSize={12} fontWeight={700}>
          Sudut pandang: {flipped ? 'klip ke pengamat · slot atas = pin 8' : 'kontak ke pengamat · slot atas = pin 1'}
        </text>
      </g>
      <text x={400} y={300} textAnchor="middle" fill="#E2E8F0" fontSize={12}>
        Tarik konektor transparan ke kiri sampai urat mentok di pin emas. Perhatikan arah klip!
      </text>
    </g>
  );

  const renderCrimp = () => {
    const gy = 300 - squeeze * 150;
    return (
      <g>
        <text x={110} y={65} fill="#CBD5E1" fontSize={11}>TANG RATCHET · DIE 8P · PLUG TERTUTUP (NON PASS-THROUGH)</text>
        {/* rahang tang */}
        <path d="M126 96 H292 L350 137 V207 L292 244 H126 Q110 244 110 228 V112 Q110 96 126 96Z" fill="url(#craft-steel)" stroke="#26323c" strokeWidth={3}/>
        <path d="M124 107 H286 L322 131" fill="none" stroke="#e5ebef" strokeOpacity=".5" strokeWidth={2}/>
        <text x={125} y={232} fill="#26343d" fontSize={9} letterSpacing={1.5}>8P · MODULAR</text>
        {[ [124,112], [124,222], [300,118], [300,219] ].map(([x,y],i)=><g key={i}><circle cx={x} cy={y} r={5} fill="#35434c" stroke="#afbdc6"/><path d={`M${x-2} ${y}h4`} stroke="#141c23"/></g>)}
        <rect x={140} y={126} width={170} height={88} rx={4} fill="#121b23" stroke="#53636d" strokeWidth={3} />
        <rect x={150} y={116 + squeeze * 14} width={150} height={10} rx={2} fill="url(#craft-jacket)" />
        {/* konektor di dalam rahang */}
        <rect x={160} y={140} width={130} height={60} rx={5} fill="rgba(186,230,253,0.35)" stroke="#7DD3FC" />
        {slots.map((id, i) =>
          id ? (
            <g key={id}>
              <line x1={172 + i * 15} y1={200} x2={172 + i * 15} y2={168} stroke={WIRES[id].stripedWith ?? WIRES[id].solid} strokeWidth={6} />
              <rect x={168 + i * 15} y={140 + squeeze * 10} width={8} height={14} fill="#F59E0B" />
            </g>
          ) : null
        )}
        {/* Steel linkage and moulded grips; same interaction coordinates. */}
        <path d="M331 144 L741 84" stroke="#283640" strokeWidth={27} strokeLinecap="round"/>
        <path d="M331 144 L741 84" stroke="url(#craft-steel)" strokeWidth={19} strokeLinecap="round"/>
        <path d="M466 124 L741 84" stroke="url(#craft-grip)" strokeWidth={31} strokeLinecap="round"/>
        <path d="M477 116 L733 79" stroke="#f4a18a" strokeOpacity=".4" strokeWidth={2} strokeLinecap="round"/>
        <path d={`M331 198 L741 ${gy+14}`} stroke="#283640" strokeWidth={27} strokeLinecap="round"/>
        <path d={`M331 198 L741 ${gy+14}`} stroke="url(#craft-steel)" strokeWidth={19} strokeLinecap="round"/>
        <path d={`M466 ${198+(gy-184)*.33} L741 ${gy+14}`} stroke="url(#craft-grip)" strokeWidth={31} strokeLinecap="round"/>
        <path d={`M354 156 Q405 163 369 ${198+(gy-184)*.08}`} fill="none" stroke="#23313a" strokeWidth={5}/>
        <circle cx={335} cy={171} r={17} fill="#344550" stroke="#b4c2ca" strokeWidth={2}/>
        <circle cx={335} cy={171} r={7} fill="#8e9da6"/><path d="M331 171h8" stroke="#344550" strokeWidth={2}/>
        <g onPointerDown={startDrag('handle')} style={{ cursor: crimped ? 'default' : 'ns-resize' }}>
          <circle cx={700} cy={gy + 14} r={42} fill="transparent" />
          <path d={`M672 ${gy+5} l2 16 M683 ${gy+4} l2 16 M694 ${gy+3} l2 16 M705 ${gy+2} l2 16`} stroke="#651d1b" strokeWidth={2} opacity={.5}/>
          <text x={705} y={gy + 43} textAnchor="middle" fill="#FECACA" fontSize={10} fontWeight={800}>
            {crimped ? 'KLIK!' : 'tekan ↑'}
          </text>
        </g>
        <rect x={110} y={262} width={230} height={10} rx={5} fill="#334155" />
        <rect x={110} y={262} width={230 * squeeze} height={10} rx={5} fill={squeeze >= 0.96 ? '#34D399' : '#F59E0B'} />
        <text x={225} y={290} textAnchor="middle" fill="#E2E8F0" fontSize={11}>
          langkah gagang {Math.round(squeeze * 100)}%
        </text>
        <text x={540} y={318} textAnchor="middle" fill="#E2E8F0" fontSize={12}>
          {crimped ? 'Lepas tang lalu lanjut' : 'Tarik gagang bawah ke atas sampai 100% (rapat penuh)'}
        </text>
      </g>
    );
  };

  const renderTest = () => {
    const map = preview?.map ?? [];
    const showRes = result ?? null;
    const remoteLit = (j: number) => {
      const step = testStep - 1;
      return step >= 0 && step < 8 && map[step] === j ? step : -1;
    };
    return (
      <g>
        <text x={400} y={24} textAnchor="middle" fill="#94A3B8" fontSize={10}>Kontinuitas DC · tidak menguji split pair / kategori kabel</text>
        {/* Master */}
        <rect x={50} y={40} width={290} height={190} rx={16} fill="#1F2937" stroke="#4B5563" />
        <text x={70} y={66} fill="#E5E7EB" fontSize={12} fontWeight={800}>
          CONTINUITY TESTER · MASTER
        </text>
        <g
          onPointerDown={(e) => {
            e.stopPropagation();
            runTest();
          }}
          style={{ cursor: 'pointer' }}
        >
          <circle cx={308} cy={64} r={14} fill={testStep >= 0 ? '#16A34A' : '#DC2626'} stroke="#111827" strokeWidth={3} />
          <text x={308} y={68} textAnchor="middle" fill="white" fontSize={9} fontWeight={800}>
            ON
          </text>
        </g>
        {Array.from({ length: 8 }).map((_, i) => (
          <g key={i}>
            <circle cx={80 + i * 30} cy={116} r={9} fill={testStep - 1 === i ? '#22C55E' : '#374151'} stroke="#111827" strokeWidth={2} />
            <text x={80 + i * 30} y={142} textAnchor="middle" fill="#9CA3AF" fontSize={10}>
              {i + 1}
            </text>
          </g>
        ))}
        <rect x={PORT_A.x - 22} y={PORT_A.y - 14} width={44} height={28} rx={3} fill="#030712" stroke="#6B7280" />

        {/* Remote */}
        <rect x={460} y={40} width={290} height={190} rx={16} fill="#1F2937" stroke="#4B5563" />
        <text x={480} y={66} fill="#E5E7EB" fontSize={12} fontWeight={800}>
          REMOTE
        </text>
        {Array.from({ length: 8 }).map((_, j) => {
          const s = remoteLit(j);
          const color = s < 0 ? '#374151' : '#22C55E';
          return (
            <g key={j}>
              <circle cx={490 + j * 30} cy={116} r={9} fill={color} stroke="#111827" strokeWidth={2} />
              <text x={490 + j * 30} y={142} textAnchor="middle" fill="#9CA3AF" fontSize={10}>
                {j + 1}
              </text>
            </g>
          );
        })}
        <rect x={PORT_B.x - 22} y={PORT_B.y - 14} width={44} height={28} rx={3} fill="#030712" stroke="#6B7280" />

        {/* Kabel hasil rakitan + 2 konektor */}
        <path
          d={`M${plugA.x} ${plugA.y + 14} C ${plugA.x} ${plugA.y + 90}, ${plugB.x} ${plugB.y + 90}, ${plugB.x} ${plugB.y + 14}`}
          stroke="#64748B"
          strokeWidth={9}
          fill="none"
        />
        {[
          { p: plugA, k: 'plugA', label: 'U1' },
          { p: plugB, k: 'plugB', label: 'U2' },
        ].map(({ p, k, label }) => (
          <g key={k} onPointerDown={startDrag(k)} style={{ cursor: 'grab' }}>
            <rect x={p.x - 26} y={p.y - 20} width={52} height={44} fill="transparent" />
            <rect x={p.x - 18} y={p.y - 12} width={36} height={26} rx={4} fill="rgba(186,230,253,0.6)" stroke="#7DD3FC" />
            {Array.from({ length: 8 }).map((_, i) => (
              <rect key={i} x={p.x - 15 + i * 4} y={p.y - 12} width={2.5} height={6} fill="#F59E0B" />
            ))}
            <text x={p.x} y={p.y + 8} textAnchor="middle" fontSize={9} fontWeight={800} fill="#0F172A">
              {label}
            </text>
          </g>
        ))}

        {!inventory.hasLanTester && (
          <g>
            <rect x={160} y={110} width={480} height={60} rx={12} fill="rgba(15,23,42,0.9)" />
            <text x={400} y={136} textAnchor="middle" fill="#FCA5A5" fontSize={13} fontWeight={800}>
              Kamu tidak punya LAN Tester
            </text>
            <text x={400} y={156} textAnchor="middle" fill="#E2E8F0" fontSize={11}>
              Kerusakan baru ketahuan saat kabel dipasang di lokasi klien.
            </text>
          </g>
        )}

        <text x={400} y={262} textAnchor="middle" fill="#E2E8F0" fontSize={12}>
          {showRes
            ? showRes.testerOk
              ? 'WIRE MAP TERCATAT'
              : 'WIRE MAP TERCATAT'
            : pluggedA && pluggedB
            ? 'Tekan tombol ON di Master'
            : 'Tarik konektor U1 ke port Master dan U2 ke port Remote'}
        </text>
      </g>
    );
  };

  /* ─────────────────────────── PANEL SAMPING ─────────────────────────── */

  const stepIndex = STEPS.findIndex((s) => s.id === phase);
  const target = targetFor(end);

  const instructions: Record<Phase, string> = {
    plan: 'Pilih jenis kabel yang mau dibuat. Ini hanya rencana — jenis aslinya ditentukan oleh susunan warnamu di kedua ujung.',
    cut: 'Tarik gunting di sepanjang meteran ke panjang yang kamu butuhkan (hasil ukur + ±1 m toleransi). Ketuk gunting untuk memotong. Potongan tidak bisa dikembalikan!',
    strip: 'Kupas jaket abu-abu sekitar 2,5–3,5 cm. Geser stripper ke titik kupas, lalu tarik potongan jaket ke kanan sampai lepas.',
    untwist: 'Di dalam ada 4 pasang urat yang terpilin. Gosok bolak-balik tiap pasangan sampai lurus dan terpisah.',
    arrange: 'Susun 8 urat sejajar di penjepit jari sesuai standar. Slot paling atas = pin 1 pada orientasi kontak yang ditampilkan. Tester LED hanya menunjukkan kontinuitas.',
    trim: 'Ratakan ujung urat dengan gunting di 1,1–1,5 cm dari jaket. Kependekan = tidak sampai pin, kepanjangan = jaket tidak terjepit.',
    insert: 'Masukkan urat ke konektor RJ45 transparan sampai mentok ke pin emas. Acuan pin: kontak menghadap pengamat, ujung plug menjauh, kabel menuju pengamat → pin 1 di kiri. Ilustrasi susunan diputar 90° sehingga pin 1 berada di atas. Membalik plug mengubah pemetaan posisi, bukan otomatis salah.',
    crimp: 'Tekan gagang tang crimping sampai rapat 100%. Kontak logam akan turun menembus isolasi dan menjepit urat. Menghabiskan 1 RJ45.',
    test: 'Colokkan kedua ujung ke LAN tester lalu nyalakan. Baca urutan Master dan Remote. Tester kontinuitas LED tidak mengukur bandwidth, crosstalk, atau mendeteksi split pair.',
    done: '',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-2 backdrop-blur-sm sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cable-workbench-title"
        className="relative flex h-[calc(100dvh-1rem)] max-h-[820px] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-stone-200 bg-[#FBF7EF] shadow-2xl sm:h-[calc(100dvh-2rem)]"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-stone-200 bg-[#F4EDE1] px-3 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0F766E] text-white">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h2 id="cable-workbench-title" className="font-serif text-base font-bold leading-tight text-stone-800 sm:text-lg">
                {context === 'field' ? 'Rakit Kabel di Lokasi' : 'Meja Crimping'} — Kerja Tangan Langsung
              </h2>
              <p className="text-[11px] text-stone-500">Semua langkah dilakukan dengan menarik / menekan alat di meja kerja</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-xl border border-stone-300 bg-white px-3 py-1.5 font-mono text-[11px] text-stone-700 sm:flex">
              <Backpack className="h-3.5 w-3.5 text-[#B45309]" />
              UTP {inventory.utpRollMeters}m · RJ45 {inventory.rj45Connectors}
            </div>
            <button onClick={requestClose} aria-label="Tutup meja crimping" className="rounded-xl p-2 text-stone-400 hover:bg-stone-200 hover:text-stone-700">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Konfirmasi di atas area kerja agar ukuran dan posisi meja tetap. */}
        {confirmExit && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-stone-900/40 p-4">
            <div role="alertdialog" aria-modal="true" aria-labelledby="save-piece-title" className="w-full max-w-md rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs shadow-xl">
              <p id="save-piece-title" className="font-semibold leading-relaxed text-amber-900">
                Potongan {cutLen} m belum selesai. Kabel akan disimpan di tas dan bisa dilanjutkan kapan saja.
              </p>
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <button
                  onClick={() => setConfirmExit(false)}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2 font-semibold text-stone-700 hover:bg-stone-100"
                >
                  Lanjut merakit
                </button>
                <button
                  onClick={() => {
                    setConfirmExit(false);
                    onClose();
                  }}
                  className="rounded-lg bg-[#B45309] px-3 py-2 font-bold text-white hover:bg-[#92400E]"
                >
                  Simpan ke tas & tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stepper */}
        <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-stone-200 bg-white px-4 py-2">
          {STEPS.map((s, i) => {
            const done = phase === 'done' || i < stepIndex;
            const active = s.id === phase;
            return (
              <div key={s.id} className="flex shrink-0 items-center gap-1">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full font-mono text-[9px] font-bold ${
                    done ? 'bg-emerald-500 text-white' : active ? 'bg-[#0F766E] text-white' : 'bg-stone-200 text-stone-500'
                  }`}
                >
                  {done ? '✓' : i + 1}
                </span>
                <span className={`text-[10px] font-semibold ${active ? 'text-[#0F766E]' : 'text-stone-400'}`}>{s.label}</span>
                {i < STEPS.length - 1 && <span className="mx-1 h-px w-3 bg-stone-300" />}
              </div>
            );
          })}
        </div>

        <div
          ref={workAreaRef}
          className="grid min-h-0 flex-1 content-start gap-4 overflow-x-hidden overflow-y-scroll p-3 [scrollbar-gutter:stable] sm:p-4 lg:grid-cols-[minmax(0,1fr)_280px]"
        >
          {/* ── Area kerja ── */}
          <div className="min-w-0 space-y-3">
            {phase === 'plan' ? (
              <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
                {/* Potongan kabel setengah jadi yang tersimpan di tas */}
                {inventory.unfinishedCables.length > 0 && (
                  <div className="space-y-2 rounded-2xl border border-amber-300 bg-amber-50 p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wide text-amber-900">
                        Potongan Kabel di Tas ({inventory.unfinishedCables.length})
                      </span>
                      <span className="text-[10px] text-amber-700">Lanjutkan tanpa memotong roll baru</span>
                    </div>
                    <div className="space-y-1.5">
                      {inventory.unfinishedCables.map((piece, idx) => {
                        const endsDone = (piece.end1 ? 1 : 0) + (piece.end2 ? 1 : 0);
                        return (
                          <div
                            key={piece.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs"
                          >
                            <div>
                              <span className="font-bold text-stone-800">
                                Potongan #{idx + 1} · {piece.lengthMeters} m
                              </span>
                              <span className="ml-2 font-mono text-[10px] text-stone-500">
                                ({piece.plan === 'straight' ? 'Straight' : 'Crossover'} · {endsDone}/2 ujung ter-crimp)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => resumePiece(piece)}
                              className="rounded-lg bg-[#B45309] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#92400E]"
                            >
                              Lanjutkan merakit →
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  {(['straight', 'crossover'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setPlan(t)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        plan === t ? 'border-[#0F766E] bg-teal-50 ring-2 ring-teal-600/20' : 'border-stone-300 bg-white hover:border-stone-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-800">{t === 'straight' ? 'Straight-Through' : 'Crossover'}</span>
                        {plan === t && <CheckCircle2 className="h-5 w-5 text-[#0F766E]" />}
                      </div>
                      <p className="mt-1 text-xs text-stone-600">
                        {t === 'straight'
                          ? 'A–A atau B–B. Pemetaan pin lurus.'
                          : 'A–B. Crossover dua pasang; kebutuhan bergantung port dan Auto-MDI-X.'}
                      </p>
                      <div className="mt-2 flex gap-1">
                        {(t === 'straight' ? T568B : T568A).map((w) => (
                          <Swatch key={w} id={w} />
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-[11px] leading-relaxed text-stone-600">
                  <strong>Alur kerja:</strong> gunting kabel dari roll sesuai meteran → untuk tiap ujung: kupas jaket, urai
                  pilinan, susun 8 warna, ratakan, masukkan ke konektor, crimp → uji dengan LAN tester.
                  {measuredMax !== null && (
                    <span className="mt-1 block font-semibold text-teal-800">
                      Hasil ukur terakhir: {measuredMax.toFixed(1)} m → potong sekitar {Math.ceil(measuredMax + 1)} m.
                    </span>
                  )}
                </div>
                <button
                  onClick={startJob}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F766E] py-3 text-sm font-bold text-white hover:bg-[#115E59]"
                >
                  Mulai: Tarik Kabel dari Roll <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : phase === 'done' ? (
              <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-6 text-center">
                <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
                <h3 className="font-serif text-2xl font-bold text-stone-800">
                  Kabel {result?.kind === 'crossover' ? 'Crossover' : 'Straight'} {cutLen} m masuk tas
                </h3>
                <p className="text-sm text-stone-600">
                  {savedTested ? 'Wire map sudah diuji. Performa kabel belum diukur.' : 'Kabel disimpan tanpa pengujian kontinuitas.'}
                </p>
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => {
                      setPhase('plan');
                      setMsg(null);
                    }}
                    className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-bold text-stone-700 hover:bg-stone-50"
                  >
                    Buat kabel lagi
                  </button>
                  <button onClick={onClose} className="rounded-xl bg-[#0F766E] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#115E59]">
                    Selesai
                  </button>
                </div>
              </div>
            ) : (
              <div className="min-w-0 overflow-hidden rounded-2xl border-4 border-[#5C3A1E] shadow-inner">
                <svg
                  data-testid="craft-canvas" data-phase={phase} data-end={end}
                  ref={svgRef}
                  viewBox="0 0 800 340"
                  className="block aspect-[40/17] w-full select-none"
                  style={{ touchAction: 'none' }}
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                  onPointerCancel={() => {
                    dragRef.current = null;
                    setDragTip(null);
                    setSqueeze(0);
                    if (!stripped) setJacketOff(0);
                  }}
                >
                  {Mat}
                  {phase === 'cut' && renderCut()}
                  {phase === 'strip' && renderStrip()}
                  {phase === 'untwist' && renderUntwist()}
                  {phase === 'arrange' && renderArrange()}
                  {phase === 'trim' && renderTrim()}
                  {phase === 'insert' && renderInsert()}
                  {phase === 'crimp' && renderCrimp()}
                  {phase === 'test' && renderTest()}
                </svg>
              </div>
            )}

            {msg && (
              <div
                className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${
                  msg.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700'
                }`}
              >
                {msg.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                {msg.text}
              </div>
            )}

            {/* Tombol aksi per tahap */}
            {phase === 'arrange' && (
              <div className="flex flex-wrap justify-between gap-2">
                <button
                  onClick={() => setSlots(Array(8).fill(null))}
                  className="flex items-center gap-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-600"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Lepas semua dari penjepit
                </button>
                <button onClick={goTrim} className="rounded-xl bg-[#0F766E] px-4 py-2 text-xs font-bold text-white hover:bg-[#115E59]">
                  Susunan siap → Ratakan ujung
                </button>
              </div>
            )}
            {phase === 'insert' && (
              <div className="flex flex-wrap justify-between gap-2">
                <button
                  onClick={() => {
                    sound.playClick();
                    setFlipped((f) => !f);
                  }}
                  className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700"
                >
                  ↻ Balik arah konektor (klip {flipped ? 'atas' : 'bawah'})
                </button>
                <button
                  disabled={!fullyInserted}
                  onClick={() => {
                    if (!jacketGripped) {
                      sound.playError();
                      say(false, 'Jaket belum masuk ke penjepit konektor — urat kepanjangan. Kabel akan mudah tercabut. Kembali ratakan lebih pendek.');
                      setPhase('trim');
                      setTrimX(TRIM_JX + insertLen - 14);
                      return;
                    }
                    setMsg(null);
                    setPhase('crimp');
                  }}
                  className="rounded-xl bg-[#0F766E] px-4 py-2 text-xs font-bold text-white hover:bg-[#115E59] disabled:opacity-40"
                >
                  Masukkan ke tang crimping →
                </button>
              </div>
            )}
            {phase === 'crimp' && crimped && (
              <div className="flex justify-end">
                <button onClick={finishEnd} className="rounded-xl bg-[#0F766E] px-4 py-2 text-xs font-bold text-white hover:bg-[#115E59]">
                  {ends[end === 1 ? 2 : 1] ? 'Lanjut uji LAN tester →' : `Ujung ${end} beres → kerjakan ujung ${end === 1 ? 2 : 1}`}
                </button>
              </div>
            )}
            {phase === 'test' && (
              <div className="space-y-2">
                {result && (
                  <div
                    className={`rounded-xl border p-3 text-xs leading-relaxed ${
                      result.testerOk ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700'
                    }`}
                  >
                    {result.text}
                  </div>
                )}
                <div className="flex flex-wrap justify-end gap-2">
                  {inventory.hasLanTester && <button disabled={!pluggedA || !pluggedB || (testStep >= 0 && testStep < 8)} onClick={runTest} className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 disabled:opacity-40">{testStep >= 0 && testStep < 8 ? 'Menguji…' : result ? 'Uji ulang' : 'Nyalakan tester'}</button>}
                  {!inventory.hasLanTester && (
                    <button onClick={() => finalize(false)} className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white">
                      Simpan tanpa diuji (berisiko)
                    </button>
                  )}
                  {result && result.testerOk && (
                    <button onClick={() => finalize(true)} className="rounded-xl bg-[#0F766E] px-4 py-2 text-xs font-bold text-white">
                      Simpan kabel ke tas ✓
                    </button>
                  )}
                  {result && !result.testerOk && (
                    <>
                      <button
                        disabled={inventory.rj45Connectors < 1}
                        onClick={() => redoEnd(1)}
                        className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 disabled:opacity-40"
                      >
                        ✂ Potong & ulang ujung 1
                      </button>
                      <button
                        disabled={inventory.rj45Connectors < 1}
                        onClick={() => redoEnd(2)}
                        className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 disabled:opacity-40"
                      >
                        ✂ Potong & ulang ujung 2
                      </button>
                      <button onClick={() => finalize(true)} className="rounded-xl bg-stone-600 px-3 py-2 text-xs font-bold text-white">
                        Simpan hasil rakitan
                      </button>
                    </>
                  )}
                </div>
                {result && !result.testerOk && inventory.rj45Connectors < 1 && (
                  <p className="text-right text-[11px] text-rose-600">RJ45 habis — beli di HP → tab Toko untuk mengulang ujung.</p>
                )}
              </div>
            )}
          </div>

          {/* ── Panel samping ── */}
          <aside className="min-w-0 space-y-3">
            <details className="rounded-2xl border border-stone-200 bg-white p-3 text-xs text-stone-600">
              <summary className="cursor-pointer font-semibold text-stone-700">Kenali alat & bahan</summary>
              <dl className="mt-3 space-y-3 leading-relaxed">
                {[
                  ['Kabel UTP', 'Empat pasangan konduktor terpilin di dalam satu jaket. Isolasi tiap konduktor tetap utuh saat diterminasi.'],
                  ['Pemotong kabel', 'Memotong kabel atau meratakan ujung konduktor. Potongan yang terbuang tidak dapat disambung kembali menjadi kabel utuh.'],
                  ['Stripper', 'Mengupas jaket luar, bukan menguliti isolasi delapan konduktor.'],
                  ['Plug 8P8C / RJ45', 'Konektor tertutup pada lab ini memiliki delapan kontak dan penahan jaket. Konektor yang sudah di-crimp diganti ketika terminasi diulang.'],
                  ['Tang crimping', 'Die 8P menekan kontak konektor dan penahan jaket. Tang dan konektor harus kompatibel.'],
                  ['Tester Master + Remote', 'Menunjukkan kontinuitas dan pemetaan pin. Tidak mengukur kecepatan jaringan atau menjamin kualitas transmisi.'],
                ].map(([name, detail]) => <div key={name}><dt className="font-semibold text-stone-800">{name}</dt><dd>{detail}</dd></div>)}
              </dl>
            </details>
            {phase !== 'done' && showGuide && (
              <div className="rounded-2xl border border-stone-200 bg-white p-3">
                <div className="mb-1 text-[11px] font-extrabold uppercase tracking-wide text-[#0F766E]">
                  {STEPS[stepIndex]?.label ?? ''}
                </div>
                <p className="text-[12px] leading-relaxed text-stone-600">{instructions[phase]}</p>
              </div>
            )}

            <button onClick={() => setShowGuide(v => !v)} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs text-stone-600">{showGuide ? 'Tutup referensi alat' : 'Buka referensi alat'}</button>
            {(phase === 'arrange' || phase === 'trim' || phase === 'insert') && (
              <div className="rounded-2xl border border-stone-200 bg-white p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-stone-700">
                    Panduan ujung {end}: {end === 1 && plan === 'crossover' ? 'T568A' : 'T568B'}
                  </span>
                  <button onClick={() => setShowGuide((v) => !v)} className="rounded-md p-1 text-stone-500 hover:bg-stone-100">
                    {showGuide ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {showGuide ? (
                  <div className="space-y-1">
                    {target.map((id, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg bg-stone-50 px-2 py-1">
                        <span className="w-8 font-mono text-[10px] text-stone-500">pin {i + 1}</span>
                        <Swatch id={id} />
                        <span className="text-[11px] text-stone-700">{WIRES[id].name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-stone-400">Panduan disembunyikan — tantang dirimu menghafal urutan warna.</p>
                )}
              </div>
            )}

            <div className="rounded-2xl border border-stone-200 bg-white p-3 text-[11px] text-stone-600">
              <div className="mb-1 flex items-center gap-1.5 font-bold text-stone-700">
                <Backpack className="h-3.5 w-3.5 text-[#B45309]" /> Tas
              </div>
              <div className="grid grid-cols-2 gap-1 font-mono">
                <span>{inventory.hasCrimper ? '✓' : '✗'} Crimper</span>
                <span>{inventory.hasLanTester ? '✓' : '✗'} LAN tester</span>
                <span>UTP {inventory.utpRollMeters}m</span>
                <span>RJ45 {inventory.rj45Connectors}</span>
              </div>
              {cutLen > 0 && phase !== 'plan' && (
                <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-teal-50 px-2 py-1 font-semibold text-teal-800">
                  <Cable className="h-3.5 w-3.5" /> Sedang dirakit: {cutLen} m
                </div>
              )}
              {measuredMax !== null && (
                <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1 text-amber-800">
                  <Ruler className="h-3.5 w-3.5" /> Hasil ukur: {measuredMax.toFixed(1)} m
                </div>
              )}
              {(ends[1] || ends[2]) && (
                <div className="mt-2 space-y-0.5 text-[10px] text-stone-500">
                  {([1, 2] as const).map((k) =>
                    ends[k] ? (
                      <div key={k} className="flex items-center gap-1">
                        <span className="w-12">Ujung {k} ✓</span>
                        {ends[k]!.order.map((id, i) => (
                          <Swatch key={i} id={id} />
                        ))}
                      </div>
                    ) : null
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
