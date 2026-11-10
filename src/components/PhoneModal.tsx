import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Search,
  Send,
  BatteryFull,
  Briefcase,
  Cable,
  CheckCheck,
  CheckCircle2,
  CircleDollarSign,
  MapPin,
  MessageCircle,
  MessageSquare,
  Minus,
  Phone,
  PhoneIncoming,
  Plus,
  Ruler,
  ShoppingBag,
  Signal,
  Star,
  Store,
  Terminal,
  Users,
  Wifi,
  Wrench,
  X,
} from 'lucide-react';
import {
  LocationId,
  MissionStep,
  ShopItem,
  TechnicianInventory,
} from '../game/types';
import { sound } from '../game/sound';

type TabId = 'job' | 'chat' | 'toko' | 'riwayat';

export interface ChatMessage {
  id: string;
  from: 'client' | 'me';
  text: string;
  time: string;
  /** Diisi kalau pesan ini berasal dari template — dipakai agar template tidak muncul lagi */
  templateId?: string;
}

/** State chat HP disimpan di App supaya tidak reset waktu HP ditutup */
export interface PhoneChatState {
  threads: Record<string, ChatMessage[]>;
  read: string[];
}

interface ChatTemplate {
  id: string;
  label: string;
  answer: string;
}

// Template per job: tiap pilihan punya jawaban sendiri. Klien awam hanya cerita gejala.
const CLIENT_TEMPLATES: Record<number, ChatTemplate[]> = {
  1: [
    {
      id: 'm1-kapan',
      label: 'Sejak kapan laptopnya bermasalah?',
      answer: 'Dari tadi pagi Mas. Habis sarapan saya nyalain laptop, udah nggak bisa internetan.',
    },
    {
      id: 'm1-lain',
      label: 'Perangkat lain di rumah normal?',
      answer: 'TV sama HP anak saya lancar Mas, cuma laptop di meja belajar ini yang bermasalah.',
    },
    {
      id: 'm1-jarak',
      label: 'Jarak laptop ke router kira-kira berapa?',
      answer:
        'Waduh, saya nggak pernah ngukur Mas. Pokoknya dari meja belajar sampai kotak Wi-Fi di pojok dapur. Bawa meteran aja ya biar pas.',
    },
  ],
  2: [
    {
      id: 'm2-tampil',
      label: 'Tampilan di browser seperti apa?',
      answer: 'Ada gambar bola dunia sama tulisan "No Internet" Mas. Muter-muter terus.',
    },
    {
      id: 'm2-ubah',
      label: 'Ada yang pernah ubah pengaturan laptop?',
      answer: 'Keponakan saya katanya pernah utak-atik biar ngebut. Saya sendiri nggak ngerti angka-angkanya.',
    },
  ],
  3: [
    {
      id: 'm3-apa',
      label: 'Yang nggak bisa dibuka apa saja?',
      answer: 'Yang saya coba baru folder laporan di server pusat, Mas, dan itu gagal terus. Website belum saya cek hari ini. Boleh sekalian dicoba?',
    },
    {
      id: 'm3-ubah',
      label: 'Ada perubahan di gedung belakangan ini?',
      answer: 'Katanya habis ada perapihan kabel di ruang server yang pakai dinding kaca itu.',
    },
  ],
  4: [
    {
      id: 'm4-kenapa',
      label: 'Kenapa jalurnya harus dipisah?',
      answer: 'Biar data gaji Finance nggak tercampur sama trafik Marketing, Mas. Manajer yang minta.',
    },
    {
      id: 'm4-port',
      label: 'Meja Finance & Marketing dicolok di mana?',
      answer: 'Meja Finance di port paling awal, Marketing di sebelahnya Mas. Coba cek langsung di switch.',
    },
  ],
  5: [
    {
      id: 'm5-kapan',
      label: 'Sejak kapan akses Wi-Fi tamu bermasalah?',
      answer: 'Sejak kemarin sore Mas, pas habis tukang harian narik kabel baru ke alat Wi-Fi-nya.',
    },
    {
      id: 'm5-jarak',
      label: 'Jarak ruang server ke lounge berapa?',
      answer: 'Lumayan jauh Mas, lewat lorong dulu. Angkanya saya nggak tau, tolong diukur sendiri ya.',
    },
  ],
};

interface Contact {
  id: string;
  name: string;
  role: string;
  accent: string;
  missionIndex: number | null;
  seed: ChatMessage[];
}

interface PhoneModalProps {
  missions: MissionStep[];
  currentMissionIndex: number;
  jobAccepted: boolean;
  currentLocation: LocationId;
  playerName: string;
  completedCount: number;
  rating: number | null;
  earnings: number;
  chat: PhoneChatState;
  onChatChange: (updater: (prev: PhoneChatState) => PhoneChatState) => void;
  shopItems: ShopItem[];
  inventory: TechnicianInventory;
  balance: number;
  initialTab?: TabId;
  onTabChange?: (tab: TabId) => void;
  onBuy: (item: ShopItem, qty: number) => void;
  onAcceptJob: () => void;
  onTalkToClient: () => void;
  onTravel: (location: LocationId) => void;
  onClose: () => void;
}

const locationNames: Record<LocationId, string> = {
  base: 'Kantor NetQuest',
  house: 'Rumah Ibu Ratna',
  office: 'PT Nusantara Tech',
};

const money = (v: number) => 'Rp ' + v.toLocaleString('id-ID', { maximumFractionDigits: 0 });

