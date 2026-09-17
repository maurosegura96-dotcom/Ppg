# AeroParamotor OS — Especificación Técnica y de Producto v0.1

PWA + apps nativas para vuelo en paramotor (PPG foot-launch & trike). Estética dark-mode
de alta legibilidad solar, precisión aeronáutica, cero dependencia de conectividad en vuelo.

---

## 1. Arquitectura del Stack Tecnológico

### 1.1 Frontend

| Capa | Elección | Justificación |
|---|---|---|
| Mobile app | **React Native + Expo (bare/dev client)** | Comparte ~70% de lógica de negocio (tipos, algoritmos, stores) con la PWA vía TypeScript. Expo Dev Client (no Expo Go puro) permite módulos nativos para GPS en background, sensores y BLE (variómetros externos tipo Flymaster/XCTrack). |
| PWA web | **Next.js 15 (App Router) + Service Worker (Workbox)** | SSR para SEO de la landing/marketing, PWA installable para planificación en escritorio, cache-first para tiles y meteo. |
| Código compartido | **pnpm workspaces / Turborepo**, paquete `@aeroparamotor/core` | Un único lugar de verdad para tipos (`FlightLog`, `RoutePlan`, etc.), algoritmos (glide cone, viento, flyability score) y clientes de API. Se testea una vez, se usa en 2 plataformas. |
| Mapas | **MapLibre GL JS / MapLibre Native** (no Mapbox GL propietario) | Vector tiles, sin vendor lock-in ni costos de licencia por MAU, soporta terreno 3D (hillshade + DEM), y tiene bindings maduros en RN (`@maplibre/maplibre-react-native`) y web. |
| Estado | **Zustand** (stores ligeros) + **TanStack Query** (data fetching/cache) | Zustand evita el boilerplate de Redux para estado de cabina (vario, GPS) que muta a alta frecuencia; TanStack Query maneja cache/retry de meteo y espacio aéreo. |
| Gráficos cabina | **Skia (`@shopify/react-native-skia`)** | Render de HUD (vario, altímetro, brújula) a 60fps sin re-render de árbol React completo — crítico para pantalla de vuelo. |

### 1.2 Backend

| Componente | Elección | Justificación |
|---|---|---|
| API | **Node.js + Fastify** (TypeScript, comparte tipos con `core`) | Bajo overhead, schema validation nativa (JSON Schema/TypeBox) que casa con nuestros tipos compartidos. |
| Base de datos | **PostgreSQL + PostGIS** | Estándar de facto para datos geoespaciales (waypoints, polígonos de espacio aéreo, LZs, tracks). Soporta índices `GiST`/`GIN` para consultas "espacio aéreo cerca de mi posición" en tiempo real. |
| Cache / pub-sub | **Redis** | Cache de snapshots meteo (TTL por modelo), pub/sub para Live Tracking (posiciones en tiempo real a "equipo de tierra"). |
| Object storage | **S3-compatible (Cloudflare R2 o AWS S3)** | Tiles offline empaquetados (PMTiles), exports GPX/KML/IGC, backups de tracks. |
| Realtime | **WebSocket (Fastify `@fastify/websocket`) o Ably/Pusher gestionado** | Live Tracking y alertas SOS de baja latencia. Empezar con self-hosted WS; migrar a Ably si escala de "seguidores por vuelo" lo justifica. |
| Jobs / cron | **BullMQ sobre Redis** | Descarga periódica de modelos meteo (GFS/ICON-D2 cada 6h, HRRR cada 1h), recomputo de Flyability Score por sitio favorito, purga de tracks. |
| Auth | **Auth.js (NextAuth) o Clerk** | OAuth (Google/Apple) + email, necesario para sincronizar bitácora entre dispositivos. |

### 1.3 APIs meteorológicas (multi-modelo)

| Fuente | Uso | Notas |
|---|---|---|
| **Open-Meteo** (open-meteo.com) | Fuente primaria multi-modelo: expone ECMWF-IFS, GFS, ICON (incluye ICON-D2 para Europa), GEM, y variables por capa de altura (viento a 10/80/120/180m, agregable a 100/300/500/1000m vía interpolación). | Gratis, sin API key para uso no comercial, límites generosos, ideal para MVP. |
| **NOAA HRRR** vía Open-Meteo o Iowa Environmental Mesonet | Modelo de alta resolución (3km) para EE.UU., clave para turbulencia/convección de corto plazo. | Open-Meteo ya lo reexpone bajo su endpoint US. |
| **Windy Point Forecast API** | Fuente secundaria de comparación + acceso a su capa de "thermal/wind" visual si se embebe su widget. | De pago por encima de cuota gratuita; usar como validación cruzada, no como única fuente. |
| **Meteomatics** (opcional, fase 2/monetización) | CAPE, cortante de viento, y perfiles verticales de alta fidelidad para usuarios PRO. | Pricing por volumen; reservar para tier premium. |
| **AWC (aviationweather.gov)** | METAR/TAF/SIGMET/AIRMET oficiales para contexto aeronáutico. | Gratis, oficial FAA. |

