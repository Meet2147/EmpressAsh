"""Readings Ash offers. Prices are [video, voice, written]; None means price on request."""

FORMATS = [
    {"id": "video", "label": "Video call + report", "live": True},
    {"id": "voice", "label": "Voice call + report", "live": True},
    {"id": "written", "label": "Written reading", "live": False},
]
FORMAT_IDS = [f["id"] for f in FORMATS]

READINGS = [
    {"id": "three-card", "glyph": "triad", "name": "3 Card Spread", "tag": "Past · Present · Future",
     "desc": "A snapshot of past influences, present circumstances and possible direction.",
     "duration": "20 mins", "inr": [899, 699, 499], "usd": [18, 14, 10]},
    {"id": "yes-no", "glyph": "eye", "name": "Yes or No Spread", "tag": "One clear question",
     "desc": "A focused answer with a brief explanation of the energy surrounding one question.",
     "duration": "10–15 mins", "inr": [499, 399, 299], "usd": [10, 8, 6]},
    {"id": "quarter", "glyph": "moon", "name": "Quarter Spread", "tag": "The next three months",
     "desc": "Themes, opportunities, challenges and guidance for the next three months.",
     "duration": "30–35 mins", "inr": [1599, 1299, 899], "usd": [35, 28, 18]},
    {"id": "year", "glyph": "sun", "name": "Year Spread", "tag": "The year ahead",
     "desc": "A broader look at the year ahead, including key themes, growth and potential turning points.",
     "duration": "45–60 mins", "inr": [2499, 1999, 1499], "usd": [55, 45, 30]},
    {"id": "love-single", "glyph": "heart", "name": "Love Spread (Singles)", "tag": "Love & openness",
     "desc": "Love energy, relationship patterns, openness to new connections and personal growth.",
     "duration": "25 mins", "inr": [1099, 899, 699], "usd": [24, 19, 14]},
    {"id": "relationship", "glyph": "rings", "name": "Relationship Spread", "tag": "Connection & paths forward",
     "desc": "Explore connection, communication, challenges, needs and possible paths forward.",
     "duration": "30–35 mins", "inr": [1599, 1299, 899], "usd": [35, 28, 18]},
    {"id": "eight-card", "glyph": "star", "name": "8 Card Spread", "tag": "Many perspectives",
     "desc": "A detailed reading exploring a specific situation from multiple perspectives.",
     "duration": "30–40 mins", "inr": [1599, 1299, 899], "usd": [35, 28, 18]},
    {"id": "health", "glyph": "leaf", "name": "Health Spread", "tag": "Self-care & balance",
     "desc": "Reflective guidance for self-care, emotional balance, stress and personal well-being.",
     "duration": "20–25 mins", "inr": [999, 799, 599], "usd": [22, 18, 12]},
    {"id": "celtic-cross", "glyph": "cross", "name": "Celtic Cross Spread", "tag": "The heart of the matter",
     "desc": "An in-depth reading covering the heart of a situation, influences, obstacles and possible outcomes.",
     "duration": "40–50 mins", "inr": [2199, 999, 799], "usd": [48, 38, 26]},
    {"id": "abundance", "glyph": "coin", "name": "Abundance Spread", "tag": "Growth & flow",
     "desc": "Explore beliefs, opportunities, blocks and practical areas for growth around abundance.",
     "duration": "25–30 mins", "inr": [1299, 999, 799], "usd": [28, 22, 16]},
    {"id": "education", "glyph": "book", "name": "Education Spread", "tag": "Study & focus",
     "desc": "Explore motivation, study challenges, strengths, focus and possible academic pathways.",
     "duration": "20–25 mins", "inr": [1099, 899, 699], "usd": [24, 20, 14]},
    {"id": "career", "glyph": "key", "name": "Career & Life Purpose Spread", "tag": "Work & calling",
     "desc": "Explore career opportunities, workplace dynamics, strengths and possible next steps.",
     "duration": "30–35 mins", "inr": [1599, 1299, 899], "usd": [35, 28, 18]},
    {"id": "home", "glyph": "house", "name": "Buying / Selling a Home Spread", "tag": "Property decisions",
     "desc": "Explore priorities, concerns, opportunities and considerations surrounding a property decision.",
     "duration": "35–40 mins", "inr": [1999, 1599, 1199], "usd": [42, 35, 24]},
    {"id": "business", "glyph": "crown", "name": "Business & Entrepreneurship Spread", "tag": "Your venture's energy",
     "desc": "Your business's current energy, opportunities, challenges, growth areas and possible next steps, so you can move forward with clarity and confidence.",
     "duration": "30–45 mins", "inr": [1999, 1599, 1199], "usd": [42, 35, 24]},
    {"id": "life-guidance", "glyph": "compass", "name": "Life Guidance & Next Steps", "tag": "Clarity & direction",
     "desc": "A supportive reading focused on the actions, changes and choices that can help you move forward with more clarity and confidence.",
     "duration": "30–45 mins", "inr": [1299, 999, 699], "usd": [28, 22, 15]},
    {"id": "rune", "glyph": "rune", "name": "Rune Reading", "tag": "Wisdom of the runes",
     "desc": "Guidance drawn from the ancient runes.",
     "duration": "To be confirmed", "inr": [None, None, None], "usd": [None, None, None]},
]
BY_ID = {r["id"]: r for r in READINGS}

ROMAN = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI"]
for _i, _r in enumerate(READINGS):
    _r["numeral"] = ROMAN[_i + 1] if _i + 1 < len(ROMAN) else str(_i + 1)

# What clients usually ask about (from the call with Ash), and the spread that fits.
TOPICS = [
    ("Career & work", "career", "Opportunities, workplace dynamics and next steps."),
    ("Love & relationships", "relationship", "Connection, communication and where it's heading."),
    ("The next 3–6 months", "quarter", "What's coming, and how to meet it."),
    ("Property & home", "home", "Buying, selling or renting with a clear head."),
    ("Moving abroad", "life-guidance", "Choices and changes around a big move."),
]


def lowest(reading, currency):
    """Cheapest available price for a reading, or None."""
    vals = [v for v in reading[currency] if v is not None]
    return min(vals) if vals else None


def price(reading: dict, fmt: str, currency: str):
    """Price in whole rupees or dollars, or None if on request."""
    return reading[currency][FORMAT_IDS.index(fmt)]


def fmt_price(amount, currency: str) -> str:
    if amount is None:
        return "On request"
    if currency == "inr":
        s = f"{amount:,}"
        # Indian grouping: 1,23,456
        if amount >= 100000:
            head, tail = str(amount)[:-3], str(amount)[-3:]
            head = ",".join([head[max(i - 2, 0):i] for i in range(len(head), 0, -2)][::-1])
            s = head + "," + tail
        return "₹" + s
    return "$" + str(amount)


def format_by_id(fid: str):
    return next((f for f in FORMATS if f["id"] == fid), None)
