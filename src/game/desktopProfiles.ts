import dimasWallpaper from '../assets/wallpapers/wallpaper-dimas.jpg?inline';
import ratnaWallpaper from '../assets/wallpapers/wallpaper-ratna.jpeg?inline';
import sariWallpaper from '../assets/wallpapers/wallpaper-sari.webp?inline';

export interface DesktopProfile {
  owner: string;
  wallpaper?: string;
  layout: 'default' | 'dimas' | 'ratna' | 'sari';
  accent: string;
  items: Array<{ name: string; kind: 'folder' | 'document' | 'browser' | 'bin'; col: number; row: number }>;
}
export const desktopProfiles: Record<string, DesktopProfile> = {
  'pc-dimas': {
    owner: 'Dimas', wallpaper: dimasWallpaper, layout: 'dimas', accent: '#ab4d5e',
    items: [
      { name: 'Recycle Bin', kind: 'bin', col: 1, row: 1 },
      { name: 'Browser', kind: 'browser', col: 2, row: 1 },
      { name: 'Anime Watchlist', kind: 'folder', col: 1, row: 3 },
      { name: 'Materi Promosi', kind: 'folder', col: 2, row: 2 },
      { name: 'Proposal FINAL v3.docx', kind: 'document', col: 1, row: 2 },
    ],
  },
  'laptop-ratna': {
    owner: 'Bu Ratna', wallpaper: ratnaWallpaper, layout: 'ratna', accent: '#307e78',
    items: [
      { name: 'Recycle Bin', kind: 'bin', col: 1, row: 1 },
      { name: 'Browser', kind: 'browser', col: 1, row: 2 },
      { name: 'Foto Kegiatan PKK', kind: 'folder', col: 2, row: 1 },
      { name: 'Resep & Menu', kind: 'folder', col: 2, row: 2 },
      { name: 'Arisan PKK.docx', kind: 'document', col: 2, row: 3 },
    ],
  },
  'pc-sari': {
    owner: 'Sari', wallpaper: sariWallpaper, layout: 'sari', accent: '#586475',
    items: [
      { name: 'Recycle Bin', kind: 'bin', col: 1, row: 1 },
      { name: '01 · Laporan', kind: 'folder', col: 2, row: 1 },
      { name: '02 · Invoice', kind: 'folder', col: 3, row: 1 },
      { name: '03 · Arsip', kind: 'folder', col: 4, row: 1 },
      { name: 'Rekap Bulanan.docx', kind: 'document', col: 1, row: 2 },
      { name: 'Browser', kind: 'browser', col: 1, row: 3 },
    ],
  },
};
export const defaultDesktopProfile: DesktopProfile = {
  owner: 'Pengguna lokal', layout: 'default', accent: '#32618e',
  items: [
    { name: 'Recycle Bin', kind: 'bin', col: 1, row: 1 },
    { name: 'Dokumen', kind: 'folder', col: 1, row: 2 },
    { name: 'Browser', kind: 'browser', col: 1, row: 3 },
  ],
};
