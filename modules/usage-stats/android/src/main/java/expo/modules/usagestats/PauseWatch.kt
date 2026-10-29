package expo.modules.usagestats

/**
 * While FocusMonster is off for an app that won't run with an accessibility service on (mostly
 * banks), decides when to turn it back on. Pure, so it can be unit tested.
 */
object PauseWatch {
  /**
   * Time away from the listed apps before turning back on. Many banks check at launch, before the
   * service has gone off, so the first open can still show their warning: this leaves time to close
   * the bank and open it again.
   */
  const val GRACE_MS = 45_000L

  /**
   * When a listed app was last in front, given what's in front at [now]; null means turn back on now.
   * [foreground] is null when the screen is off or usage history hasn't caught up: keep waiting.
   * [gated] apps (wasted, Instagram, YouTube) end the pause at once, so they never ride on it.
   */
  fun next(foreground: String?, now: Long, lastListedAt: Long, listed: Set<String>, gated: Set<String>): Long? = when {
    foreground == null -> lastListedAt
    foreground in gated -> null
    foreground in listed -> now
    now - lastListedAt >= GRACE_MS -> null
    else -> lastListedAt
  }
}
