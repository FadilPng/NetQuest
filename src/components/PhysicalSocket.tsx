export type SocketKind = 'ethernet' | 'console' | 'usb-a' | 'hdmi' | 'dc' | 'audio';

/** Generic connector geometry, not a scale drawing or wiring/pinout diagram. */
export function PhysicalSocket({ kind, link = false }: { kind: SocketKind; link?: boolean }) {
  const modular = kind === 'ethernet' || kind === 'console';
  return <svg className="nq-socket" viewBox="0 0 120 76" role="img" aria-label={modular ? `${kind === 'console' ? 'Console serial' : 'Ethernet'}: soket modular 8P8C, delapan kontak` : kind === 'usb-a' ? 'Soket USB Type-A dengan lidah konektor' : kind === 'hdmi' ? 'Soket HDMI Type-A berbentuk trapesium' : kind === 'dc' ? 'Soket daya DC barrel bulat' : 'Soket audio 3,5 mm'}>
    {modular ? <>
      <rect x="18" y="12" width="84" height="54" rx="3" fill={kind === 'console' ? '#80bfcf' : '#aab1b5'} stroke="#dce3e6" strokeWidth="2"/>
      <path d="M27 21 H93 V49 H75 V58 H45 V49 H27 Z" fill="#10171c" stroke="#59646a" strokeWidth="2"/>
      {Array.from({length:8}, (_, i) => <path key={i} d={`M${35+i*7} 23 v17`} stroke="#d4af57" strokeWidth="2.6"/>)}
      <path d="M47 55 H73" stroke="#59646a" strokeWidth="2"/>
      {kind === 'ethernet' && <><rect x="21" y="14" width="10" height="5" rx="1" fill={link ? '#63df79' : '#283b2b'}/><rect x="89" y="14" width="10" height="5" rx="1" fill="#483c1c"/></>}
    </> : kind === 'usb-a' ? <>
      <rect x="17" y="24" width="86" height="32" rx="2" fill="#acb3b8" stroke="#e0e6e9" strokeWidth="2"/>
      <rect x="23" y="29" width="74" height="22" fill="#12181c"/>
      <rect x="27" y="39" width="66" height="9" rx="1" fill="#276f9b"/>
      <path d="M35 40v6 M48 40v6 M61 40v6 M74 40v6" stroke="#c8b36c" strokeWidth="3"/>
    </> : kind === 'hdmi' ? <>
      <path d="M17 23 H103 V43 L91 55 H29 L17 43Z" fill="#b2b9bf" stroke="#e1e6e9" strokeWidth="2"/>
      <path d="M24 29 H96 V41 L87 49 H33 L24 41Z" fill="#11171b"/>
      <path d="M31 37 H89" stroke="#525b62" strokeWidth="6"/>
      {Array.from({length:10}, (_, i)=><path key={i} d={`M${34+i*5.7} 34v6`} stroke="#b9a166" strokeWidth="1.3"/>)}
    </> : <>
      <circle cx="60" cy="38" r={kind === 'dc' ? 23 : 17} fill={kind === 'audio' ? '#77a782' : '#9ca5ab'} stroke="#dce2e6" strokeWidth="2"/>
      <circle cx="60" cy="38" r={kind === 'dc' ? 16 : 11} fill="#0b1014"/>
      {kind === 'dc' && <circle cx="60" cy="38" r="4" fill="#b8bec2"/>}
    </>}
  </svg>;
}
