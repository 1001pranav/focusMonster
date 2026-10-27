package expo.modules.usagestats

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import java.util.Calendar

/** Reads usage events from Android and turns them into foreground time per app. */
object UsageReader {
  fun foregroundMs(context: Context, start: Long, end: Long): Map<String, Long> {
    if (end <= start) return emptyMap()
    val usage = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val events = usage.queryEvents(start, end)
    val raw = UsageEvents.Event()
    val sequence = generateSequence {
      if (!events.hasNextEvent()) return@generateSequence null
      events.getNextEvent(raw)
      raw.packageName?.let { ForegroundTime.Event(raw.eventType, it, raw.className ?: "", raw.timeStamp) }
    }
    return ForegroundTime.compute(sequence, start, end)
  }

  fun startOfToday(): Long =
    Calendar.getInstance().apply {
      set(Calendar.HOUR_OF_DAY, 0)
      set(Calendar.MINUTE, 0)
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)
    }.timeInMillis
}
