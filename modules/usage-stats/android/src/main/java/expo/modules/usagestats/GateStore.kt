package expo.modules.usagestats

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/** What the JS side tells the gate, refreshed whenever the app's data changes. */
data class GateConfig(
  val enabled: Boolean,
  val wasted: Set<String>,
  val targetMin: Int,
  val nextTask: String?,
  val why: String?,
)

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
    return GateConfig(
      enabled = o.optBoolean("enabled", false),
      wasted = (0 until wasted.length()).map { wasted.getString(it) }.toSet(),
      targetMin = o.optInt("targetMin", 0),
      nextTask = o.optString("nextTask").takeIf { it.isNotEmpty() },
      why = o.optString("why").takeIf { it.isNotEmpty() },
    )
  }

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
