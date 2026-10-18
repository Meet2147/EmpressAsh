import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop, SvgXml } from 'react-native-svg';
import { REEDS_SVG } from '@/data/reeds';

// The web app's home hero: above the clouds at first light, with a breathing
// sun, mountain ridges, a sea of cloud and swaying reeds.

function useLoop(duration: number) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, duration]);
  return v;
}

const RIDGE_BACK =
  'M0,600 L0,364 L51,355 L103,326 L154,372 L206,322 L257,253 L309,244 L360,231 L411,225 L463,244 L514,241 L566,266 L617,308 L669,297 L720,336 L771,337 L823,358 L874,357 L926,309 L977,365 L1029,309 L1080,331 L1131,341 L1183,356 L1234,346 L1286,339 L1337,328 L1389,325 L1440,327 L1440,600 Z';
const RIDGE_FRONT =
  'M0,600 L0,403 L40,405 L80,407 L120,424 L160,416 L200,452 L240,419 L280,441 L320,392 L360,406 L400,407 L440,414 L480,435 L520,423 L560,406 L600,437 L640,409 L680,457 L720,444 L760,396 L800,411 L840,391 L880,384 L920,348 L960,369 L1000,357 L1040,311 L1080,328 L1120,360 L1160,395 L1200,360 L1240,382 L1280,389 L1320,409 L1360,438 L1400,425 L1440,435 L1440,600 Z';
const CLIFF =
  'M1440,600 L1440,120 L1395,105 L1350,140 L1318,210 L1290,300 L1250,380 L1190,450 L1100,500 L980,540 L900,600 Z';

export function Hero({ children, height = 600 }: { children: ReactNode; height?: number }) {
  const { width } = useWindowDimensions();
  const breathe = useLoop(4500);
  const clouds = useLoop(30000);
  const sway = useLoop(3800);
  const sun = Math.max(width, height) * 0.9;

  return (
    <View style={[st.hero, { height, marginHorizontal: -20, marginTop: -20 }]}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="scene" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#3f4e53" />
            <Stop offset="0.3" stopColor="#6d7470" />
            <Stop offset="0.52" stopColor="#b9a982" />
            <Stop offset="0.64" stopColor="#8f8a78" />
            <Stop offset="0.82" stopColor="#3a4644" />
            <Stop offset="1" stopColor="#0f1716" />
          </LinearGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#scene)" />
      </Svg>

      <Animated.View
        style={{
          position: 'absolute',
          left: width * 0.7 - sun / 2,
          top: height * 0.4 - sun / 2,
          opacity: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 0.88] }),
          transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }],
        }}
      >
        <Svg width={sun} height={sun}>
          <Defs>
            <RadialGradient id="sun">
              <Stop offset="0" stopColor="#fffaf0" />
              <Stop offset="0.06" stopColor="#fff1cf" />
              <Stop offset="0.14" stopColor="#ffe9ba" stopOpacity="0.75" />
              <Stop offset="0.28" stopColor="#F8D794" stopOpacity="0.4" />
              <Stop offset="0.5" stopColor="#F8D794" stopOpacity="0.12" />
              <Stop offset="0.7" stopColor="#F8D794" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width={sun} height={sun} fill="url(#sun)" />
        </Svg>
      </Animated.View>

      <Svg
        width={width}
        height={height * 0.72}
        viewBox="0 0 1440 600"
        preserveAspectRatio="xMidYMax slice"
        style={{ position: 'absolute', bottom: 0 }}
      >
        <Defs>
          <LinearGradient id="mistfade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#cfd6cf" stopOpacity="0" />
            <Stop offset="1" stopColor="#cfd6cf" stopOpacity="0.55" />
          </LinearGradient>
          <LinearGradient id="rim" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#F8D794" stopOpacity="0" />
            <Stop offset="0.35" stopColor="#F8D794" stopOpacity="0.55" />
            <Stop offset="0.6" stopColor="#F8D794" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={RIDGE_BACK} fill="#5d6c69" opacity={0.55} />
        <Rect y={300} width={1440} height={300} fill="url(#mistfade)" opacity={0.5} />
        <Path d={RIDGE_FRONT} fill="#33423f" opacity={0.85} />
        <Path d={RIDGE_FRONT} fill="none" stroke="url(#rim)" strokeWidth={2} />
        <Path d={CLIFF} fill="#141c1a" />
        <Path d="M1318,210 L1290,300 L1250,380" fill="none" stroke="#F8D794" strokeOpacity={0.35} strokeWidth={2} />
      </Svg>

      <Animated.View
        style={{
          position: 'absolute',
          left: -width * 0.2,
          bottom: height * 0.02,
          transform: [
            { translateX: clouds.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.08, width * 0.08] }) },
          ],
        }}
      >
        <Svg width={width * 1.4} height={height * 0.36}>
          <Defs>
            <RadialGradient id="cloud">
              <Stop offset="0" stopColor="#e2e5de" stopOpacity="0.85" />
              <Stop offset="0.6" stopColor="#c9d3cd" stopOpacity="0.35" />
              <Stop offset="1" stopColor="#c9d3cd" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse
            cx={width * 0.4}
            cy={height * 0.24}
            rx={width * 0.5}
            ry={height * 0.12}
            fill="url(#cloud)"
            opacity={0.7}
          />
          <Ellipse
            cx={width * 0.95}
            cy={height * 0.2}
            rx={width * 0.5}
            ry={height * 0.1}
            fill="url(#cloud)"
            opacity={0.55}
          />
          <Ellipse
            cx={width * 0.7}
            cy={height * 0.32}
            rx={width * 0.65}
            ry={height * 0.1}
            fill="url(#cloud)"
            opacity={0.6}
          />
        </Svg>
      </Animated.View>

      <Animated.View
        style={{
          position: 'absolute',
          left: -width * 0.08,
          bottom: -height * 0.02,
          width: width * 0.75,
          height: height * 0.5,
          opacity: 0.92,
          transformOrigin: 'bottom',
          transform: [{ rotate: sway.interpolate({ inputRange: [0, 1], outputRange: ['-1.5deg', '2deg'] }) }],
        }}
      >
        <SvgXml xml={REEDS_SVG} width="100%" height="100%" />
      </Animated.View>

      <Svg width={width} height={height * 0.3} style={{ position: 'absolute', bottom: 0 }}>
        <Defs>
          <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0f1716" stopOpacity="0" />
            <Stop offset="1" stopColor="#0f1716" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect width={width} height={height * 0.3} fill="url(#fade)" />
      </Svg>

      <View style={st.copy}>{children}</View>
    </View>
  );
}

const st = StyleSheet.create({
  hero: { overflow: 'hidden', justifyContent: 'center' },
  copy: { paddingHorizontal: 24, paddingTop: 40, gap: 14, alignItems: 'center' },
});
