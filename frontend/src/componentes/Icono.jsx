/* Íconos de línea del diseño de Figma Make (docs/diseno/figma-make). Son decorativos: aria-hidden. */
const TRAZOS = {
  flecha: <path d="m9 18 6-6-6-6" />,
  campana: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  reloj: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  ojo: (
    <>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  archivo: (
    <>
      <path d="M6 2h8l4 4v16H6z" />
      <path d="M14 2v5h5M9 12h6M9 16h6" />
    </>
  ),
  inicio: (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10M9 20v-6h6v6" />
    </>
  ),
  candado: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  correo: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  mas: <path d="M12 5v14M5 12h14" />,
  perfil: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  escudo: (
    <>
      <path d="M12 2 20 5v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" />
      <path d="m8.5 12 2.2 2.2 4.8-5" />
    </>
  ),
  usuario: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
    </>
  ),
  salir: (
    <>
      <path d="M15 4h4v16h-4" />
      <path d="M10 8l-4 4 4 4M6 12h10" />
    </>
  ),
  cerrar: <path d="M6 6l12 12M18 6 6 18" />,
};

export function Icono({ nombre, tamano = 20 }) {
  return (
    <svg aria-hidden="true" focusable="false" fill="none" width={tamano} height={tamano} viewBox="0 0 24 24"
      stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
      {TRAZOS[nombre]}
    </svg>
  );
}

export function Marca({ clara = false }) {
  return (
    <div className={`marca${clara ? ' marca--clara' : ''}`}>
      <span className="marca__logo">
        <Icono nombre="escudo" tamano={23} />
      </span>
      <span className="marca__texto">
        <span className="marca__nombre">MESA DE SERVICIOS</span>
        <span className="marca__sub">UNIVERSITARIOS · UNMSM</span>
      </span>
    </div>
  );
}

export function Avatar({ nombre, tamano = 'normal' }) {
  const iniciales = (nombre ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
  return (
    <span className={`avatar avatar--${tamano}`} aria-hidden="true">
      {iniciales}
    </span>
  );
}
