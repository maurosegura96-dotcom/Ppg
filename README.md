# AeroParamotor OS

PWA + apps nativas de nivel profesional para vuelo en paramotor (PPG foot-launch & trike):
factibilidad de vuelo, meteorología multi-modelo, cartografía offline-first, planeación
XC, cabina de vuelo digital y bitácora/mantenimiento.

Especificación completa: [`docs/PRODUCT_SPEC.md`](./docs/PRODUCT_SPEC.md).

## Estructura

- `packages/core` — tipos de dominio y algoritmos compartidos (TypeScript puro, sin
  dependencias de plataforma; imports sin extensión, compatible con `tsx`/Node y con el
  bundler Metro de React Native). Implementado: `PilotProfile`, `WeatherSnapshot`,
  `RoutePlan`, `FlightLog`, cono de planeo, Flyability Score, interpolación de perfil de
  viento y altitud de densidad — 17/17 tests pasando.
- `apps/mobile` — app iOS/Android/Web (Expo + React Navigation). **Scaffoldeada y
  funcional**: tabs Briefing/Mapa/Ruta/Bitácora/Perfil + Modo Vuelo (HUD con GPS real vía
  `expo-location` y chequeo de cono de planeo en vivo). Verificado con `tsc --noEmit`,
  bundle real de Metro, y capturas de pantalla navegando la app en Chromium.
- `apps/web` — PWA (Next.js). Pendiente de scaffolding.
- `apps/api` — backend (Fastify + PostgreSQL/PostGIS). Servidor real con endpoints
  `/health`, `/weather/snapshot` (Open-Meteo multi-modelo) y `/airspace/near` (OpenAIP),
  CORS habilitado para desarrollo local.

## Correr todo en local

```bash
npm install                          # instala todo el monorepo (workspaces)
npm run test:core                    # 17/17 tests de packages/core

npm run dev -w apps/api              # backend en http://localhost:3001
npm run web -w apps/mobile           # app en el navegador (Expo web)
# o: npm run start -w apps/mobile    # Metro + QR para Expo Go / dev client
```

Copia `apps/api/.env.example` → `apps/api/.env` y `apps/mobile/.env.example` → `.env`
(y `apps/web/.env.example` → `.env.local` cuando exista) con tus keys de OpenAIP y
MapTiler — ver `docs/PRODUCT_SPEC.md` sección 6.
