import React from 'react';
import {
  AlertTriangle,
  Backpack,
  Cable,
  CheckCircle2,
  MapPin,
  Ruler,
  Terminal,
  Wrench,
  X,
} from 'lucide-react';
import { LocationId, TechnicianInventory } from '../game/types';

export const InventoryModal: React.FC<{
  inventory: TechnicianInventory;
  currentLocation: LocationId;
  balance: number;
  measuredRoutes: Record<string, number>;
  onTravelToBase: () => void;
  onCraftHere: () => void;
  onClose: () => void;
}> = ({
  inventory,
  currentLocation,
  balance,
  measuredRoutes,
  onTravelToBase,
  onCraftHere,
  onClose,
}) => {
  const hasUnfinished = inventory.unfinishedCables.length > 0;
  const canCraftHere =
    inventory.hasCrimper &&
    (hasUnfinished || (inventory.utpRollMeters > 0 && inventory.rj45Connectors >= 2));
  const measuredList = Object.entries(measuredRoutes);
  const straightCount = inventory.cables.filter((c) => c.type === 'straight').length;
  const crossoverCount = inventory.cables.filter((c) => c.type === 'crossover').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-stone-200 bg-[#FBF7EF] shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 bg-[#F4EDE1] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#B45309] text-white">
              <Backpack className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-stone-800">Tas Perlengkapan Teknisi</h3>
              <p className="text-[11px] text-stone-500">
                Pastikan alat & panjang kabel lengkap sebelum berangkat ke lokasi klien
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

        <div className="max-h-[76vh] space-y-4 overflow-y-auto p-5">
          {/* Saldo */}
          <div className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white px-4 py-2.5">
            <span className="text-[11px] font-semibold text-stone-500">Saldo freelance</span>
            <span className="font-mono text-sm font-extrabold text-[#0F766E]">
              Rp {balance.toLocaleString('id-ID')}
            </span>
          </div>

          {/* Core Tools */}
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-500">
              Peralatan Kerja (dibeli di Toko Online HP)
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                {
                  name: 'Tang Crimping',
                  ok: inventory.hasCrimper,
                  icon: Wrench,
                },
                {
                  name: 'LAN Tester',
                  ok: inventory.hasLanTester,
                  icon: Cable,
                },
                {
                  name: 'Meteran',
                  ok: inventory.hasMeasuringTape,
                  icon: Ruler,
                },
                {
                  name: 'Kabel Console',
                  ok: inventory.hasConsoleCable,
                  icon: Terminal,
                },
              ].map((t) => (
                <div
                  key={t.name}
                  className={`rounded-xl border p-3 text-center ${
                    t.ok
                      ? 'border-emerald-200 bg-emerald-50/70'
                      : 'border-stone-200 bg-white opacity-75'
                  }`}
                >
                  <t.icon
                    className={`mx-auto h-5 w-5 ${t.ok ? 'text-emerald-700' : 'text-stone-400'}`}
                  />
                  <div className="mt-1.5 text-[11px] font-bold text-stone-800">{t.name}</div>
                  <div
                    className={`mt-0.5 text-[10px] font-semibold ${
                      t.ok ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {t.ok ? '✓ Tersedia' : 'Belum diambil'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Raw Materials */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-stone-200 bg-white p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
                <Ruler className="h-3.5 w-3.5 text-[#0F766E]" /> Sisa Roll UTP Cat6
              </div>
              <div className="mt-1 font-mono text-base font-extrabold text-stone-800">
                {inventory.utpRollMeters} meter
              </div>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
                <Cable className="h-3.5 w-3.5 text-[#B45309]" /> Konektor RJ45
              </div>
              <div className="mt-1 font-mono text-base font-extrabold text-stone-800">
                {inventory.rj45Connectors} pcs
              </div>
            </div>
          </div>

          {/* Hasil ukur meteran */}
          {measuredList.length > 0 && (
            <div className="rounded-2xl border border-teal-200 bg-teal-50 p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal-900">
                <Ruler className="h-3.5 w-3.5" /> Catatan hasil ukur
              </div>
              <ul className="mt-1 space-y-0.5">
                {measuredList.map(([route, m]) => (
                  <li key={route} className="flex items-center justify-between text-[11px] text-teal-900">
                    <span>{route}</span>
                    <span className="font-mono font-bold">
                      {m.toFixed(1)}m → siapkan ≥ {Math.ceil(m + 1)}m
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Potongan kabel setengah jadi yang belum selesai di-crimp */}
          {inventory.unfinishedCables.length > 0 && (
            <div className="space-y-1.5 rounded-2xl border border-amber-300 bg-amber-50 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-amber-900">
                  Potongan Kabel Belum Selesai ({inventory.unfinishedCables.length})
                </span>
                <span className="text-[10px] text-amber-700">Tersimpan aman di tas</span>
              </div>
              {inventory.unfinishedCables.map((u, idx) => {
                const endsDone = (u.end1 ? 1 : 0) + (u.end2 ? 1 : 0);
                return (
                  <div
                    key={u.id}
                    className="flex items-center justify-between rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs"
                  >
                    <span className="font-bold text-stone-800">
                      Potongan #{idx + 1} · {u.lengthMeters} m{' '}
                      <span className="font-mono text-[10px] font-normal text-stone-500">
                        ({endsDone}/2 ujung ter-crimp)
                      </span>
                    </span>
                    <button
                      type="button"
                      disabled={!inventory.hasCrimper}
                      onClick={() => {
                        onClose();
                        onCraftHere();
                      }}
                      className="rounded-lg bg-[#B45309] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#92400E] disabled:opacity-40"
                    >
                      Lanjutkan →
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Rakit di lokasi pakai toolkit di tas */}
          <button
            type="button"
            disabled={!canCraftHere}
            onClick={() => {
              onClose();
              onCraftHere();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0F766E] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Wrench className="h-4 w-4" />{' '}
            {hasUnfinished ? 'Lanjutkan / Rakit Kabel di Sini' : 'Rakit Kabel di Sini (pakai toolkit di tas)'}
          </button>
          {!canCraftHere && (
            <p className="-mt-2 text-center text-[10px] text-stone-400">
              Butuh Tang Crimping, roll UTP, dan minimal 2 konektor RJ45 di tas.
            </p>
          )}

          {/* Crafted Cables List */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Kabel RJ45 Siap Pakai ({inventory.cables.length})
              </span>
              <span className="font-mono text-[10px] text-stone-500">
                Straight: {straightCount} · Crossover: {crossoverCount}
              </span>
            </div>

            {inventory.cables.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-4 text-center text-xs text-stone-500">
                Belum ada kabel yang di-crimp. Beli bahan di <strong>Toko Online (HP → Toko)</strong>, ukur rute pakai meteran,
                lalu rakit di Meja Crimping atau langsung di lokasi.
              </div>
            ) : (
              <div className="space-y-1.5">
                {inventory.cables.map((c, idx) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="font-bold text-stone-800">
                        Kabel #{idx + 1} ·{' '}
                        {c.type === 'straight' ? 'UTP Straight-Through' : 'UTP Crossover'}
                      </span>
                      {c.tested && c.faulty && (
                        <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">RUSAK</span>
                      )}
                      {c.tested === false && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">belum diuji</span>
                      )}
                    </div>
                    <span className="rounded-md bg-teal-50 px-2 py-0.5 font-mono text-xs font-bold text-teal-800">
                      {c.lengthMeters} meter
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {currentLocation !== 'base' &&
            (!inventory.hasCrimper || !inventory.hasConsoleCable || inventory.cables.length === 0) && (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Alat atau bahan kurang? Buka HP → tab Toko untuk belanja online.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onTravelToBase();
                  }}
                  className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-[#0F766E] px-3 py-2 text-[11px] font-bold text-white hover:bg-[#115E59]"
                >
                  <MapPin className="h-3.5 w-3.5" /> Ke Kantor
                </button>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};
