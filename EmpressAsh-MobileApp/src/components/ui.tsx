import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '@/theme';
import { Sky } from './Sky';

// Screens sit under a navigation header (or, on Home, the hero runs under the
// status bar), so only the side edges need safe-area padding here.
export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  return (
    <SafeAreaView style={s.screen} edges={['left', 'right']}>
      <Sky />
      {scroll ? (
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[s.content, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <Text style={s.eyebrow}>{children}</Text>;
}

export function H1({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.h1, style]}>{children}</Text>;
}

export function H2({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.h2, style]}>{children}</Text>;
}

export function P({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.p, muted && { color: colors.muted }, style]}>{children}</Text>;
}

export function Fine({ children }: { children: ReactNode }) {
  return <Text style={s.fine}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Divider() {
  return <Text style={s.divider}>✦</Text>;
}

export function Button({
  title,
  onPress,
  variant = 'solid',
  disabled,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'solid' | 'ghost';
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        variant === 'ghost' && s.btnGhost,
        disabled && { opacity: 0.45 },
        pressed && { opacity: 0.75 },
      ]}
    >
      <Text style={[s.btnText, variant === 'ghost' && { color: colors.khaki }]}>{title}</Text>
    </Pressable>
  );
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night },
  content: { padding: 20, paddingBottom: 48, gap: 16 },
  eyebrow: {
    fontFamily: fonts.body,
    color: colors.olive,
    textTransform: 'uppercase',
    letterSpacing: 2.4,
    fontSize: 12,
  },
  h1: { fontFamily: fonts.display, color: colors.text, fontSize: 40, lineHeight: 46 },
  h2: { fontFamily: fonts.display, color: colors.text, fontSize: 26, lineHeight: 32 },
  p: { fontFamily: fonts.body, color: colors.text, fontSize: 18, lineHeight: 27 },
  fine: { fontFamily: fonts.body, color: colors.muted, fontSize: 13, lineHeight: 19 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radius,
    padding: 18,
    gap: 8,
  },
  divider: { color: colors.khaki, textAlign: 'center', fontSize: 16, marginVertical: 4 },
  btn: {
    backgroundColor: colors.khaki,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.khaki,
  },
  btnGhost: { backgroundColor: 'transparent' },
  btnText: { fontFamily: fonts.bodyMedium, color: colors.night, fontSize: 17, letterSpacing: 0.4 },
});
