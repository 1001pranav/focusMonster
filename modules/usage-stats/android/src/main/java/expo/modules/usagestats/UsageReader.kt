package expo.modules.usagestats

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import java.util.Calendar

/** Reads usage events from Android and turns them into foreground time per app. */
object UsageReader {
  fun foregroundMs(context: Context, start: Long, end: Long): Map<String, Long> =
    if (end <= start) emptyMap() else ForegroundTime.compute(events(context, start, end), start, end)

  /** Foreground stretches of every app, oldest first; one still going ends at [end]. */
  fun intervals(context: Context, start: Long, end: Long): List<ForegroundTime.Interval> =
    if (end <= start) emptyList() else runCatching { ForegroundTime.intervals(events(context, start, end), start, end) }.getOrDefault(emptyList())

  private fun events(context: Context, start: Long, end: Long): Sequence<ForegroundTime.Event> {
    val usage = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val events = usage.queryEvents(start, end)
    val raw = UsageEvents.Event()
    return generateSequence {
      if (!events.hasNextEvent()) return@generateSequence null
      events.getNextEvent(raw)
      raw.packageName?.let { ForegroundTime.Event(raw.eventType, it, raw.className ?: "", raw.timeStamp) }
    }
  }

  /** Milliseconds of [packages] in each local hour of the day, summed over the range. */
  fun byHour(context: Context, start: Long, end: Long, packages: Set<String>): LongArray {
    val calendar = Calendar.getInstance()
    return ForegroundTime.byHour(events(context, start, end), start, end, packages) { calendar.timeInMillis = it; calendar.get(Calendar.HOUR_OF_DAY) }
  }

  fun startOfToday(): Long =
    Calendar.getInstance().apply {
      set(Calendar.HOUR_OF_DAY, 0)
      set(Calendar.MINUTE, 0)
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)
    }.timeInMillis
}
