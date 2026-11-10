# Data lokasi — Phase 1

- `ratnaHouse.ts`: rumah Bu Ratna (`house`).
- `netquestOffice.ts`: kantor/base NetQuest (`base`).
- `nusantaraOffice.ts`: kantor PT Nusantara Tech (`office`).
- `index.ts`: registry `LOCATIONS`, gabungan `ALL_NPCS`, dan lookup peminta misi.

Setiap file lokasi memuat tile map, NPC, penempatan prop/furnitur, jalur kabel bawaan, ukuran peta, nama/subtitle, dan titik spawn. Legend tile ada di awal setiap file. Ukuran dan posisi menggunakan koordinat tile.

`worldData.ts` tetap mengekspor ulang API lokasi agar import lama tidak rusak. Data misi, toko, inventaris awal, dan state perangkat jaringan masih berada di `worldData.ts`. Setelah Phase 2, renderer lantai/dinding/furnitur rumah berada di `../rendering/`; `sprites.ts` tetap menjadi dispatcher dan menyimpan renderer karakter/perangkat yang belum dipisah.

## Catatan saat nanti mengedit denah

Prop yang memiliki `deviceId` terhubung ke state perangkat dari `createInitialDevices()` di `worldData.ts`. Untuk rumah Ratna, sejak Phase 4 koordinat laptop/router diambil langsung dari RATNA_LAPTOP/RATNA_ROUTER dan label ruang berasal dari roomLabels di ratnaHouse.ts. Lokasi lainnya masih perlu menyelaraskan koordinat state perangkat secara manual; label zonanya masih digambar di App. Jangan berasumsi seluruh data visual/perangkat sudah otomatis berasal dari registry lokasi.

Penambahan ID lokasi baru perlu memperbarui tipe `LocationId` di `types.ts`, registry, serta data NPC/perangkat/misi yang terkait.

## Verifikasi pemisahan

Pemisahan ini tidak mengubah nilai data. Perbandingan deep equality sebelum/sesudah lulus untuk ekspor data worldData, hasil createInitialDevices/createInitialInventory, lookup peminta semua misi, dan fallback peminta. Typecheck/build, 33 tes logika, dan 10 tes browser world/HP lulus. Tidak ada perubahan denah, renderer, rating, atau penyimpanan dalam Phase 1.

## Migrasi dinding rumah Ratna
Rumah Ratna kini memakai `walls` (segmen + ketebalan) terpisah dari tile lantai. Gunakan wallGeometry untuk collision/overlap, jangan mengandalkan tile 1 saja. Kantor lain tetap tile-wall. Detail migrasi: `docs/tembok-tipis-ratna.md`.
