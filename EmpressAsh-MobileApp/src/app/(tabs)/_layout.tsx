import { Tabs } from 'expo-router/js-tabs';
import { Text, type ColorValue } from 'react-native';
import { colors, fonts } from '@/theme';

const icon = (glyph: string) =>
  function TabIcon({ color }: { color: ColorValue }) {
    return <Text style={{ color, fontSize: 20 }}>{glyph}</Text>;
  };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.night },
        headerTitleStyle: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: 'rgba(15, 23, 22, 0.96)', borderTopColor: colors.cardBorder },
        tabBarActiveTintColor: colors.khaki,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16 },
        sceneStyle: { backgroundColor: colors.night },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', headerShown: false, tabBarIcon: icon('☾') }} />
      <Tabs.Screen name="readings" options={{ title: 'Readings', tabBarIcon: icon('✦') }} />
      <Tabs.Screen name="daily" options={{ title: "Today's card", tabBarIcon: icon('❖') }} />
      <Tabs.Screen name="deck" options={{ title: 'The deck', tabBarIcon: icon('▤') }} />
      <Tabs.Screen name="contact" options={{ title: 'Contact', tabBarIcon: icon('✉') }} />
    </Tabs>
  );
}
