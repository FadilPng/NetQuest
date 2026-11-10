# Renderer bersama — Phase 2

Renderer menggunakan Canvas, bukan aset SVG/file gambar baru. Tidak ada perubahan bentuk, warna, koordinat, atau urutan gambar dalam pemisahan ini.

## Struktur
- `primitives.ts`: TILE_SIZE dan roundRect; tidak bergantung pada dispatcher.
- `floors.ts`: tekstur lantai dan variasi deterministik.
- `walls.ts`: renderer dinding solid/kaca beserta orientasinya.
- `furniture/sofa.ts`: sofa.
- `furniture/bookshelf.ts`: rak buku.
- `furniture/kitchenette.ts`: meja/perabot dapur.
- `furniture/tvUnit.ts`: kabinet dan TV.
- `furniture/coffeeTable.ts`: meja ruang keluarga.
- `furniture/plants.ts`: tanaman monstera dan snake plant.
- `furniture/waterCooler.ts`: dispenser.
- `furniture/types.ts`: argumen renderer furnitur, batas dalam piksel, prop, dan waktu animasi.

## Cara memakai
Lokasi tetap memilih aset lewat `MapProp.kind`. `drawMapProp` di `sprites.ts` menghitung batas piksel lalu memanggil renderer furnitur yang sesuai. Highlight, label, save/restore Canvas tetap dikelola bersama di dispatcher; fungsi furnitur hanya menggambar bentuknya. Jadi rumah/kantor lain memakai aset yang sama tanpa menyalin kode.

Import lama dari `sprites.ts` tetap valid melalui re-export lantai, dinding, dan primitives. Jangan mengimpor dispatcher sprites dari renderer baru: dependency harus satu arah agar tidak membuat siklus.

## Belum dipisahkan
Gambar karakter, meja laptop/PC, router, perangkat Cisco, serta sebagian aset kantor tetap di `sprites.ts`. Ini disengaja untuk menjaga scope Phase 2. Tidak ada perubahan denah, collision, misi, rating, atau save.

## Validasi
- 1.436 perbandingan sebelum/sesudah: urutan operasi Canvas, argumen dan style identik untuk tile seluruh lokasi, prop pada beberapa waktu/highlight/link status, dan sampel karakter. Perbandingan ini memakai recorder Canvas, bukan klaim pixel-diff screenshot.
- 33 tes logika lulus.
- 10 tes browser world/HP lulus.
- Typecheck/build lulus.

## Phase 5 — detail rumah
`furniture/homeDetails.ts` menyediakan renderer props rumah yang bisa dipakai ulang: meja printer, lemari, meja/kursi makan, wastafel, kloset, shower, papan PKK, foto keluarga, tumpukan kursi, dan ambang pintu. Penempatan dan collision tetap ditentukan oleh data lokasi. Papan/foto dipasang pada area dinding dan ambang tidak menghalangi jalan. Props dekoratif bukan fitur printer/sanitair yang bisa dioperasikan. Detail pintu berupa ambang/bingkai visual, bukan sistem buka-tutup pintu.
