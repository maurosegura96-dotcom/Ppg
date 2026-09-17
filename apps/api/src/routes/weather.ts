import type { FastifyInstance } from "fastify";
import { buildWeatherSnapshots } from "../services/weatherAggregator.js";

export async function weatherRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { lat: string; lon: string } }>("/weather/snapshot", async (req, reply) => {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return reply.code(400).send({ error: "lat and lon query params are required numbers" });
    }

    // Placeholder pilot profile until auth + PilotProfile persistence lands.
    const defaultPilot = {
      experienceLevel: "intermediate" as const,
      windTolerance: { maxSustainedWindKt: 15, maxGustKt: 20, maxCrosswindComponentKt: 10 },
    };

    try {
      const snapshots = await buildWeatherSnapshots(lat, lon, defaultPilot);
      if (snapshots.length === 0) {
        return reply
          .code(502)
          .send({ error: "All upstream weather models failed to respond; no snapshot available" });
      }
      return { lat, lon, snapshots };
    } catch (err) {
      req.log.error(err);
      return reply.code(502).send({ error: "Failed to fetch upstream weather models" });
    }
  });
}
