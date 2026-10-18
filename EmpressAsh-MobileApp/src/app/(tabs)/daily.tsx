import { useState } from 'react';
import { Share, View } from 'react-native';
import { FlipCard } from '@/components/TarotCard';
import { Button, Card, Eyebrow, Fine, H1, H2, P, Screen } from '@/components/ui';
import { siteLink } from '@/config';
import { cardOfTheDay, todayIST } from '@/data/tarot';
import { openWeb } from '@/web';

export default function Daily() {
  const card = cardOfTheDay();
  const [open, setOpen] = useState(false);
  const date = new Date(`${todayIST()}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <Screen>
      <View style={{ gap: 6, alignItems: 'center' }}>
        <Eyebrow>Card of the day · {date}</Eyebrow>
        <H1 style={{ textAlign: 'center' }}>{open ? card.name : 'Turn over your card'}</H1>
        {!open && <P muted>Take a breath, hold a question in mind, then tap the card.</P>}
      </View>

      <View style={{ paddingVertical: 8 }}>
        <FlipCard key={card.id} card={card} onReveal={() => setOpen(true)} />
      </View>

      {open && (
        <>
          <Card>
            <Eyebrow>{card.arcana}</Eyebrow>
            <H2>What it says today</H2>
            <P>{card.meaning}</P>
          </Card>
          <Button
            title="Share today's card"
            variant="ghost"
            onPress={() =>
              Share.share({ message: `My card of the day from EmpressAsh: ${card.name}. ${siteLink('/daily-card')}` })
            }
          />
          <Button
            title="Talk about it with the circle"
            variant="ghost"
            onPress={() => openWeb(siteLink('/daily-card'))}
          />
        </>
      )}
      <Fine>Everyone sees the same card each day. A new card turns over at midnight in India.</Fine>
    </Screen>
  );
}
