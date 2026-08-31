// Fetcher compartido por todos los useSWR de la app. Los API routes ya
// devuelven { error: '...' } en el body cuando fallan (ver app/api/**) —
// esto lo propaga como Error para que error.message llegue a los mismos
// mensajes que antes mostraban las páginas.
export async function fetcher(url: string) {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}
