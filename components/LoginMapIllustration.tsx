// Decorativo, pero basado en un lugar real: Plaza de Mayo (Buenos Aires).
// La grilla de calles sola se leía como papel cuadriculado, y las curvas
// genéricas quedaron feas — lo que sí identifica un lugar de verdad son
// las Diagonales Norte/Sur convergiendo sobre la plaza (el rasgo más
// reconocible del microcentro porteño) más la plaza y la Casa Rosada.
// Colores de zona/markers iguales al mapa real, ver components/MapCanvas.tsx.
export default function LoginMapIllustration() {
  return (
    <svg viewBox="0 0 480 480" className="h-full w-full" role="img" aria-hidden="true">
      <rect width="480" height="480" rx="24" fill="var(--color-surface-container-low)" />

      {/* Grilla de calles del microcentro */}
      <g stroke="var(--color-outline-variant)" strokeWidth="1.5" opacity="0.45">
        {[60, 120, 180, 240, 300, 360, 420].map((x) => (
          <line key={`v${x}`} x1={x} y1="0" x2={x} y2="480" />
        ))}
        {[60, 120, 180, 240, 300, 360, 420].map((y) => (
          <line key={`h${y}`} x1="0" y1={y} x2="480" y2={y} />
        ))}
      </g>

      {/* Diagonal Norte y Diagonal Sur convergiendo en un mismo punto de la plaza */}
      <g stroke="var(--color-outline-variant)" strokeWidth="4" strokeLinecap="round" opacity="0.7">
        <line x1="20" y1="20" x2="200" y2="235" />
        <line x1="20" y1="460" x2="200" y2="235" />
      </g>

      {/* Plaza de Mayo */}
      <rect x="200" y="185" width="150" height="95" rx="8" fill="#c9b285" fillOpacity="0.55" />
      {/* Casa Rosada, en la punta este de la plaza (adentro de los límites de la zona) */}
      <rect x="345" y="208" width="38" height="48" rx="4" fill="#d98a94" fillOpacity="0.6" />

      {/* Zona dibujada por el usuario, alrededor de la plaza */}
      <path
        d="M 150 160 L 330 130 L 400 230 L 360 320 L 220 340 L 130 260 Z"
        fill="#674bb5"
        fillOpacity="0.16"
        stroke="#674bb5"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Vértices de la zona, como al dibujarla a mano en /mapa */}
      {[
        [150, 160],
        [330, 130],
        [400, 230],
        [360, 320],
        [220, 340],
        [130, 260],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="5" fill="#ffffff" stroke="#674bb5" strokeWidth="2.5" />
      ))}

      {/* Negocios encontrados: más concentrados adentro de la zona que afuera */}
      {[
        { x: 240, y: 200, color: '#006c4b' },
        { x: 280, y: 220, color: '#855316' },
        { x: 200, y: 240, color: '#006c4b' },
        { x: 320, y: 255, color: '#006c4b' },
        { x: 260, y: 285, color: '#855316' },
        { x: 185, y: 205, color: '#006c4b' },
        { x: 90, y: 100, color: '#855316' },
        { x: 420, y: 380, color: '#855316' },
        { x: 150, y: 385, color: '#006c4b' },
      ].map((m, i) => (
        <circle key={i} cx={m.x} cy={m.y} r="7" fill={m.color} stroke="#ffffff" strokeWidth="2" />
      ))}
    </svg>
  );
}
