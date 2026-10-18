"""The 78-card tarot deck and the card of the day."""
import datetime
import hashlib

MAJORS = [
    ("The Fool", "0", "New beginnings, trust and a leap into the unknown. Step forward with an open heart."),
    ("The Magician", "I", "Focus and will. You already hold every tool you need; use them with intention."),
    ("The High Priestess", "II", "Intuition and quiet knowing. Listen to what lies beneath the surface."),
    ("The Empress", "III", "Abundance, nurture and creation. Tend to what you love and let it grow."),
    ("The Emperor", "IV", "Structure and steady leadership. Build firm foundations and hold your ground."),
    ("The Hierophant", "V", "Tradition and guidance. Wisdom passed down has something to teach you today."),
    ("The Lovers", "VI", "Choice, union and alignment. Choose with your values, not only your wants."),
    ("The Chariot", "VII", "Willpower and direction. Gather opposing forces and move forward with purpose."),
    ("Strength", "VIII", "Gentle courage. Patience and compassion will tame what force cannot."),
    ("The Hermit", "IX", "Solitude and inner light. Step back and seek your own answers."),
    ("Wheel of Fortune", "X", "Cycles and change. The wheel turns; meet what comes with grace."),
    ("Justice", "XI", "Truth and fairness. Actions return to their source; choose honestly."),
    ("The Hanged Man", "XII", "Pause and surrender. A new view comes when you stop pushing."),
    ("Death", "XIII", "Endings that make room. Let something close so something new can begin."),
    ("Temperance", "XIV", "Balance and patience. Blend, soften and find the middle way."),
    ("The Devil", "XV", "Attachment and shadow. Notice what binds you; the chains are looser than they seem."),
    ("The Tower", "XVI", "Sudden change and revelation. What falls away was not built to last."),
    ("The Star", "XVII", "Hope and healing. After the storm, renewal and quiet faith."),
    ("The Moon", "XVIII", "Dreams, illusion and the unknown. Trust your intuition through the fog."),
    ("The Sun", "XIX", "Joy, warmth and clarity. Let yourself be seen and celebrated."),
    ("Judgement", "XX", "Awakening and calling. Rise to the version of yourself that is calling you."),
    ("The World", "XXI", "Completion and wholeness. A chapter closes; honour how far you have come."),
]

SUITS = {
    "Wands": ("fire", "passion, creativity and drive"),
    "Cups": ("water", "emotions, love and relationships"),
    "Swords": ("air", "thoughts, truth and conflict"),
    "Pentacles": ("earth", "work, money and the body"),
}
RANKS = [
    ("Ace", "a fresh spark and new potential in"),
    ("Two", "a choice or partnership to balance in"),
    ("Three", "growth and early results in"),
    ("Four", "stability, rest or holding on in"),
    ("Five", "challenge and friction around"),
    ("Six", "harmony returning, and give and take, in"),
    ("Seven", "testing your resolve in"),
    ("Eight", "movement, effort and learning in"),
    ("Nine", "near-fulfilment, with lessons, in"),
    ("Ten", "completion, and its weight, in"),
    ("Page", "curious, youthful news about"),
    ("Knight", "bold action and pursuit in"),
    ("Queen", "mature, nurturing mastery of"),
    ("King", "steady authority over"),
]


def deck():
    cards = [{"name": n, "numeral": num, "meaning": m, "arcana": "Major Arcana"} for n, num, m in MAJORS]
    for suit, (element, theme) in SUITS.items():
        for rank, phrase in RANKS:
            cards.append({
                "name": f"{rank} of {suit}",
                "numeral": rank if rank in {"Page", "Knight", "Queen", "King", "Ace"} else str(RANKS.index((rank, phrase)) + 1),
                "meaning": f"This card speaks of {phrase} {theme}. Notice where the element of {element} is moving in your life today.",
                "arcana": f"Minor Arcana · {suit}",
            })
    return cards


DECK = deck()


def card_of_the_day(day: datetime.date | None = None) -> dict:
    """The same card for everyone on a given day (IST)."""
    if day is None:
        day = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=5, minutes=30)).date()
    idx = int(hashlib.sha256(f"empressash-{day.isoformat()}".encode()).hexdigest(), 16) % len(DECK)
    return {**DECK[idx], "date": day}
