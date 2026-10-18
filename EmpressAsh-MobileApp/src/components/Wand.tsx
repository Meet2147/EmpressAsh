import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Defs, Line, Path, RadialGradient, Stop } from 'react-native-svg';

// The website's wand cursor, made for touch: wherever a finger goes, the wand
// follows with a warm light and a trail of sparks. It never blocks a tap.

const WAND = 64; // drawn size; the tip sits at (8, 8)
const TIP = 8;
const LIGHT = 240;

function WandIcon() {
  return (
    <Svg width={WAND} height={WAND} viewBox="0 0 32 32">
      <Defs>
        <RadialGradient id="tip">
          <Stop offset="0" stopColor="#fff8e1" />
          <Stop offset="1" stopColor="#f3d58e" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="4" cy="4" r="4" fill="url(#tip)" />
      <Path d="M4 4 3 1M4 4 1 3M4 4 7 2M4 4 2 7" stroke="#fff3cf" strokeWidth="0.8" />
      <Line x1="5" y1="5" x2="29" y2="29" stroke="#2a1a10" strokeWidth="3.2" strokeLinecap="round" />
      <Line x1="5" y1="5" x2="29" y2="29" stroke="#8a5a32" strokeWidth="2" strokeLinecap="round" />
      <Line x1="22" y1="22" x2="29" y2="29" stroke="#c9a96e" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function Light() {
  return (
    <Svg width={LIGHT} height={LIGHT}>
      <Defs>
        <RadialGradient id="light">
          <Stop offset="0" stopColor="#fff1cf" stopOpacity="0.32" />
          <Stop offset="0.4" stopColor="#F8D794" stopOpacity="0.12" />
          <Stop offset="1" stopColor="#F8D794" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx={LIGHT / 2} cy={LIGHT / 2} r={LIGHT / 2} fill="url(#light)" />
    </Svg>
  );
}

type SparkT = { id: number; x: number; y: number; dx: number; dy: number };

function Spark({ s, onDone }: { s: SparkT; onDone: (id: number) => void }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(
      () => onDone(s.id),
    );
  }, [t, s.id, onDone]);
  return (
    <Animated.View
      style={[
        st.spark,
        {
          left: s.x - 3,
          top: s.y - 3,
          opacity: t.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [
            { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, s.dx] }) },
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, s.dy] }) },
            { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 0.2] }) },
          ],
        },
      ]}
    />
  );
}

export function WandLayer({ children }: { children: ReactNode }) {
  const pos = useRef(new Animated.ValueXY({ x: -200, y: -200 })).current;
  const shown = useRef(new Animated.Value(0)).current;
  const [sparks, setSparks] = useState<SparkT[]>([]);
  const last = useRef(0);
  const nextId = useRef(0);

  const move = useCallback(
    (x: number, y: number) => {
      pos.setValue({ x, y });
      const now = Date.now();
      if (now - last.current > 45) {
        last.current = now;
        const s = { id: nextId.current++, x, y, dx: Math.random() * 30 - 15, dy: Math.random() * 24 + 6 };
        setSparks((xs) => [...xs.slice(-24), s]);
      }
    },
    [pos],
  );
  const show = useCallback(
    (on: boolean) =>
      Animated.timing(shown, { toValue: on ? 1 : 0, duration: on ? 120 : 600, useNativeDriver: true }).start(),
    [shown],
  );
  const done = useCallback((id: number) => setSparks((xs) => xs.filter((s) => s.id !== id)), []);

  const touch = (e: GestureResponderEvent) => move(e.nativeEvent.pageX, e.nativeEvent.pageY);
  const handlers =
    Platform.OS === 'web'
      ? {
          // On the web preview, mouse and touch both drive the wand.
          onPointerMove: (e: { nativeEvent: { pageX: number; pageY: number } }) => {
            show(true);
            move(e.nativeEvent.pageX, e.nativeEvent.pageY);
          },
          onPointerLeave: () => show(false),
        }
      : {
          onTouchStart: (e: GestureResponderEvent) => {
            show(true);
            touch(e);
          },
          onTouchMove: touch,
          onTouchEnd: () => show(false),
          onTouchCancel: () => show(false),
        };

  return (
    <View style={{ flex: 1 }} {...handlers}>
      {children}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Animated.View
          style={{
            position: 'absolute',
            left: -LIGHT / 2,
            top: -LIGHT / 2,
            opacity: shown,
            transform: pos.getTranslateTransform(),
          }}
        >
          <Light />
        </Animated.View>
        {sparks.map((s) => (
          <Spark key={s.id} s={s} onDone={done} />
        ))}
        <Animated.View
          style={{
            position: 'absolute',
            left: -TIP,
            top: -TIP,
            opacity: shown,
            transform: pos.getTranslateTransform(),
          }}
        >
          <WandIcon />
        </Animated.View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  spark: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fbe7b0',
    shadowColor: '#fbe7b0',
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
});
