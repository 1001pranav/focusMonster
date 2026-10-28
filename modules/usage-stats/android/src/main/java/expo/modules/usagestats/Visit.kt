package expo.modules.usagestats

/**
 * The service only receives events from the apps it watches, so it can't see the user leave one.
 * Usage history fills that in. Pure, so it can be unit tested.
 */
object Visit {
  /** A foreground stretch that started this recently is an arrival, not a window change inside a visit. */
  const val ARRIVAL_MS = 5_000L

  data class Arrival(
    /** The app just came to the foreground (rather than changing screens while already there). */
    val fresh: Boolean,
    /** When the user last left the app before this visit, if usage history knows. */
    val leftAt: Long?,
  )

  /**
   * [intervals]: the app's foreground stretches over the last few minutes, oldest first; an ongoing
   * one ends at [now]. When history hasn't caught up with the arrival yet, it counts as fresh.
   */
  fun of(intervals: List<ForegroundTime.Interval>, now: Long): Arrival {
    val ongoing = intervals.lastOrNull()?.takeIf { it.to >= now - 1_000 }
    val earlier = if (ongoing != null) intervals.dropLast(1) else intervals
    val leftAt = earlier.lastOrNull()?.to
    if (ongoing == null) return Arrival(fresh = true, leftAt = leftAt)
    return Arrival(fresh = now - ongoing.from <= ARRIVAL_MS, leftAt = leftAt)
  }

  /** The app in the foreground at [now], from everyone's stretches; null if none is ongoing. */
  fun foreground(intervals: List<ForegroundTime.Interval>, now: Long): String? =
    intervals.filter { it.to >= now - 1_000 }.maxByOrNull { it.from }?.packageName
}
