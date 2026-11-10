export const T568B = ['wo', 'o', 'wg', 'b', 'wb', 'g', 'wbr', 'br'];
export const T568A = ['wg', 'g', 'wo', 'b', 'wb', 'o', 'wbr', 'br'];
export interface CableEnd { order: string[]; flipped: boolean }
export interface CableTestResult {
  ok: boolean;
  testerOk: boolean;
  kind: 'straight' | 'crossover' | 'split' | 'miswire' | 'nonstandard';
  map: number[];
  text: string;
  faultReason?: string;
}
const same = (a: string[], b: string[]) => a.join() === b.join();
const pair = (color: string) => color.replace(/^w/, '');
const intactPairs = (order: string[]) => [[0,1],[2,5],[3,4],[6,7]].every(([a,b]) => pair(order[a]) === pair(order[b]));
export function evaluateCable(data: { 1?: CableEnd; 2?: CableEnd }): CableTestResult {
  const effective = (end?: CableEnd) => end ? (end.flipped ? [...end.order].reverse() : [...end.order]) : [];
  const a = effective(data[1]); const b = effective(data[2]);
  const valid = (o: string[]) => o.length === 8 && new Set(o).size === 8 && o.every(c => T568A.includes(c));
  const map = a.map(color => b.indexOf(color));
  if (!valid(a) || !valid(b)) return { ok: false, testerOk: false, kind: 'miswire', map, text: 'Wire map tidak lengkap.', faultReason: 'Terminasi tidak lengkap.' };
  const straight = same(a,b);
  const standardStraight = straight && (same(a,T568A) || same(a,T568B));
  const crossover = (same(a,T568A) && same(b,T568B)) || (same(a,T568B) && same(b,T568A));
  if (standardStraight || crossover) return { ok: true, testerOk: true, kind: crossover ? 'crossover' : 'straight', map,
    text: crossover ? 'Master 1–8 → Remote 3, 6, 1, 4, 5, 2, 7, 8. Pemetaan crossover dua pasang (10/100BASE-TX).' : 'Master 1–8 → Remote 1–8. Kontinuitas lurus; hasil ini bukan sertifikasi kategori atau performa kabel.' };
  if (straight) {
    const split = !intactPairs(a);
    return { ok: false, testerOk: true, kind: split ? 'split' : 'nonstandard', map,
      text: 'Master 1–8 → Remote 1–8. Kontinuitas lurus; hasil ini bukan sertifikasi kategori atau performa kabel.',
      faultReason: split ? 'Split pair: pasangan pilin tidak mengikuti pasangan pin Ethernet.' : 'Terminasi tidak mengikuti T568A/B yang disyaratkan lab; bukan berarti split pair.' };
  }
  return { ok: false, testerOk: false, kind: 'miswire', map, text: `Master 1–8 → Remote ${map.map(n => n+1).join(', ')}.`, faultReason: 'Pemetaan pin bukan straight atau crossover dua pasang yang didukung lab.' };
}
