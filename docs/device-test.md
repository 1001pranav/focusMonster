# Device test checklist

One pass over every feature on a real Android phone. Do it in order: later steps depend on earlier ones.

For anything that fails, note the **step number**, your **phone model and Android version**, and what you saw. A screenshot helps most for the gate and the Settings screens.

**Install:** merge PRs #4 to #10 in order, then download the APK from the latest *Android APK* run on `main` (Actions → run → Artifacts → `focusmonster-apk`). If you're upgrading from an older build, install over it; your data stays.

Some checks need time to pass (the next day, a weekend). Those are marked ⏳.

---

## 1. Setup

| # | Do | Expect |
|---|---|---|
| 1.1 | Open the app for the first time | Welcome screen, then *Allow usage access* |
| 1.2 | Tap *Open usage access settings*, turn on FocusMonster, press Back | You're taken straight to the app list. ⚠️ If you stay stuck on the usage-access step, that's a bug: note your phone brand |
| 1.3 | Look at the app list | Instagram and YouTube are switched on as wasted; apps are sorted by daily use |
| 1.4 | Continue to the baseline | A detected number from last week. Compare with Digital Wellbeing: it should be in the same range |
| 1.5 | Set a goal and a why, then *Start* | Android asks for notification permission. Allow it. You land on Today |

## 2. Today and usage numbers

| # | Do | Expect |
|---|---|---|
| 2.1 | Use Instagram for ~5 min, come back | The ring on Today grows by about 5 min, and so does Instagram in Progress → "Where today's time went" |
| 2.2 | Compare Instagram's minutes with Digital Wellbeing | Within a few minutes of each other. A big gap means the time counting is wrong |
| 2.3 | Add three Top 3 tasks, one linked to your goal | A 4th can't be added; ticking a task marks it done |
| 2.4 | ⏳ Next day | Yesterday's open tasks show under "Left over" with *Today* / *Drop* |

## 3. Mindful gate

| # | Do | Expect |
|---|---|---|
| 3.1 | Today → *Finish setting up* → Accessibility service → *Turn on*, then *Open Accessibility* | Android's Accessibility screen |
| 3.2 | Find *FocusMonster mindful gate* and turn it on | On Android 13+ you'll likely see **"Restricted setting"**. Then: setup step 2 → App info → ⋮ → *Allow restricted settings* → try again |
| 3.3 | Open Instagram | **The pause screen appears within a second**: "Opening Instagram", reasons, budget, your why, next task |
| 3.4 | Tap *Close Instagram* | You're on the home screen |
| 3.5 | Open Instagram, pick a reason, wait out the countdown, tap *Continue* | Instagram opens |
| 3.6 | Pull down notifications, open WhatsApp for 30 s, back to Instagram | **No** second pause |
| 3.7 | Leave Instagram for 3+ minutes, reopen | The pause shows again |
| 3.7b | Open Instagram with no Top 3 task set | No "null" anywhere on the pause screen: the task section is simply missing |
| 3.7c | Open your banking and UPI apps | They open normally. FocusMonster no longer watches them |
| 3.7d | If a bank still refuses: Settings → Protection → *Banking app won't open?* | The service turns off and the bank opens. A reminder comes after 15 min to turn it back on |
| 3.8 | Progress tab | "Mindful gate today: paused you N×, turned back M×" |

## 4. 24-hour lock

| # | Do | Expect |
|---|---|---|
| 4.1 | Settings → switch the gate off | Confirmation; then "Still on, turns off in 23h 59m" |
| 4.2 | Open Instagram | The pause still appears |
| 4.3 | Switch the gate back on | The pending "off" is cancelled |
| 4.4 | Wasted-time apps → switch off YouTube → Save, reopen the list | "Still counts, stops in 23h…" in orange; YouTube is still gated |

## 5. Reels and Shorts ⚠️ the most fragile part

