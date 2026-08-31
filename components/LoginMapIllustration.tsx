// Decorativo: no es un mapa real, es una postal de lo que hace el producto
// (dibujar una zona, encontrar negocios adentro) usando los mismos colores
// que el mapa real (ver components/MapCanvas.tsx: zona en primary #674bb5,
// markers enriquecidos en secondary #006c4b, básicos en tertiary #855316).
// A propósito NO hay ninguna forma rectangular/alineada a ejes: cualquier
// bloque o grilla, por más irregular que sea, se termina leyendo como
// papel cuadriculado. Calles curvas + una costa alcanzan para que esto se
// lea como mapa sin caer en eso.
export default function LoginMapIllustration() {
  return (
    <svg viewBox="0 0 480 480" className="h-full w-full" role="img" aria-hidden="true">
      <rect width="480" height="480" rx="24" fill="var(--color-surface-container-low)" />

      {/* Costa: agua en la esquina, como el celeste del basemap real de Esri */}
      <path
        d="M 480 290 C 415 300 375 355 400 410 C 415 445 445 465 480 462 L 480 480 L 320 480 C 300 430 305 360 340 300 C 370 250 430 230 480 240 Z"
        fill="#8ec5d6"
        fillOpacity="0.35"
      />

      {/* Calles: curvas y en ángulos distintos entre sí, no una grilla */}
      <g fill="none" stroke="var(--color-outline-variant)" strokeWidth="3" strokeLinecap="round" opacity="0.8">
        <path d="M -10 100 C 90 70, 180 140, 260 110 C 340 80, 400 60, 490 90" />
        <path d="M -10 260 C 110 290, 200 230, 300 260 C 370 280, 420 250, 490 270" />
        <path d="M 60 -10 C 40 90, 110 160, 90 260 C 70 340, 120 400, 100 490" />
        <path d="M 350 -10 C 380 70, 320 140, 350 220" />
      </g>

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
        { x: 255, y: 390, color: '#855316' },
        { x: 130, y: 400, color: '#006c4b' },
      ].map((m, i) => (
        <circle key={i} cx={m.x} cy={m.y} r="7" fill={m.color} stroke="#ffffff" strokeWidth="2" />
      ))}
    </svg>
  );
}
