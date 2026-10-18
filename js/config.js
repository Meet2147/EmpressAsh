/*
 * EmpressAsh site settings.
 * Everything Ash may need to change lives in this file: contact details,
 * the Cal.com booking link, Dodo Payments checkout links and reading prices.
 * Values containing "PLACEHOLDER" are not set yet; the site shows a friendly
 * "coming soon" message for those instead of a broken link.
 */
window.SITE = {
  name: "EmpressAsh",

  contact: {
    email: "PLACEHOLDER@empressash.com",
    phone: "+91 PLACEHOLDER",
    // WhatsApp number in international format, digits only (e.g. 919876543210)
    whatsapp: "PLACEHOLDER",
  },

  social: {
    instagram: "https://instagram.com/PLACEHOLDER",
    youtube: "https://youtube.com/@PLACEHOLDER",
  },

  // Cal.com event used for live readings, as "username/event-slug".
  // Set per spread in calEvents below if Ash creates one event per duration.
  calDefault: "PLACEHOLDER/reading",
  // Free first reading: a separate Cal.com event whose booking form asks for
  // name, email, mobile number and date of birth (set those as required questions in Cal.com).
  calFree: "PLACEHOLDER/first-reading-free",
  calEvents: {
    // "celtic-cross": "empressash/celtic-cross",
  },

  // Dodo Payments hosted checkout links: one per reading, per format, per currency.
  // Key format: "<spread-id>:<format>:<currency>", e.g. "three-card:video:inr".
  // Unset keys fall back to a "payment link coming soon" message.
  dodo: {
    // "three-card:video:inr": "https://checkout.dodopayments.com/buy/pdt_xxx?quantity=1",
  },
};

// Formats, in the order shown on the site.
window.FORMATS = [
  { id: "video", label: "Video call + report", short: "Video", live: true },
  { id: "voice", label: "Voice call + report", short: "Voice", live: true },
  { id: "written", label: "Written reading", short: "Written", live: false },
];

// Prices are [video, voice, written]. Use null for "price on request".
window.READINGS = [
  { id: "three-card", name: "3 Card Spread", tag: "Past · Present · Future",
    desc: "A snapshot of past influences, present circumstances and possible direction.",
    duration: "20 mins", inr: [899, 699, 499], usd: [18, 14, 10] },
  { id: "yes-no", name: "Yes or No Spread", tag: "One clear question",
    desc: "A focused answer with a brief explanation of the energy surrounding one question.",
    duration: "10–15 mins", inr: [499, 399, 299], usd: [10, 8, 6] },
  { id: "quarter", name: "Quarter Spread", tag: "The next three months",
    desc: "Themes, opportunities, challenges and guidance for the next three months.",
    duration: "30–35 mins", inr: [1599, 1299, 899], usd: [35, 28, 18] },
  { id: "year", name: "Year Spread", tag: "The year ahead",
    desc: "A broader look at the year ahead, including key themes, growth and potential turning points.",
    duration: "45–60 mins", inr: [2499, 1999, 1499], usd: [55, 45, 30] },
  { id: "love-single", name: "Love Spread (Singles)", tag: "Love & openness",
    desc: "Love energy, relationship patterns, openness to new connections and personal growth.",
    duration: "25 mins", inr: [1099, 899, 699], usd: [24, 19, 14] },
  { id: "relationship", name: "Relationship Spread", tag: "Connection & paths forward",
    desc: "Explore connection, communication, challenges, needs and possible paths forward.",
    duration: "30–35 mins", inr: [1599, 1299, 899], usd: [35, 28, 18] },
  { id: "eight-card", name: "8 Card Spread", tag: "Many perspectives",
    desc: "A detailed reading exploring a specific situation from multiple perspectives.",
    duration: "30–40 mins", inr: [1599, 1299, 899], usd: [35, 28, 18] },
  { id: "health", name: "Health Spread", tag: "Self-care & balance",
    desc: "Reflective guidance for self-care, emotional balance, stress and personal well-being.",
    duration: "20–25 mins", inr: [999, 799, 599], usd: [22, 18, 12] },
  { id: "celtic-cross", name: "Celtic Cross Spread", tag: "The heart of the matter",
    desc: "An in-depth reading covering the heart of a situation, influences, obstacles and possible outcomes.",
    duration: "40–50 mins", inr: [2199, 999, 799], usd: [48, 38, 26] },
  { id: "abundance", name: "Abundance Spread", tag: "Growth & flow",
    desc: "Explore beliefs, opportunities, blocks and practical areas for growth around abundance.",
    duration: "25–30 mins", inr: [1299, 999, 799], usd: [28, 22, 16] },
  { id: "education", name: "Education Spread", tag: "Study & focus",
    desc: "Explore motivation, study challenges, strengths, focus and possible academic pathways.",
    duration: "20–25 mins", inr: [1099, 899, 699], usd: [24, 20, 14] },
  { id: "career", name: "Career & Life Purpose Spread", tag: "Work & calling",
    desc: "Explore career opportunities, workplace dynamics, strengths and possible next steps.",
    duration: "30–35 mins", inr: [1599, 1299, 899], usd: [35, 28, 18] },
  { id: "home", name: "Buying / Selling a Home Spread", tag: "Property decisions",
    desc: "Explore priorities, concerns, opportunities and considerations surrounding a property decision.",
    duration: "35–40 mins", inr: [1999, 1599, 1199], usd: [42, 35, 24] },
  { id: "business", name: "Business & Entrepreneurship Spread", tag: "Your venture's energy",
    desc: "Your business's current energy, opportunities, challenges, growth areas and possible next steps, so you can move forward with clarity and confidence.",
    duration: "30–45 mins", inr: [1999, 1599, 1199], usd: [42, 35, 24] },
  { id: "life-guidance", name: "Life Guidance & Next Steps", tag: "Clarity & direction",
    desc: "A supportive reading focused on the actions, changes and choices that can help you move forward with more clarity and confidence.",
    duration: "30–45 mins", inr: [1299, 999, 699], usd: [28, 22, 15] },
  { id: "rune", name: "Rune Reading", tag: "Wisdom of the runes",
    desc: "Guidance drawn from the ancient runes.",
    duration: "To be confirmed", // PLACEHOLDER: Ash to send description, duration and prices
    inr: [null, null, null], usd: [null, null, null] },
];
