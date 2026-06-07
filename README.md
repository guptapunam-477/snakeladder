# 🪜⚡🐍 Chaos Ladder

A fast, funny, 2–5 player **private-room party game** — Snakes & Ladders reimagined as a chaotic office/house-party romp. Players open a URL on their phone or laptop, join a room with a 5-letter code, and race to tile 50 while the board throws dares, votes, sabotage, power cards, and questionable alliances at them.

- **No install** — just a browser (Chrome, Safari, Edge, Firefox; mobile, tablet, desktop).
- **Real-time** — built on Firebase Firestore live listeners.
- **Deployable on Netlify** in a couple of minutes.
- **10–18 minute** games on a fast 50-tile board.

---

## Table of contents

1. [Quick start](#quick-start)
2. [Firebase setup (exact steps)](#firebase-setup-exact-steps)
3. [Run locally + test from your phone](#run-locally--test-from-your-phone)
4. [Deploy to Netlify (exact steps)](#deploy-to-netlify-exact-steps)
5. [How the game works](#how-the-game-works)
6. [Architecture & key decisions](#architecture--key-decisions)
7. [Project structure](#project-structure)
8. [Edge cases handled](#edge-cases-handled)
9. [Testing checklist](#testing-checklist)
10. [Troubleshooting](#troubleshooting)
11. [Customization guide](#customization-guide)
12. [MVP vs. optional/advanced](#mvp-vs-optionaladvanced)

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Add your Firebase keys
cp .env.example .env
#    ...then edit .env with values from your Firebase project (see below)

# 3. Run it
npm run dev
#    open the printed URL (e.g. http://localhost:5173)
```

You need a (free) Firebase project for real-time multiplayer. It takes ~3 minutes — steps below.

---

## Firebase setup (exact steps)

1. Go to <https://console.firebase.google.com> and click **Add project**. Name it (e.g. `chaos-ladder`). You can disable Google Analytics. Click **Create project**.

2. **Create a Firestore database:**
   - In the left sidebar: **Build → Firestore Database → Create database**.
   - Choose a location near your players.
   - Start in **Production mode** (we'll paste real rules in a moment).

3. **Enable Anonymous Authentication** (the app signs each browser in anonymously so the security rules can require an authenticated user):
   - Left sidebar: **Build → Authentication → Get started**.
   - **Sign-in method** tab → **Anonymous** → enable → **Save**.

4. **Register a Web App and copy your config:**
   - Project Overview (gear icon) → **Project settings** → scroll to **Your apps** → click the **`</>`** (Web) icon.
   - Give it a nickname, **don't** enable Hosting, click **Register app**.
   - Copy the `firebaseConfig` values into your `.env` file:

   ```env
   VITE_FIREBASE_API_KEY=AIza...
   VITE_FIREBASE_AUTH_DOMAIN=chaos-ladder.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=chaos-ladder
   VITE_FIREBASE_STORAGE_BUCKET=chaos-ladder.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
   VITE_FIREBASE_APP_ID=1:1234567890:web:abc123
   ```

   > These are **public client keys** — it's normal and safe for them to ship in the browser bundle. Your data is protected by the Firestore **rules**, not by hiding the keys.

5. **Publish the security rules:**
   - Open `firestore.rules` from this repo, copy its contents.
   - Firebase Console → **Firestore Database → Rules** tab → paste → **Publish**.
   - (Or, if you use the Firebase CLI: `firebase deploy --only firestore:rules`.)

That's it. Restart `npm run dev` after editing `.env` (Vite only reads env vars at startup).

---

## Run locally + test from your phone

```bash
npm run dev
```

Vite is configured with `host: true`, so it also prints a **Network** URL like `http://192.168.1.42:5173`. As long as your phone is on the **same Wi-Fi**, open that URL on the phone to join a room created on your laptop — a great way to test multiplayer before deploying.

For the most realistic test (different networks, mobile data), deploy to Netlify first (below) and share that URL.

---

## Deploy to Netlify (exact steps)

This repo already includes `netlify.toml` and `public/_redirects`, which configure the build and the SPA fallback (so deep links like `/room/ABCDE` survive a refresh).

**Option A — Git (recommended):**

1. Push this folder to a GitHub/GitLab repo.
2. In Netlify: **Add new site → Import an existing project** → pick the repo.
3. Netlify auto-detects the settings from `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Before the first deploy, add your environment variables: **Site settings → Environment variables → Add a variable** (or "Import from a .env file"). Add all six `VITE_FIREBASE_*` values from your `.env`.
5. **Deploy site.** You'll get a URL like `https://chaos-ladder.netlify.app`.

**Option B — Netlify CLI:**

```bash
npm i -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
# set env vars in the Netlify UI (Site settings → Environment variables) and redeploy
```

> **Important:** environment variables must be set in Netlify **before** the build runs — Vite inlines them at build time. If you add them later, trigger a new deploy (**Deploys → Trigger deploy → Clear cache and deploy site**).

---

## How the game works

- **Board:** 50 tiles in a serpentine grid (5 columns × 10 rows). Tile 1 is the start, tile 50 is the finish. Tile types are randomly distributed at room creation: `normal` (~40%), `ladder` (12%), `snake` (12%), `chaos` (14%), `challenge` (8%), `vote` (6%), `power` (4%), `collab` (4%).
- **Turns:** players take turns. Only the current player can roll (1–6). The token auto-moves. A turn timer (15/30/45s, host-configurable) auto-rolls or skips on timeout.
- **Overshoot rule:** rolling past 50 still lands you on 50 (keeps games short). First to 50 wins.
- **Tile effects:**
  - 🪜 **Ladder / 🐍 Snake** — jump forward / slide back.
  - ⚡ **Chaos** — a random funny event (Corporate Restructure, Budget Cut, Fake Promotion, HR Complaint vote, Best-Friend Betrayal, Lucky Intern reroll, …).
  - 🎤 **Challenge** — perform a silly prompt (prompts respect the host's "Challenge Mode" so it stays office/family friendly).
  - 🗳️ **Vote** — everyone votes on the current player's fate (back/forward/challenge). Majority wins; ties favour mercy.
  - 🃏 **Power** — draw a power card (Extra Dice, Shield, Friendship Tax, Chaos Bomb, Ladder Insurance, Swap Token).
  - 🤝 **Collab** — choose another player to help (or, via Betrayal chaos, to hurt — they get a revenge Shield).
- **Final-round chaos:** once anyone crosses tile 40, a "Final Chaos" flag flips on (surfaced in the UI) to signal the spicy endgame.
- **Winner screen:** final standings + auto-computed **funny awards** (Snake Magnet, Luckiest Intern, Chaos King, …) based on per-player stats tracked all game. Host can **Play Again** (resets to the lobby with a fresh board).

---

## Architecture & key decisions

**One document, transactional mutations.** Instead of separate `rooms` / `players` / `gameEvents` / `votes` collections, the *entire* game state lives in a single Firestore document, `rooms/{CODE}`. This was a deliberate choice:

- **Real-time sync is one `onSnapshot`.** Every client subscribes to the one document and re-renders on any change — no fan-out across collections, no partial/inconsistent views.
- **Atomicity kills race conditions.** Every action (roll, vote, power card, collab) runs inside a Firestore **transaction** (`runTransaction`) that reads the current room, validates the rules (is it your turn? are you the host? is a roll already in progress?), mutates a working copy, and writes it back atomically. Two players hammering the dice button at once cannot double-move — the second transaction sees the updated `turnIndex`/`rolling` state and is rejected.
- **Refresh/reconnect is trivial.** A player's identity is a stable id in `localStorage`; on reload we just re-subscribe and the player maps back to their token.

The trade-off is that the doc is rewritten on each action and the event feed is capped (last 40 items) to keep it small — totally fine for a 2–5 player, ~15-minute game. If you wanted spectators-at-scale or long histories, you'd split events into a subcollection.

The conceptual schema from the brief still maps onto the document (`players[]`, `feed[]`, `votes{}`, `settings`, `turnIndex`, `winnerId`, …) — see `src/types.ts`.

**Where the rules live.** Authoritative game logic runs in the transaction callbacks in `src/services/*` + `src/utils/*` (pure, testable functions). Firestore Security Rules (`firestore.rules`) enforce the coarse boundary: you must be authenticated, you can only touch the `rooms` collection, and the player list can't exceed 5. Fine-grained "only the current player may roll" is enforced in the transaction, not in rules (replicating full game logic in the rules language is impractical). See the README's stricter-rules note if you need server-authoritative moves.

---

## Project structure

```
chaos-ladder/
├─ index.html
├─ package.json
├─ vite.config.ts
├─ netlify.toml                # build command + SPA redirect
├─ firestore.rules             # paste into Firebase console
├─ .env.example                # copy to .env, add your keys
├─ public/_redirects           # SPA fallback (belt & suspenders)
└─ src/
   ├─ main.tsx                 # React + Router bootstrap
   ├─ App.tsx                  # routes
   ├─ index.css                # Tailwind + small base styles
   ├─ firebase.ts              # Firebase init + anonymous auth
   ├─ types.ts                 # all shared types (the Room document)
   ├─ gameConfig.ts            # tunables: tiles, chaos events, challenges, cards, awards, themes
   ├─ vite-env.d.ts
   ├─ utils/
   │  ├─ generateRoomCode.ts   # short, unambiguous codes
   │  ├─ dice.ts
   │  ├─ board.ts              # 50-tile serpentine board generation
   │  ├─ resolveTileEffect.ts  # core landing/effect resolution (pure)
   │  ├─ turn.ts               # advance-turn / roll-again logic
   │  ├─ ranking.ts
   │  ├─ awards.ts             # funny end-game awards
   │  └─ identity.ts           # localStorage player id, avatar/colour assignment
   ├─ services/
   │  ├─ db.ts                 # withRoom() transaction helper
   │  ├─ factories.ts          # makeRoom / makePlayer
   │  ├─ roomService.ts        # create/join/start/restart/end/settings/kick
   │  ├─ playerService.ts      # presence heartbeat, leave/disconnect
   │  ├─ gameService.ts        # rollDice, acknowledge, collab, power cards, timeout
   │  └─ voteService.ts        # castVote, resolveVoteIfDue
   ├─ hooks/
   │  └─ useRoom.ts            # live subscription + timers + presence
   ├─ components/
   │  ├─ Board.tsx  Tile.tsx  PlayerToken.tsx
   │  ├─ Dice.tsx   Timer.tsx  Confetti.tsx
   │  ├─ PlayerList.tsx  EventFeed.tsx
   │  ├─ PowerCards.tsx  VotePanel.tsx  EventModal.tsx
   └─ pages/
      ├─ LandingPage.tsx  CreateRoomPage.tsx  JoinRoomPage.tsx
      ├─ RoomPage.tsx          # routes to Lobby/Game/Winner by status
      ├─ LobbyPage.tsx  GamePage.tsx  WinnerPage.tsx
```

---

## Edge cases handled

- **Player refreshes the browser** → stable `localStorage` id re-binds to their token; the live listener restores state.
- **Player disconnects / backgrounds the tab** → marked disconnected (token dimmed); they can rejoin. Turn timer keeps the game moving.
- **Host disconnects/leaves in lobby** → host role transfers to the next player automatically.
- **Room code not found** → friendly "Room not found" screen.
- **Room already active / completed when joining** → join is blocked with a clear message (rejoin works if you were already in it).
- **Room full (5 players)** → join rejected.
- **Duplicate player names** → rejected (case-insensitive).
- **Two players click the dice simultaneously** → transaction + `turnIndex`/`rolling` checks ensure exactly one roll applies.
- **Votes not completed before timer** → host's client resolves the vote at `voteEndsAt` by majority (ties favour the first option).
- **Turn timeout** → auto-roll or skip per the room's "On timeout" setting.
- **Winner detected mid-event** → finalization short-circuits any further effects and jumps to the winner screen.

---

## Testing checklist

Manual tests that exercise the important paths:

- [ ] Create a room on a laptop; join from up to 4 phones (try the share link too).
- [ ] Refresh one player's browser mid-game — their token and turn order survive.
- [ ] Try rolling when it isn't your turn — the button is disabled and the service rejects it.
- [ ] Try to join a room that already has 5 players — rejected.
- [ ] Trigger a 🗳️ vote tile; have everyone vote; confirm majority resolves (and the early-resolve when all have voted).
- [ ] Land on a 🃏 power tile, then play **Swap Token** / **Friendship Tax** on a target.
- [ ] Hit a 🐍 snake while holding a **Shield** — confirm it blocks.
- [ ] Reach tile 50 (or overshoot) — winner screen + awards appear for everyone.
- [ ] Open the deployed Netlify URL on mobile data (not Wi-Fi) and play a full game.

---

## Troubleshooting

**"Firebase isn't configured" banner / `Firebase is not configured` error.**
Your `.env` is missing or empty. Copy `.env.example` → `.env`, fill in all six `VITE_FIREBASE_*` values, and **restart** `npm run dev`. On Netlify, set them under *Site settings → Environment variables* and redeploy.

**`Missing or insufficient permissions` (Firestore).**
Either (a) you didn't publish `firestore.rules`, or (b) Anonymous Auth isn't enabled. The rules require an authenticated user, and the app signs in anonymously — so both must be in place. Enable **Authentication → Anonymous**, and **publish the rules**.

**`Unsupported field value: undefined`.**
Shouldn't happen — Firestore is initialized with `ignoreUndefinedProperties: true` in `src/firebase.ts`. If you add new optional fields, keep that setting.

**Refreshing a deep link (e.g. `/room/ABCDE`) shows a 404 on Netlify.**
Make sure `netlify.toml` (and/or `public/_redirects`) is deployed — both add the SPA fallback to `index.html`. They're included here by default.

**Env vars not taking effect on Netlify.**
Vite inlines env vars at **build time**. Set them first, then *Deploys → Trigger deploy → Clear cache and deploy site*.

**Vars must start with `VITE_`.** Vite only exposes env vars prefixed with `VITE_` to the client. Don't rename them.

---

## Customization guide

Everything tunable lives in **`src/gameConfig.ts`** — no logic changes needed for most tweaks.

**Add a chaos event:** append to `CHAOS_EVENTS`. Reuse an existing `effect` key (e.g. `"forward"`, `"back"`, `"viral-meme"`) for instant support, or add a new key and handle it in the `switch` inside `applyChaosEvent` in `src/utils/resolveTileEffect.ts`.

```ts
// gameConfig.ts
{ id: "coffee-machine-broke", name: "Coffee Machine Broke", emoji: "☕",
  description: "Productivity plummets.", effect: "back", amount: 3 },
```

**Add a challenge prompt:** add a string to the relevant array in `CHALLENGE_PROMPTS` (`"Safe Funny"` / `"Office Funny"` / `"Family Friendly"`). Keep them harmless and group-appropriate.

**Add a vote event:** append to `VOTE_EVENTS` with `options` that each declare an `effect` (`back` / `forward` / `challenge` / `nothing`) and optional `amount`. Resolution is automatic.

**Add a power card:** append to `POWER_CARDS`. Set `usable` (can be played from hand) and `needsTarget`. Then handle its `id` in the `switch` in `usePowerCard` (`src/services/gameService.ts`). Passive cards (like Shield) are auto-armed on draw in `resolveLanding`.

**Add a theme / change the default:** edit `THEMES`, `THEME_BLURB`, and `DEFAULT_SETTINGS.theme`. (Themes currently drive flavour/copy; wire them to colour palettes in `index.css`/Tailwind if you want full re-skins.)

**Rebalance the board:** change `TILE_DISTRIBUTION`, `BOARD_SIZE`, or `FINAL_ROUND_TILE` in `gameConfig.ts`. `EXACT_ROLL_REQUIRED = true` enables the classic "must land exactly on the finish" rule.

**Add a funny award:** add a definition to `DEFS` in `src/utils/awards.ts` with a `pick` function over the per-player `stats`. Track new stats by incrementing them in the effect functions.

---

## MVP vs. optional/advanced

**Implemented MVP (works end-to-end):** private rooms + codes + share links, lobby with host-configurable settings, real-time turn-based play, dice + auto-move, ladders/snakes, all special tiles (chaos/challenge/vote/power/collab), power cards (active + passive), cross-device voting, win detection + overshoot rule, winner screen with rankings + funny awards, restart, presence/heartbeat, turn timer with auto-roll/skip, reactions, and the full edge-case handling above.

**Optional / advanced (good next steps, intentionally not in the MVP):**

- **Server-authoritative moves (stricter rules).** Move `rollDice`/vote resolution into **Cloud Functions** (or the Firebase callable-functions) so clients can't write arbitrary positions. Then tighten `firestore.rules` to `allow update: if false` for game fields and let only the Functions service account mutate them. This is the right move for competitive/public deployments; it's overkill for invite-only friend groups.
- **Sound effects** (dice, snake, ladder, win) — the UI is structured to add an audio layer; default muted.
- **Temporary Alliance** and **Group Vote Rescue** collaboration variants (the data model supports adding them as new pending-event types).
- **Automated tests** for `resolveTileEffect` / `turn` (they're pure functions — easy to unit test with Vitest).
- **Stale-room cleanup** via a scheduled Cloud Function or Firestore TTL policy on `updatedAt`.

---

Made for small private groups. Keep it funny, keep it kind. 🤝
