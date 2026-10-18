// Readings Ash offers, copied from the website (app/catalog.py on the web-app branch).
// Prices are whole rupees / dollars for [video, voice]; null means price on request.
// Written readings are left out on purpose: the app only sells live one-on-one sessions.
// See README.md, "How payments work".

export type Currency = 'inr' | 'usd';
export type LiveFormat = 'video' | 'voice';

export type Reading = {
  id: string;
  name: string;
  tag: string;
  desc: string;
  duration: string;
  inr: [number | null, number | null];
  usd: [number | null, number | null];
};

export const FORMATS: { id: LiveFormat; label: string; detail: string }[] = [
  {
    id: 'video',
    label: 'Video call + report',
    detail: 'Private one-to-one video session, then a written summary within 48 hours.',
  },
  {
    id: 'voice',
    label: 'Voice call + report',
    detail: 'Private audio session with the same depth, then a written summary within 48 hours.',
  },
];

export const READINGS: Reading[] = [
  {
    id: 'three-card',
    name: '3 Card Spread',
    tag: 'Past · Present · Future',
    desc: 'A snapshot of past influences, present circumstances and possible direction.',
    duration: '20 mins',
    inr: [899, 699],
    usd: [18, 14],
  },
  {
    id: 'yes-no',
    name: 'Yes or No Spread',
    tag: 'One clear question',
    desc: 'A focused answer with a brief explanation of the energy surrounding one question.',
    duration: '10–15 mins',
    inr: [499, 399],
    usd: [10, 8],
  },
  {
    id: 'quarter',
    name: 'Quarter Spread',
    tag: 'The next three months',
    desc: 'Themes, opportunities, challenges and guidance for the next three months.',
    duration: '30–35 mins',
    inr: [1599, 1299],
    usd: [35, 28],
  },
  {
    id: 'year',
    name: 'Year Spread',
    tag: 'The year ahead',
    desc: 'A broader look at the year ahead, including key themes, growth and potential turning points.',
    duration: '45–60 mins',
    inr: [2499, 1999],
    usd: [55, 45],
  },
  {
    id: 'love-single',
    name: 'Love Spread (Singles)',
    tag: 'Love & openness',
    desc: 'Love energy, relationship patterns, openness to new connections and personal growth.',
    duration: '25 mins',
    inr: [1099, 899],
    usd: [24, 19],
  },
  {
    id: 'relationship',
    name: 'Relationship Spread',
    tag: 'Connection & paths forward',
    desc: 'Explore connection, communication, challenges, needs and possible paths forward.',
    duration: '30–35 mins',
    inr: [1599, 1299],
    usd: [35, 28],
  },
  {
    id: 'eight-card',
    name: '8 Card Spread',
    tag: 'Many perspectives',
    desc: 'A detailed reading exploring a specific situation from multiple perspectives.',
    duration: '30–40 mins',
    inr: [1599, 1299],
    usd: [35, 28],
  },
  {
    id: 'health',
    name: 'Health Spread',
    tag: 'Self-care & balance',
    desc: 'Reflective guidance for self-care, emotional balance, stress and personal well-being.',
    duration: '20–25 mins',
    inr: [999, 799],
    usd: [22, 18],
  },
  {
    id: 'celtic-cross',
    name: 'Celtic Cross Spread',
    tag: 'The heart of the matter',
    desc: 'An in-depth reading covering the heart of a situation, influences, obstacles and possible outcomes.',
    duration: '40–50 mins',
    inr: [2199, 999],
    usd: [48, 38],
  },
  {
    id: 'abundance',
    name: 'Abundance Spread',
    tag: 'Growth & flow',
    desc: 'Explore beliefs, opportunities, blocks and practical areas for growth around abundance.',
    duration: '25–30 mins',
    inr: [1299, 999],
    usd: [28, 22],
  },
  {
    id: 'education',
    name: 'Education Spread',
    tag: 'Study & focus',
    desc: 'Explore motivation, study challenges, strengths, focus and possible academic pathways.',
    duration: '20–25 mins',
    inr: [1099, 899],
    usd: [24, 20],
  },
  {
    id: 'career',
    name: 'Career & Life Purpose Spread',
    tag: 'Work & calling',
    desc: 'Explore career opportunities, workplace dynamics, strengths and possible next steps.',
    duration: '30–35 mins',
    inr: [1599, 1299],
    usd: [35, 28],
  },
  {
    id: 'home',
    name: 'Buying / Selling a Home Spread',
    tag: 'Property decisions',
    desc: 'Explore priorities, concerns, opportunities and considerations surrounding a property decision.',
    duration: '35–40 mins',
    inr: [1999, 1599],
    usd: [42, 35],
  },
  {
    id: 'business',
    name: 'Business & Entrepreneurship Spread',
    tag: "Your venture's energy",
    desc: "Your business's current energy, opportunities, challenges, growth areas and possible next steps, so you can move forward with clarity and confidence.",
    duration: '30–45 mins',
    inr: [1999, 1599],
    usd: [42, 35],
  },
  {
    id: 'life-guidance',
    name: 'Life Guidance & Next Steps',
    tag: 'Clarity & direction',
    desc: 'A supportive reading focused on the actions, changes and choices that can help you move forward with more clarity and confidence.',
    duration: '30–45 mins',
    inr: [1299, 999],
    usd: [28, 22],
  },
  {
    id: 'rune',
    name: 'Rune Reading',
    tag: 'Wisdom of the runes',
    desc: 'Guidance drawn from the ancient runes.',
    duration: 'To be confirmed',
    inr: [null, null],
    usd: [null, null],
  },
];

export const readingById = (id: string) => READINGS.find((r) => r.id === id);

export function price(r: Reading, format: LiveFormat, currency: Currency): number | null {
  return r[currency][format === 'video' ? 0 : 1];
}

export function formatPrice(amount: number | null, currency: Currency): string {
  if (amount == null) return 'On request';
  return currency === 'inr' ? `₹${amount.toLocaleString('en-IN')}` : `$${amount}`;
}

/** Lowest live price, for the "from" label on the list. */
export function fromPrice(r: Reading, currency: Currency): number | null {
  const xs = r[currency].filter((x): x is number => x != null);
  return xs.length ? Math.min(...xs) : null;
}