const clockNow = () =>
  new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

const SHOP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  crimper: Wrench,
  tester: Cable,
  tape: Ruler,
  console: Terminal,
  utp5: Cable,
  rj45x10: Cable,
};

const OWNED_KEY: Record<string, keyof TechnicianInventory | undefined> = {
  crimper: 'hasCrimper',
  tester: 'hasLanTester',
  tape: 'hasMeasuringTape',
  console: 'hasConsoleCable',
};

export const PhoneModal: React.FC<PhoneModalProps> = ({
  missions,
  currentMissionIndex,
  jobAccepted,
  currentLocation,
  playerName,
  completedCount,
  rating,
  earnings,
  chat,
  onChatChange,
  shopItems,
  inventory,
  balance,
  initialTab = 'job',
  onTabChange,
  onBuy,
  onAcceptJob,
  onTalkToClient,
  onTravel,
  onClose: finishClose,
}) => {
  const [ringing, setRinging] = useState(false);
  const swipeStart = useRef<{id:number; y:number} | null>(null);
  const [swipeDistance, setSwipeDistance] = useState(0);
  const showIncomingCall = () => { goTab('chat'); setRinging(true); setSwipeDistance(0); };
  const answerCall = () => { swipeStart.current = null; setSwipeDistance(0); setRinging(false); setCallLine(0); };
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [closing, setClosing] = useState(false);
  const [callLine, setCallLine] = useState<number | null>(null);
  const onClose = () => setClosing(true);
  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(finishClose, 180);
    return () => window.clearTimeout(timer);
  }, [closing, finishClose]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key.toLowerCase() === 'q') {
        e.stopImmediatePropagation(); e.preventDefault(); setClosing(true);
      }
    };
    window.addEventListener('keydown', escape, true);
    return () => window.removeEventListener('keydown', escape, true);
  }, []);
  const [chatSearch, setChatSearch] = useState('');
  const [showReplies, setShowReplies] = useState(false);
  const [homeScreen, setHomeScreen] = useState(true);
  const [tab, setTabState] = useState<TabId>(initialTab);
  const setTab = (next: TabId) => {
    setTabState(next);
    onTabChange?.(next);
  };
  const [openContact, setOpenContact] = useState<string | null>(null);
  const [typingFor, setTypingFor] = useState<string | null>(null);
  const [clock, setClock] = useState(clockNow);
  const [shopQty, setShopQty] = useState<Record<string, number>>({ utp5: 2, rj45x10: 1 });
  const [shopFlash, setShopFlash] = useState<string | null>(null);
  const threads = chat.threads;
  const readContacts = chat.read;
  const threadScrollRef = useRef<HTMLDivElement | null>(null);

  const currentMission = missions[currentMissionIndex];
  const finished = currentMissionIndex >= missions.length;
  const firstName = playerName.split(' ')[0] || 'Teknisi';
  const onSite = Boolean(currentMission && currentLocation === currentMission.location);

  useEffect(() => {
    const t = window.setInterval(() => setClock(clockNow()), 20000);
    return () => window.clearInterval(t);
  }, []);

  // ── Kontak dibangun dari progres nyata (bukan data palsu) ──
  const contacts: Contact[] = useMemo(() => {
    const list: Contact[] = [
      {
        id: 'nadia',
        name: 'Nadia',
        role: 'Koordinator NetQuest',
        accent: 'bg-[#B45309]',
        missionIndex: null,
        seed: [
          {
            id: 'n1',
            from: 'client',
            text: `Halo ${firstName}! Selamat gabung jadi teknisi freelance NetQuest.`,
            time: '08:02',
          },
          {
            id: 'n2',
            from: 'client',
            text: 'Ingat: alat & kabel disiapkan dulu ya. Di tempat klien nggak ada crimper.',
            time: '08:03',
          },
        ],
      },
    ];

    const seen = new Set<string>();
    missions.forEach((m, idx) => {
      if (idx > currentMissionIndex) return;
      const key = m.requesterNpcId;
      if (seen.has(key)) return;
      seen.add(key);
      const isRatna = key === 'npc-ratna';
      const name = isRatna
        ? 'Bu Ratna'
        : key === 'npc-dimas'
        ? 'Mas Dimas'
        : key === 'npc-kevin'
        ? 'Mas Kevin'
        : 'Pak Budi';
      const done = idx < currentMissionIndex;
      list.push({
        id: key,
        name,
        role: m.locationLabel.split('·')[0].trim(),
        accent: isRatna ? 'bg-rose-700' : 'bg-[#0F766E]',
        missionIndex: idx,
        seed: [
          {
            id: `${key}-a`,
            from: 'client',
            text: m.briefing[0] || m.shortTask,
            time: '09:1' + (idx % 9),
          },
          ...(m.briefing[1]
            ? [
                {
                  id: `${key}-b`,
                  from: 'client' as const,
                  text: m.briefing[1],
                  time: '09:1' + (idx % 9),
                },
              ]
            : []),
          ...(done
            ? [
                {
                  id: `${key}-done`,
                  from: 'client' as const,
                  text: `Sudah beres ya Mas, terima kasih banyak! Fee ${m.fee} sudah saya transfer.`,
                  time: '10:2' + (idx % 9),
                },
              ]
            : []),
        ],
      });
    });
    return list;
  }, [missions, currentMissionIndex, firstName]);

  const messagesFor = (c: Contact) => [...c.seed, ...(threads[c.id] || [])];

  const unreadCount = (c: Contact) => {
    if (readContacts.includes(c.id)) return 0;
    if (c.id === 'nadia') return currentMissionIndex === 0 && !jobAccepted ? 1 : 0;
    return c.missionIndex === currentMissionIndex && !jobAccepted ? 1 : 0;
  };

  const totalUnread = contacts.reduce((n, c) => n + unreadCount(c), 0);

  // Scroll hanya di dalam layar HP (tidak menggeser halaman di belakangnya)
  useEffect(() => {
    const el = threadScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [threads, openContact, tab]);

  const pushMessage = (contactId: string, msg: ChatMessage) => {
    onChatChange((prev) => ({
      ...prev,
      threads: { ...prev.threads, [contactId]: [...(prev.threads[contactId] || []), msg] },
    }));
  };

  // Template yang sudah pernah ditekan (dibaca dari riwayat chat) → tidak muncul lagi
  const usedTemplateIds = (contactId: string) =>
    new Set(
      (threads[contactId] || []).map((m) => m.templateId).filter((id): id is string => Boolean(id))
    );

  // Template yang tersedia untuk kontak ini, sesuai kondisi game saat ini
  const getTemplates = (c: Contact): ChatTemplate[] => {
    const list: ChatTemplate[] = [];

    if (c.id === 'nadia') {
      list.push(
        {
          id: 'nadia-job',
          label: 'Ada job baru?',
          answer: finished
            ? 'Semua job minggu ini sudah kelar. Istirahat dulu, nanti aku kabari kalau ada orderan lagi.'
            : 'Ada! Buka tab Job di HP, kliennya sudah menunggu.',
        },
        {
          id: 'nadia-alat',
          label: 'Alat apa saja yang wajib dibawa?',
          answer:
            'Itu bagian kerjaanmu, hehe. Baca keluhan kliennya baik-baik, lalu tentukan sendiri. Yang jelas di tempat klien nggak ada toolkit.',
        },
        {
          id: 'nadia-kabel',
          label: 'Ada referensi kalau aku lupa sesuatu?',
          answer: 'Ada rak buku jaringan di kantor. Selain itu, nggak ada contekan ya.',
        },
        {
          id: 'nadia-siap',
          label: 'Siap, saya cek Tas Alat dulu',
          answer: 'Mantap! Semangat ya, hati-hati di jalan.',
        }
      );
      return list.filter((t) => !usedTemplateIds(c.id).has(t.id));
    }

    // Klien: pertanyaan khusus untuk job yang sedang aktif
    if (c.missionIndex !== null && !finished) {
      const activeMission = missions[currentMissionIndex];
      if (activeMission && activeMission.requesterNpcId === c.id) {
        list.push(...(CLIENT_TEMPLATES[activeMission.id] || []));
        if (onSite) {
          list.push({
            id: `onsite-${activeMission.id}`,
            label: 'Saya sudah di lokasi, langsung saya cek',
            answer: 'Silakan Mas, saya tunggu di sini.',
          });
        } else {
          list.push({
            id: `otw-${activeMission.id}`,
            label: 'Saya segera berangkat ke sana',
            answer: 'Siap Mas, ditunggu kedatangannya ya. Terima kasih!',
          });
        }
      }
    }
    return list.filter((t) => !usedTemplateIds(c.id).has(t.id));
  };

  const pressTemplate = (c: Contact, t: ChatTemplate) => {
    if (typingFor) return; // tunggu balasan sebelumnya
    sound.playClick();
    // Pesan kita langsung masuk → templatenya otomatis hilang (ditandai templateId)
    pushMessage(c.id, {
      id: `me-${t.id}`,
      from: 'me',
      text: t.label,
      time: clockNow(),
      templateId: t.id,
    });
    setTypingFor(c.id);
    window.setTimeout(() => {
      sound.playTerminalBeep();
      pushMessage(c.id, {
        id: `cl-${t.id}`,
        from: 'client',
        text: t.answer,
        time: clockNow(),
      });
      setTypingFor(null);
    }, 700);
  };

  const openThread = (c: Contact) => {
    sound.playClick();
    setOpenContact(c.id);
    onChatChange((prev) =>
      prev.read.includes(c.id) ? prev : { ...prev, read: [...prev.read, c.id] }
    );
  };

  const goTab = (next: TabId) => {
    setHomeScreen(false);
    sound.playClick();
    setOpenContact(null);
    setTab(next);
  };

  const activeContact = contacts.find((c) => c.id === openContact) || null;

  // ── Toko Online ──
  const changeShopQty = (id: string, delta: number) => {
    sound.playClick();
    setShopQty((prev) => ({ ...prev, [id]: Math.max(1, Math.min(10, (prev[id] || 1) + delta)) }));
  };

  const buyShopItem = (item: ShopItem) => {
    const q = item.kind === 'material' ? shopQty[item.id] || 1 : 1;
    const total = item.price * q;
    if (total > balance) {
      sound.playError();
      setShopFlash(`Saldo tidak cukup untuk ${item.name} (${money(total)}).`);
      return;
    }
    sound.playPingSuccess();
    onBuy(item, q);
    setShopFlash(`Berhasil beli ${item.name}${item.kind === 'material' ? ` ×${q}` : ''} — ${money(total)}. Masuk tas.`);
  };

  const appName = tab === 'toko' ? 'Lupabapak' : tab === 'chat' ? 'Supdawg' : 'NetQuest';
  const returnHome = () => { sound.playClick(); setHomeScreen(true); setOpenContact(null); };
  const homeApps = [
    { tab: 'job' as TabId, name: 'NetQuest', icon: Briefcase, theme: 'quest', subtitle: 'Pekerjaan teknisi' },
    { tab: 'toko' as TabId, name: 'Lupabapak', icon: ShoppingBag, theme: 'shop', subtitle: 'Alat & bahan' },
    { tab: 'chat' as TabId, name: 'Supdawg', icon: MessageCircle, theme: 'chat', subtitle: 'Pesan klien' },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-end bg-stone-950/15 p-6">
      <div role="dialog" aria-modal="true" aria-label="Ponsel teknisi" className={`nq-phone nq-handset nq-phone-right ${closing ? "is-closing" : ""} relative max-w-[calc(100vw-2rem)] ${homeScreen ? "is-home" : `app-${tab}`}`}>
        <button
          onClick={onClose}
          aria-label="Tutup HP"
          className="absolute -right-2 -top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white text-stone-500 shadow-lg transition hover:bg-stone-100 hover:text-stone-800"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Phone body — ukuran TETAP, tidak berubah antar tab */}
        <div className="nq-phone-body flex h-[740px] max-h-[86vh] flex-col overflow-hidden rounded-[2.2rem] border-[7px] border-stone-800 bg-[#F7F2E8] shadow-2xl">
          {/* Status bar */}
          <div className="nq-phone-status flex shrink-0 items-center justify-between bg-[#0F766E] px-4 pb-1 pt-2 text-[10px] font-semibold text-teal-50">
            <span className="font-mono">{clock}</span>
            <div className="nq-camera h-4 w-20 rounded-b-xl bg-stone-900" />
            <div className="flex items-center gap-1">
              <Signal className="h-3 w-3" />
              <Wifi className="h-3 w-3" />
              <BatteryFull className="h-3.5 w-3.5" />
            </div>
          </div>

          {!ringing && callLine === null && !noticeDismissed && !finished && !jobAccepted && !onSite && (homeScreen || tab === 'chat') && (
            <aside data-testid="incoming-call-notice" className="absolute left-2 right-2 top-12 z-30 flex items-center rounded-2xl border border-white/20 bg-[#075e54] text-white shadow-xl">
              <button onClick={showIncomingCall} className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left">
                <PhoneIncoming className="h-4 w-4 shrink-0" />
                <span className="min-w-0 text-[10px]"><strong className="block truncate">Supdawg · Panggilan masuk</strong>
                  <span className="block truncate">{contacts.find(c => c.missionIndex === currentMissionIndex)?.name || 'Klien'} · Lihat panggilan</span>
                </span>
              </button>
              <button onClick={() => setNoticeDismissed(true)} aria-label="Tutup notifikasi panggilan" className="mr-1 rounded-full p-2 hover:bg-white/15"><X className="h-4 w-4" /></button>
            </aside>
          )}
          {ringing && currentMission ? (
            <main data-testid="incoming-call-screen" className="flex min-h-0 flex-1 flex-col items-center bg-gradient-to-b from-[#173e3a] to-[#082621] px-5 py-6 text-white">
              <p className="text-xs text-teal-100">Supdawg · Panggilan suara masuk</p>
              <div className="mt-6 flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/15 text-3xl font-semibold">
                {(contacts.find(c => c.missionIndex === currentMissionIndex)?.name || 'Klien').replace(/^(Bu|Pak|Mas)\s/, '').slice(0,1)}
              </div>
              <h2 className="mt-4 text-center text-xl font-bold">{contacts.find(c => c.missionIndex === currentMissionIndex)?.name || 'Klien'}</h2>
              <p className="mt-2 text-xs text-teal-100/70">Panggilan masuk</p>
              <div className="flex-1" />
              <p id="answer-swipe-hint" className="mb-16 text-center text-xs text-teal-100">Tarik tombol hijau ke atas untuk mengangkat</p>
              <div className="flex w-full shrink-0 items-end justify-between gap-3 pb-4">
                <div className="flex flex-col items-center gap-3">
                  <button aria-label="Tolak panggilan" onClick={() => { setRinging(false); setNoticeDismissed(true); swipeStart.current=null; setSwipeDistance(0); }} className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 hover:bg-rose-500"><Phone className="h-6 w-6 rotate-[135deg]" /></button>
                  <span className="text-xs">Tolak</span>
                </div>
                <div className="relative flex flex-col items-center gap-3">
                  <span aria-hidden="true" className="absolute -top-10 text-2xl text-emerald-200">↑</span>
                  <button aria-label="Angkat panggilan: tarik ke atas" aria-describedby="answer-swipe-hint" title="Tarik ke atas dengan mouse, atau tekan panah atas saat tombol terpilih"
                    className="flex h-14 w-14 touch-none select-none items-center justify-center rounded-full bg-emerald-500 shadow-lg hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                    style={{transform:`translateY(-${swipeDistance}px)`}}
                    onPointerDown={e => { if(e.button!==0)return; e.preventDefault(); e.currentTarget.focus(); swipeStart.current={id:e.pointerId,y:e.clientY}; e.currentTarget.setPointerCapture(e.pointerId); }}
                    onPointerMove={e => { if(swipeStart.current?.id===e.pointerId)setSwipeDistance(Math.max(0,Math.min(80,swipeStart.current.y-e.clientY))); }}
                    onPointerUp={e => { const start=swipeStart.current; swipeStart.current=null; setSwipeDistance(0); if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId); if(start?.id===e.pointerId && start.y-e.clientY>=48)answerCall(); }}
                    onPointerCancel={() => { swipeStart.current=null; setSwipeDistance(0); }}
                    onLostPointerCapture={() => { swipeStart.current=null; setSwipeDistance(0); }}
                    onKeyDown={e => { if(e.key==='ArrowUp'){e.preventDefault();e.stopPropagation();answerCall();} }}>
                    <Phone className="h-6 w-6" />
                  </button>
                  <span className="text-xs">Angkat</span>
                </div>
                <div className="flex flex-col items-center gap-3 opacity-40">
                  <button disabled aria-label="Pesan (belum tersedia)" className="flex h-14 w-14 cursor-not-allowed items-center justify-center rounded-full bg-white/20"><MessageCircle className="h-6 w-6" /></button>
                  <span className="text-xs">Pesan</span>
                </div>
              </div>
            </main>
          ) : callLine !== null && currentMission ? (
            <main data-testid="phone-call" className="flex min-h-0 flex-1 flex-col bg-[#123e39] px-5 py-5 text-white">
              <p className="text-center text-xs text-teal-200">Supdawg · Panggilan berlangsung</p>
              <div className="mx-auto mt-5 flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/15"><Phone className="h-7 w-7" /></div>
              <h2 className="mt-3 text-center text-lg font-bold">{contacts.find(c => c.missionIndex === currentMissionIndex)?.name || 'Klien'}</h2>
              <div aria-live="polite" className="my-5 min-h-0 flex-1 overflow-y-auto rounded-2xl bg-white/10 p-4 text-sm leading-relaxed">
                {currentMission.briefing[callLine] || `Lokasi saya: ${currentMission.locationLabel}. Bayaran ${currentMission.fee}. Bisa dibantu?`}
              </div>
              <button className="rounded-xl bg-teal-100 px-3 py-3 text-xs font-bold text-teal-950" onClick={() => {
                if (callLine < currentMission.briefing.length) setCallLine(callLine + 1);
                else { onAcceptJob(); setCallLine(null); goTab('job'); }
              }}>{callLine < currentMission.briefing.length ? 'Lanjut percakapan' : 'Setuju & terima job'}</button>
              <button onClick={() => setCallLine(null)} className="mt-3 rounded-xl bg-rose-700 py-2.5 text-xs font-bold">Akhiri tanpa menerima</button>
            </main>
          ) : homeScreen ? (
            <main className="nq-home-screen">
              <div className="nq-home-clock"><span>{clock}</span><p>Hari yang baik untuk memperbaiki sesuatu.</p></div>
              <div className="nq-home-widget"><div className="flex items-center gap-2"><MapPin size={14} /><span>{locationNames[currentLocation]}</span></div><strong>Halo, {firstName}.</strong><p>{finished ? 'Semua pekerjaan selesai. Kerja bagus!' : jobAccepted ? 'Ada pekerjaan yang sedang kamu tangani.' : 'Ada panggilan masuk di Supdawg.'}</p></div>
              <div className="nq-home-apps">
                {homeApps.map(app => <button key={app.tab} onClick={() => goTab(app.tab)} aria-label={`Buka ${app.name}: ${app.subtitle}`}>
                  <span className={`nq-app-icon ${app.theme}`}><app.icon size={27} strokeWidth={1.8}/>{app.tab === 'chat' && (totalUnread > 0 || (!finished && !jobAccepted)) && <b className="nq-app-badge">{Math.max(1,totalUnread)}</b>}</span><span>{app.name}</span>
                </button>)}
              </div>
              <div className="nq-home-bottom"><span className="nq-home-dot"/><p>Peralatan siap. Masalah pasti bisa dicari.</p></div>
            </main>
          ) : (<>
          {/* App header */}
          <div className={`${tab === 'chat' ? 'hidden' : ''} nq-phone-header shrink-0 bg-[#0F766E] px-4 pb-3 pt-2 text-white`}>
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="font-sans text-xl font-bold leading-tight">{appName}</div>
                <div className="truncate text-[10px] text-teal-100">
                  {tab === 'toko' ? 'Alat lengkap, kerjaan beres.' : tab === 'chat' ? 'Tanya gejalanya, bukan tebak masalahnya.' : `${firstName} · ${locationNames[currentLocation]}`}
                </div>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-bold">
                {firstName.slice(0, 1).toUpperCase()}
              </div>
            </div>
            {(tab === 'job' || tab === 'riwayat') && <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-center">
              <div className="rounded-xl bg-white/10 py-1.5">
                <div className="text-sm font-bold">{completedCount}</div>
                <div className="text-[9px] text-teal-100">Job selesai</div>
              </div>
              <div className="rounded-xl bg-white/10 py-1.5">
                <div className="flex items-center justify-center gap-0.5 text-sm font-bold">
                  {rating === null ? (
                    <span className="text-[11px] font-bold text-teal-100">Baru</span>
                  ) : (
                    <>
                      {rating.toFixed(1)}
                      <Star className="h-2.5 w-2.5 fill-amber-300 text-amber-300" />
                    </>
                  )}
                </div>
                <div className="text-[9px] text-teal-100">
                  {rating === null ? 'Belum ada rating' : `Rating · ${completedCount} ulasan`}
                </div>
              </div>
              <div className="rounded-xl bg-white/10 py-1.5">
                <div className="text-[11px] font-bold leading-5">{money(earnings)}</div>
                <div className="text-[9px] text-teal-100">Saldo</div>
              </div>
            </div>}
            {tab === 'toko' && <div className="nq-shop-wallet">Saldo belanja <strong>{money(earnings)}</strong></div>}
          </div>

          {(tab === 'job' || tab === 'riwayat') ? <div className="nq-job-tabs"><button aria-pressed={tab === 'job'} onClick={() => goTab('job')}>Pekerjaan</button><button aria-pressed={tab === 'riwayat'} onClick={() => goTab('riwayat')}>Riwayat</button></div> : tab !== 'chat' ? <div className="nq-phone-section"><span>{tab === 'toko' ? 'Kebutuhan teknisi' : 'Chat'}</span><span>{tab === 'toko' ? 'TOKO ALAT' : `${contacts.length} KONTAK`}</span></div> : null}
          {/* Scrollable content — tinggi tetap */}
          <div
            className={`nq-phone-content min-h-0 flex-1 ${
              tab === 'chat' && activeContact ? 'overflow-hidden' : 'overflow-y-auto'
            }`}
          >
            {/* ───────── JOB ───────── */}
            {tab === 'job' && (
              <div className="space-y-2.5 p-3">
                {finished ? (
                  <div className="space-y-3 rounded-2xl border border-emerald-200 bg-white p-4 text-center">
                    <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
                    <div className="font-bold text-stone-800">Semua job minggu ini selesai!</div>
                    <p className="text-[11px] leading-relaxed text-stone-500">
                      Rating akhirmu {rating?.toFixed(1) ?? '-'} dari {completedCount} klien. Total pendapatan{' '}
                      {money(earnings)}.
                    </p>
                    <button
                      onClick={() => onTravel('base')}
                      className="w-full rounded-xl bg-[#0F766E] py-2 text-xs font-bold text-white transition hover:bg-[#115E59]"
                    >
                      Kembali ke Kantor
                    </button>
                  </div>
                ) : !jobAccepted ? (
                  <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-700">
                    <h2 className="font-bold">Belum ada job aktif</h2>
                    <p className="my-3 text-xs leading-relaxed">Pekerjaan akan tercatat di sini setelah kamu menyetujui permintaan klien.</p>
                    <button onClick={onSite ? onTalkToClient : () => goTab('chat')} className="w-full rounded-xl bg-[#0F766E] p-3 text-xs font-bold text-white">
                      {onSite ? 'Tutup HP & Sapa Klien' : 'Buka Supdawg'}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Konteks: telepon jarak jauh vs klien di ruangan yang sama */}
                    {!jobAccepted && (
                      <div
                        className={`flex items-start gap-2 rounded-xl border p-2.5 ${
                          onSite
                            ? 'border-teal-200 bg-teal-50'
                            : 'border-amber-200 bg-amber-50'
                        }`}
                      >
                        {onSite ? (
                          <Users className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                        ) : (
                          <PhoneIncoming className="mt-0.5 h-4 w-4 shrink-0 animate-pulse text-amber-700" />
                        )}
                        <div
                          className={`text-[11px] leading-snug ${
                            onSite ? 'text-teal-900' : 'text-amber-800'
                          }`}
                        >
                          {onSite ? (
                            <>
                              <strong>Klien ada di ruangan ini.</strong> Nggak perlu ditelepon — tutup HP dan
                              sapa langsung orangnya.
                            </>
                          ) : (
                            <>
                              <strong>Belum ada job diterima.</strong> Hubungi lewat Supdawg:{' '}
                              {currentMission.locationLabel.split('·')[0].trim()} — keluhan baru menunggu.
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="rounded-2xl border border-stone-200 bg-white p-3.5 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold uppercase tracking-wide text-[#B45309]">
                            {currentMission.category}
                          </div>
                          <div className="mt-0.5 text-sm font-bold leading-snug text-stone-800">
                            {currentMission.title.replace(/^Job #\d+ — /, '')}
                          </div>
                        </div>
                        <div className="shrink-0 rounded-lg bg-teal-50 px-2 py-1 text-[10px] font-bold text-teal-800">
                          {currentMission.fee}
                        </div>
                      </div>

                      <p className="mt-2 text-[11px] leading-relaxed text-stone-600">
                        {currentMission.shortTask}
                      </p>

                      <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-stone-500">
                        <MapPin className="h-3 w-3 shrink-0 text-[#B45309]" />
                        {currentMission.locationLabel}
                      </div>

                      {!jobAccepted ? (
                        onSite ? (
                          <button
                            onClick={onTalkToClient}
                            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0F766E] py-2.5 text-xs font-bold text-white transition hover:bg-[#115E59]"
                          >
                            <MessageSquare className="h-3.5 w-3.5" /> Tutup HP & Sapa Klien
                          </button>
                        ) : (
                          <button
                            onClick={() => goTab('chat')}
                            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0F766E] py-2.5 text-xs font-bold text-white transition hover:bg-[#115E59]"
                          >
                            <Phone className="h-3.5 w-3.5" /> Buka Supdawg
                          </button>
                        )
                      ) : (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-800">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Job diterima
                          </div>
                          {onSite ? (
                            <button
                              onClick={onClose}
                              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-teal-300 bg-teal-50 py-2.5 text-xs font-bold text-teal-800 transition hover:bg-teal-100"
                            >
                              <MapPin className="h-3.5 w-3.5" /> Sudah di lokasi — lanjut kerja
                            </button>
                          ) : (
                            <button
                              onClick={() => onTravel(currentMission.location)}
                              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#B45309] py-2.5 text-xs font-bold text-white transition hover:bg-[#92400E]"
                            >
                              <MapPin className="h-3.5 w-3.5" /> Berangkat ke{' '}
                              {locationNames[currentMission.location]}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {currentLocation !== 'base' && (
                      <button
                        onClick={() => onTravel('base')}
                        className="w-full rounded-xl border border-stone-300 bg-white py-2 text-[11px] font-semibold text-stone-600 transition hover:bg-stone-50"
                      >
                        Pulang ke Kantor NetQuest (siapkan kabel)
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ───────── PESAN ───────── */}
            {tab === 'chat' && !activeContact && (
              <div className="sd-list">
                <header className="sd-list-header"><h2>Supdawg</h2>
                  {!finished && !jobAccepted && !onSite ? <button aria-label="Angkat panggilan klien" title="Panggilan masuk" onClick={showIncomingCall} className="rounded-full bg-teal-50 p-2 text-teal-700"><PhoneIncoming size={20}/></button> : <MessageCircle size={22}/>}
                </header>
                <label className="sd-search"><Search size={17}/><input aria-label="Cari percakapan" placeholder="Cari nama atau pesan" value={chatSearch} onChange={e => setChatSearch(e.target.value)}/></label>
                <div className="sd-filter"><span>Semua chat</span><small>{contacts.length} kontak</small></div>
                <div className="sd-contacts">
                {contacts.filter(c => `${c.name} ${messagesFor(c).slice(-1)[0]?.text || ''}`.toLowerCase().includes(chatSearch.toLowerCase())).map(c => {
                  const msgs = messagesFor(c);
                  const last = msgs[msgs.length - 1];
                  const unread = unreadCount(c);
                  return <button key={c.id} className="sd-contact" onClick={() => { setShowReplies(false); openThread(c); }}>
                    <span className={`sd-avatar ${c.accent}`}>{c.name.replace(/^(Bu|Mas|Pak)\s/, '').slice(0, 1)}</span>
                    <span className="sd-contact-body"><span className="sd-contact-top"><strong>{c.name}</strong><time className={unread ? 'sd-unread-time' : ''}>{last?.time}</time></span><span className="sd-contact-preview"><span>{last?.from === 'me' ? 'Kamu: ' : ''}{last?.text || 'Mulai percakapan'}</span>{unread > 0 && <b>{unread}</b>}</span></span>
                  </button>;
                })}
                {contacts.filter(c => `${c.name} ${messagesFor(c).slice(-1)[0]?.text || ''}`.toLowerCase().includes(chatSearch.toLowerCase())).length === 0 && <p className="sd-empty">Percakapan tidak ditemukan.</p>}
                </div>
                <p className="sd-list-note">Tanya klien untuk memahami gejalanya.</p>
              </div>
            )}

            {tab === 'chat' && activeContact && (
              <div className="sd-thread flex h-full flex-col">
                <div className="sd-thread-header flex shrink-0 items-center gap-2 px-2.5 py-2">
                  <button
                    onClick={() => {
                      sound.playClick();
                      setOpenContact(null);
                    }}
                    className="rounded-lg p-1 text-stone-500 transition hover:bg-stone-100"
                    aria-label="Kembali ke daftar pesan"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white ${activeContact.accent}`}
                  >
                    {activeContact.name.replace(/^(Bu|Mas|Pak)\s/, '').slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[11px] font-bold text-stone-800">{activeContact.name}</div>
                    <div className="truncate text-[9px] text-stone-400">{typingFor === activeContact.id ? 'sedang mengetik…' : activeContact.role}</div>
                  </div>
                </div>

                <div
                  ref={threadScrollRef}
                  className="sd-messages min-h-0 flex-1 space-y-2 overflow-y-auto p-3"
                >
                  <div className="sd-day">Percakapan klien</div>
                  {messagesFor(activeContact).map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`sd-bubble max-w-[88%] rounded-lg px-2.5 py-2 text-[12px] leading-relaxed shadow-sm ${
                          m.from === 'me'
                            ? 'sd-outgoing rounded-tr-sm bg-[#d9fdd3] text-stone-800'
                            : 'rounded-tl-sm bg-white text-stone-800'
                        }`}
                      >
                        {m.text}
                        <div
                          className={`mt-1 flex items-center justify-end gap-1 font-mono text-[8px] ${
                            m.from === 'me' ? 'text-[#597565]' : 'text-stone-400'
                          }`}
                        >
                          {m.time}
                          {m.from === 'me' && <CheckCheck className="h-2.5 w-2.5" />}
                        </div>
                      </div>
                    </div>
                  ))}
                  {typingFor === activeContact.id && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-stone-200 bg-white px-3 py-2.5 shadow-sm">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400"
                            style={{ animationDelay: `${i * 120}ms` }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Template balasan: tekan sekali, hilang, tidak bisa diulang. Tidak ada kolom ketik. */}
                <div className="sd-composer shrink-0 p-2">
                  {(() => {
                    const templates = getTemplates(activeContact);
                    if (templates.length === 0) {
                      return (
                        <div className="rounded-xl bg-stone-50 px-3 py-2 text-center text-[10px] leading-snug text-stone-400">
                          Tidak ada lagi yang perlu dibalas di percakapan ini.
                        </div>
                      );
                    }
                    return (
                      <>
                        <button className="sd-reply-trigger" aria-expanded={showReplies} onClick={() => setShowReplies(value => !value)}><MessageCircle size={18}/><span>{showReplies ? 'Tutup pilihan balasan' : 'Pilih pesan…'}</span><span className="sd-send"><Send size={16}/></span></button>
                        {showReplies && <div className="sd-replies flex max-h-[145px] flex-col gap-1 overflow-y-auto">
                          {templates.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => { pressTemplate(activeContact, t); setShowReplies(false); }}
                              disabled={Boolean(typingFor)}
                              className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-left text-[10px] font-semibold leading-snug text-teal-900 transition hover:bg-teal-100 disabled:opacity-50"
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>}
                        <p className="sd-compose-note">Balasan pilihan · simulasi percakapan</p>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ───────── TOKO ONLINE ───────── */}
            {tab === 'toko' && (
              <div className="space-y-2 p-3">
                <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-2">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-stone-800">
                    <Store className="h-3.5 w-3.5 text-[#B45309]" /> Toko Online NetSupply
                  </span>
                  <span className="font-mono text-[11px] font-bold text-[#0F766E]">{money(balance)}</span>
                </div>
                <p className="px-0.5 text-[10px] leading-snug text-stone-400">
                  Pesan dari mana saja — barang langsung masuk tas teknisi.
                </p>

                {shopItems.map((item) => {
                  const Icon = SHOP_ICONS[item.id] || ShoppingBag;
                  const ownKey = OWNED_KEY[item.id];
                  const owned = ownKey ? Boolean(inventory[ownKey]) : false;
                  const q = item.kind === 'material' ? shopQty[item.id] || 1 : 1;
                  const total = item.price * q;
                  const affordable = total <= balance;
                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border p-2.5 ${
                        owned ? 'border-emerald-200 bg-emerald-50/60' : 'border-stone-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            item.kind === 'tool' ? 'bg-teal-100 text-[#0F766E]' : 'bg-amber-100 text-[#B45309]'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-1.5">
                            <span className="text-[11px] font-bold leading-tight text-stone-800">
                              {item.name}
                            </span>
                            <span className="shrink-0 font-mono text-[10px] font-bold text-[#0F766E]">
                              {money(item.price)}
                            </span>
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-[9px] leading-snug text-stone-500">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        {item.kind === 'material' ? (
                          <div className="flex items-center gap-1 rounded-lg border border-stone-300 bg-stone-50 p-0.5">
                            <button
                              type="button"
                              onClick={() => changeShopQty(item.id, -1)}
                              className="rounded-md p-1 text-stone-600 hover:bg-white"
                              aria-label="Kurangi"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="min-w-[52px] text-center font-mono text-[10px] font-bold text-stone-800">
                              {q}× = {(item.unitAmount || 1) * q}
                              {item.unitLabel === 'meter' ? 'm' : ' pcs'}
                            </span>
                            <button
                              type="button"
                              onClick={() => changeShopQty(item.id, 1)}
                              className="rounded-md p-1 text-stone-600 hover:bg-white"
                              aria-label="Tambah"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        ) : owned ? (
                          <span className="text-[10px] font-bold text-emerald-700">✓ Sudah punya</span>
                        ) : (
                          <span className="text-[10px] text-stone-400">Sekali beli</span>
                        )}
                        <button
                          type="button"
                          disabled={owned || !affordable}
                          onClick={() => buyShopItem(item)}
                          className="rounded-lg bg-[#0F766E] px-2.5 py-1.5 text-[10px] font-bold text-white transition hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {owned ? 'Dimiliki' : `Beli ${money(total)}`}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {shopFlash && (
                  <div className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-[10px] font-semibold leading-snug text-stone-700">
                    {shopFlash}
                  </div>
                )}
              </div>
            )}

            {/* ───────── RIWAYAT ───────── */}
            {tab === 'riwayat' && (
              <div className="space-y-2 p-3">
                {missions.slice(0, currentMissionIndex).map((m) => (
                  <div key={m.id} className="rounded-xl border border-stone-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-stone-800">
                        Job #{String(m.id).padStart(2, '0')}
                      </span>
                      <span className="shrink-0 text-[10px] font-semibold text-emerald-700">
                        Selesai · {m.fee}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] leading-snug text-stone-500">
                      {m.title.replace(/^Job #\d+ — /, '')}
                    </p>
                    <p className="mt-1 font-mono text-[9px] text-stone-400">{m.locationLabel}</p>
                  </div>
                ))}
                {currentMissionIndex === 0 ? (
                  <div className="rounded-xl border border-dashed border-stone-300 p-5 text-center text-[11px] leading-relaxed text-stone-500">
                    Belum ada job selesai. Rating & pendapatan akan muncul di sini setelah kunjungan
                    pertamamu beres.
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl bg-teal-50 p-3 text-[11px] font-semibold text-teal-800">
                    <CircleDollarSign className="h-4 w-4 shrink-0" /> Total masuk: {money(earnings)}
                  </div>
                )}
              </div>
            )}
          </div>

          </>)}
          {!ringing && callLine === null && <div className="nq-system-nav">
            <button aria-label="Kembali" onClick={() => { if (!homeScreen && tab === 'chat' && openContact) setOpenContact(null); else returnHome(); }}><ArrowLeft size={17}/></button>
            <button className="nq-home-button" aria-label="Layar utama" onClick={returnHome}><span/></button>
            <button aria-label="Simpan HP" onClick={onClose}><X size={17}/></button>
          </div>}
        </div>
      </div>
    </div>
  );
};
