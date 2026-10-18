import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Card, Eyebrow, H1, P, Screen } from '@/components/ui';
import { cardById } from '@/data/tarot';
import { colors, fonts } from '@/theme';

export default function CardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const card = cardById(id);
  if (!card) {
    return (
      <Screen>
        <H1>Card not found</H1>
      </Screen>
    );
  }
  return (
    <Screen>
      <Stack.Screen options={{ title: card.name }} />
      <View style={st.big}>
        <Text style={st.num}>{card.numeral}</Text>
        <Text style={st.star}>✦</Text>
        <Text style={st.name}>{card.name}</Text>
      </View>
      <Card>
        <Eyebrow>{card.arcana}</Eyebrow>
        <P>{card.meaning}</P>
      </Card>
    </Screen>
  );
}

const st = StyleSheet.create({
  big: {
    alignSelf: 'center',
    width: 200,
    height: 320,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.khaki,
    backgroundColor: colors.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
  },
  num: { fontFamily: fonts.display, color: colors.khaki, fontSize: 28 },
  star: { color: colors.khaki, fontSize: 36 },
  name: { fontFamily: fonts.display, color: colors.text, fontSize: 24, textAlign: 'center' },
});
