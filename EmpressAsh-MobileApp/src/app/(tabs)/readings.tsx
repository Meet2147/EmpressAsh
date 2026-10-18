import { router } from 'expo-router';
import { View } from 'react-native';
import { CurrencySwitch } from '@/components/CurrencySwitch';
import { ReadingRow } from '@/components/ReadingRow';
import { Button, Card, Eyebrow, Fine, H1, H2, P, Screen } from '@/components/ui';
import { CONFIG, siteLink } from '@/config';
import { FORMATS, READINGS } from '@/data/readings';
import { openWeb } from '@/web';

export default function Readings() {
  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Eyebrow>Live one-on-one readings</Eyebrow>
        <H1>Choose your spread</H1>
        <P muted>
          Every spread is a private session with Ash by video or voice, followed by a written summary within 48 hours.
        </P>
        <CurrencySwitch />
      </View>

      {!CONFIG.liveReadingsOpen && (
        <Card>
          <Eyebrow>Opening soon</Eyebrow>
          <H2>Live sessions are almost here</H2>
          <P muted>Join the circle now to claim your free first reading and hear first when booking opens.</P>
          <Button title="Join the circle" onPress={() => openWeb(siteLink('/join'))} />
        </Card>
      )}

      {FORMATS.map((f) => (
        <Card key={f.id} style={{ gap: 4 }}>
          <Eyebrow>{f.id === 'video' ? 'Premium' : 'Private'}</Eyebrow>
          <H2 style={{ fontSize: 22 }}>{f.label}</H2>
          <P muted style={{ fontSize: 16 }}>
            {f.detail}
          </P>
        </Card>
      ))}

      {READINGS.map((r) => (
        <ReadingRow key={r.id} r={r} />
      ))}

      <Fine>
        All readings are for spiritual reflection and personal guidance. Tarot interpretations are subjective, do not
        guarantee outcomes, and are not a substitute for medical, legal, mental health, property or financial advice.
      </Fine>
      <Button title="How booking and payment work" variant="ghost" onPress={() => router.push('/payments')} />
    </Screen>
  );
}
