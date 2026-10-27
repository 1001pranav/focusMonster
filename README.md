# FocusMonster

An Android app that helps you cut down wasted phone time a little every day.

- Tracks time per app and separates *wasted* time (Reels, Shorts, feeds) from everything else.
- Sets a daily target that shrinks gradually from your own baseline, and holds steady on a bad day instead of punishing it.
- Keeps your reason for starting in front of you: up to 3 goals, plus a daily Top 3.
- Morning intention and nightly recap notifications.

All data stays on the phone. There is no account and no backend.



## v1 features

- **Usage tracking:** foreground time per app, read from Android's usage events by a local Expo module (`modules/usage-stats`).
- **Daily target with a hold rule:** it starts 1.5% below your baseline and drops 1.5% after every day you hit it, about 10% a week. A missed day keeps it where it is. It never goes below the goal you set.
- **Fair comparisons:** today so far vs. the same time on the same weekday last week, and vs. your 7-day average.
- **Streak with freezes:** every 7 hits in a row earns a freeze (up to 2), and a freeze covers one missed day.
- **Time won back:** how far each finished day came in under your baseline, added up.
- **Goals (at most 3), each with a why** that shows on the Today screen.
- **Daily Top 3:** tasks can link to a goal. Unfinished tasks are carried over to today or dropped.
- **Morning plan and nightly recap notifications** at times you choose.

## v2: mindful gate

- Opening a wasted-time app shows a full-screen pause first. It asks why you're opening the app, shows today's budget, your why and your next Top 3 task, and offers **Close** or **Continue**.
- The wait is 5 s, then 10 s at half the budget, 15 s at 80%, and 30 s once you're over.
- After **Continue** the app stays open to you until you've been away from it for 2 minutes.
- Every decision is logged, and Today shows how often the gate paused you, how often you turned back, and your most common reason.
- It runs as an Accessibility service that only listens for which app is opening. It never reads screen content. Turn it on in Settings → Mindful gate. On Android 13+, a sideloaded APK also needs App info → ⋮ → **Allow restricted settings**.

## Development

This app needs a development build, because Expo Go doesn't include the usage-stats module.

```bash
npm install
npx expo run:android          # local build on a connected phone or emulator
npx eas-cli@latest build --profile development --platform android   # or a cloud build
```

Checks:

```bash
npx tsc --noEmit
npx expo lint
npm test
# Kotlin unit tests for the usage module (after `npx expo prebuild --platform android`):
cd android && ./gradlew :usage-stats:testDebugUnitTest
```

On first run, grant **Usage access** in the screen Android opens (Settings → Usage access → FocusMonster).

## Layout

```
src/app/        screens (Expo Router)
src/domain/     pure logic: target, streak, tasks, dates (unit tested)
src/db/         SQLite schema, migrations and queries
src/services/   usage sync, notifications
src/data/       hooks that load what screens show
src/ui/         theme and components
modules/usage-stats/   Kotlin module: usage access, foreground time, launcher apps, and the mindful gate
                       (accessibility service + native gate screen)
```
