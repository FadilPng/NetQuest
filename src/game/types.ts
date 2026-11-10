export type Direction = 'down' | 'up' | 'left' | 'right';

export type PlayerAvatar = 'raka' | 'rina';

export type CableType = 'none' | 'straight' | 'crossover' | 'console';

export type LocationId = 'base' | 'house' | 'office';

export type DeviceId =
  | 'toolbench'
  | 'bookshelf'
  | 'pc-work'
  | 'laptop-ratna'
  | 'rt-ratna'
  | 'pc-sari'
  | 'pc-dimas'
  | 'sw1'
  | 'r1'
  | 'srv-fin'
  | 'ap-lounge'
  | 'coffee-machine';

export interface CraftedCableItem {
  id: string;
  type: 'straight' | 'crossover';
  lengthMeters: number;
  createdAt: number;
  /** Kabel rakitan sendiri bisa salah urutan / split pair / konektor terbalik */
  faulty?: boolean;
  faultReason?: string;
  /** Sudah diuji pakai LAN tester? (kalau belum, kerusakan baru ketahuan saat dipasang) */
  tested?: boolean;
}

/** Potongan kabel UTP yang sudah digunting dari roll tapi belum selesai di-crimp
 *  (disimpan di tas agar tidak hilang kalau player menutup meja di tengah jalan) */
export interface UnfinishedCableItem {
  id: string;
  lengthMeters: number;
  plan: 'straight' | 'crossover';
  end1?: { order: string[]; flipped: boolean };
  end2?: { order: string[]; flipped: boolean };
  createdAt: number;
}

export interface TechnicianInventory {
  hasCrimper: boolean;
  hasLanTester: boolean;
  hasConsoleCable: boolean;
  hasMeasuringTape: boolean;
  utpRollMeters: number;
  rj45Connectors: number;
  cables: CraftedCableItem[];
  unfinishedCables: UnfinishedCableItem[];
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  kind: 'tool' | 'material';
  /** Untuk bahan: berapa unit yang didapat per pembelian (meter / pcs) */
  unitAmount?: number;
  unitLabel?: string;
}

export interface InterfaceState {
  name: string;
  shortName: string;
  connectedTo: string | null;
  cableType: CableType;
  adminUp: boolean;
  lineProtocolUp: boolean;
  cableFaulty?: boolean;
  ipAddress: string;
  subnetMask: string;
  vlan?: number;
  description?: string;
}

export interface VlanEntry {
  id: number;
  name: string;
  ports: string[];
}

export interface NetworkDevice {
  id: DeviceId;
  name: string;
  hostname: string;
  type: 'pc' | 'switch' | 'router' | 'server' | 'ap' | 'toolbench' | 'coffee';
  zone: string;
  x: number;
  y: number;
  widthTiles: number;
  heightTiles: number;
  ipAddress?: string;
  subnetMask?: string;
  defaultGateway?: string;
  cableConnected: boolean;
  cableType: CableType;
  installedCableMeters?: number;
  requiredCableMeters?: number;
  uplinkDeviceName?: string;
  uplinkPortLabel?: string;
  consoleConnected?: boolean;
  autoMdix?: boolean;
  powered?: boolean;
  powerSource?: 'dc' | 'ac' | 'poe';
  interfaces: Record<string, InterfaceState>;
  vlans?: Record<number, VlanEntry>;
  wifiSsid?: string;
  wifiActive?: boolean;
}

export interface PacketVisual {
  id: string;
  path: Array<{ x: number; y: number }>;
  progress: number;
  speed: number;
  color: string;
  label: string;
}

export interface NPC {
  id: string;
  name: string;
  role: string;
  division: string;
  x: number;
  y: number;
  direction: Direction;
  shirtColor: string;
  accentColor: string;
  hairColor: string;
  hasGlasses?: boolean;
  hasHeadset?: boolean;
  isFemale?: boolean;
}

export interface MapProp {
  /** Attached tabletop objects retain world coordinates and move with their parent. */
  parentId?: string;
  /** Clockwise orientation; w/h always describe the occupied world bounds. */
  rotation?: 0 | 90 | 180 | 270;
  id: string;
  kind:
    | 'desk-pc'
    | 'desk-laptop'
    | 'desk-empty'
    | 'server-rack'
    | 'cisco-switch-rack'
    | 'cisco-router-rack'
    | 'toolbench'
    | 'ap-stand'
    | 'plant-monstera'
    | 'plant-snake'
    | 'coffee-station'
    | 'water-cooler'
    | 'sofa'
    | 'coffee-table'
    | 'whiteboard'
    | 'server-unit'
    | 'home-router'
    | 'tv-unit'
    | 'bookshelf'
    | 'kitchenette'
    | 'bed'
    | 'entry-door'
    | 'router-item' | 'wood-table' | 'chair' | 'laptop-item' | 'monitor-item' | 'printer-item' | 'desk-lamp' | 'book-stack' | 'cup-tray'
    | 'printer-table' | 'wardrobe' | 'dining-set'
    | 'washbasin' | 'toilet' | 'shower'
    | 'pkk-board' | 'family-photo' | 'chair-stack' | 'door-threshold';
  x: number;
  y: number;
  w: number;
  h: number;
  solid: boolean;
  deviceId?: DeviceId;
  label?: string;
}

export interface FloorCableSegment {
  id: string;
  fromDevice: DeviceId;
  toDevice: DeviceId;
  points: Array<{ x: number; y: number }>;
}

/** Axis-aligned wall centerline in tile coordinates; gaps between segments are doors. */
export interface WallSegment {
  id: string;
  x1: number; y1: number; x2: number; y2: number;
  thickness: number;
}

export interface GameLocation {
  id: LocationId;
  name: string;
  subtitle: string;
  cols: number;
  rows: number;
  tiles: number[][];
  props: MapProp[];
  npcs: NPC[];
  floorCables: FloorCableSegment[];
  walls?: WallSegment[];
  roomLabels?: Array<{ text: string; x: number; y: number }>;
  spawn: { x: number; y: number };
}

export interface MissionStep {
  id: number;
  title: string;
  shortTask: string;
  category: string;
  requesterNpcId: string;
  location: LocationId;
  locationLabel: string;
  targetDeviceIds: DeviceId[];
  xpReward: number;
  fee: string;
  briefing: string[];
  ciscoConceptTitle: string;
  ciscoConceptBody: string;
  recommendedCommand?: string;
}

export interface DialogueBoxState {
  speakerName: string;
  speakerRole: string;
  speakerId: string;
  lines: string[];
  currentLineIndex: number;
  actionButtonText?: string;
  onAction?: () => void;
}
