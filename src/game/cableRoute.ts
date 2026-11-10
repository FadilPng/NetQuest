export interface RoutePoint { x: number; y: number }
export const routeMeters = (points: RoutePoint[]): number => points.slice(1).reduce((sum, point, i) => sum + Math.hypot(point.x-points[i].x, point.y-points[i].y)*0.5, 0);

/** Retrace existing cable instead of charging more cable for walking backwards. */
export function advanceCableRoute(points: RoutePoint[], next: RoutePoint): RoutePoint[] {
  if (!points.length) return [{...next}];
  const tip = points[points.length-1];
  if (Math.hypot(next.x-tip.x,next.y-tip.y)<1e-6) return points;
  for (let i=points.length-2;i>=0;i--) {
    const a=points[i], b=points[i+1], dx=b.x-a.x, dy=b.y-a.y;
    const squared=dx*dx+dy*dy;
    if (squared<1e-9) continue;
    const t=((next.x-a.x)*dx+(next.y-a.y)*dy)/squared;
    if (t < 0 || t > 1) continue;
    const distance=Math.hypot(next.x-(a.x+t*dx),next.y-(a.y+t*dy));
    if(distance <= 0.06) return [...points.slice(0,i+1),{...next}];
  }
  if(points.length>=2) {
    const a=points[points.length-2], dx=tip.x-a.x, dy=tip.y-a.y;
    const ex=next.x-tip.x, ey=next.y-tip.y;
    if (dx*ex+dy*ey>=0 && Math.abs(dx*ey-dy*ex)<1e-5) return [...points.slice(0,-1),{...next}];
  }
  return [...points,{...next}];
}
export function completedCableRoute(trail: RoutePoint[], player: RoutePoint, target: RoutePoint): RoutePoint[] {
  return [...trail, {x:player.x,y:player.y}, target].filter((p,i,points)=> i===0 || Math.hypot(p.x-points[i-1].x,p.y-points[i-1].y)>1e-6);
}
export const measuredCableMeters = (route: RoutePoint[]) => Math.ceil((routeMeters(route)-1e-9)*2)/2;
export const cableFits = (route: RoutePoint[], length: number) => routeMeters(route) <= length + 1e-6;
