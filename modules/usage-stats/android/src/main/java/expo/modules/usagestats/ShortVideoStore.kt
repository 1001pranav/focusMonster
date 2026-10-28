package expo.modules.usagestats

import android.content.Context
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Reels and Shorts watched per day and app: count, milliseconds in the player, and times the player
 * was blocked. Kept natively because it changes while the JS runtime sleeps; JS copies it into
 * SQLite (src/services/shorts.ts). Days older than two weeks are dropped.
 */
object ShortVideoStore {
  private const val PREFS = "focusmonster_shorts"
  private const val KEEP_DAYS = 14

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  /** The same 'YYYY-MM-DD' local day as src/domain/dates.ts. */
  fun dayOf(ms: Long): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date(ms))

  @Synchronized
  fun add(context: Context, pkg: String, now: Long, count: Int = 0, ms: Long = 0, blocked: Int = 0) {
    val day = dayOf(now)
    val all = read(context)
    val days = all.optJSONObject(day) ?: JSONObject().also { all.put(day, it) }
    val entry = days.optJSONObject(pkg) ?: JSONObject().also { days.put(pkg, it) }
    entry.put("count", entry.optInt("count") + count)
    entry.put("ms", entry.optLong("ms") + ms)
    entry.put("blocked", entry.optInt("blocked") + blocked)
    val oldest = dayOf(now - KEEP_DAYS * 24 * 60 * 60 * 1000L)
    all.keys().asSequence().toList().filter { it < oldest }.forEach { all.remove(it) }
    prefs(context).edit().putString("days", all.toString()).apply()
  }

  /** {day: {package: {count, ms, blocked}}}. */
  @Synchronized
  fun read(context: Context): JSONObject = runCatching { JSONObject(prefs(context).getString("days", "{}") ?: "{}") }.getOrDefault(JSONObject())
}
