import {splitCompactFurniture} from './compactFurniture';
import type {GameLocation,NPC,FloorCableSegment} from '../types';

// Original compact house restored from repository baseline.
const HOUSE_MAP: number[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 3, 3, 3, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 3, 3, 3, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 3, 3, 3, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 3, 3, 3, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 4, 4, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 4, 4, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 4, 4, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 4, 4, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 4, 4, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

const HOUSE_NPCS: NPC[] = [
  {
    id: 'npc-ratna',
    name: 'Bu Ratna',
    role: 'Pemilik Rumah',
    division: 'Pelanggan Rumahan',
    x: 9.6,
    y: 6.6,
    direction: 'left',
    shirtColor: '#9F1239',
    accentColor: '#FECDD3',
    hairColor: '#1C1917',
    isFemale: true,
  },
];

const HOUSE_PROPS: GameLocation['props'] = splitCompactFurniture([
  {
    id: 'house-router',
    kind: 'home-router',
    x: 14.6,
    y: 1.4,
    w: 1.4,
    h: 1.1,
    solid: true,
    deviceId: 'rt-ratna',
    label: 'Router Wi-Fi Rumah',
  },
  {
    id: 'house-kitchen',
    kind: 'kitchenette',
    x: 13.5,
    y: 3.3,
    w: 2.6,
    h: 1.2,
    solid: true,
    label: 'Meja Dapur',
  },
  {
    id: 'house-laptop',
    kind: 'desk-laptop',
    x: 2.7,
    y: 2.1,
    w: 2,
    h: 1.4,
    solid: true,
    deviceId: 'laptop-ratna',
    label: 'Laptop Bu Ratna',
  },
  {
    id: 'house-bookshelf',
    kind: 'bookshelf',
    x: 6.2,
    y: 1.2,
    w: 2.0,
    h: 0.9,
    solid: true,
    label: 'Rak Buku Ruang Belajar',
  },
  {
    id: 'house-sofa',
    kind: 'sofa',
    x: 2.2,
    y: 7.4,
    w: 2.7,
    h: 1.2,
    solid: true,
  },
  {
    id: 'house-tv',
    kind: 'tv-unit',
    x: 6.6,
    y: 7,
    w: 2.2,
    h: 1,
    solid: true,
    label: 'TV Keluarga',
  },
  {
    id: 'house-table',
    kind: 'coffee-table',
    x: 2.9,
    y: 9.2,
    w: 1.8,
    h: 1,
    solid: true,
  },
  {
    id: 'house-plant-1',
    kind: 'plant-monstera',
    x: 1.1,
    y: 5.6,
    w: 1,
    h: 1,
    solid: true,
  },
  {
    id: 'house-plant-2',
    kind: 'plant-snake',
    x: 16.3,
    y: 9.4,
    w: 1,
    h: 1,
    solid: true,
  },
  {
    id: 'house-water',
    kind: 'water-cooler',
    x: 16.2,
    y: 5.2,
    w: 1,
    h: 1,
    solid: true,
  },
]);

const HOUSE_CABLES: FloorCableSegment[] = [
  {
    id: 'cable-ratna',
    fromDevice: 'laptop-ratna',
    toDevice: 'rt-ratna',
    points: [
      { x: 4.2, y: 2.9 },
      { x: 10.8, y: 2.9 },
      { x: 10.8, y: 4.6 },
      { x: 15.2, y: 4.6 },
      { x: 15.2, y: 2.4 },
    ],
  },
];

export const RATNA_LAPTOP = HOUSE_PROPS.find(p=>p.id==='house-laptop')!;
export const RATNA_ROUTER = HOUSE_PROPS.find(p=>p.id==='house-router')!;
export const RATNA_HOUSE: GameLocation = {
    id: 'house',
    name: 'Rumah Ibu Ratna',
    subtitle: 'Jl. Melati Raya No. 12 (Tidak ada toolkit di lokasi)',
    cols: 18,
    rows: 12,
    tiles: HOUSE_MAP,
    props: HOUSE_PROPS,
    npcs: HOUSE_NPCS,
    floorCables: HOUSE_CABLES,
    spawn: { x: 9.2, y: 9.6 },
};
