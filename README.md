# OpenDrink

A private, on-device iOS & Android app for tracking alcohol consumption and sober days.
Built with Expo (SDK 57) + Expo Router + TypeScript.

## Features

- **Today** — status of today (not logged / sober / N drinks) with one-tap "Sober today"
  or a +/- drink counter, plus your current sober streak.
- **Calendar heat map** — month view coloured by day:
  - **Sober** (0 drinks)
  - **Moderate** (1 to threshold − 1; exactly 1 drink at the default threshold)
  - **Heavy** (≥ threshold)
  - **Not logged** (neutral)

  Tap any past day to edit it.
- **Adjustable heavy-day threshold** (default **2**, range 2–12) in Settings.
- **Daily reminder** at a time you choose (local notification, no server).
- **Statistics** for 30D / 90D / 1Y / All: average drinks per day, week and month,
  average per day of week, sober-day rate, current & longest sober streak, totals.

### Design decisions

- **Unlogged ≠ sober.** A day only counts as sober once you mark it. Averages are computed
  over *logged* days only, and the Stats screen shows coverage ("28 of 30 days logged").
- **Per week / per month** averages are the per-day average × 7 and × 30.44, so partial
  weeks/months and gaps in logging don't skew them.
- **Colours** for the heat map were checked for colour-vision-deficiency separation in both
  light and dark themes; the legend and tallies mean colour is never the only cue.
- Weeks start on **Sunday**.
- All data lives in AsyncStorage on the device; nothing is uploaded.

## Development

```bash
npm install
npx expo start          # scan the QR code with Expo Go, or press i / a
npm run typecheck
npm test                # pure stats/date logic (node:test)
npx expo lint
```

In development builds, **Settings → Load sample data (dev)** fills ~4 months of history
for previewing the UI.

For the most faithful notification behaviour, test reminders in a development build
(`npx expo run:ios|android` or `eas build --profile development`) rather than Expo Go.

## Project layout

```
src/app/            screens (Expo Router): index (Today), stats, settings
src/components/     UI: today card, heat-map calendar, day editor, chart, tiles
src/lib/            pure logic: dates, stats (+ tests), reminders, sample data
src/store/          persisted app state (entries + settings)
src/theme/          colour tokens for dark & light
```
