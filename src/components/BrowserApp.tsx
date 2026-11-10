import envyThumbnail from '../assets/youpipe/envy-baby.jpg?inline';
import peradabanThumbnail from '../assets/youpipe/peradaban.jpg?inline';
import damageThumbnail from '../assets/youpipe/a-lot-of-damage.jpg?inline';
import { useState } from 'react';
import { ArrowLeft, Globe2, Home, Play, RotateCcw, Search, WifiOff } from 'lucide-react';
import type { NetworkDevice } from '../game/types';
import { checkWebAccess } from '../game/network';

const videos = [
  { title: '【エイプリルフールver.】エンヴィーベイビー / CBNEL', channel: 'CBNEL', duration: '2:17', thumbnail: envyThumbnail },
  { title: '.Feast - Peradaban', channel: '.Feast', duration: '5:44', thumbnail: peradabanThumbnail },
  { title: 'A lot of damage', channel: 'Slumpwumper', duration: '0:33', thumbnail: damageThumbnail },
];

export function BrowserApp({ device, devices }: { device: NetworkDevice; devices: Record<string, NetworkDevice> }) {
  const [address, setAddress] = useState('');
  const [page, setPage] = useState<'home' | 'youpipe' | 'unknown'>('home');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof checkWebAccess>>('ok');
  const current = checkWebAccess(device, devices);
  // A failed request needs a reload; an existing page loses playback when disconnected.
  const status = current !== 'ok' ? current : result;
  const visit = (url: string) => {
    const text = url.trim().toLowerCase();
    if (!text || text === 'netquest://newtab') { setPage('home'); setAddress(''); return; }
    const supported = /^(https?:\/\/)?(www\.)?youpipe\.test\/?$/.test(text) || text === 'youpipe';
    setAddress(supported ? 'https://youpipe.test' : url.trim());
    setPage(supported ? 'youpipe' : 'unknown');
    setSelected(null); setPlaying(false); setResult(checkWebAccess(device, devices));
  };
  const errors = {
    link: ['Tidak ada koneksi', 'Link Ethernet belum aktif. Periksa koneksi fisik, lalu coba muat ulang.', 'ERR_INTERNET_DISCONNECTED'],
    gateway: ['Situs ini tidak dapat dijangkau', 'Periksa konfigurasi IP dan jalur menuju gateway. Gunakan ipconfig dan ping untuk menguji dugaanmu.', 'ERR_NETWORK_UNREACHABLE'],
    isp: ['Koneksi ke luar jaringan gagal', 'Gateway lokal mungkin bisa dijangkau, tetapi jalur ISP pada simulasi sedang tidak tersedia.', 'ERR_CONNECTION_TIMED_OUT'],
    dns: ['Alamat situs tidak ditemukan', 'Layanan DNS simulasi tidak dapat menerjemahkan nama situs.', 'ERR_NAME_NOT_RESOLVED'],
    service: ['YouPipe sedang tidak tersedia', 'Server simulasi tidak merespons. Ini belum tentu masalah pada komputer klien.', 'ERR_SERVICE_UNAVAILABLE'],
  };
  return <div className="nq-browser">
    <div className="nq-browser-tab"><Globe2 size={13}/>{page === 'home' ? 'Tab baru' : page === 'youpipe' ? 'YouPipe' : 'Situs tidak tersedia'}<span>Browser · simulasi</span></div>
    <div className="nq-browser-toolbar">
      <button aria-label="Kembali ke tab baru" onClick={() => visit('')}><ArrowLeft size={16}/></button>
      <button aria-label="Muat ulang halaman" onClick={() => { setResult(checkWebAccess(device, devices)); setPlaying(false); }}><RotateCcw size={15}/></button>
      <form onSubmit={e => { e.preventDefault(); visit(address); }}><Globe2 size={13}/><input aria-label="Alamat situs" placeholder="Ketik youpipe.test" value={address} onChange={e => setAddress(e.target.value)}/></form>
      <button aria-label="Tab baru" onClick={() => visit('')}><Home size={15}/></button>
    </div>
    <div className="nq-browser-page">
      {page === 'home' ? <div className="nq-browser-home"><Globe2 size={38}/><h2>Mau ke mana hari ini?</h2><p>Buka situs untuk menguji pengalaman pengguna.</p><button onClick={() => visit('youpipe.test')}><span className="yp-logo"><Play size={18} fill="white"/></span>YouPipe<small>youpipe.test</small></button></div>
      : status !== 'ok' ? <div className="nq-browser-error"><WifiOff size={34}/><h2>{errors[status][0]}</h2><p>{errors[status][1]}</p><code>{errors[status][2]}</code><button onClick={() => { setResult(checkWebAccess(device, devices)); setPlaying(false); }}>Coba lagi</button></div>
      : page === 'unknown' ? <div className="nq-browser-error"><Globe2 size={34}/><h2>Situs belum ada di simulasi</h2><p>Ini bukan bukti koneksi rusak. Saat ini hanya YouPipe yang tersedia.</p><button onClick={() => visit('youpipe.test')}>Buka YouPipe</button></div>
      : <div className="yp-site">
        <header><button className="yp-brand" onClick={() => { setSelected(null); setPlaying(false); }}><span className="yp-logo"><Play size={17} fill="white"/></span>YouPipe<sup>ID</sup></button><label><Search size={14}/><input aria-label="Cari video YouPipe" placeholder="Cari video" value={query} onChange={e => { setQuery(e.target.value); setSelected(null); }}/></label></header>
        {selected === null ? <><div className="yp-feed-label">Untuk kamu <span>Situs berhasil dimuat</span></div><div className="yp-grid">{videos.map((video, i) => `${video.title} ${video.channel}`.toLowerCase().includes(query.toLowerCase()) && <button className="yp-card" key={video.title} onClick={() => { setSelected(i); setPlaying(false); }}><div className="yp-thumb yp-image-thumb"><img src={video.thumbnail} alt={video.title} loading="lazy"/><small>{video.duration}</small></div><h3>{video.title}</h3><p>{video.channel}</p><p>DEMO · video belum tersedia</p></button>)}</div>{!videos.some(v => `${v.title} ${v.channel}`.toLowerCase().includes(query.toLowerCase())) && <p>Tidak ada video yang cocok.</p>}</>
        : <div className="yp-watch"><button className={`yp-player ${playing ? 'is-playing' : ''}`} aria-label={playing ? 'Jeda demo' : 'Putar demo'} onClick={() => setPlaying(v => !v)}><img className="yp-player-poster" src={videos[selected].thumbnail} alt={videos[selected].title}/><span className="yp-play-caption">{playing ? 'Demo berjalan · klik untuk jeda' : '▶ Putar demo'}</span><div className="yp-demo-progress"/></button><h2>{videos[selected].title}</h2><p>{videos[selected].channel} · {videos[selected].duration}</p><small>Thumbnail asli dari aset pengguna. Pemutaran hanya simulasi lokal, tanpa video atau audio asli.</small></div>}
      </div>}
    </div>
    <footer className="nq-browser-lab">Lab web: ISP, DNS & server diasumsikan normal. Gateway terjangkau saja bukan bukti internet di dunia nyata.</footer>
  </div>;
}
