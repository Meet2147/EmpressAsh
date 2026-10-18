import { router } from 'expo-router';
import { Button, H1, P, Screen } from '@/components/ui';

export default function NotFound() {
  return (
    <Screen>
      <H1>Lost in the mist</H1>
      <P muted>This page doesn&apos;t exist.</P>
      <Button title="Back home" onPress={() => router.replace('/')} />
    </Screen>
  );
}
