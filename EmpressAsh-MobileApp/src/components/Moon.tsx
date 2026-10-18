import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '@/theme';

// The crescent moon from the website's favicon.
export function Moon({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path d="M40 12a20 20 0 1 0 12 32A16 16 0 1 1 40 12z" fill={colors.khaki} />
      <Circle cx={46} cy={18} r={2} fill={colors.mauve} />
    </Svg>
  );
}
