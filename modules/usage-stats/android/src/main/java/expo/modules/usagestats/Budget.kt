package expo.modules.usagestats

/**
 * Pure rules for the background worker and the gate, unit tested. The caller passes the clock and
 * the measurements.
 */
object Budget {
  /**
   * Today's target. The JS side computes targets only while the app is open, so it also sends what
   * tomorrow's would be after a hit and after a miss; on a new day yesterday's usage picks one.
   * After a gap of more than a day the chain is unknown, so the target holds (the miss value).
   */
  fun targetFor(config: TargetPlan, today: String, yesterday: String, wastedYesterdayMin: () -> Double): Int =
    when {
      config.day.isEmpty() -> 0
      today == config.day -> config.targetMin
      yesterday == config.day -> if (wastedYesterdayMin() <= config.targetMin) config.ifHitMin else config.ifMissMin
      else -> config.ifMissMin
    }

  /** Budget warnings, in percent of the target. */
  val LEVELS = listOf(50, 80, 100)

  /** The highest level reached and not yet sent today, or null. Lower ones are skipped once passed. */
  fun alertDue(usedMin: Double, targetMin: Int, sent: Set<Int>): Int? {
    if (targetMin <= 0) return null
    val pct = usedMin * 100 / targetMin
    val reached = LEVELS.filter { pct >= it }
    val top = reached.maxOrNull() ?: return null
    return if (top in sent) null else top
  }

  /** The morning plan goes out in the three hours after its time; later it would be stale. */
  fun morningDue(minuteNow: Int, morningAt: Int, sent: Boolean) = !sent && minuteNow >= morningAt && minuteNow < morningAt + 180

  /** The recap goes out from its time until midnight. */
  fun nightDue(minuteNow: Int, nightAt: Int, sent: Boolean) = !sent && minuteNow >= nightAt

  fun minuteOf(hhmm: String): Int = hhmm.split(":").let { (it.getOrNull(0)?.toIntOrNull() ?: 0) * 60 + (it.getOrNull(1)?.toIntOrNull() ?: 0) }

  fun minutes(min: Double): String {
    val m = Math.round(min).toInt().coerceAtLeast(0)
    return if (m < 60) "${m}m" else "${m / 60}h ${"%02d".format(m % 60)}m"
  }
}

/** The day the JS side last computed a target for, with the two possible next ones. */
data class TargetPlan(val day: String, val targetMin: Int, val ifHitMin: Int, val ifMissMin: Int)
