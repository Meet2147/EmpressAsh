import { Card, Eyebrow, H1, P, Screen } from '@/components/ui';

const SECTIONS: [string, string[]][] = [
  [
    'Disclaimer',
    [
      'All readings are intended for spiritual reflection and personal guidance. Tarot interpretations are subjective and do not guarantee outcomes. They are not a substitute for medical, legal, mental health, property or professional financial advice.',
    ],
  ],
  ['Age', ['Clients must be 18 or older. Ash does not read for anyone under 18.']],
  [
    'Boundaries',
    [
      'No readings on death or hospitalisation.',
      "Please keep questions relevant and to the point, and don't ask Ash personal questions about herself or her whereabouts.",
      'Readings booked only for fun or curiosity, without a genuine question, are not accepted.',
    ],
  ],
  [
    'Booking & payment',
    [
      'Appointments are confirmed upon full payment, made on the EmpressAsh website.',
      'Live readings must be booked at least one week in advance.',
      'Ash needs your full real name and your question before the reading.',
      'Written summaries are delivered within 48 hours.',
    ],
  ],
  [
    'Confidentiality & recordings',
    ['All sessions are confidential. Sessions are not recorded, by Ash or by the client.'],
  ],
  [
    'Your details & privacy',
    [
      'This app does not create an account or store your personal details. When you book or join on the website, Ash keeps your name, email, mobile number, date of birth and question to deliver your reading. Your details are never sold. To have them removed, message Ash.',
    ],
  ],
];

export default function Policies() {
  return (
    <Screen>
      <Eyebrow>Policies</Eyebrow>
      <H1>Policies &amp; disclaimer</H1>
      {SECTIONS.map(([title, lines]) => (
        <Card key={title}>
          <Eyebrow>{title}</Eyebrow>
          {lines.map((l) => (
            <P key={l} style={{ fontSize: 16 }}>
              {l}
            </P>
          ))}
        </Card>
      ))}
    </Screen>
  );
}
