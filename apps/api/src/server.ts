import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { weatherRoutes } from "./routes/weather.js";
import { airspaceRoutes } from "./routes/airspace.js";

const app = Fastify({ logger: true });

// Dev-permissive: the web/mobile apps run on their own localhost ports
// (Next.js, Expo web/Metro) during development. Tighten to an explicit
// origin allowlist before deploying anywhere public.
await app.register(cors, { origin: true });

app.get("/health", async () => ({ status: "ok" }));

await app.register(weatherRoutes);
await app.register(airspaceRoutes);

const port = Number(process.env.PORT ?? 3001);
app
  .listen({ port, host: "0.0.0.0" })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
