import type {
  ChallengeMode,
  RoomSettings,
  ThemeName,
  TileType,
} from "./types";

// ---------------------------------------------------------------------------
// Tunable game constants. Edit these to rebalance the game.
// ---------------------------------------------------------------------------

export const BOARD_SIZE = 50;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 5;
export const FINAL_ROUND_TILE = 40; // crossing this turns on extra chaos
export const FEED_LIMIT = 40; // keep only the last N feed items in the doc

// If a player overshoots tile 50 they still land on 50 (keeps the game fast).
export const EXACT_ROLL_REQUIRED = false;

// Tile distribution (counts are derived from these weights to sum to BOARD_SIZE).
export const TILE_DISTRIBUTION: Record<TileType, number> = {
  normal: 0.4,
  ladder: 0.12,
  snake: 0.12,
  chaos: 0.14,
  challenge: 0.08,
  vote: 0.06,
  power: 0.04,
  collab: 0.04,
};

export const TILE_ICONS: Record<TileType, string> = {
  normal: "",
  ladder: "🪜",
  snake: "🐍",
  chaos: "⚡",
  challenge: "🎤",
  vote: "🗳️",
  power: "🃏",
  collab: "🤝",
};

export const DEFAULT_SETTINGS: RoomSettings = {
  speed: "Normal",
  turnTimerSeconds: 30,
  challengeMode: "Safe Funny",
  powerCardsEnabled: true,
  theme: "Office Chaos",
  timeoutAction: "auto-roll",
};

export const SPEED_OPTIONS = ["Fast", "Normal", "Chaos"] as const;
export const TIMER_OPTIONS = [15, 30, 45] as const;
export const CHALLENGE_MODES: ChallengeMode[] = [
  "Safe Funny",
  "Office Funny",
  "Family Friendly",
];
export const THEMES: ThemeName[] = [
  "Office Chaos",
  "House Party",
  "Startup Survival",
  "Family Drama",
];

// Speed changes how often a roll triggers a chaos sub-event vs. a quiet move.
export const SPEED_CHAOS_MULTIPLIER: Record<string, number> = {
  Fast: 0.85,
  Normal: 1,
  Chaos: 1.35,
};

// Player identity pools (auto-assigned, unique within a room).
export const AVATARS = [
  "🦊",
  "🐸",
  "🐼",
  "🦄",
  "🐙",
  "🐲",
  "🦁",
  "🐧",
  "🐨",
  "🦖",
];

export const COLORS = [
  "#f97316", // orange
  "#22d3ee", // cyan
  "#a78bfa", // violet
  "#f472b6", // pink
  "#4ade80", // green
  "#facc15", // yellow
];

// Reaction buttons shown in-game.
export const REACTIONS = ["😂", "😡", "👏", "🐍", "🪜", "💀", "🤝"];

export const THEME_BLURB: Record<ThemeName, string> = {
  "Office Chaos": "Climb the corporate ladder. Get pushed down by HR.",
  "House Party": "Vibes, drama, and questionable decisions.",
  "Startup Survival": "Hyper-growth, pivots, and surprise layoffs.",
  "Family Drama": "Group chats, guilt trips, and dinner-table politics.",
};

// ---------------------------------------------------------------------------
// CHAOS EVENTS
// Each event has an `effect` key resolved deterministically in resolveTileEffect.
// Add new ones here freely; just give them a unique id and a known effect key.
// ---------------------------------------------------------------------------

export interface ChaosEventDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  // effect keys understood by resolveTileEffect.ts
  effect:
    | "swap-nearest"
    | "half-move-next"
    | "skip-next"
    | "overconfidence-tax"
    | "vote-punish"
    | "fake-promotion"
    | "betrayal"
    | "roll-again"
    | "budget-cut"
    | "viral-meme"
    | "back"
    | "forward";
  amount?: number;
}

export const CHAOS_EVENTS: ChaosEventDef[] = [
  {
    id: "corporate-restructure",
    name: "Corporate Restructure",
    emoji: "🔀",
    description: "A reorg nobody asked for.",
    effect: "swap-nearest",
  },
  {
    id: "internet-lag",
    name: "Internet Lag",
    emoji: "🐢",
    description: "Your wifi has chosen violence.",
    effect: "half-move-next",
  },
  {
    id: "unnecessary-meeting",
    name: "Unnecessary Meeting",
    emoji: "📅",
    description: "This could have been an email.",
    effect: "skip-next",
  },
  {
    id: "overconfidence-tax",
    name: "Overconfidence Tax",
    emoji: "😎",
    description: "Leaders pay the price.",
    effect: "overconfidence-tax",
  },
  {
    id: "hr-complaint",
    name: "HR Complaint",
    emoji: "📝",
    description: "Someone filed a (hilarious) report.",
    effect: "vote-punish",
  },
  {
    id: "fake-promotion",
    name: "Fake Promotion",
    emoji: "🎉",
    description: "Congrats! ...for now.",
    effect: "fake-promotion",
  },
  {
    id: "best-friend-betrayal",
    name: "Best Friend Betrayal",
    emoji: "🗡️",
    description: "Et tu?",
    effect: "betrayal",
  },
  {
    id: "lucky-intern",
    name: "Lucky Intern",
    emoji: "🍀",
    description: "Beginner's luck strikes again.",
    effect: "roll-again",
  },
  {
    id: "budget-cut",
    name: "Budget Cut",
    emoji: "✂️",
    description: "Everyone ahead of you, please downsize.",
    effect: "budget-cut",
  },
  {
    id: "viral-meme",
    name: "Viral Meme",
    emoji: "📈",
    description: "You went viral for the right reasons.",
    effect: "viral-meme",
  },
];

