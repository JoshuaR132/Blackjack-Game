````markdown
# Blackjack 

A modern, browser-based **Blackjack game** built with **HTML, CSS, and JavaScript** — featuring smooth animations, sound effects, multiplayer mode, chip betting, and persistent score tracking.  

---

## Features

- **Smooth card dealing animations**
- **Interactive chip betting** with animated movements  
- **Sound effects** for dealing, betting, winning, losing, and button clicks  
- **Two-player alternating mode**  
- **Persistent bankroll and stats** (saved locally via `localStorage`)
- **Responsive casino-inspired design**

---

## Tech Stack

| Area | Technology |
|------|-------------|
| Frontend | HTML5, CSS3, JavaScript (ES6) |
| Animations | CSS transitions + JavaScript-controlled transforms |
| Audio | HTML5 `<audio>` API |
| Storage | LocalStorage |
| Tools | VS Code / GitHub Pages |

---

## Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/blackjack-royale.git
cd blackjack-royale
````

### 2. File structure

```
blackjack-royale/
├── index.html
├── style.css
├── script.js
├── sounds/
│   ├── deal.mp3
│   ├── chip.mp3
│   ├── win.mp3
│   ├── lose.mp3
│   ├── tie.mp3
│   └── click.mp3
├── images/
│   ├── cards/
│   │   ├── 2_of_hearts.png
│   │   ├── 3_of_hearts.png
│   │   └── ... (all 52 cards)
│   └── card_back.png
└── docs/
    └── preview.png (optional)
```

> 🃏 **Card image naming format**:
> `"<rank>_of_<suit>.png"`
> Example: `ace_of_spades.png`, `10_of_hearts.png`

---

## How to Play

1. **Place your bet** by clicking one or more chips.
2. Hit **Deal** to start. You and the dealer each get two cards.
3. Click **Hit** to take another card, or **Stand** to hold your total.
4. The dealer plays automatically. Whoever gets closer to 21 without busting wins.
5. Your **bankroll** and **stats** are saved automatically.

> First to reach £10,000 wins bragging rights!

---

## Sound Effects

All sounds are stored under `/sounds/` and can be customized.
Supported sound triggers:

| Event        | File        | Description                  |
| ------------ | ----------- | ---------------------------- |
| Card dealt   | `deal.mp3`  | Short shuffle or slide sound |
| Chip placed  | `chip.mp3`  | Classic casino chip sound    |
| Win          | `win.mp3`   | Reward or celebration        |
| Lose         | `lose.mp3`  | Short thud or sad tone       |
| Tie          | `tie.mp3`   | Neutral cue                  |
| Button click | `click.mp3` | UI interaction sound         |

---

## Saving Data

The game uses the browser’s `localStorage` to store:

* Player bankrolls 
* Round stats (wins/losses/ties)
* Active player turn
* Deck and state between sessions

You can clear progress via browser dev tools → Application → Local Storage → `blackjack-royale`.

---

## Development Notes

* No external libraries or frameworks — **pure vanilla JavaScript**.
* Fully client-side (safe for GitHub Pages hosting).
* Modular structure:

  * `renderHand()`: updates the visual hand
  * `placeBetForActivePlayer()`: handles bets and chips
  * `dealerPlayAndResolve()`: auto-dealer logic
  * `playSound()`: centralized audio manager

---

## Future Improvements

* [ ] Online multiplayer via WebSockets
* [ ] Background music & ambient crowd sounds
* [ ] Mobile-friendly touch gestures
* [ ] Leaderboard system
* [ ] Theming (light/dark mode)