**Estrategia:** un `WeatherAggregatorService` en el backend normaliza las respuestas de cada
modelo al tipo `WeatherSnapshot` (ver sección 3), calcula el **Flyability Score** de forma
centralizada (no en el cliente, para poder auditar/ajustar el algoritmo sin re-desplegar apps),
y cachea en Redis por `(lat, lon redondeados a 0.05°, modelo, hora)`.

### 1.4 Cartografía y espacio aéreo (offline-first)

| Necesidad | Solución |
|---|---|
| Vector tiles base (calles/topo) | **OpenMapTiles** (esquema abierto) servidos como **PMTiles** — archivo único, soporta HTTP range-requests o lectura 100% local en el dispositivo. Ideal para pre-descargar la región de vuelo antes de salir a campo. |
| Terreno / DEM (para sotaventos, rotores, efecto Venturi) | **Terrarium tiles** (AWS Open Data, derivados de SRTM/ASTER) o **MapTiler Terrain-RGB**. Se procesan client-side a hillshade + pendiente para resaltar zonas de rotor probable detrás de crestas con viento fuerte. |
| Satelital HD | **MapTiler Satellite** o **ESRI World Imagery** (uso no comercial/atribución) como capa alternable. |
| Espacio aéreo (Clases A-E, CTR, TMA, prohibidas/restringidas) | **OpenAIP** (openaip.net) — dataset abierto y API REST, cobertura global creciente, actualizado por la comunidad + fuentes oficiales. Es la respuesta principal a "dónde consigo mapas actualizados" (ver sección final). |
| NOTAMs | **FAA NOTAM API** (EE.UU.) y agregadores como **AutoRouter/AviationAPI** para otras regiones; en Europa, fuentes AIP nacionales via **EAD Basic**. Fase 2 (requiere acuerdos/curación por país). |
| LZs, antenas, cables de alta tensión | Fuente inicial: **OpenStreetMap** (tags `power=line`, `man_made=tower`, `aeroway=helipad` etc.) vía Overpass API, complementado con reportes de la comunidad de pilotos dentro de la app (crowdsourcing curado). |

---

## 2. Arquitectura de Información y Flujo de Navegación (UX/UI)

### 2.1 Principios de diseño

- **Dark mode nativo obligatorio** (no "modo oscuro opcional"): fondo `#0B0F14`, acentos
  semáforo saturados (`#22C55E` verde / `#F59E0B` ámbar / `#EF4444` rojo) para máximo
  contraste bajo sol directo.
- **Tap targets ≥ 56dp** pensados para uso con guantes.
- **Modo Vuelo = pantalla única, sin scroll, sin menús anidados.** Todo lo crítico cabe en
  un solo golpe de vista.
- Tipografía tabular monoespaciada para números de cabina (altímetro, velocidad) — evita
  "saltos" de ancho al cambiar dígitos.

### 2.2 Flujo de navegación principal

