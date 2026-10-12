# QuackSort photo challenges

Static browser games using the existing website palette and buttons. The homepage links to `challenges/`; the three cards lead to `sorting.html`, `groups.html`, and `albums.html`. Deploy the complete `challenges/` folder alongside the existing website files. No server or model dependency is required.

Local preview from the repository root: `node tests/challenges/serve.cjs`, then open `http://127.0.0.1:4173/challenges/`. The site's homepage is at `http://127.0.0.1:4173/`. Stop the preview with Ctrl+C.

- **Sort the Crowd:** 60 seconds, ten photos, four people. Photos are copied to all applicable collections; originals stay in the centre. Desktop supports pointer dragging; mouse, touch, and keyboard support selecting a photo and pressing the person's Add button. Click a copy to undo.
- **Find the Shared Moments:** 40 seconds, twelve photos, three random people chosen from Maya, Alex, Priya, Leo, and Zoe. Shared-photo matches require all three people and can include other guests.
- **Build a Concept Album:** 40 seconds, sixteen photos. Match a random event theme AND a Group photo or Solo portrait clue. The sample includes four matches, four theme-only near misses, four portrait-type-only near misses, and four pictures matching neither clue.

Every round samples the local pool of 124 original SVG illustrations. Replay resamples photos and targets, resets choices, and returns to the Start screen. The timer starts only after Start and uses an absolute monotonic deadline; changing tabs does not pause it. Results identify correct, missed, and extra answers. Score = correct / (expected + extra), rounded to a percentage. A prepared sample reveal demonstrates QuackSort's workflow without presenting an animation as an AI benchmark.

“Try QuackSort” links to `../index.html?demo=1`, which opens the existing demo request form. No form is submitted by the games. No personal photos, accounts, uploads, cookies, remote scoring, or persistent storage are used.

The dataset is declared in `data.js`. People memberships and concept tags are the answer key. Update that file and replace image assets to use a different licensed dataset. Original illustrations can be regenerated from the repository root with `node tests/challenges/generate-assets.cjs`.

Verification: `node tests/challenges/test.cjs` uses the existing Playwright installation under `tests/demo_clip/node_modules` and local Chrome. It checks randomized rounds and scoring, all desktop games, copy/undo and keyboard-compatible clicks, replay, automatic expiry, demo CTA, and mobile touch/layout. Screenshots go to `tests/challenges/output/`.
