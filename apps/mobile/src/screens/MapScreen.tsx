import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Map, Camera, GeoJSONSource, Layer, UserLocation, type LngLat } from "@maplibre/maplibre-react-native";
import type { FeatureCollection, Polygon } from "geojson";
import { colors, spacing, typography } from "../theme/tokens";
import { useAirspace, type AirspacePolygon } from "../hooks/useAirspace";

const MAPTILER_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY ?? "";

// Valle de Bravo, MX -- same default as the Briefing screen's home site,
// until "favorite sites" picks a real one.
const DEFAULT_CENTER: LngLat = [-100.1339, 19.1947];

type BaseLayer = "topo" | "satellite";

function styleUrl(layer: BaseLayer): string {
  const styleId = layer === "topo" ? "topo-v2" : "satellite";
  return `https://api.maptiler.com/maps/${styleId}/style.json?key=${MAPTILER_KEY}`;
}

// Rough color-by-class so restricted/prohibited airspace reads as the danger
// it is; everything else falls back to a neutral controlled-airspace blue.
function airspaceColor(icaoClass: string, type: string): string {
  const t = `${icaoClass} ${type}`.toLowerCase();
  if (t.includes("prohibit") || t.includes("restrict") || t.includes("danger")) return colors.red;
  if (t.includes("tmz") || t.includes("ctr") || t.includes("class d") || t.includes("class c")) return colors.amber;
  return colors.accent;
}

function toFeatureCollection(airspaces: AirspacePolygon[]): FeatureCollection<Polygon> {
  return {
    type: "FeatureCollection",
    features: airspaces.map((a) => ({
      type: "Feature",
      id: a.id,
      properties: {
        name: a.name,
        color: airspaceColor(a.icaoClass, a.type),
        lowerLimitFt: a.lowerLimitFt,
        upperLimitFt: a.upperLimitFt,
      },
      geometry: a.geometry,
    })),
  };
}

function roundCenter(lon: number, lat: number) {
  // ~1.1km grid -- coarse enough to avoid a request per pan frame, fine
  // enough that the airspace list stays relevant to what's on screen.
  return { lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100 };
}

export default function MapScreen() {
  const [layer, setLayer] = useState<BaseLayer>("topo");
  const [center, setCenter] = useState(() => roundCenter(DEFAULT_CENTER[0], DEFAULT_CENTER[1]));

  const airspace = useAirspace(center);
  const featureCollection = useMemo(
    () => (airspace.status === "ready" ? toFeatureCollection(airspace.airspaces) : null),
    [airspace],
  );

  return (
    <View style={styles.container}>
      <Map
        style={styles.map}
        mapStyle={styleUrl(layer)}
        onRegionDidChange={(event) => {
          const [lon, lat] = event.nativeEvent.center;
          setCenter(roundCenter(lon, lat));
        }}
      >
        <Camera initialViewState={{ center: DEFAULT_CENTER, zoom: 10 }} />
        <UserLocation animated accuracy />

        {featureCollection && (
          <GeoJSONSource id="airspace" data={featureCollection}>
            <Layer id="airspace-fill" type="fill" paint={{ "fill-color": ["get", "color"], "fill-opacity": 0.15 }} />
            <Layer id="airspace-line" type="line" paint={{ "line-color": ["get", "color"], "line-width": 2 }} />
          </GeoJSONSource>
        )}
      </Map>

      <View style={styles.layerSwitcher}>
        <Pressable
          style={[styles.layerButton, layer === "topo" && styles.layerButtonActive]}
          onPress={() => setLayer("topo")}
        >
          <Text style={styles.layerButtonText}>Topo</Text>
        </Pressable>
        <Pressable
          style={[styles.layerButton, layer === "satellite" && styles.layerButtonActive]}
          onPress={() => setLayer("satellite")}
        >
          <Text style={styles.layerButtonText}>Satelital</Text>
        </Pressable>
      </View>

      {airspace.status === "unavailable" && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Espacio aéreo no disponible: falta OPENAIP_API_KEY en el servidor.</Text>
        </View>
      )}
      {airspace.status === "error" && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>No se pudo cargar el espacio aéreo: {airspace.message}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  map: { flex: 1 },
  layerSwitcher: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  layerButton: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  layerButtonActive: { backgroundColor: colors.accent },
  layerButtonText: { color: colors.textPrimary, fontWeight: "600", fontSize: 13 },
  banner: {
    position: "absolute",
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 12,
    padding: spacing.md,
  },
  bannerText: { ...typography.body, color: colors.amber },
});
