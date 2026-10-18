import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MiniCard } from '@/components/TarotCard';
import { Eyebrow, H1, P, Screen } from '@/components/ui';
import { DECK } from '@/data/tarot';
import { colors, fonts, radius } from '@/theme';

const GROUPS = ['All', 'Major', 'Wands', 'Cups', 'Swords', 'Pentacles'] as const;

export default function Deck() {
  const [group, setGroup] = useState<(typeof GROUPS)[number]>('All');
  const [q, setQ] = useState('');
  const cards = useMemo(
    () =>
      DECK.filter((c) => group === 'All' || c.arcana.includes(group)).filter((c) =>
        c.name.toLowerCase().includes(q.trim().toLowerCase()),
      ),
    [group, q],
  );

  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Eyebrow>The 78 cards</Eyebrow>
        <H1>Learn the deck</H1>
        <P muted>Every card Ash reads with, and what it speaks of.</P>
      </View>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Search a card"
        placeholderTextColor={colors.muted}
        style={st.search}
      />
      <View style={st.chips}>
        {GROUPS.map((g) => (
          <Pressable key={g} onPress={() => setGroup(g)} style={[st.chip, g === group && st.chipOn]}>
            <Text style={[st.chipText, g === group && { color: colors.night }]}>{g}</Text>
          </Pressable>
        ))}
      </View>
      {cards.map((c) => (
        <Pressable
          key={c.id}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/card/[id]', params: { id: c.id } })}
          style={({ pressed }) => [st.row, pressed && { opacity: 0.8 }]}
        >
          <MiniCard card={c} />
          <View style={{ flex: 1 }}>
            <Text style={st.name}>{c.name}</Text>
            <Text style={st.meta}>{c.arcana}</Text>
          </View>
        </Pressable>
      ))}
    </Screen>
  );
}

const st = StyleSheet.create({
  search: {
    fontFamily: fonts.body,
    fontSize: 17,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chipOn: { backgroundColor: colors.khaki, borderColor: colors.khaki },
  chipText: { fontFamily: fonts.body, color: colors.text, fontSize: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radius,
    padding: 10,
  },
  name: { fontFamily: fonts.display, color: colors.text, fontSize: 20 },
  meta: { fontFamily: fonts.body, color: colors.muted, fontSize: 14 },
});
