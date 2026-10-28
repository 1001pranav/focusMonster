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
  /** Epoch ms a focus session ends; while it runs, wasted apps are closed to the user. */
  val focusUntil: Long = 0,
  val focusTask: String? = null,
  /** Replacement habits offered on the gate: id to title. */
  val instead: List<Pair<String, String>> = emptyList(),
  val plan: TargetPlan = TargetPlan("", targetMin, targetMin, targetMin),
  /** 'HH:MM' times of the morning plan and nightly recap notifications. */
  val morningAt: String = "08:00",
  val nightAt: String = "21:30",
  val quiet: QuietHours = QuietHours.OFF,
  /** A weaker bedtime waiting out the 24-hour lock, and when it starts. */
  val quietNext: QuietHours? = null,
  val quietNextAt: Long = 0,
) {
  fun quietHours(now: Long): QuietHours = if (quietNext != null && now >= quietNextAt) quietNext else quiet

  fun focusActive(now: Long) = now < focusUntil

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
      focusUntil = o.optLong("focusUntil", 0),
      focusTask = o.optString("focusTask").takeIf { it.isNotEmpty() },
      plan = TargetPlan(o.optString("day"), o.optInt("targetMin", 0), o.optInt("ifHitMin", o.optInt("targetMin", 0)), o.optInt("ifMissMin", o.optInt("targetMin", 0))),
      morningAt = o.optString("morningAt", "08:00"),
      nightAt = o.optString("nightAt", "21:30"),
      quiet = o.optJSONObject("bedtime")?.let(::quiet) ?: QuietHours.OFF,
      quietNext = o.optJSONObject("bedtimeNext")?.let(::quiet),
      quietNextAt = o.optJSONObject("bedtimeNext")?.optLong("at", 0) ?: 0,
      instead = (o.optJSONArray("instead") ?: JSONArray()).let { a -> (0 until a.length()).map { a.getJSONObject(it).let { h -> h.getString("id") to h.getString("title") } } },
    )
  }

  /** Ends a running focus session at once, from the gate, without waiting for the JS side. */
  @Synchronized
  fun endFocus(context: Context, now: Long) {
    val json = prefs(context).getString(CONFIG, null) ?: return
    val o = runCatching { JSONObject(json) }.getOrNull() ?: return
    saveConfig(context, o.put("focusUntil", now).toString())
  }

  private fun quiet(o: JSONObject) =
    QuietHours(o.optBoolean("enabled"), Budget.minuteOf(o.optString("start", "23:00")), Budget.minuteOf(o.optString("end", "07:00")), o.optInt("morningFreeMin", 0))

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
