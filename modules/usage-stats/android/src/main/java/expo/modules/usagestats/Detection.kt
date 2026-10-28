package expo.modules.usagestats

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * What the Reels/Shorts detection saw today, for the in-app detection check: how often each app
 * opened, when its player was last recognised, and the view ids of its most recent scrolls. View ids
 * are the app's internal names for its screens' parts; no text or content is recorded. When an app
 * update renames the player, these ids show what it is called now.
 */
object Detection {
  private const val PREFS = "focusmonster_detection"
  private const val MAX_CHAINS = 12

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  @Synchronized
  private fun update(context: Context, pkg: String, change: (JSONObject) -> Unit) {
    val today = ShortVideoStore.dayOf(System.currentTimeMillis())
    val all = runCatching { JSONObject(prefs(context).getString("data", "{}") ?: "{}") }.getOrDefault(JSONObject())
    // Only today is kept.
    val day = if (all.optString("day") == today) all else JSONObject().put("day", today)
    val apps = day.optJSONObject("apps") ?: JSONObject().also { day.put("apps", it) }
    val app = apps.optJSONObject(pkg) ?: JSONObject().also { apps.put(pkg, it) }
    change(app)
    prefs(context).edit().putString("data", day.toString()).apply()
  }

  fun noteOpened(context: Context, pkg: String, now: Long) = update(context, pkg) { it.put("opened", it.optInt("opened") + 1).put("lastOpened", now) }

  fun notePlayerSeen(context: Context, pkg: String, now: Long) = update(context, pkg) { it.put("playerSeen", it.optInt("playerSeen") + 1).put("lastPlayerSeen", now) }

  /** The last chain saved per app: one swipe fires many scroll events, and only a change is written. */
  private val lastChain = HashMap<String, String>()

  fun noteScroll(context: Context, pkg: String, chain: List<String?>) {
    val text = chain.joinToString(" < ") { it?.substringAfter(":id/") ?: "(no id)" }
    if (lastChain[pkg] == text) return
    lastChain[pkg] = text
    update(context, pkg) { app ->
      val chains = app.optJSONArray("scrolls") ?: JSONArray()
      val kept = (0 until chains.length()).map { chains.getString(it) }.filter { it != text }.takeLast(MAX_CHAINS - 1) + text
      app.put("scrolls", JSONArray(kept))
    }
  }

  /** {day, apps: {package: {opened, lastOpened, playerSeen, lastPlayerSeen, scrolls: [...]}}}. */
  fun read(context: Context): String = prefs(context).getString("data", "{}") ?: "{}"
}
