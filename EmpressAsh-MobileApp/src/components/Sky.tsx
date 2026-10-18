import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Motes } from './Motes';

// The web app's sky: misty slate-teal gradient, a warm glow from above,
// slow drifting fog, embers and snow, and a soft vignette.
function Fog({
  top,
  duration,
  opacity,
  reverse,
}: {
  top: number;
  duration: number;
  opacity: number;
  reverse?: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(x, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(x, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [x, duration]);
  const shift = width * 0.12;
  const translateX = x.interpolate({ inputRange: [0, 1], outputRange: reverse ? [shift, -shift] : [-shift, shift] });
  const w = width * 1.4;
  const h = height * 0.5;
  return (
    <Animated.View
      style={{ position: 'absolute', left: -width * 0.2, top: height * top, opacity, transform: [{ translateX }] }}
    >
      <Svg width={w} height={h}>
        <Defs>
          <RadialGradient id="fog" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#c9d3cd" stopOpacity="0.9" />
            <Stop offset="1" stopColor="#c9d3cd" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill="url(#fog)" />
      </Svg>
    </Animated.View>
  );
}

export function Sky() {
  const { width, height } = useWindowDimensions();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="base" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#1f2b2a" />
            <Stop offset="0.45" stopColor="#16201f" />
            <Stop offset="1" stopColor="#0f1716" />
          </LinearGradient>
          <RadialGradient id="sun" cx="70%" cy="-6%" rx="90%" ry="45%">
            <Stop offset="0" stopColor="#F8D794" stopOpacity="0.2" />
            <Stop offset="1" stopColor="#F8D794" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="slate" cx="5%" cy="30%" rx="80%" ry="40%">
            <Stop offset="0" stopColor="#4b5b5e" stopOpacity="0.4" />
            <Stop offset="1" stopColor="#4b5b5e" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="plum" cx="95%" cy="88%" rx="80%" ry="40%">
            <Stop offset="0" stopColor="#372C41" stopOpacity="0.55" />
            <Stop offset="1" stopColor="#372C41" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="vignette" cx="50%" cy="45%" rx="75%" ry="70%">
            <Stop offset="0.6" stopColor="#050808" stopOpacity="0" />
            <Stop offset="1" stopColor="#050808" stopOpacity="0.55" />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#base)" />
        <Rect width={width} height={height} fill="url(#sun)" />
        <Rect width={width} height={height} fill="url(#slate)" />
        <Rect width={width} height={height} fill="url(#plum)" />
      </Svg>
      <Fog top={0.02} duration={45000} opacity={0.12} />
      <Fog top={0.42} duration={60000} opacity={0.08} reverse />
      <Fog top={0.75} duration={75000} opacity={0.09} />
      <Motes />
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Rect width={width} height={height} fill="url(#vignette)" />
      </Svg>
    </View>
  );
}
