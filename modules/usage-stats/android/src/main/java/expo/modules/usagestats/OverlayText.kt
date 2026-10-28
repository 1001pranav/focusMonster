package expo.modules.usagestats

/** What the live counter over Reels/Shorts says. Pure, so it can be unit tested. */
object OverlayText {
  /** The pill turns orange this many videos before a break. */
  const val WARN_BEFORE = 3

  data class Pill(val text: String, val warn: Boolean)

  /**
   * "12 / 20 · 48 today" while pausing every 20, else "12 · 6m · 48 today". The session count is
   * the one that matters in the moment; today's total keeps the bigger picture in view.
   */
  fun of(session: Int, sessionMin: Double, today: Int, policy: ShortsPolicy): Pill {
    val todayPart = if (today > session) " · $today today" else ""
    return if (policy.mode == ShortsPolicy.PAUSE && policy.limit > 0) {
      val untilBreak = policy.limit - (session % policy.limit)
      Pill("$session / ${(session / policy.limit + 1) * policy.limit}$todayPart", untilBreak <= WARN_BEFORE)
    } else {
      Pill("$session · ${Budget.minutes(sessionMin)}$todayPart", false)
    }
  }
}