| # | Do | Expect |
|---|---|---|
| 5.1 | Instagram → Reels, swipe through 5 reels, leave | Today: "Reels 5 · Xm". **If it's 0:** Today → *Check detection*. If it says the player was never recognised, tap *Send report* and send it to me with your Instagram version (App info): the report has the player's real name |
| 5.1b | While swiping Reels, look at the top of the screen | A small pill `🎬 3 / 20` counts up with each reel, and taps on Instagram underneath still work. It disappears when you leave Reels |
| 5.1c | Watch ~6 Reels, then go straight to YouTube Shorts and swipe 3 | The pill switches to `🎬 Shorts 1…`, `2…`, `3…` with each swipe, starting from 1, not from the Reels count |
| 5.2 | Scroll comments inside a reel | The count doesn't go up |
| 5.3 | YouTube → Shorts, swipe 5 | "Shorts 5" (same note: YouTube version if it's 0) |
| 5.4 | Settings → Reels and Shorts → *Pause me* every 10, then watch 10 reels | "10 reels in a row" break screen, at least 10 s wait |
| 5.5 | Choose *Block*, open Reels | You're sent back, with "Reels are blocked. The rest of Instagram is yours." Your feed and messages still work |
| 5.6 | Choose *Just count* | "…the change starts in 23h…" (it's gentler, so it's locked) |

## 6. Focus sessions and habits

| # | Do | Expect |
|---|---|---|
| 6.1 | Today → pick a task → *25 min* | The focus card counts down |
| 6.2 | Open Instagram | "Focus session: 24m left" with no Continue, only *Back to work* and *End early* after 10 s |
| 6.3 | *Back to work* | FocusMonster opens |
| 6.4 | Start a 25 min session and let it finish | A notification at the end; Today asks whether the task is done |
| 6.5 | Goals tab | "… focused this week" on the task's goal |
| 6.6 | Add two habits, open Instagram | The pause shows *Instead:* buttons; tapping one closes Instagram |
| 6.7 | Back on Today | That habit shows "Picked at the gate today. Did you do it?" and is **not** ticked |

## 7. Background, bedtime, widget

| # | Do | Expect |
|---|---|---|
| 7.1 | ⏳ Use wasted apps past 50% of today's target | A "Half of today's budget is gone" notification within ~15–30 min |
| 7.2 | ⏳ Next morning, after the morning time | "Today's target: …, Yesterday: …" with real numbers |
| 7.3 | ⏳ After the recap time | "Today: X of Y …" with today's short-video count |
| 7.4 | Settings → Bedtime on, set the start to the next half hour | After the start, Instagram shows "It's bedtime…"; *Open anyway* after 30 s |
| 7.5 | Long-press home screen → Widgets → FocusMonster budget | "Xh Ym left · of … · N short videos"; tapping opens the app |
| 7.6 | ⏳ New day, **without** opening FocusMonster, open Instagram | The pause shows the new day's target, not yesterday's |

## 8. Review and challenges

| # | Do | Expect |
|---|---|---|
| 8.1 | After 18:00, write a reflection on Today | It shows as "TODAY YOU: …" |
| 8.2 | Progress → *Full review* | The week's numbers. "Most scrolling: around …" matches when you actually scroll |
| 8.3 | *Share this week* | The share sheet with an image: totals only, no app names |
| 8.4 | Pick *Phone-free dinner* | Today shows the challenge with 7 empty dots |
| 8.5 | ⏳ After 20:30 | Today's dot is ✓ if you stayed off the phone, ✗ if not |

## 8b. Midnight

| # | Do | Expect |
|---|---|---|
| 8b.1 | Swipe Reels across midnight (11:58 pm → 12:01 am) | The pill drops back to `🎬 Reels 1…` after 12:00, not `61 / 80` |
| 8b.2 | Leave FocusMonster open on Today across midnight | Within a minute of 12:00 it shows the new day: ring near 0, a fresh Top 3 |
| 8b.3 | Tap Continue on the gate at ~11:58 pm, reopen Instagram after midnight | The pause shows again: a new day's budget starts with one |
| 8b.4 | Look at the widget just after midnight | It shows the new day within a few minutes, not yesterday's total |

## 9. Battery and stability (over a few days)

| # | Check | Expect |
|---|---|---|
| 9.1 | Settings → Battery → FocusMonster | Low single-digit % a day. Much more means the service or worker needs fixing |
| 9.2 | Phone restart | The gate still works without opening the app |
| 9.3 | Any crash or the gate failing to appear | Note the time and what you were doing |
