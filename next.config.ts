import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // duckdb es un addon nativo (usa require() dinámico para bajar el binario
  // si falta) — sin esto Turbopack intenta bundlearlo como código de cliente
  // y falla resolviendo deps opcionales de @mapbox/node-pre-gyp que no
  // instalamos (aws-sdk, nock, etc.) porque nunca se usan en la práctica.
  serverExternalPackages: ['duckdb'],
};

export default nextConfig;
