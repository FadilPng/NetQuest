import type {MapProp} from '../game/types';
import {splitCompactFurniture} from '../game/locations/compactFurniture';
export function migrateFurniture(input:MapProp[],base:MapProp[]):MapProp[]{
 if(!base.some(p=>p.id==='house-study-table'))return input;
 return splitCompactFurniture(input);
}
