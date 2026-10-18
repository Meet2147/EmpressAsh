import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCurrency } from '@/currency';
import { formatPrice, fromPrice, type Reading } from '@/data/readings';
import { colors, fonts, radius } from '@/theme';

export function ReadingRow({ r }: { r: Reading }) {
  const { currency } = useCurrency();
  const from = fromPrice(r, currency);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/reading/[id]', params: { id: r.id } })}
      style={({ pressed }) => [st.row, pressed && { opacity: 0.8 }]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={st.tag}>{r.tag}</Text>
        <Text style={st.name}>{r.name}</Text>
        <Text style={st.meta}>{r.duration}</Text>
      </View>
      <Text style={st.price}>{from == null ? 'On request' : `from ${formatPrice(from, currency)}`}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radius,
    padding: 16,
  },
  tag: { fontFamily: fonts.body, color: colors.olive, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase' },
  name: { fontFamily: fonts.display, color: colors.text, fontSize: 22, lineHeight: 27 },
  meta: { fontFamily: fonts.body, color: colors.muted, fontSize: 15 },
  price: { fontFamily: fonts.bodyMedium, color: colors.khaki, fontSize: 16 },
});
