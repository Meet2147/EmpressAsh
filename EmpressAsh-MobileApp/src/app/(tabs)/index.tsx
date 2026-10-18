import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CurrencySwitch } from '@/components/CurrencySwitch';
import { Hero } from '@/components/Hero';
import { Moon } from '@/components/Moon';
import { ReadingRow } from '@/components/ReadingRow';
import { Button, Card, Divider, Eyebrow, Fine, H2, P, Screen } from '@/components/ui';
import { siteLink } from '@/config';
import { READINGS } from '@/data/readings';
import { colors, fonts } from '@/theme';
import { openWeb } from '@/web';

const FEATURED = ['three-card', 'love-single', 'career'];
const TICK = 'Tarot ✦ Oracle ✦ Runes ✦ Energy work ✦ Love ✦ Career ✦ Year ahead ✦ Abundance';

export default function Home() {
  const insets = useSafeAreaInsets();
  return (
    <Screen>
      <Hero height={560 + insets.top}>
        <View style={{ height: insets.top }} />
        <Moon size={44} />
        <Text style={st.eyebrow}>Tarot · Oracle · Runes · Energy guidance</Text>
        <Text style={st.h1}>Step into another realm</Text>
        <Text style={st.lead}>
          Gentle, intuitive readings with Ash, who has read the cards for more than ten years. A quiet space above the
          clouds to find clarity on love, career and the path ahead.
        </Text>
        <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 6 }}>
          <Button title="Claim your free first reading" onPress={() => openWeb(siteLink('/join'))} />
          <Button title="Draw today's card" variant="ghost" onPress={() => router.navigate('/daily')} />
        </View>
      </Hero>

      <Text style={st.ticker} numberOfLines={1}>
        {TICK}
      </Text>

      <Card>
        <Eyebrow>Today&apos;s card</Eyebrow>
        <H2>Your card is waiting</H2>
        <P muted>Each day the deck offers one card to everyone. Turn it over and sit with its message.</P>
        <Button title="Reveal today's card" variant="ghost" onPress={() => router.navigate('/daily')} />
      </Card>

      <Card>
        <Eyebrow>For new visitors</Eyebrow>
        <H2>Your first reading is free</H2>
        <P muted>
          Join the circle with your email, mobile and birthday. You&apos;ll get a free first reading, a birthday reading
          gift, and a code to share with friends.
        </P>
        <Button title="Join & claim" onPress={() => openWeb(siteLink('/join'))} />
      </Card>

      <Divider />
      <View style={{ gap: 10 }}>
        <Eyebrow>Readings</Eyebrow>
        <H2>Choose your spread</H2>
        <CurrencySwitch />
      </View>
      {READINGS.filter((r) => FEATURED.includes(r.id)).map((r) => (
        <ReadingRow key={r.id} r={r} />
      ))}
      <Button title="See all readings" variant="ghost" onPress={() => router.navigate('/readings')} />

      <Divider />
      <Card>
        <Eyebrow>About Ash</Eyebrow>
        <H2>A path passed down, a gift made her own</H2>
        <P muted>
          Ash grew up watching her mother read tarot, and took up the cards herself. More than ten years on, she reads
          mostly with the Rider-Waite deck, alongside oracle decks and runes chosen in the moment.
        </P>
        <Button title="Read Ash's story" variant="ghost" onPress={() => router.push('/about')} />
      </Card>

      <Fine>Readings are for adults 18 and over, for guidance and reflection.</Fine>
    </Screen>
  );
}

const st = StyleSheet.create({
  eyebrow: {
    fontFamily: fonts.body,
    color: colors.sunlight,
    textTransform: 'uppercase',
    letterSpacing: 3,
    fontSize: 11,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 10,
  },
  h1: {
    fontFamily: fonts.display,
    color: '#fbf4e4',
    fontSize: 46,
    lineHeight: 50,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowRadius: 24,
  },
  lead: {
    fontFamily: fonts.body,
    color: '#e9e3d3',
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowRadius: 12,
  },
  ticker: {
    fontFamily: fonts.body,
    color: colors.mist,
    textAlign: 'center',
    letterSpacing: 0.6,
    fontSize: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.cardBorder,
    marginHorizontal: -20,
  },
});
