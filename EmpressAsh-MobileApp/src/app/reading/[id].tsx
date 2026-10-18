import { Stack, router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { CurrencySwitch } from '@/components/CurrencySwitch';
import { Button, Card, Eyebrow, Fine, H1, H2, P, Screen } from '@/components/ui';
import { CONFIG, siteLink } from '@/config';
import { useCurrency } from '@/currency';
import { FORMATS, formatPrice, price, readingById } from '@/data/readings';
import { openCheckout, openWeb } from '@/web';

export default function ReadingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const r = readingById(id);
  const { currency } = useCurrency();

  if (!r) {
    return (
      <Screen>
        <H1>Reading not found</H1>
        <Button title="All readings" onPress={() => router.replace('/readings')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: r.name }} />
      <View style={{ gap: 8 }}>
        <Eyebrow>{r.tag}</Eyebrow>
        <H1>{r.name}</H1>
        <P muted>{r.desc}</P>
        <Fine>Session length: {r.duration}</Fine>
        <CurrencySwitch />
      </View>

      {FORMATS.map((f) => {
        const amount = price(r, f.id, currency);
        const canBook = CONFIG.liveReadingsOpen && amount != null;
        return (
          <Card key={f.id}>
            <Eyebrow>{f.id === 'video' ? 'Premium' : 'Private'}</Eyebrow>
            <H2 style={{ fontSize: 22 }}>{f.label}</H2>
            <P muted style={{ fontSize: 16 }}>
              {f.detail}
            </P>
            <H2 style={{ fontSize: 24 }}>{formatPrice(amount, currency)}</H2>
            {canBook ? (
              <Button title="Book this session" onPress={() => openCheckout(r.id, f.id, currency)} />
            ) : amount == null ? (
              <Button title="Ask Ash about this reading" variant="ghost" onPress={() => router.push('/contact')} />
            ) : (
              <Button title="Opening soon" variant="ghost" disabled />
            )}
          </Card>
        );
      })}

      {!CONFIG.liveReadingsOpen && (
        <Card>
          <P muted>Live sessions open soon. Join the circle for a free first reading and first word when they do.</P>
          <Button title="Join the circle" onPress={() => openWeb(siteLink('/join'))} />
        </Card>
      )}

      <Fine>
        Booking opens a secure page in your browser where you share your question and pay. After paying, you pick a time
        for your session with Ash. Sessions must be booked at least a week ahead.
      </Fine>
    </Screen>
  );
}
