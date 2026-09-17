import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text } from "react-native";
import { colors } from "../theme/tokens";
import HomeBriefingScreen from "../screens/HomeBriefingScreen";
import MapScreen from "../screens/MapScreen";
import RoutePlannerScreen from "../screens/RoutePlannerScreen";
import LogbookScreen from "../screens/LogbookScreen";
import ProfileScreen from "../screens/ProfileScreen";
import FlightModeScreen from "../screens/FlightModeScreen";

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    border: colors.border,
    primary: colors.accent,
    text: colors.textPrimary,
  },
};

const TAB_ICONS: Record<string, string> = {
  Briefing: "☀️",
  Mapa: "🗺️",
  Ruta: "📍",
  Bitácora: "📖",
  Perfil: "👤",
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIcon: () => <Text style={{ fontSize: 18 }}>{TAB_ICONS[route.name]}</Text>,
      })}
    >
      <Tab.Screen name="Briefing" component={HomeBriefingScreen} />
      <Tab.Screen name="Mapa" component={MapScreen} />
      <Tab.Screen name="Ruta" component={RoutePlannerScreen} />
      <Tab.Screen name="Bitácora" component={LogbookScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen
          name="FlightMode"
          component={FlightModeScreen}
          options={{ presentation: "fullScreenModal" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
