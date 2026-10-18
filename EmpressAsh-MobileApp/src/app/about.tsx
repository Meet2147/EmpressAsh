import { router } from 'expo-router';
import { View } from 'react-native';
import { Moon } from '@/components/Moon';
import { Button, Card, Divider, Eyebrow, H1, H2, P, Screen } from '@/components/ui';

export default function About() {
  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: 10, paddingTop: 8 }}>
        <Moon size={56} />
        <Eyebrow>About me</Eyebrow>
        <H1 style={{ textAlign: 'center' }}>I&apos;m Ash</H1>
        <P muted style={{ textAlign: 'center' }}>
          Reader of tarot, oracle cards and runes, and a guide for those standing at a crossroads.
        </P>
      </View>
      <Divider />
      <H2>How I found the cards</H2>
      <P>
        My mother is a tarot reader, and watching her shuffle and lay out the cards is how I first fell in love with
        them. I began practising on my own, and over the years it became the way I listen to people and help them see
        their path more clearly. That was more than ten years ago, and I&apos;ve been reading ever since.
      </P>
      <P>I&apos;m also a certified tarot reader, with thanks to my mom and to the teacher whose course I took.</P>
      <Divider />
      <H2>My tools</H2>
      <P>
        I work with more than five decks, letting guidance choose the right one for each reading. Most often I reach for
        my Rider-Waite tarot deck, alongside oracle decks, runes and crystals.
      </P>
      <Card>
        <Eyebrow>Style</Eyebrow>
        <P>Intuitive and gentle. Readings are guided and relaxed, with room to talk things through.</P>
      </Card>
      <Card>
        <Eyebrow>Practice</Eyebrow>
        <P>Tarot, oracle, runes and energy work.</P>
      </Card>
      <Card>
        <Eyebrow>Who I read for</Eyebrow>
        <P>
          Real questions about career, love, a new home or the year ahead. No readings on death or hospitalisation, and
          only for adults 18+.
        </P>
      </Card>
      <Button title="Explore readings" onPress={() => router.navigate('/readings')} />
    </Screen>
  );
}
