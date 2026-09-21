# apps/api — AeroParamotor OS Backend

Pendiente de scaffolding: Fastify + TypeScript, PostgreSQL/PostGIS (vía Prisma o Drizzle),
Redis (BullMQ para jobs de ingesta meteo), consumiendo `@aeroparamotor/core` para los
tipos de dominio y el `WeatherAggregatorService` que normaliza ECMWF/GFS/ICON-D2/HRRR
(Open-Meteo) a `WeatherSnapshot` y calcula el Flyability Score server-side.

Próximo paso: definir el esquema Prisma/Drizzle a partir de los tipos en
`packages/core/src/types/`, y montar el primer endpoint `/weather/snapshot?lat&lon`.
