import type { FastifyInstance } from "fastify";
import { fetchAirspaceNear, OpenAipNotConfiguredError } from "../services/openAipClient.js";

export async function airspaceRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { lat: string; lon: string; radiusKm?: string } }>(
    "/airspace/near",
    async (req, reply) => {
      const lat = Number(req.query.lat);
      const lon = Number(req.query.lon);
      const radiusKm = Number(req.query.radiusKm ?? "25");
      if (Number.isNaN(lat) || Number.isNaN(lon)) {
        return reply.code(400).send({ error: "lat and lon query params are required numbers" });
      }

      try {
        const airspaces = await fetchAirspaceNear(lat, lon, radiusKm);
        return { lat, lon, radiusKm, airspaces };
      } catch (err) {
        if (err instanceof OpenAipNotConfiguredError) {
          return reply.code(503).send({ error: err.message });
        }
        req.log.error(err);
        return reply.code(502).send({ error: "Failed to fetch upstream airspace data" });
      }
    },
  );
}
