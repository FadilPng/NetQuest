import type { GameLocation, LocationId, NPC } from '../types';
import { NETQUEST_OFFICE } from './netquestOffice';
import { RATNA_HOUSE } from './ratnaHouse';
import { NUSANTARA_OFFICE } from './nusantaraOffice';

export { OFFICE_MAP } from './nusantaraOffice';

export const LOCATIONS: Record<LocationId, GameLocation> = {
  base: NETQUEST_OFFICE,
  house: RATNA_HOUSE,
  office: NUSANTARA_OFFICE,
};

export const ALL_NPCS: NPC[] = [
  ...NETQUEST_OFFICE.npcs,
  ...RATNA_HOUSE.npcs,
  ...NUSANTARA_OFFICE.npcs,
];

export function getMissionRequester(npcId: string): NPC {
  return ALL_NPCS.find(n => n.id === npcId) || ALL_NPCS[0];
}
