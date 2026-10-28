package expo.modules.usagestats

/** Bedtime window, the same rules as src/domain/bedtime.ts. Times are minutes of the day. */
data class QuietHours(val enabled: Boolean, val start: Int, val end: Int, val morningFreeMin: Int) {
  private val until get() = (end + morningFreeMin) % DAY_MIN

  fun active(minute: Int): Boolean {
    if (!enabled) return false
    val stop = until
    if (start == stop) return false
    return if (start < stop) minute in start until stop else minute >= start || minute < stop
  }

  /** "07:30": when wasted apps open again. */
  fun opensAt(): String = "%02d:%02d".format(until / 60, until % 60)

  companion object {
    const val DAY_MIN = 24 * 60
    val OFF = QuietHours(false, 0, 0, 0)
  }
}
