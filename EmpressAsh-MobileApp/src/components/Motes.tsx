import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';

type Kind = 'ember' | 'snow';
type Mote = { kind: Kind; x: number; size: number; duration: number; delay: number; drift: number };

// Drifting embers (rising) and snow (falling), like the web app's canvas.
function Particle({ m, height }: { m: Mote; height: number }) {
  const t = useRef(new Animated.Value(0)).current;
  const flicker = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    // Start part-way through the path so the sky is already full on first open.
    const run = (from: number) => {
      t.setValue(from);
      Animated.timing(t, {
        toValue: 1,
        duration: m.duration * (1 - from),
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) run(0);
      });
    };
    run(m.delay);
    const fl = Animated.loop(
      Animated.sequence([
        Animated.timing(flicker, { toValue: 1, duration: 900 + m.size * 300, useNativeDriver: true }),
        Animated.timing(flicker, { toValue: 0.35, duration: 900 + m.size * 300, useNativeDriver: true }),
      ]),
    );
    fl.start();
    return () => {
      t.stopAnimation();
      fl.stop();
    };
  }, [t, flicker, m]);

  const rising = m.kind === 'ember';
  const translateY = t.interpolate({
    inputRange: [0, 1],
    outputRange: rising ? [height + 20, -20] : [-20, height + 20],
  });
  const translateX = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, m.drift, m.drift * 0.4] });
  const glow = m.size * 4;
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: m.x - glow / 2,
        top: 0,
        width: glow,
        height: glow,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: flicker,
        transform: [{ translateX }, { translateY }],
      }}
    >
      {rising ? (
        <>
          <View
            style={{
              position: 'absolute',
              width: glow,
              height: glow,
              borderRadius: glow,
              backgroundColor: 'rgba(248, 190, 110, 0.09)',
            }}
          />
          <View
            style={{
              width: m.size,
              height: m.size,
              borderRadius: m.size,
              backgroundColor: 'rgba(255, 226, 160, 0.95)',
            }}
          />
        </>
      ) : (
        <View
          style={{ width: m.size, height: m.size, borderRadius: m.size, backgroundColor: 'rgba(236, 240, 234, 0.7)' }}
        />
      )}
    </Animated.View>
  );
}

export function Motes({ count = 26 }: { count?: number }) {
  const { width, height } = useWindowDimensions();
  const motes = useMemo<Mote[]>(
    () =>
      Array.from({ length: count }, (_, i) => {
        const kind: Kind = i % 3 === 0 ? 'snow' : 'ember';
        return {
          kind,
          x: Math.random() * width,
          size: kind === 'ember' ? 1.6 + Math.random() * 2.4 : 1.4 + Math.random() * 2.2,
          duration: (kind === 'ember' ? 22000 : 16000) + Math.random() * 14000,
          delay: Math.random(),
          drift: 20 + Math.random() * 50,
        };
      }),
    [count, width],
  );
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {motes.map((m, i) => (
        <Particle key={i} m={m} height={height} />
      ))}
    </View>
  );
}
