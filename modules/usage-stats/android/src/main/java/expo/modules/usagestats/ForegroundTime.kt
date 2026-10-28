package expo.modules.usagestats

/**
 * Foreground time per app from raw usage events, kept free of Android types so it can be unit tested.
 *
 * An app is in the foreground from the moment one of its activities resumes until none is resumed,
 * or the screen turns off. A session already running at the window's start counts from the start;
 * one still running at its end counts until the end.
 */
object ForegroundTime {
  // Raw values of UsageEvents.Event types: the named constants for 23 and 26 only exist from API 29.
  const val ACTIVITY_RESUMED = 1
  const val ACTIVITY_PAUSED = 2
  const val SCREEN_NON_INTERACTIVE = 16
  const val ACTIVITY_STOPPED = 23
  const val DEVICE_SHUTDOWN = 26

  data class Event(val type: Int, val packageName: String, val activity: String, val timeStamp: Long)

  /** One stretch of an app in the foreground. */
  data class Interval(val packageName: String, val from: Long, val to: Long)

  fun compute(events: Sequence<Event>, start: Long, end: Long): Map<String, Long> {
    val totals = HashMap<String, Long>()
    for (i in intervals(events, start, end)) totals[i.packageName] = (totals[i.packageName] ?: 0L) + (i.to - i.from)
    return totals.filterValues { it > 0 }
  }

  /** Total milliseconds of the given apps in each hour of the day (0-23, local time via [hourOf]). */
  fun byHour(events: Sequence<Event>, start: Long, end: Long, packages: Set<String>, hourOf: (Long) -> Int): LongArray {
    val hours = LongArray(24)
    for (i in intervals(events, start, end)) {
      if (i.packageName !in packages) continue
      var t = i.from
      while (t < i.to) {
        // Up to the next whole hour; zone offsets are whole or half hours, so step in half hours.
        val next = minOf(i.to, (t / HALF_HOUR + 1) * HALF_HOUR)
        hours[hourOf(t)] += next - t
        t = next
      }
    }
    return hours
  }

  private const val HALF_HOUR = 30 * 60_000L

  fun intervals(events: Sequence<Event>, start: Long, end: Long): List<Interval> {
    val out = ArrayList<Interval>()
    val resumed = HashMap<String, MutableSet<String>>()
    val since = HashMap<String, Long>()
    val seen = HashSet<String>()

    fun close(pkg: String, at: Long) {
      val from = since.remove(pkg) ?: return
      if (at > from) out.add(Interval(pkg, from, at))
    }

    for (event in events) {
      val pkg = event.packageName
      when (event.type) {
        ACTIVITY_RESUMED -> {
          val open = resumed.getOrPut(pkg) { HashSet() }
          if (open.isEmpty()) since[pkg] = event.timeStamp
          open.add(event.activity)
        }
        ACTIVITY_PAUSED, ACTIVITY_STOPPED -> {
          val open = resumed[pkg]
          if (open.isNullOrEmpty()) {
            // First thing seen for this app is it leaving: it was open when the window started.
            if (pkg !in seen) {
              since[pkg] = start
              close(pkg, event.timeStamp)
            }
          } else {
            open.remove(event.activity)
            if (open.isEmpty()) close(pkg, event.timeStamp)
          }
        }
        SCREEN_NON_INTERACTIVE, DEVICE_SHUTDOWN -> {
          since.keys.toList().forEach { close(it, event.timeStamp) }
          resumed.clear()
        }
      }
      seen.add(pkg)
    }
    since.keys.toList().forEach { close(it, end) }
    return out
  }
}
