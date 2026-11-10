import type { GameLocation, NPC } from '../types';

// Tile legend:
// 0 = Warm wood parquet
// 1 = Solid wall
// 2 = Server room anti-static floor
// 3 = Kitchen / ceramic tile
// 4 = Carpet / rug
// 5 = Glass partition
const BASE_MAP: number[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 4, 4, 4, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 4, 4, 4, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 4, 4, 4, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 4, 4, 4, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

const BASE_NPCS: NPC[] = [
  {
    id: 'npc-nadia',
    name: 'Nadia',
    role: 'Koordinator Lapangan',
    division: 'NetQuest HQ',
    x: 7.6,
    y: 4.6,
    direction: 'down',
    shirtColor: '#B45309',
    accentColor: '#FDE68A',
    hairColor: '#292524',
    isFemale: true,
    hasGlasses: true,
  },
];

const BASE_PROPS: GameLocation['props'] = [
  {
    id: 'base-toolbench',
    kind: 'toolbench',
    x: 1.3,
    y: 1.3,
    w: 2.6,
    h: 1.35,
    solid: true,
    deviceId: 'toolbench',
    label: 'Meja Crimping',
  },
  {
    id: 'base-whiteboard',
    kind: 'whiteboard',
    x: 4.6,
    y: 1.1,
    w: 2,
    h: 0.9,
    solid: true,
    label: 'Papan Jadwal Klien',
  },
  {
    id: 'base-bookshelf',
    kind: 'bookshelf',
    deviceId: 'bookshelf',
    x: 7.1,
    y: 1.1,
    w: 1.9,
    h: 0.85,
    solid: true,
    label: 'Rak Buku Jaringan',
  },
  {
    id: 'base-desk',
    kind: 'desk-pc',
    x: 10.7,
    y: 1.4,
    w: 2,
    h: 1.4,
    solid: true,
    deviceId: 'pc-work',
    label: 'PC Admin NetQuest',
  },
  {
    id: 'base-coffee',
    kind: 'coffee-station',
    x: 13.5,
    y: 1.2,
    w: 1.7,
    h: 1.2,
    solid: true,
    deviceId: 'coffee-machine',
    label: 'Mesin Kopi',
  },
  {
    id: 'base-sofa',
    kind: 'sofa',
    x: 11.9,
    y: 6.9,
    w: 2.5,
    h: 1.2,
    solid: true,
  },
  {
    id: 'base-table',
    kind: 'coffee-table',
    x: 12.4,
    y: 8.6,
    w: 1.7,
    h: 1,
    solid: true,
  },
  {
    id: 'base-plant-1',
    kind: 'plant-monstera',
    x: 1.1,
    y: 8.7,
    w: 1,
    h: 1,
    solid: true,
  },
  {
    id: 'base-plant-2',
    kind: 'plant-snake',
    x: 14.3,
    y: 5.3,
    w: 1,
    h: 1,
    solid: true,
  },
  {
    id: 'base-water',
    kind: 'water-cooler',
    x: 14.3,
    y: 3.3,
    w: 1,
    h: 1,
    solid: true,
  },
];

export const NETQUEST_OFFICE: GameLocation = {
  id: 'base',
  name: 'Kantor NetQuest (Base)',
  subtitle: 'Gudang alat & meja crimping — Ruko Melati No. 3',
  cols: 16,
  rows: 11,
  tiles: BASE_MAP,
  props: BASE_PROPS,
  npcs: BASE_NPCS,
  floorCables: [],
  spawn: { x: 7.6, y: 7.6 },
};
