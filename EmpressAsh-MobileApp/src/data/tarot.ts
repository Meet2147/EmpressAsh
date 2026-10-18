// The 78-card deck and the card of the day, ported from the website (app/tarot.py).
// The daily card uses the same hash as the website, so app and site always agree.
import { sha256Hex } from './sha256';

export type Card = { id: string; name: string; numeral: string; meaning: string; arcana: string };

const MAJORS: [string, string, string][] = [
  ['The Fool', '0', 'New beginnings, trust and a leap into the unknown. Step forward with an open heart.'],
  ['The Magician', 'I', 'Focus and will. You already hold every tool you need; use them with intention.'],
  ['The High Priestess', 'II', 'Intuition and quiet knowing. Listen to what lies beneath the surface.'],
  ['The Empress', 'III', 'Abundance, nurture and creation. Tend to what you love and let it grow.'],
  ['The Emperor', 'IV', 'Structure and steady leadership. Build firm foundations and hold your ground.'],
  ['The Hierophant', 'V', 'Tradition and guidance. Wisdom passed down has something to teach you today.'],
  ['The Lovers', 'VI', 'Choice, union and alignment. Choose with your values, not only your wants.'],
  ['The Chariot', 'VII', 'Willpower and direction. Gather opposing forces and move forward with purpose.'],
  ['Strength', 'VIII', 'Gentle courage. Patience and compassion will tame what force cannot.'],
  ['The Hermit', 'IX', 'Solitude and inner light. Step back and seek your own answers.'],
  ['Wheel of Fortune', 'X', 'Cycles and change. The wheel turns; meet what comes with grace.'],
  ['Justice', 'XI', 'Truth and fairness. Actions return to their source; choose honestly.'],
  ['The Hanged Man', 'XII', 'Pause and surrender. A new view comes when you stop pushing.'],
  ['Death', 'XIII', 'Endings that make room. Let something close so something new can begin.'],
  ['Temperance', 'XIV', 'Balance and patience. Blend, soften and find the middle way.'],
  ['The Devil', 'XV', 'Attachment and shadow. Notice what binds you; the chains are looser than they seem.'],
  ['The Tower', 'XVI', 'Sudden change and revelation. What falls away was not built to last.'],
  ['The Star', 'XVII', 'Hope and healing. After the storm, renewal and quiet faith.'],
  ['The Moon', 'XVIII', 'Dreams, illusion and the unknown. Trust your intuition through the fog.'],
  ['The Sun', 'XIX', 'Joy, warmth and clarity. Let yourself be seen and celebrated.'],
  ['Judgement', 'XX', 'Awakening and calling. Rise to the version of yourself that is calling you.'],
  ['The World', 'XXI', 'Completion and wholeness. A chapter closes; honour how far you have come.'],
];

const SUITS: [string, string, string][] = [
  ['Wands', 'fire', 'passion, creativity and drive'],
  ['Cups', 'water', 'emotions, love and relationships'],
  ['Swords', 'air', 'thoughts, truth and conflict'],
  ['Pentacles', 'earth', 'work, money and the body'],
];

const RANKS: [string, string][] = [
  ['Ace', 'a fresh spark and new potential in'],
  ['Two', 'a choice or partnership to balance in'],
  ['Three', 'growth and early results in'],
  ['Four', 'stability, rest or holding on in'],
  ['Five', 'challenge and friction around'],
  ['Six', 'harmony returning, and give and take, in'],
  ['Seven', 'testing your resolve in'],
  ['Eight', 'movement, effort and learning in'],
  ['Nine', 'near-fulfilment, with lessons, in'],
  ['Ten', 'completion, and its weight, in'],
  ['Page', 'curious, youthful news about'],
  ['Knight', 'bold action and pursuit in'],
  ['Queen', 'mature, nurturing mastery of'],
  ['King', 'steady authority over'],
];

const COURT = new Set(['Page', 'Knight', 'Queen', 'King', 'Ace']);
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export const DECK: Card[] = [
  ...MAJORS.map(([name, numeral, meaning]) => ({ id: slug(name), name, numeral, meaning, arcana: 'Major Arcana' })),
  ...SUITS.flatMap(([suit, element, theme]) =>
    RANKS.map(([rank, phrase], i) => {
      const name = `${rank} of ${suit}`;
      return {
        id: slug(name),
        name,
        numeral: COURT.has(rank) ? rank : String(i + 1),
        meaning: `This card speaks of ${phrase} ${theme}. Notice where the element of ${element} is moving in your life today.`,
        arcana: `Minor Arcana · ${suit}`,
      };
    }),
  ),
];

export const cardById = (id: string) => DECK.find((c) => c.id === id);

/** Today's date in India (IST), as YYYY-MM-DD, matching the website. */
export function todayIST(now = new Date()): string {
  return new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
}

/** The same card for everyone on a given day. */
export function cardOfTheDay(day = todayIST()): Card {
  const hex = sha256Hex(`empressash-${day}`);
  // Big number mod 78, done in chunks so it works without BigInt.
  let rem = 0;
  for (const ch of hex) rem = (rem * 16 + parseInt(ch, 16)) % DECK.length;
  return DECK[rem];
}
