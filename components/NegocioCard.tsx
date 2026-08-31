import { traducirRubro } from '@/lib/rubros';
import { formatearFrescura } from '@/lib/freshness';
import type { Lang } from '@/lib/i18n/types';
import type { Dictionary } from '@/lib/i18n/types';
import type { Negocio } from '@/lib/types';

interface NegocioCardProps {
  negocio: Negocio;
  lang: Lang;
  t: Dictionary;
  seleccionado: boolean;
  onToggleSeleccionado: () => void;
  enriqueciendo: boolean;
  onEnriquecer: () => void;
  agregado: boolean;
  onAgregarAPipeline: () => void;
}

// Card de un negocio: se usa tanto en la lista de resultados de /mapa como
// en el popup que se abre al clickear su marker en el mapa — misma
// información, mismas acciones (tildar para bulk, enriquecer, pipeline) en
// los dos lugares, para no mantener dos versiones de lo mismo.
export default function NegocioCard({
  negocio,
  lang,
  t,
  seleccionado,
  onToggleSeleccionado,
  enriqueciendo,
  onEnriquecer,
  agregado,
  onAgregarAPipeline,
}: NegocioCardProps) {
  const frescura = formatearFrescura(negocio.ultima_actualizacion, lang);

  return (
    <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4 transition-all hover:border-primary/30 hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 gap-2">
          <input
            type="checkbox"
            checked={seleccionado}
            onChange={onToggleSeleccionado}
            className="mt-1 shrink-0 accent-primary"
          />
          <div className="min-w-0">
            <p className="font-title text-sm font-semibold text-on-surface">{negocio.nombre}</p>
            {negocio.rubro && (
              <p className="font-label mt-1 text-xs text-on-surface-variant">{traducirRubro(negocio.rubro, lang)}</p>
            )}
            {negocio.direccion && (
              <p className="font-label mt-0.5 flex items-start gap-1 text-xs text-on-surface-variant">
                <span className="material-symbols-outlined shrink-0 text-[13px]">location_on</span>
                <span className="break-words">{negocio.direccion}</span>
              </p>
            )}
            {negocio.telefono && (
              <p className="font-label mt-0.5 flex items-center gap-1 text-xs text-on-surface-variant">
                <span className="material-symbols-outlined shrink-0 text-[13px]">call</span>
                {negocio.telefono}
              </p>
            )}
            {negocio.web && (
              <a
                href={negocio.web}
                target="_blank"
                rel="noreferrer"
                className="font-label mt-0.5 block break-all text-xs text-primary underline"
              >
                {negocio.web}
              </a>
            )}
            {frescura && (
              <p
                className={`font-label mt-0.5 flex items-center gap-1 text-xs ${
                  frescura.stale ? 'text-error' : 'text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[13px]">{frescura.stale ? 'warning' : 'verified'}</span>
                {frescura.texto}
              </p>
            )}
          </div>
        </div>
        <span
          className={`font-mono shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            negocio.enriquecido
              ? 'bg-primary-fixed text-on-primary-fixed-variant'
              : 'border border-outline-variant/20 bg-surface-container-highest text-on-surface-variant'
          }`}
        >
          {negocio.enriquecido ? t.mapa.enriched : t.mapa.basic}
        </span>
      </div>

      <div className="mt-3 flex gap-2 border-t border-outline-variant/10 pt-3">
        {!negocio.enriquecido && (
          <button
            onClick={onEnriquecer}
            disabled={enriqueciendo}
            className="font-label rounded-full bg-surface-container-highest px-3 py-1 text-xs font-medium text-on-surface-variant hover:opacity-80 disabled:opacity-50"
          >
            {enriqueciendo ? t.mapa.enriching : t.mapa.enrichWithGoogle}
          </button>
        )}
        <button
          onClick={onAgregarAPipeline}
          disabled={agregado}
          className="font-label rounded-full bg-primary px-3 py-1 text-xs font-medium text-on-primary hover:opacity-90 disabled:opacity-50"
        >
          {agregado ? t.mapa.inPipeline : t.mapa.addToPipeline}
        </button>
      </div>
    </div>
  );
}
