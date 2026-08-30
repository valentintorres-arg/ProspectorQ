// Decorativo: no es un mapa real, es una postal de lo que hace el producto
// (dibujar una zona, encontrar negocios adentro) usando los mismos colores
// que el mapa real (ver components/MapCanvas.tsx: zona en primary #674bb5,
// markers enriquecidos en secondary #006c4b, básicos en tertiary #855316).
export default function LoginMapIllustration() {
  return (
    <svg
      viewBox="0 0 480 480"
      className="h-full w-full"
      role="img"
      aria-hidden="true"
    >
      <rect width="480" height="480" rx="24" fill="var(--color-surface-container-low)" />

      {/* Calles: una grilla irregular, apenas visible, para sugerir un mapa sin dibujar una ciudad real */}
      <g stroke="var(--color-outline-variant)" strokeWidth="1.5" opacity="0.5">
        <line x1="0" y1="90" x2="480" y2="80" />
        <line x1="0" y1="200" x2="480" y2="210" />
        <line x1="0" y1="340" x2="480" y2="330" />
        <line x1="0" y1="420" x2="480" y2="425" />
        <line x1="70" y1="0" x2="60" y2="480" />
        <line x1="170" y1="0" x2="180" y2="480" />
        <line x1="300" y1="0" x2="290" y2="480" />
        <line x1="410" y1="0" x2="420" y2="480" />
      </g>

      {/* Zona dibujada por el usuario */}
      <path
        d="M 130 150 L 300 110 L 360 220 L 320 320 L 170 340 L 110 250 Z"
        fill="#674bb5"
        fillOpacity="0.15"
        stroke="#674bb5"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Vértices de la zona, como al dibujarla a mano en /mapa */}
      {[
        [130, 150],
        [300, 110],
        [360, 220],
        [320, 320],
        [170, 340],
        [110, 250],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="5" fill="#ffffff" stroke="#674bb5" strokeWidth="2.5" />
      ))}

      {/* Negocios encontrados: más concentrados adentro de la zona que afuera */}
      {[
        { x: 195, y: 190, color: '#006c4b' },
        { x: 250, y: 165, color: '#855316' },
        { x: 230, y: 240, color: '#006c4b' },
        { x: 285, y: 255, color: '#006c4b' },
        { x: 175, y: 270, color: '#855316' },
        { x: 245, y: 300, color: '#006c4b' },
        { x: 60, y: 90, color: '#855316' },
        { x: 410, y: 380, color: '#855316' },
        { x: 400, y: 100, color: '#006c4b' },
      ].map((m, i) => (
        <circle key={i} cx={m.x} cy={m.y} r="7" fill={m.color} stroke="#ffffff" strokeWidth="2" />
      ))}
    </svg>
  );
}
