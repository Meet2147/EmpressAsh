import {
  EBGaramond_400Regular,
  EBGaramond_400Regular_Italic,
  EBGaramond_500Medium,
} from '@expo-google-fonts/eb-garamond';
import { IMFellEnglish_400Regular, IMFellEnglish_400Regular_Italic } from '@expo-google-fonts/im-fell-english';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { WandLayer } from '@/components/Wand';
import { CurrencyProvider } from '@/currency';
import { colors, fonts } from '@/theme';

// Keep the moon splash up until the fonts are ready.
SplashScreen.preventAutoHideAsync();

const headerStyle = {
  headerStyle: { backgroundColor: colors.night },
  headerTintColor: colors.khaki,
  headerTitleStyle: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.night },
} as const;

export default function RootLayout() {
  const [loaded, error] = useFonts({
    IMFellEnglish_400Regular,
    IMFellEnglish_400Regular_Italic,
    EBGaramond_400Regular,
    EBGaramond_400Regular_Italic,
    EBGaramond_500Medium,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <CurrencyProvider>
      <WandLayer>
        <StatusBar style="light" />
        <Stack screenOptions={{ ...headerStyle, headerBackButtonDisplayMode: 'minimal' }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="reading/[id]" options={{ title: '' }} />
          <Stack.Screen name="card/[id]" options={{ title: '' }} />
          <Stack.Screen name="about" options={{ title: 'About Ash' }} />
          <Stack.Screen name="policies" options={{ title: 'Policies' }} />
          <Stack.Screen name="payments" options={{ title: 'How booking works' }} />
        </Stack>
      </WandLayer>
    </CurrencyProvider>
  );
}
