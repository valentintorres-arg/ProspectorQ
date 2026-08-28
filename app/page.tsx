import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-semibold">Prospector</h1>
      <p className="max-w-md text-gray-500">
        Dibujá una zona en el mapa, encontrá negocios ahí adentro y armá tu pipeline de prospección.
      </p>
      <Link
        href="/mapa"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Ir al mapa
      </Link>
    </div>
  );
}
