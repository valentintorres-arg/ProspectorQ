// A cuántos días sin que ninguna fuente verifique el dato empezamos a
// desconfiar (podría estar cerrado, mudado, etc.). Un año es conservador:
// negocios chicos no siempre están al día en los datos abiertos.
const UMBRAL_STALE_DIAS = 365;

export interface Frescura {
  texto: string;
  stale: boolean;
}

// null = sin fecha, o reloj del cliente desincronizado/dato corrupto (fecha
// futura) — en ambos casos mejor tratarlo como "no sabemos" que inventar un
// número raro.
export function diasDesdeVerificacion(fechaISO: string | null): number | null {
  if (!fechaISO) return null;
  const dias = Math.floor((Date.now() - new Date(fechaISO).getTime()) / (1000 * 60 * 60 * 24));
  return dias < 0 ? null : dias;
}

export function formatearFrescura(fechaISO: string | null, lang: 'es' | 'en'): Frescura | null {
  const dias = diasDesdeVerificacion(fechaISO);
  if (dias === null) return null;

  const stale = dias > UMBRAL_STALE_DIAS;
  const meses = Math.floor(dias / 30);
  const anios = Math.floor(meses / 12);

  if (lang === 'en') {
    if (dias < 30) return { texto: dias <= 1 ? 'Verified 1 day ago' : `Verified ${dias} days ago`, stale };
    if (meses < 12) return { texto: `Verified ${meses} month${meses === 1 ? '' : 's'} ago`, stale };
    return { texto: `Not verified in ${anios} year${anios === 1 ? '' : 's'}`, stale };
  }

  if (dias < 30) return { texto: dias <= 1 ? 'Verificado hace 1 día' : `Verificado hace ${dias} días`, stale };
  if (meses < 12) return { texto: `Verificado hace ${meses} mes${meses === 1 ? '' : 'es'}`, stale };
  return { texto: `Sin verificar hace ${anios} año${anios === 1 ? '' : 's'}`, stale };
}
