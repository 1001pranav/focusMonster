package expo.modules.usagestats

import android.content.Context

/** Wasted minutes and the target for a day, measured on the spot: no JS needed. */
data class TodayNumbers(val day: String, val usedMin: Double, val targetMin: Int, val yesterdayMin: Double?, val yesterdayTargetMin: Int?) {
  val ratio get() = if (targetMin > 0) usedMin / targetMin else 0.0

  companion object {
    private const val DAY_MS = 24 * 60 * 60 * 1000L

    fun measure(context: Context, config: GateConfig, now: Long): TodayNumbers {
      val start = UsageReader.startOfToday()
      val today = ShortVideoStore.dayOf(now)
      val yesterday = ShortVideoStore.dayOf(start - 1)
      fun wasted(from: Long, to: Long) =
        runCatching { UsageReader.foregroundMs(context, from, to).filterKeys { it in config.wasted }.values.sum() / 60000.0 }.getOrDefault(0.0)
      val yesterdayMin by lazy { wasted(start - DAY_MS, start) }
      val target = Budget.targetFor(config.plan, today, yesterday) { yesterdayMin }
      val yesterdayTarget = if (config.plan.day == yesterday) config.plan.targetMin else null
      return TodayNumbers(today, wasted(start, now), target, if (yesterdayTarget != null) yesterdayMin else null, yesterdayTarget)
    }
  }
}
