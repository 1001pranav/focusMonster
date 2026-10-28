package expo.modules.usagestats

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/** What happens in Reels and Shorts: just count them, pause every [limit] videos, or block the player. */
data class ShortsPolicy(val mode: String, val limit: Int) {
  companion object {
    const val COUNT = "count"
    const val PAUSE = "pause"
    const val BLOCK = "block"
  }
}

/** What the JS side tells the gate, refreshed whenever the app's data changes. */
data class GateConfig(
  val enabled: Boolean,
  val wasted: Set<String>,
  val targetMin: Int,
  val nextTask: String?,
  val why: String?,
  /** Epoch ms when the gate turns itself off (the 24-hour lock ran out); 0 for never. */
  val offAt: Long = 0,
  /** Wasted apps on their way out, and when they stop being gated. */
  val releaseAt: Map<String, Long> = emptyMap(),
  val shorts: ShortsPolicy = ShortsPolicy(ShortsPolicy.PAUSE, 20),
  /** A weaker short-video policy waiting out the 24-hour lock, and when it starts. */
  val shortsNext: ShortsPolicy? = null,
  val shortsNextAt: Long = 0,
) {
  fun shortsPolicy(now: Long): ShortsPolicy = if (shortsNext != null && now >= shortsNextAt) shortsNext else shorts

  /** Whether opening [pkg] at [now] should go through the gate. */
  fun gates(pkg: String, now: Long): Boolean {
    if (!enabled || (offAt > 0 && now >= offAt)) return false
    if (pkg !in wasted) return false
    val release = releaseAt[pkg]
    return release == null || now < release
  }
}

/**
 * The gate's config and its log of decisions, in SharedPreferences: the accessibility service runs
 * while the JS runtime is asleep, so it can't ask JS anything.
 */
object GateStore {
  private const val PREFS = "focusmonster_gate"
  private const val CONFIG = "config"
  private const val LOG = "log"
  /** Older decisions are dropped if the app isn't opened for a long time. */
  private const val MAX_LOG = 500

  @Volatile private var cached: GateConfig? = null

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun saveConfig(context: Context, json: String) {
    prefs(context).edit().putString(CONFIG, json).apply()
    cached = parse(json)
  }

  fun config(context: Context): GateConfig =
    cached ?: parse(prefs(context).getString(CONFIG, null)).also { cached = it }

  private fun parse(json: String?): GateConfig {
    val o = json?.let { runCatching { JSONObject(it) }.getOrNull() } ?: return GateConfig(false, emptySet(), 0, null, null)
    val wasted = o.optJSONArray("wasted") ?: JSONArray()
    val release = o.optJSONObject("releaseAt") ?: JSONObject()
    return GateConfig(
      enabled = o.optBoolean("enabled", false),
      wasted = (0 until wasted.length()).map { wasted.getString(it) }.toSet(),
      targetMin = o.optInt("targetMin", 0),
      nextTask = o.optString("nextTask").takeIf { it.isNotEmpty() },
      why = o.optString("why").takeIf { it.isNotEmpty() },
      offAt = o.optLong("offAt", 0),
      releaseAt = release.keys().asSequence().associateWith { release.getLong(it) },
      shorts = o.optJSONObject("shorts")?.let(::policy) ?: ShortsPolicy(ShortsPolicy.PAUSE, 20),
      shortsNext = o.optJSONObject("shortsNext")?.let(::policy),
      shortsNextAt = o.optJSONObject("shortsNext")?.optLong("at", 0) ?: 0,
    )
  }

  private fun policy(o: JSONObject) = ShortsPolicy(o.optString("mode", ShortsPolicy.PAUSE), o.optInt("limit", 20))

  @Synchronized
  fun appendLog(context: Context, entry: JSONObject) {
    val log = runCatching { JSONArray(prefs(context).getString(LOG, "[]")) }.getOrDefault(JSONArray())
    log.put(entry)
    while (log.length() > MAX_LOG) log.remove(0)
    prefs(context).edit().putString(LOG, log.toString()).apply()
  }

  /** Every decision since the last call, oldest first; the log is emptied. */
  @Synchronized
  fun drainLog(context: Context): String {
    val log = prefs(context).getString(LOG, "[]") ?: "[]"
    prefs(context).edit().putString(LOG, "[]").apply()
    return log
  }
}