```
┌─────────────────────────────────────────────────────────────────┐
│  TAB BAR INFERIOR (persistente fuera de Modo Vuelo)              │
│  [ Home/Briefing ]  [ Mapa ]  [ Planear Ruta ]  [ Bitácora ]  [ Perfil ] │
└─────────────────────────────────────────────────────────────────┘

Home / Briefing (pantalla de aterrizaje al abrir la app)
 ├─ Semáforo de Vuelo grande (Verde/Ámbar/Rojo) para el sitio "home" o el más cercano por GPS
 ├─ Timeline horizontal de "ventanas de vuelo" (mañana / tarde) próximas 48h
 ├─ Tarjetas resumen: viento superficie + capas, densidad altitud, CAPE/turbulencia
 ├─ CTA: "Ver detalle meteo" → Weather Detail Screen
 └─ CTA: "Planear vuelo" → Route Planner

Weather Detail Screen
 ├─ Selector de modelo (ECMWF / GFS / ICON-D2 / HRRR) con badge de "última actualización"
 ├─ Gráfico vertical de viento por capa (0/100/300/500/1000m AGL) — barbas de viento
 ├─ Gráfico horario 24-48h: viento, ráfaga, gradiente térmico, inversión
 └─ Desglose del Flyability Score (qué factor penaliza más, editable por perfil de piloto)

Mapa (pantalla exploratoria)
 ├─ Selector de capas: Topo 3D | Satelital | Aeronáutica (overlay espacio aéreo)
 ├─ Toggle: Espacio aéreo en vivo (NOTAMs, CTR/TMA) con alerta de proximidad
 ├─ Toggle: POIs PPG (LZ/TO, cables, antenas, campos alternos)
 ├─ Botón "Descargar región offline" (dibuja bounding box → empaqueta PMTiles)
 └─ Long-press → crear waypoint / reportar POI comunitario

Planear Ruta (Route Planner)
 ├─ Paso 1: elegir TO (despegue) — autodetecta por GPS o selecciona de favoritos
 ├─ Paso 2: agregar waypoints tocando el mapa (drag para reordenar)
 ├─ Paso 3: panel de performance en vivo por tramo:
 │    Groundspeed est. | Rumbo mag. | Distancia | ETE | Combustible
 ├─ Paso 4: overlay de "Cono de planeo" en cada waypoint (ver si hay LZ segura alcanzable)
 ├─ Alertas de espacio aéreo si la ruta cruza CTR/TMA/zona restringida
 └─ CTA: "Iniciar vuelo con esta ruta" → Flight Mode

Modo Vuelo (Flight Mode / Cockpit) — pantalla dedicada, siempre en orientación bloqueada,
brillo forzado al máximo, se activa "Keep Awake"
 ┌───────────────────────────────────────────────────────────┐
 │  [Altímetro MSL/AGL]        [Variómetro digital + barra]   │
 │        grande, esquina        grande, centro, con           │
 │        sup. izquierda         audio reactivo                │
 │                                                              │
 │  [Mapa mini con track       [Velocidad GPS]                 │
 │   + siguiente waypoint]      esquina sup. derecha            │
 │                                                              │
 │  [Rumbo/Heading + compás    [Distancia y ETE al              │
 │   giroscópico, banda        siguiente waypoint]              │
 │   inferior]                                                  │
 │                                                              │
 │  [Barra de combustible restante + autonomía en minutos]     │
 │  [Botón SOS grande, esquina inferior — mantener 3s]         │
 └───────────────────────────────────────────────────────────┘
 └─ Al aterrizar (detección automática por velocidad+altitud estable) → prompt
    "¿Finalizar vuelo?" → guarda en Bitácora automáticamente

Bitácora (Logbook)
 ├─ Lista de vuelos (fecha, sitio, duración, distancia) con mini-mapa de track
 ├─ Detalle de vuelo: gráfico altitud/velocidad/vario en el tiempo, mapa 3D del track
 ├─ Exportar: GPX / KML / IGC (con validación FAI para IGC)
 └─ Hangar (Mantenimiento)
      ├─ Horómetro de motor (horas totales, horas desde último service)
      ├─ Checklist de inspección de vela (porosidad, cordinas) con recordatorio por horas/meses
      └─ Alertas: bujía, pistón, hélice, reductora — con umbral configurable

Perfil (Pilot Profile)
 ├─ Nivel de experiencia, tolerancia de viento (usada por Flyability Score)
 ├─ Configuración de ala (trim speed, glide ratio, reflex) y motor (consumo, tanque, reserva)
 ├─ Safety Link: contactos de emergencia, umbral de inactividad para SOS automático
 └─ Preferencias de unidades (kt/km-h, m/ft, L/gal)
```

### 2.3 Componentes clave de la pantalla de vuelo (detalle)

| Componente | Comportamiento |
|---|---|
| Variómetro digital | Actualización ≤ 200ms, tono de audio proporcional a m/s (silencio en banda muerta ±0.2 m/s), color verde en ascenso / rojo en descenso fuerte. |
| Altímetro | Doble lectura simultánea MSL (barométrico, calibrable con QNH manual) y AGL (MSL − elevación del terreno vía DEM local, sin necesitar red). |
| HUD de rumbo | Aguja al siguiente waypoint + cinta de rumbo magnético (declinación aplicada localmente). |
| Botón SOS | Requiere hold de 3s (evita activación accidental por vibración), dispara: SMS con lat/lon + enlace de mapa a contactos de emergencia, y notificación push a "equipo de tierra" suscrito al Safety Link. |
| Detección de inmovilidad/impacto | Si `groundSpeed < 2 kt` Y `sin cambio de altitud > 1 min` tras haber estado en vuelo, o una deceleración > umbral G, inicia cuenta regresiva visible (ej. 60s) antes de disparar SOS automático — cancelable con un toque. |

