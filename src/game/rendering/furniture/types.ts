import type { MapProp } from '../../types';

/** Pixel bounds supplied by the shared prop renderer. Labels/highlights stay there. */
export interface FurnitureDrawArgs {
  ctx: CanvasRenderingContext2D;
  px: number; py: number; pw: number; ph: number;
  prop: MapProp;
  time: number;
}