// ---------------------------------------------------------------------------
// CHALLENGE PROMPTS (grouped by challenge mode so the host can keep it tame).
// ---------------------------------------------------------------------------

export const CHALLENGE_PROMPTS: Record<ChallengeMode, string[]> = {
  "Safe Funny": [
    "Do your best villain laugh. Other players vote if it was acceptable.",
    "Describe your life using only three words.",
    "Say one fake motivational quote. The funniest gets respect (and bragging rights).",
    "Choose one player and give them a ridiculous job title.",
    "Say the most dramatic line possible about rolling a dice.",
    "Give a campaign slogan for yourself as President of this game.",
    "Convince everyone why you deserve immunity for one round.",
    "Do a 5-second interpretive dance for 'I just hit a snake'.",
  ],
  "Office Funny": [
    "Act like a CEO announcing bad news for 10 seconds.",
    "Make a sales pitch for a completely useless product.",
    "Pretend you are customer support handling a very angry pigeon.",
    "Give a 10-second performance review of the player to your left.",
    "Announce a fake company-wide policy that nobody will like.",
    "Explain a simple task using maximum corporate jargon.",
    "Pitch 'synergy' like your bonus depends on it.",
  ],
  "Family Friendly": [
    "Describe your day using only animal sounds.",
    "Give your best impression of a cartoon character.",
    "Say three nice things about the player to your right.",
    "Invent a silly superhero and their useless power.",
    "Make up a short jingle for a cereal called 'Chaos Flakes'.",
    "Tell the cheesiest joke you know.",
    "Do your best robot voice while saying 'I will win this game'.",
  ],
};

// ---------------------------------------------------------------------------
// VOTE EVENT DEFINITIONS (the standalone 'vote' tile + HR Complaint reuse this)
// ---------------------------------------------------------------------------

export interface VoteEventDef {
  id: string;
  title: string;
  emoji: string;
  description: string;
  options: { id: string; label: string; effect: "back" | "forward" | "challenge" | "nothing"; amount?: number }[];
}

export const VOTE_EVENTS: VoteEventDef[] = [
  {
    id: "court-of-public-opinion",
    title: "Court of Public Opinion",
    emoji: "🗳️",
    description: "The people have opinions about the current player.",
    options: [
      { id: "punish", label: "Send them back 3 tiles", effect: "back", amount: 3 },
      { id: "reward", label: "Push them forward 2 tiles", effect: "forward", amount: 2 },
      { id: "challenge", label: "Make them do a challenge", effect: "challenge" },
    ],
  },
  {
    id: "tax-the-leader",
    title: "Tax The Leader",
    emoji: "💸",
    description: "Should the current player pay the leadership tax?",
    options: [
      { id: "tax", label: "Tax them: back 4 tiles", effect: "back", amount: 4 },
      { id: "pardon", label: "Pardon them: nothing happens", effect: "nothing" },
    ],
  },
];

// ---------------------------------------------------------------------------
// POWER CARDS
// `usable: true` cards can be played from the player's hand on their turn.
// `passive: true` cards apply automatically when relevant (handled in effects).
// ---------------------------------------------------------------------------

export interface PowerCardDef {
  id: string;
  name: string;
  emoji: string;
  effect: string; // human readable
  usable: boolean; // can be actively played from hand
  needsTarget: boolean; // requires choosing another player
}

export const POWER_CARDS: PowerCardDef[] = [
  {
    id: "extra-dice",
    name: "Extra Dice",
    emoji: "🎲",
    effect: "On your next turn, roll twice and keep the better roll.",
    usable: true,
    needsTarget: false,
  },
  {
    id: "shield",
    name: "Shield",
    emoji: "🛡️",
    effect: "Protects you from the next snake or punishment.",
    usable: false,
    needsTarget: false,
  },
  {
    id: "friendship-tax",
    name: "Friendship Tax",
    emoji: "🤲",
    effect: "Pick a player. They give you 2 tiles of progress.",
    usable: true,
    needsTarget: true,
  },
  {
    id: "chaos-bomb",
    name: "Chaos Bomb",
    emoji: "💣",
    effect: "Trigger a random chaos event for everyone.",
    usable: true,
    needsTarget: false,
  },
  {
    id: "ladder-insurance",
    name: "Ladder Insurance",
    emoji: "📉",
    effect: "Next snake you hit moves you back 50% less.",
    usable: false,
    needsTarget: false,
  },
  {
    id: "swap-token",
    name: "Swap Token",
    emoji: "🔁",
    effect: "Swap positions with any player.",
    usable: true,
    needsTarget: true,
  },
];

export const POWER_CARD_MAP: Record<string, PowerCardDef> = Object.fromEntries(
  POWER_CARDS.map((c) => [c.id, c])
);
