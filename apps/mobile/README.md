# apps/mobile — AeroParamotor OS (iOS/Android)

Pendiente de scaffolding: Expo (Dev Client, no Expo Go) + React Native +
`@maplibre/maplibre-react-native` + `@shopify/react-native-skia` para el HUD de cabina,
consumiendo `@aeroparamotor/core`.

Próximo paso: `npx create-expo-app@latest . --template` dentro de este directorio,
luego `npx expo install` de los módulos nativos (geolocation en background, sensores,
expo-dev-client) y enlazar el workspace `@aeroparamotor/core`.
