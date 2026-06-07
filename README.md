# 🪜⚡🐍 Chaos Ladder

A fast, funny, 2–5 player **private-room party game** — Snakes & Ladders reimagined as a chaotic office/house-party romp. Friends open a link on their phone or laptop, join with a room code, and race to tile 50 while the board throws dares, votes, sabotage, power cards, and questionable alliances at them.

- **No install, no accounts, no login.** Just open a URL and play.
- **No backend to set up.** It runs **peer-to-peer** in the browser (WebRTC) — there's no server and no database to configure.
- **Deployable on Netlify** as a plain static site in two minutes.
- **10–18 minute** games on a fast 50-tile board.

---

## How the online play works (read this first)

Chaos Ladder is **host-authoritative and serverless**:

- Whoever taps **Create Room** becomes the **host**. Their browser tab runs the actual game and acts as the "server" for everyone.
- Everyone else **joins with the room code** and connects directly to the host over a peer-to-peer data channel (brokered by the free public PeerJS signalling service — no account needed).
- The host keeps the real game state and broadcasts it to all players in real time.

**What this means in practice:**

- ✅ No Firebase, no `.env`, no API keys, no logins. Deploy and play.
- ⚠️ **The host must keep their tab open** for the whole game — if the host closes the tab, the game ends for everyone. (The host *can* refresh; the game auto-resumes from the host's saved state, and players auto-reconnect.)
- ⚠️ A small minority of **very strict corporate/VPN networks** can block direct peer connections (there's no TURN relay configured by default). On home Wi-Fi and mobile data it works for the vast majority of people. See [Troubleshooting](#troubleshooting) to add a TURN server if you need bulletproof connectivity.

This is the classic "Jackbox-style" model — perfect for a small group of friends.

---

## Quick start (local)

```bash
npm install
npm run dev
```

Open the printed URL (e.g. `http://localhost:5173`). Vite also prints a **Network** URL like `http://192.168.1.42:5173` — open that on your phone (same Wi-Fi) to test multiplayer across devices.

That's it. There's nothing else to configure.

---

## Deploy to Netlify (exact steps)

This repo includes `netlify.toml` and `public/_redirects`, which set the build and the SPA fallback (so deep links like `/room/ABCDE` survive a refresh). There are **no environment variables to set**.

**Option A — Git (recommended):**

1. Push this folder to a GitHub/GitLab repo.
2. In Netlify: **Add new site → Import an existing project** → pick the repo.
3. Netlify auto-detects from `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. **Deploy site.** You'll get a URL like `https://chaos-ladder.netlify.app`. Share it with friends.

**Option B — Netlify CLI:**

```bash
npm i -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

> Tip: the host should open the deployed URL, create the room, and share the **room code or the join link** (the lobby has copy buttons for both).

---

## How the game plays

- **Board:** a hand-designed, **recognizable** 50-tile board (5 × 10). Tile 1 is start, tile 50 the gold-ringed finish. **Snakes are drawn as actual snakes** — head (with eyes + tongue) sits on the higher tile and drops you to its tail on a lower tile, just like the classic game. **Ladders** are drawn with rails and rungs. Landing on a snake triggers a funny **💩 poop-drop** animation as you slide down.
- **Turns:** only the current player can roll (1–6); the token slides to its new spot with a **3D rolling dice**. A turn timer (15/30/45s, host-set) auto-rolls or skips on timeout.
- **Overshoot rule:** rolling past 50 still lands you on 50. First to 50 wins.
- **Tile effects — every one has real stakes:**
  - 🪜 **Ladder / 🐍 Snake** — climb up / slide down (with animation).
  - ⚡ **Chaos** — a deterministic funny event: Corporate Restructure swap, Budget Cut, Fake Promotion, Lucky Intern reroll, **Office Politics (reverses turn order, UNO-style)**, and more.
  - 🎤 **Challenge** — you perform a silly prompt **live, and the others judge you**. Approval (👍 ≥ 👎) moves you **forward 3**. Crucially, a biased group **can't gang up to punish you**: you only lose tiles (−2) if the disapproval is **unanimous** — one sympathetic friend (or a non-voter) saves you.
  - 🗳️ **Vote** — a rare group vote on your fate. Majority wins; ties favour mercy.
  - 🃏 **Power** — draw a power card (Extra Dice, Shield, Friendship Tax, Chaos Bomb, Ladder Insurance, Swap Token).
  - 🤝 **Collab** — help another player forward 3 (or, via Betrayal chaos, knock them back — they get a revenge Shield).
- **Final-round chaos:** once anyone crosses tile 40, "Final Chaos" flips on for a spicy endgame.
- **Winner screen:** final standings + auto-computed **funny awards** (Snake Magnet, Luckiest Intern, Chaos King, …). Host can **Play Again** to reset.

**Designed so a "collective can't control the game":** the outcome leans on **deterministic** rules (dice, snakes, ladders, chaos, power cards). Group voting is deliberately rare and **can't be used to bully a single player** — challenges can only *reward* via majority; punishment needs near-unanimity.

## Social features

- 💬 **Text chat** — up to 50 characters per message, with a built-in cooldown so nobody can spam.
- 🎯 **Throwable stickers** — fling 💩 / 🍅 / 🥚 / 💣 and more **at a specific player**; it flies across the board and splats on their token. There's a 3-second cooldown per throw (no spam).
- 😂 **Quick reactions** — one-tap emoji reactions in the feed (rate-limited).
- 🎙️ **Voice chat (beta)** — optional push-button peer-to-peer voice. Tap **🎙️ Voice** to grant mic access and talk to the room; **mute** anytime. Because it's a direct peer mesh with no relay server, it works on most home/mobile networks but can fail on strict corporate/VPN networks — it's isolated so it never affects the game itself.

---

## Architecture & key decisions

**One object, one authority.** The entire game state is a single `Room` object (`src/types.ts`). The host holds it, mutates it through a pure reducer, and broadcasts full snapshots. Clients are thin: they send **actions** ("roll", "vote", …) and render whatever snapshot arrives. This removes whole categories of bugs — there's exactly one source of truth and one place that applies rules, so "two players roll at once" simply can't double-apply (the host processes actions one at a time and re-validates each).

**Why peer-to-peer instead of a database.** The original build used Firebase, which is reliable but forces a one-time setup (project, keys, rules) on whoever deploys it. For a casual, invite-by-code game with friends, that setup is the main friction. WebRTC data channels (via PeerJS's free broker) give real-time multiplayer with **zero setup and zero accounts** — you trade a little robustness (host tab must stay open; rare strict-network failures) for "deploy once and just play."

**Layout of the important pieces:**

```
src/
├─ net/
│  ├─ protocol.ts        # message + action types, host peer-id, STUN servers
│  └─ peer.ts            # PeerHost + PeerClient (WebRTC wrappers, auto-reconnect)
├─ game/
│  └─ engine.ts          # host-authoritative reducer: createRoom, join, applyAction, tickTimers
├─ hooks/
│  └─ useGame.ts         # wires host/client networking to the engine; exposes dispatch()
├─ utils/                # PURE game logic (board, dice, tile effects, turns, ranking, awards)
├─ services/factories.ts # makeRoom / makePlayer
├─ components/           # Board (SVG connectors + animated tokens), Dice, EventModal, VotePanel, …
└─ pages/                # Landing, Create, Join, Room (host/client view), Lobby, Game, Winner
```

The game-logic in `utils/` is deliberately free of any networking, so it's deterministic and easy to unit-test.

---

## Edge cases handled

- **Host refreshes their tab** → the room is restored from the host's saved state and players auto-reconnect.
- **A player refreshes / drops** → their stable `localStorage` id reconnects them to the same token; mid-game they're marked disconnected (dimmed) until they return.
- **It's a disconnected player's turn** → the turn timer keeps the game moving (auto-roll or skip).
- **Room code not found / host offline** → the joiner sees a "Connecting to the host…" screen and keeps retrying.
- **Room full (5) / game already started / duplicate name** → the host rejects the join with a clear message.
- **Two players act at once** → the host serialises actions and re-validates each, so only valid ones apply.
- **Votes/challenges not finished in time** → the host resolves them by majority when the timer expires.
- **Winner detected mid-event** → finalisation short-circuits and jumps to the winner screen.

---

## Testing checklist

- [ ] Create a room on a laptop; join from up to 4 phones (try the share link too).
- [ ] Land on a 🎤 challenge — perform it and confirm the others' 👍/👎 vote moves you forward/back.
- [ ] Trigger a 🗳️ vote tile; everyone votes; confirm majority resolves.
- [ ] Use a 🃏 power card (Swap Token / Friendship Tax) on a target.
- [ ] Hit a 🐍 snake while holding a **Shield** — confirm it blocks.
- [ ] Host **refreshes** mid-game — confirm the game resumes and players reconnect.
- [ ] Reach tile 50 — winner screen + awards appear for everyone.
- [ ] Open the deployed Netlify URL on mobile data and play a full game.

---

## Troubleshooting

**"Connecting to the host…" never finishes.**
The host's tab must be open on the deployed site with that exact room code. Double-check the code, and that the host hasn't closed/backgrounded the tab. If you're on a strict corporate/VPN/firewalled network, peer connections may be blocked — try mobile data, or add a TURN server (below).

**Players on some networks can't connect (works on others).**
WebRTC needs to traverse NATs. STUN (configured) handles most home/mobile networks. Very strict networks need a **TURN relay**, which isn't free to run reliably. To add one, edit `ICE_SERVERS` in `src/net/protocol.ts`:

```ts
export const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  // Add your TURN server (e.g. from Twilio, Metered, or self-hosted coturn):
  { urls: "turn:YOUR_TURN_HOST:3478", username: "USER", credential: "PASS" },
];
```

**The game resets when the host refreshes.**
It should auto-resume — the host's state is saved to `localStorage` for 6 hours. If it doesn't, the host may have cleared site data, or more than 6 hours passed. Just start a new room.

**Deep link `/room/ABCDE` shows a 404 on Netlify.**
Ensure `netlify.toml` / `public/_redirects` are deployed (they're included) — they route all paths to `index.html`.

---

## Customization guide

Everything tunable lives in **`src/gameConfig.ts`** — most tweaks need no logic changes.

**Add a chaos event:** append to `CHAOS_EVENTS`. Reuse an existing `effect` key (e.g. `"forward"`, `"back"`, `"viral-meme"`), or add a new key and handle it in the `switch` in `applyChaosEvent` (`src/utils/resolveTileEffect.ts`).

**Add a challenge prompt:** add a string to the relevant array in `CHALLENGE_PROMPTS` (`Safe Funny` / `Office Funny` / `Family Friendly`).

**Add a vote event:** append to `VOTE_EVENTS` with `options` that each declare an `effect` (`back`/`forward`/`challenge`/`nothing`) and optional `amount`.

**Add a power card:** append to `POWER_CARDS` (set `usable` / `needsTarget`), then handle its `id` in `doUsePower` (`src/game/engine.ts`). Passive cards (Shield, Ladder Insurance) auto-arm on draw.

**Rebalance the board:** change `TILE_DISTRIBUTION`, `BOARD_SIZE`, or `FINAL_ROUND_TILE`. Set `EXACT_ROLL_REQUIRED = true` for the classic "land exactly on 50" rule.

**Add a funny award:** add a definition to `DEFS` in `src/utils/awards.ts` with a `pick` over per-player `stats`.

---

## What could come next (optional)

- **A TURN server** for 100% voice/data connectivity on locked-down networks (see Troubleshooting).
- **Sound effects** (dice, snake, ladder, win) — the UI is structured to add them.
- **Spectator mode** and **Temporary Alliance** mechanics.
- **Unit tests** for `resolveTileEffect` / `engine` (pure functions — easy with Vitest).

## Voice chat notes (beta)

Voice uses a separate WebRTC peer mesh. Each participant grants mic access (browsers require **HTTPS** — Netlify is fine; on localhost it also works). If a participant is behind a strict NAT/firewall, their audio may not connect even though the game does — add a TURN server (same `ICE_SERVERS` in `src/net/protocol.ts`) for full reliability. Voice failures are caught and never interrupt the game.

---

Made for small private groups. Keep it funny, keep it kind. 🤝
