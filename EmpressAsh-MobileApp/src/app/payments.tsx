import { Card, Eyebrow, Fine, H1, P, Screen } from '@/components/ui';

const STEPS = [
  ['Choose a spread', 'Pick a reading and whether you want a video or voice session.'],
  [
    'Book on the website',
    'The app opens the EmpressAsh booking page in your browser. You share your question there and pay securely.',
  ],
  ['Pick a time', 'After paying, you choose a time for your live session with Ash.'],
  [
    'Meet Ash',
    'Your private one-on-one session takes place at that time, followed by a written summary within 48 hours.',
  ],
];

export default function Payments() {
  return (
    <Screen>
      <Eyebrow>Booking</Eyebrow>
      <H1>How booking works</H1>
      <P muted>Readings are live, one-on-one sessions with Ash. Nothing is bought or unlocked inside this app.</P>
      {STEPS.map(([t, d], i) => (
        <Card key={t}>
          <Eyebrow>Step {i + 1}</Eyebrow>
          <P>{t}</P>
          <P muted style={{ fontSize: 16 }}>
            {d}
          </P>
        </Card>
      ))}
      <Fine>Payments are handled by Dodo Payments on the EmpressAsh website.</Fine>
    </Screen>
  );
}
