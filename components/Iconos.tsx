/**
 * Iconografía técnica.
 *
 * Trazo, no relleno: el mismo lenguaje de un diagrama de planta. Se usan
 * en las cabeceras de panel (en amarillo sobre azul) y junto a cada dato,
 * para que el ojo encuentre el campo sin leer la etiqueta.
 */

type P = { className?: string };
const base = "w-4 h-4";
const trazo = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const IcoMotor = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" {...trazo}>
    <path d="M4 14v-3h3l2-3h5l1 3h3l2 2v5H5" />
    <path d="M9 8V5h5v3" />
    <circle cx="8" cy="18" r="1.6" />
    <circle cx="17" cy="18" r="1.6" />
  </svg>
);

export const IcoGenerador = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" {...trazo}>
    <rect x="3" y="7" width="18" height="11" rx="1.5" />
    <path d="M7 7V4h10v3M6 18v2M18 18v2" />
    <path d="M11 10l-1.5 3h2L11 15.5 13.5 12h-2L13 10z" />
  </svg>
);

export const IcoRayo = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2Z" />
  </svg>
);

export const IcoCombustible = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" {...trazo}>
    <path d="M3 21h11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2Z" />
    <path d="M3 10h11" />
    <path d="M14 9h2a2 2 0 0 1 2 2v5a2 2 0 0 0 4 0V9l-3-3" />
  </svg>
);

export const IcoReloj = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" {...trazo}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </svg>
);

export const IcoChip = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" {...trazo}>
    <rect x="6.5" y="6.5" width="11" height="11" rx="1" />
    <path d="M10 3v3.5M14 3v3.5M10 17.5V21M14 17.5V21M3 10h3.5M3 14h3.5M17.5 10H21M17.5 14H21" />
  </svg>
);

export const IcoRed = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" {...trazo}>
    <rect x="8" y="3" width="8" height="5" rx="1" />
    <rect x="2" y="16" width="7" height="5" rx="1" />
    <rect x="15" y="16" width="7" height="5" rx="1" />
    <path d="M12 8v4M12 12H5.5v4M12 12h6.5v4" />
  </svg>
);

export const IcoLlave = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" {...trazo}>
    <circle cx="8" cy="15" r="4" />
    <path d="M11 12l6.5-6.5M15 4h5v5" />
  </svg>
);

export const IcoHerramienta = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" {...trazo}>
    <path d="M14.5 6.5a3.5 3.5 0 0 0 4.6 4.6l-8.7 8.7a2 2 0 0 1-2.8-2.8Z" />
    <path d="m16.5 3 4.5 4.5" />
  </svg>
);

export const IcoPlaca = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" {...trazo}>
    <rect x="3" y="5" width="18" height="14" rx="1.5" />
    <path d="M7 9.5h6M7 13h10M17.5 9.5h.01" />
  </svg>
);

export const IcoUbicacion = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" {...trazo}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="2.8" />
  </svg>
);

export const IcoCamara = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" {...trazo}>
    <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2l1.3-2h7l1.3 2h2.2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-14A1.5 1.5 0 0 1 3 17.5Z" />
    <circle cx="11.5" cy="12.5" r="3.2" />
  </svg>
);

export const IcoDisco = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" {...trazo}>
    <ellipse cx="12" cy="6" rx="8.5" ry="3" />
    <path d="M3.5 6v12c0 1.7 3.8 3 8.5 3s8.5-1.3 8.5-3V6" />
    <path d="M3.5 12c0 1.7 3.8 3 8.5 3s8.5-1.3 8.5-3" />
  </svg>
);

export const IcoDocumento = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" {...trazo}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
    <path d="M14 3v5h5M8.5 13h7M8.5 16.5h4.5" />
  </svg>
);

export const IcoCarpeta = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" {...trazo}>
    <path d="M3 7a2 2 0 0 1 2-2h3.5l2 2.5H19a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
  </svg>
);

export const IcoCodigoQR = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" {...trazo}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3v3M20.5 14v.01M17 20.5h.01M20.5 20.5v.01M20.5 17v.01" />
  </svg>
);

export const IcoLapiz = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" {...trazo}>
    <path d="M4 20h4L20 8a2.8 2.8 0 0 0-4-4L4 16Z" />
    <path d="m14.5 5.5 4 4" />
  </svg>
);

export const IcoLupa = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" {...trazo}>
    <circle cx="11" cy="11" r="7.5" />
    <path d="m21 21-4.6-4.6" />
  </svg>
);

export const IcoFlecha = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" {...trazo}>
    <path d="M5 12h13M13 6.5 18.5 12 13 17.5" />
  </svg>
);

export const IcoDescarga = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" {...trazo}>
    <path d="M12 3v11M7.5 10 12 14.5 16.5 10M4 19.5h16" />
  </svg>
);

export const IcoSubida = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" {...trazo}>
    <path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9M4 19.5h16" />
  </svg>
);

export const IcoTermometro = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" {...trazo}>
    <path d="M14 14.8V5a2 2 0 1 0-4 0v9.8a4 4 0 1 0 4 0Z" />
    <path d="M12 17.5v.01" />
  </svg>
);

export const IcoGaleria = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" {...trazo}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="8.5" cy="10" r="1.6" />
    <path d="m4 17 4.5-4.5 3 3L15 12l5 5" />
  </svg>
);

export const IcoLista = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" {...trazo}>
    <path d="M9 6h12M9 12h12M9 18h12" />
    <path d="m3 6 1.2 1.2L6.5 5M3 12l1.2 1.2L6.5 11M3 18l1.2 1.2L6.5 16" />
  </svg>
);

export const IcoBandera = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" {...trazo}>
    <path d="M5 21V4M5 4h11l-1.5 4L16 12H5" />
  </svg>
);

export const IcoPersona = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" {...trazo}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </svg>
);
