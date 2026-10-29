package expo.modules.usagestats

/**
 * Decides when the mindful gate opens. Free of Android types so it can be unit tested; the caller
 * passes the clock.
 *
 * After "Continue" the app stays allowed while the user is in it, and for [returnGraceMs] after
 * they leave: pulling down the notification shade or switching to WhatsApp for a reply doesn't
 * cost another pause. A longer absence means a new visit, and a new visit gets a new gate.
 */
class GateRules(private val returnGraceMs: Long = 2 * 60_000L) {
  /** Allowed apps, with the time the user last left them (or was allowed in, while still inside). */
  private val allowed = HashMap<String, Long>()
  private var foreground: String? = null

  /** Called on every foreground change. True when the gate should open for [pkg]. */
  fun onForeground(pkg: String, now: Long, gated: Boolean): Boolean {
    val previous = foreground
    foreground = pkg
    if (previous != null && previous != pkg && previous in allowed) allowed[previous] = now
    if (!gated || pkg == previous) return false
    val leftAt = allowed[pkg]
    if (leftAt != null && now - leftAt <= returnGraceMs) return false
    allowed.remove(pkg)
    return true
  }

  fun allow(pkg: String, now: Long) {
    allowed[pkg] = now
  }

  /** A new day's budget starts with a pause: yesterday's "Continue" doesn't carry over. */
  fun newDay() {
    allowed.clear()
  }

  companion object {
    /** The pause gets longer as the day's budget runs out. */
    fun waitSeconds(usedRatio: Double): Int =
      when {
        usedRatio < 0.5 -> 5
        usedRatio < 0.8 -> 10
        usedRatio < 1.0 -> 15
        else -> 30
      }
  }
}
