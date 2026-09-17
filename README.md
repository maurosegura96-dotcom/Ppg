# AeroParamotor OS

PWA + apps nativas de nivel profesional para vuelo en paramotor (PPG foot-launch & trike):
factibilidad de vuelo, meteorología multi-modelo, cartografía offline-first, planeación
XC, cabina de vuelo digital y bitácora/mantenimiento.

Especificación completa: [`docs/PRODUCT_SPEC.md`](./docs/PRODUCT_SPEC.md).

## Estructura

- `packages/core` — tipos de dominio y algoritmos compartidos (TypeScript puro, sin
  dependencias de plataforma). **Ya implementado**: `PilotProfile`, `WeatherSnapshot`,
  `RoutePlan`, `FlightLog`, y el algoritmo de cono de planeo (`glideCone.ts`, testeado).
- `apps/web` — PWA (Next.js). Pendiente de scaffolding.
- `apps/mobile` — app iOS/Android (Expo). Pendiente de scaffolding.
- `apps/api` — backend (Fastify + PostgreSQL/PostGIS). Pendiente de scaffolding.

## Verificar el algoritmo de cono de planeo

Los tests usan `node:test` y corren directamente sobre TypeScript con el type-stripping
nativo de Node 22+. Como el código fuente usa la convención NodeNext (imports con
extensión `.js` apuntando a archivos `.ts`, para compatibilidad futura con `tsc`/bundlers),
para ejecutarlos directo con `node` hace falta compilar o usar `tsx`:

```bash
npx tsx --test packages/core/src/glideCone.test.ts
```

(o compilar el paquete con `tsc` y correr `node --test` sobre el `dist/` resultante).
