import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCurrency } from '@/currency';
import { colors, fonts } from '@/theme';
import type { Currency } from '@/data/readings';

const OPTIONS: { id: Currency; label: string }[] = [
  { id: 'inr', label: '₹ INR' },
  { id: 'usd', label: '$ USD' },
];

export function CurrencySwitch() {
  const { currency, setCurrency } = useCurrency();
  return (
    <View style={st.row} accessibilityRole="radiogroup" accessibilityLabel="Currency">
      {OPTIONS.map((o) => {
        const on = o.id === currency;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => setCurrency(o.id)}
            style={[st.opt, on && st.on]}
          >
            <Text style={[st.text, on && { color: colors.night }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 999,
    padding: 3,
  },
  opt: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999 },
  on: { backgroundColor: colors.khaki },
  text: { fontFamily: fonts.body, color: colors.text, fontSize: 15 },
});
