import { router } from 'expo-router';
import { View } from 'react-native';
import { Button, Card, Eyebrow, Fine, H1, H2, P, Screen } from '@/components/ui';
import { CONFIG, siteLink } from '@/config';
import { openExternal, openWeb } from '@/web';

export default function Contact() {
  const { email, whatsapp, instagram, youtube } = CONFIG.contact;
  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Eyebrow>Contact</Eyebrow>
        <H1>Reach Ash</H1>
        <P muted>Questions before booking, or help with a reading you&apos;ve already booked.</P>
      </View>
      <Card>
        <H2>Message Ash</H2>
        {whatsapp ? (
          <Button title="Chat on WhatsApp" onPress={() => openExternal(`https://wa.me/${whatsapp}`)} />
        ) : null}
        {email ? (
          <Button title="Send an email" variant="ghost" onPress={() => openExternal(`mailto:${email}`)} />
        ) : null}
        {!whatsapp && !email ? (
          <Button title="Contact page" variant="ghost" onPress={() => openWeb(siteLink('/contact'))} />
        ) : null}
      </Card>
      {(instagram || youtube) && (
        <Card>
          <H2>Follow along</H2>
          {instagram ? <Button title="Instagram" variant="ghost" onPress={() => openExternal(instagram)} /> : null}
          {youtube ? <Button title="YouTube" variant="ghost" onPress={() => openExternal(youtube)} /> : null}
        </Card>
      )}
      <Card>
        <H2>More</H2>
        <Button title="About Ash" variant="ghost" onPress={() => router.push('/about')} />
        <Button title="How booking works" variant="ghost" onPress={() => router.push('/payments')} />
        <Button title="Policies & disclaimer" variant="ghost" onPress={() => router.push('/policies')} />
      </Card>
      <Fine>For adults 18 and over. Readings are for guidance and reflection only.</Fine>
    </Screen>
  );
}