---

## 3. Esquema de Datos (TypeScript)

Ya implementado como código real en el repo (`packages/core/src/types/`). Resumen:

```typescript
// PilotProfile — packages/core/src/types/pilotProfile.ts
interface PilotProfile {
  id: string;
  experienceLevel: "student" | "novice" | "intermediate" | "advanced" | "instructor";
  windTolerance: { maxSustainedWindKt: number; maxGustKt: number; maxCrosswindComponentKt: number };
  wing: { trimSpeedMs: number; bestGlideRatio: number; minSinkRateMs: number; /* ... */ };
  motor: { fuelBurnRateLph: number; tankCapacityL: number; reserveFuelL: number; /* ... */ };
  safetyLink: { enabled: boolean; inactivityAlertMinutes: number; impactDetectionEnabled: boolean };
  // ... ver archivo fuente para el tipo completo
}

// WeatherSnapshot — packages/core/src/types/weatherSnapshot.ts
interface WeatherSnapshot {
  model: "ECMWF" | "GFS" | "ICON-D2" | "HRRR";
  surfaceWind: { speedKt: number; gustKt: number; directionDeg: number };
  windLayers: Array<{ altitudeAglM: number; speedKt: number; directionDeg: number }>;
  densityAltitudeFt: number;
  capeJkg: number;
  flyability: { level: "green" | "yellow" | "red"; score: number; contributingFactors: [...] };
  // ... ver archivo fuente
}

// RoutePlan — packages/core/src/types/routePlan.ts
interface RoutePlan {
  waypoints: Waypoint[];
  legs: Array<{ estimatedGroundspeedKt: number; estimatedFuelBurnL: number;
                glideCoverage: { reachableLzWithinGlide: boolean } }>;
  totals: { distanceKm: number; eteMinutes: number; fuelRequiredL: number; fuelMarginL: number };
  // ... ver archivo fuente
}

// FlightLog — packages/core/src/types/flightLog.ts
interface FlightLog {
  track: TrackPoint[];
  stats: { maxAltitudeMslM: number; totalDistanceKm: number; engineTimeMinutes: number; /* ... */ };
  exports: { gpxUrl?: string; kmlUrl?: string; igcUrl?: string };
  maintenanceAlertsTriggered: MaintenanceAlert[];
  // ... ver archivo fuente
}
```

Los archivos fuente completos están en `packages/core/src/types/` y son el contrato único
compartido entre mobile, web y backend.

---

## 4. Algoritmo de Cono de Planeo / Autonomía

Implementado y **testeado** en `packages/core/src/glideCone.ts` (5/5 tests pasando en
`packages/core/src/glideCone.test.ts`, ejecutable con Node 22 nativo vía type-stripping).

### Modelo físico simplificado

- Tasa de hundimiento: `sinkRate = trimSpeed / glideRatio`
- Tiempo hasta el suelo: `timeToGround = altitudeAGL / sinkRate`
- Para cada rumbo (0-359°), el groundspeed alcanzable se calcula proyectando el componente
  de viento de cola/frente sobre ese rumbo (simplificación estándar de "glide ring" usada en
  la mayoría de EFBs: se asume que el piloto vuela con rumbo ≈ derrota deseada, válido porque
  el trim speed típico de un ala PPG domina sobre el componente de viento en las condiciones
  que la app aprueba para volar).
- Rango en esa dirección: `range = groundspeed * timeToGround * (1 - margenSeguridad)`
  con `margenSeguridad` por defecto de 15%.

```typescript
export function computeGlideCone(input: GlideConeInput): GlideConeResult {
  const sinkRateMs = input.trimSpeedMs / input.glideRatio;
  const timeToGroundS = input.altitudeAglM / sinkRateMs;

  const polygon: GlideConePolygonPoint[] = [];
  for (let bearing = 0; bearing < 360; bearing += input.bearingResolutionDeg ?? 5) {
    const groundspeed = groundspeedForBearing(
      bearing, input.trimSpeedMs, input.windSpeedMs, input.windFromDeg,
    );
    const rangeM = groundspeed * timeToGroundS * (1 - (input.safetyMarginPct ?? 0.15));
    polygon.push({ ...destinationPoint(input.position, bearing, rangeM), bearingDeg: bearing, rangeM });
  }
  return { sinkRateMs, timeToGroundS, polygon, /* min/max range */ };
}
```

