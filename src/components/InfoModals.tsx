import React from 'react';
import { Award, BookOpen, Sparkles, X } from 'lucide-react';
import { PlayerAvatar } from '../game/types';

export const CiscoHandbookModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/55 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-stone-200 bg-[#FBF7EF] shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 bg-[#F4EDE1] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#B45309] text-white">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-stone-800">Buku Saku Teknisi</h3>
              <p className="text-[11px] text-stone-500">Referensi lapangan untuk freelance IT support</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5 text-xs leading-relaxed text-stone-600">
          <section className="rounded-2xl border border-stone-200 bg-white p-4">
            <h4 className="font-serif text-sm font-bold text-stone-800">1. Menentukan kabel</h4>
            <ul className="mt-2 space-y-1.5">
              <li>
                <strong className="text-teal-800">Straight-through (T568B–T568B):</strong> perangkat berbeda. Laptop →
                router/switch, Access Point → switch.
              </li>
              <li>
                <strong className="text-amber-800">Crossover (T568A–T568B):</strong> perangkat sejenis. Switch lama →
                switch, PC → PC.
              </li>
              <li>
                <strong className="text-stone-700">Console rollover:</strong> laptop teknisi → port Console
                router/switch untuk akses CLI.
              </li>
            </ul>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-4">
            <h4 className="font-serif text-sm font-bold text-stone-800">2. Urutan warna T568B</h4>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px] text-stone-600">
              <span>1. Putih-Oranye</span><span>5. Putih-Biru</span>
              <span>2. Oranye</span><span>6. Hijau</span>
              <span>3. Putih-Hijau</span><span>7. Putih-Coklat</span>
              <span>4. Biru</span><span>8. Coklat</span>
            </div>
            <p className="mt-2 text-[11px]">
              T568A menukar pasangan oranye & hijau. Selalu uji kabel dengan LAN tester setelah crimp.
            </p>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-4">
            <h4 className="font-serif text-sm font-bold text-stone-800">3. Mode Cisco IOS & perintah wajib</h4>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {[
                ['Router>', 'User EXEC — mode awal terbatas'],
                ['Router#', 'Privileged EXEC — setelah enable'],
                ['Router(config)#', 'Global config — configure terminal'],
                ['Router(config-if)#', 'Interface — ip address, no shutdown'],
              ].map(([mode, desc]) => (
                <div key={mode} className="rounded-lg bg-stone-50 px-2.5 py-2">
                  <div className="font-mono text-[11px] font-bold text-teal-800">{mode}</div>
                  <div className="text-[10px] text-stone-500">{desc}</div>
                </div>
              ))}
            </div>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-stone-800 p-3 font-mono text-[10px] leading-relaxed text-stone-100">
{`enable
configure terminal
interface gigabitEthernet 0/1
ip address 192.168.20.1 255.255.255.0
no shutdown
end

! Switch
vlan 10
name FINANCE
interface fastEthernet 0/1
switchport mode access
switchport access vlan 10`}
            </pre>
          </section>

          <section className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
            <h4 className="font-serif text-sm font-bold text-teal-900">4. Alur troubleshooting freelance</h4>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-[11px] text-stone-700">
              <li>Tanya keluhan & kapan terakhir normal (informasi berguna untuk laporan).</li>
              <li>Cek fisik dulu: kabel, konektor, lampu link, adaptor daya (Layer 1).</li>
              <li>Cek IP, subnet mask, gateway, dan DHCP (Layer 3).</li>
              <li>Tes dengan ipconfig dan ping, lalu catat hasilnya.</li>
              <li>Rapikan kabel dan jelaskan penyebab masalah ke klien.</li>
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
};

export const CertificateModal: React.FC<{
  playerName: string;
  avatar: PlayerAvatar;
  xp: number;
  rating: number | null;
  earnings: number;
  onContinueSandbox: () => void;
}> = ({ playerName, xp, rating, earnings, onContinueSandbox }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/65 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl space-y-4 rounded-3xl border-2 border-amber-300 bg-[#FBF7EF] p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-[#B45309]">
          <Award className="h-9 w-9" />
        </div>
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-teal-800">
            <Sparkles className="h-3.5 w-3.5" /> Sertifikat freelance
          </div>
          <h2 className="font-serif text-2xl font-black text-stone-800 sm:text-3xl">
            Junior IT Support Technician
          </h2>
          <p className="text-[11px] text-stone-500">NetQuest Field Services · Verified portfolio</p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <p className="text-[11px] text-stone-500">Diberikan kepada</p>
          <div className="font-serif text-2xl font-bold text-[#0F766E]">{playerName}</div>
          <p className="mx-auto mt-1 max-w-md text-[11px] leading-relaxed text-stone-600">
            telah menyelesaikan 5 kunjungan klien: pembuatan & pemasangan kabel UTP, konfigurasi IPv4 dan uji
            konektivitas, aktivasi interface Cisco Router, segmentasi VLAN pada Catalyst Switch, serta perbaikan
            wireless Access Point.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 font-mono text-[11px] font-bold text-amber-800">
              {xp} XP
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-1.5 font-mono text-[11px] font-bold text-teal-800">
              Rating {rating?.toFixed(1) ?? '-'} / 5.0
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 px-3 py-1.5 font-mono text-[11px] font-bold text-stone-700">
              Rp {earnings.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        <p className="text-[10px] leading-relaxed text-stone-400">
          Portofolio ini menandai bahwa kamu mampu menangani job jaringan level rumahan hingga kantor kecil secara
          mandiri.
        </p>

        <button
          onClick={onContinueSandbox}
          className="w-full rounded-2xl bg-[#0F766E] px-6 py-3 text-sm font-extrabold text-white hover:bg-[#115E59] sm:w-auto"
        >
          Lanjut eksplorasi & latihan kabel
        </button>
      </div>
    </div>
  );
};
