import { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Card } from '@/data/tarot';
import { colors, fonts } from '@/theme';
import { Moon } from './Moon';

const W = 220;
const H = 360;

function Face({ card }: { card: Card }) {
  return (
    <View style={[st.card, st.face]}>
      <Text style={st.numeral}>{card.numeral}</Text>
      <Text style={st.star}>✦</Text>
      <Text style={st.name}>{card.name}</Text>
      <Text style={st.arcana}>{card.arcana}</Text>
    </View>
  );
}

function Back() {
  return (
    <View style={[st.card, st.back]}>
      <View style={st.inner}>
        <Moon size={64} />
        <Text style={st.backText}>EmpressAsh</Text>
      </View>
    </View>
  );
}

/** A card that turns over when tapped. */
export function FlipCard({ card, onReveal }: { card: Card; onReveal?: () => void }) {
  const turn = useRef(new Animated.Value(0)).current;
  const [open, setOpen] = useState(false);

  const flip = () => {
    if (open) return;
    setOpen(true);
    Animated.spring(turn, { toValue: 1, friction: 7, tension: 30, useNativeDriver: true }).start();
    onReveal?.();
  };

  const backRot = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const faceRot = turn.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  return (
    <Pressable onPress={flip} accessibilityRole="button" accessibilityLabel={open ? card.name : 'Turn over the card'}>
      <View style={{ width: W, height: H, alignSelf: 'center' }}>
        <Animated.View style={[st.side, { transform: [{ perspective: 900 }, { rotateY: backRot }] }]}>
          <Back />
        </Animated.View>
        <Animated.View style={[st.side, { transform: [{ perspective: 900 }, { rotateY: faceRot }] }]}>
          <Face card={card} />
        </Animated.View>
      </View>
    </Pressable>
  );
}

/** A small, already-turned card for the deck list. */
export function MiniCard({ card }: { card: Card }) {
  return (
    <View style={st.mini}>
      <Text style={st.miniNum}>{card.numeral}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  side: { position: 'absolute', inset: 0, backfaceVisibility: 'hidden' },
  card: {
    width: W,
    height: H,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.khaki,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  back: { backgroundColor: colors.indigo },
  inner: {
    flex: 1,
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: 'rgba(248, 215, 148, 0.45)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  backText: { fontFamily: fonts.display, color: colors.khaki, fontSize: 20, letterSpacing: 1 },
  face: { backgroundColor: colors.emerald, gap: 10 },
  numeral: { fontFamily: fonts.display, color: colors.khaki, fontSize: 30 },
  star: { color: colors.khaki, fontSize: 40 },
  name: { fontFamily: fonts.display, color: colors.text, fontSize: 26, textAlign: 'center', lineHeight: 31 },
  arcana: { fontFamily: fonts.body, color: colors.muted, fontSize: 14, textAlign: 'center' },
  mini: {
    width: 40,
    height: 60,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.khaki,
    backgroundColor: colors.emerald,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniNum: { fontFamily: fonts.display, color: colors.khaki, fontSize: 13, textAlign: 'center' },
});
