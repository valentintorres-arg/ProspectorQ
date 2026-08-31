// Decorativo: no es un mapa real, es una postal de lo que hace el producto
// (dibujar una zona, encontrar negocios adentro) usando los mismos colores
// que el mapa real (ver components/MapCanvas.tsx: zona en primary #674bb5,
// markers enriquecidos en secondary #006c4b, básicos en tertiary #855316).
// Los bloques son a mano y de tamaño irregular a propósito: una grilla
// pareja se lee como papel cuadriculado/waffle, no como una ciudad.
const BLOCKS: [number, number, number, number][] = [
  [20, 20, 140, 65],
  [180, 15, 115, 50],
  [315, 20, 145, 90],
  [15, 105, 85, 115],
  [415, 90, 50, 165],
  [365, 140, 75, 60],
  [20, 245, 105, 75],
  [365, 225, 95, 95],
  [150, 375, 135, 85],
  [300, 345, 150, 115],
  [20, 335, 95, 125],
];

export default function LoginMapIllustration() {
  return (
    <svg viewBox="0 0 480 480" className="h-full w-full" role="img" aria-hidden="true">
      <rect width="480" height="480" rx="24" fill="var(--color-surface-container-low)" />

      {BLOCKS.map(([x, y, width, height], i) => (
        <rect
          key={i}
          x={x}
          y={y}
          width={width}
          height={height}
          rx="16"
          fill="var(--color-surface-container)"
        />
      ))}

      {/* Zona dibujada por el usuario */}
      <path
        d="M 130 150 L 300 110 L 360 220 L 320 320 L 170 340 L 110 250 Z"
        fill="#674bb5"
        fillOpacity="0.18"
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
