/**
 * Ilustraciones dibujadas en código, para no depender de archivos de imagen
 * mientras no tengamos las fotos reales de planta y de los controladores.
 * Cuando lleguen las fotos, estos componentes se reemplazan por <img>.
 */

export function FotoPlanta({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 200" className={className} preserveAspectRatio="xMidYMid slice" aria-label="Vista de planta">
      <defs>
        <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1b3a6b" />
          <stop offset="45%" stopColor="#7a5a7d" />
          <stop offset="75%" stopColor="#d98b52" />
          <stop offset="100%" stopColor="#f0b070" />
        </linearGradient>
        <linearGradient id="suelo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16233f" />
          <stop offset="100%" stopColor="#0b1428" />
        </linearGradient>
      </defs>
      <rect width="480" height="200" fill="url(#cielo)" />
      <circle cx="330" cy="132" r="16" fill="#ffd9a0" opacity="0.75" />
      <g fill="#1a2b4a" opacity="0.92">
        <rect x="18" y="96" width="26" height="76" />
        <rect x="24" y="72" width="6" height="26" />
        <rect x="52" y="112" width="38" height="60" />
        <rect x="98" y="60" width="14" height="112" />
        <rect x="92" y="54" width="26" height="8" />
        <rect x="126" y="120" width="52" height="52" />
        <rect x="186" y="88" width="18" height="84" />
        <rect x="212" y="104" width="44" height="68" />
        <rect x="264" y="130" width="60" height="42" />
        <rect x="286" y="86" width="10" height="46" />
        <rect x="334" y="110" width="34" height="62" />
        <rect x="376" y="126" width="46" height="46" />
        <rect x="430" y="98" width="16" height="74" />
        <rect x="424" y="92" width="28" height="8" />
      </g>
      <g stroke="#243a5e" strokeWidth="1.5" opacity="0.8">
        <path d="M0 118h480M0 100h480" />
      </g>
      <g fill="#ffc629" opacity="0.85">
        <rect x="60" y="122" width="3" height="4" /><rect x="70" y="122" width="3" height="4" />
        <rect x="134" y="132" width="3" height="4" /><rect x="146" y="132" width="3" height="4" />
        <rect x="158" y="142" width="3" height="4" /><rect x="222" y="118" width="3" height="4" />
        <rect x="236" y="118" width="3" height="4" /><rect x="274" y="142" width="3" height="4" />
        <rect x="292" y="142" width="3" height="4" /><rect x="344" y="124" width="3" height="4" />
        <rect x="386" y="138" width="3" height="4" /><rect x="400" y="138" width="3" height="4" />
      </g>
      <rect y="168" width="480" height="32" fill="url(#suelo)" />
    </svg>
  );
}

export function FotoControlador({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 210" className={className} aria-label="Controlador">
      <rect x="4" y="4" width="292" height="202" rx="10" fill="#1c1c1e" />
      <rect x="10" y="10" width="280" height="190" rx="7" fill="#2a2a2d" />
      <text x="26" y="34" fill="#e6e6e8" fontSize="13" fontWeight="700" fontFamily="sans-serif">
        InteliGen 4 200
      </text>
      <text x="274" y="34" fill="#e6e6e8" fontSize="13" fontWeight="700" fontFamily="sans-serif" textAnchor="end">
        ComAp
      </text>
      <rect x="26" y="46" width="150" height="86" rx="3" fill="#8fa38b" />
      <rect x="30" y="50" width="142" height="78" rx="2" fill="#9db398" />
      <g fill="#2f3d2c" fontFamily="monospace" fontSize="7">
        <text x="36" y="62">GEN 480V  60.0Hz</text>
        <text x="36" y="74">kW  412   PF 0.92</text>
        <text x="36" y="86">RPM 1800  BAT 27.4</text>
        <text x="36" y="98">OIL 62psi  T 84C</text>
        <text x="36" y="110">MODE AUTO  SYNC OK</text>
        <text x="36" y="122">RUN 5430 h</text>
      </g>
      <g>
        <rect x="188" y="48" width="24" height="18" rx="3" fill="#3a3a3d" />
        <rect x="220" y="48" width="24" height="18" rx="3" fill="#3a3a3d" />
        <rect x="252" y="48" width="24" height="18" rx="3" fill="#3a3a3d" />
        <rect x="188" y="72" width="24" height="18" rx="3" fill="#3a3a3d" />
        <rect x="220" y="72" width="24" height="18" rx="3" fill="#3a3a3d" />
        <rect x="252" y="72" width="24" height="18" rx="3" fill="#3a3a3d" />
        <rect x="188" y="96" width="24" height="18" rx="3" fill="#3a3a3d" />
        <rect x="220" y="96" width="24" height="18" rx="3" fill="#3a3a3d" />
        <rect x="252" y="96" width="24" height="18" rx="3" fill="#3a3a3d" />
      </g>
      <g>
        <rect x="26" y="146" width="30" height="22" rx="4" fill="#1f6f3f" />
        <rect x="64" y="146" width="30" height="22" rx="4" fill="#3a3a3d" />
        <rect x="102" y="146" width="30" height="22" rx="4" fill="#3a3a3d" />
        <rect x="140" y="146" width="30" height="22" rx="4" fill="#b02a2a" />
        <rect x="26" y="174" width="30" height="18" rx="4" fill="#1f6f3f" />
        <rect x="188" y="146" width="40" height="22" rx="4" fill="#3a3a3d" />
        <rect x="236" y="146" width="40" height="22" rx="4" fill="#b02a2a" />
      </g>
      <g fill="#8a8a8f" fontFamily="sans-serif" fontSize="6">
        <text x="41" y="160" textAnchor="middle">START</text>
        <text x="153" y="160" textAnchor="middle">STOP</text>
        <text x="208" y="160" textAnchor="middle">MODE</text>
        <text x="256" y="160" textAnchor="middle">FAULT</text>
      </g>
      <circle cx="278" cy="182" r="4" fill="#2fbf5f" />
      <circle cx="262" cy="182" r="4" fill="#ffc629" />
    </svg>
  );
}