También se incluye `isLzWithinGlide()` (chequeo puntual rápido contra una LZ candidata,
usado en tiempo real durante el vuelo sin recalcular el polígono completo) y
`findReachableLzs()` (filtra y ordena una lista de LZs candidatas por margen de seguridad).

**Uso en producto:** en Modo Vuelo, cada 2-3 segundos se recalcula `findReachableLzs` contra
la base de LZs/campos alternos cercanos (precargados offline) usando la altitud AGL actual y
el viento de la capa más cercana. Si el número de LZs alcanzables cae a 0, se dispara una
alerta visual/sonora de "fuera de alcance de planeo" — señal crítica de seguridad para PPG.

---

## 5. Estado del repositorio (este scaffold)

```
aeroparamotor-os/
├── docs/PRODUCT_SPEC.md          ← este documento
├── packages/core/                ← lógica compartida, YA IMPLEMENTADA
│   └── src/
│       ├── types/                ← PilotProfile, WeatherSnapshot, RoutePlan, FlightLog
│       ├── geo.ts                ← haversine, bearing, destination point
│       ├── glideCone.ts          ← algoritmo de cono de planeo (testeado)
│       └── glideCone.test.ts
├── apps/web/                     ← stub Next.js PWA (siguiente paso)
├── apps/mobile/                  ← stub Expo app (siguiente paso)
└── apps/api/                     ← stub backend Fastify (siguiente paso)
```

## 6. Dónde obtener mapas y datos aeronáuticos actualizados

| Dato | Fuente recomendada | Notas de acceso |
|---|---|---|
| **Espacio aéreo global (clases, CTR, TMA, restringido/prohibido)** | **OpenAIP** — https://www.openaip.net | API REST + descargas por país en GeoJSON/AIXM. Tiene tier gratuito con API key; es la fuente más práctica para un MVP multi-país. |
| **NOTAMs EE.UU.** | **FAA NOTAM Search API** — https://notams.aim.faa.gov (requiere registro de developer) | Cobertura solo EE.UU.; para otros países se necesita el AIP nacional o un agregador comercial (ej. Lido, AutoRouter). |
| **METAR/TAF/SIGMET oficiales** | **aviationweather.gov (AWC) Data API** | Gratis, sin key, formato JSON/XML. |
| **Terreno / DEM** | **AWS Open Data Terrain Tiles** (Terrarium) o **MapTiler Cloud Terrain-RGB** | Terrarium es gratis y sin key (S3 público); MapTiler requiere key pero tiene mejor resolución en algunas regiones. |
| **Mapas base (calles/topo) en vector tiles** | **OpenMapTiles** + hosting propio en PMTiles, o **MapTiler Cloud** como CDN gestionado | Para offline real, generar extractos regionales en PMTiles con `tippecanoe` o `planetiler`. |
| **Satelital HD** | **MapTiler Satellite** o **Esri World Imagery** (uso no comercial con atribución) | Evaluar licencia si el uso pasa a ser comercial con muchos usuarios. |
| **Cables de alta tensión, antenas, LZs** | **OpenStreetMap** vía Overpass API (`power=line`, `power=tower`, `man_made=mast`) | Complementar con reportes propios de la comunidad de pilotos dentro de la app; OSM no siempre está actualizado en zonas rurales. |
| **Modelos meteo multi-modelo (ECMWF/GFS/ICON-D2/HRRR)** | **Open-Meteo API** — https://open-meteo.com | Sin key para uso no comercial; esta es la pieza central del motor de meteorología del punto 1. |

### Qué necesito que me pases para avanzar

1. **Región(es) piloto** donde vas a lanzar primero (país/zona) — define si priorizamos
   OpenAIP+FAA (EE.UU.) o AIP europeo, y qué extractos de PMTiles generar primero.
2. Si ya tienes **API keys** de alguno de estos servicios (OpenAIP, MapTiler, Windy), o si
   las gestiono yo con cuentas de prueba gratuitas para el MVP.
3. Confirmar el **stack elegido** en la sección 1 (o decirme qué cambiar) para que el
   siguiente paso sea scaffolding real de `apps/web` (Next.js) y `apps/api` (Fastify).
