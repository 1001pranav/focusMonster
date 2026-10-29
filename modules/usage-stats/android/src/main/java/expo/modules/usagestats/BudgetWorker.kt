package expo.modules.usagestats

import android.content.Context
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar
import java.util.concurrent.TimeUnit

/**
 * Every ~15 minutes (Android's minimum; Doze can stretch it): budget warnings at 50/80/100%, the
 * morning plan and the nightly recap, all with real numbers measured on the spot.
 */
class BudgetWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
  companion object {
    private const val NAME = "focusmonster-budget"
    private const val PREFS = "focusmonster_worker"

    fun schedule(context: Context) {
      MidnightReceiver.schedule(context)
      val request = PeriodicWorkRequestBuilder<BudgetWorker>(15, TimeUnit.MINUTES).build()
      WorkManager.getInstance(context).enqueueUniquePeriodicWork(NAME, ExistingPeriodicWorkPolicy.KEEP, request)
    }
  }

  override fun doWork(): Result {
    val context = applicationContext
    val config = GateStore.config(context)
    runCatching { BudgetWidget.updateAll(context) }
    // Alarms don't survive a reboot; the worker does, so it keeps the midnight refresh armed.
    runCatching { MidnightReceiver.schedule(context) }
    if (config.plan.day.isEmpty()) return Result.success()
    val now = System.currentTimeMillis()
    val numbers = TodayNumbers.measure(context, config, now)
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val sent = runCatching { JSONObject(prefs.getString(numbers.day, "{}") ?: "{}") }.getOrDefault(JSONObject())
    val alerts = sent.optJSONArray("alerts") ?: JSONArray()
    val alertsSent = (0 until alerts.length()).map { alerts.getInt(it) }.toSet()
    val minute = Calendar.getInstance().let { it.get(Calendar.HOUR_OF_DAY) * 60 + it.get(Calendar.MINUTE) }

    Budget.alertDue(numbers.usedMin, numbers.targetMin, alertsSent)?.let { level ->
      alert(context, level, numbers)
      // Passing a level also covers the ones below it.
      Budget.LEVELS.filter { it <= level }.forEach { if (it !in alertsSent) alerts.put(it) }
      sent.put("alerts", alerts)
    }
    if (Budget.morningDue(minute, Budget.minuteOf(config.morningAt), sent.optBoolean("morning"))) {
      morning(context, numbers)
      sent.put("morning", true)
    }
    if (Budget.nightDue(minute, Budget.minuteOf(config.nightAt), sent.optBoolean("night"))) {
      night(context, numbers, config)
      sent.put("night", true)
    }
    // Only today's record is kept.
    prefs.edit().clear().putString(numbers.day, sent.toString()).apply()
    return Result.success()
  }

  private fun alert(context: Context, level: Int, n: TodayNumbers) {
    val used = Budget.minutes(n.usedMin)
    val target = Budget.minutes(n.targetMin.toDouble())
    val left = Budget.minutes(n.targetMin - n.usedMin)
    when (level) {
      50 -> Notifier.post(context, Notifier.ID_ALERT, "Half of today's budget is gone", "$used of $target. $left left for the rest of the day.")
      80 -> Notifier.post(context, Notifier.ID_ALERT, "$left left today", "You're at 80% of today's $target. Worth saving the rest for later?")
      else -> Notifier.post(context, Notifier.ID_ALERT, "Today's target is reached", "$used of $target. From here, every minute keeps tomorrow's target where it is.")
    }
  }

  private fun morning(context: Context, n: TodayNumbers) {
    val yesterday = if (n.yesterdayMin != null && n.yesterdayTargetMin != null) {
      val hit = n.yesterdayMin <= n.yesterdayTargetMin
      "Yesterday: ${Budget.minutes(n.yesterdayMin)}, ${if (hit) "under target ✅" else "over target, so today's holds"}. "
    } else ""
    Notifier.post(context, Notifier.ID_MORNING, "Today's target: ${Budget.minutes(n.targetMin.toDouble())}", "${yesterday}Pick your Top 3.")
  }

  private fun night(context: Context, n: TodayNumbers, config: GateConfig) {
    val hit = n.usedMin <= n.targetMin
    val reels = ShortVideoStore.read(context).optJSONObject(n.day)?.let { day ->
      day.keys().asSequence().sumOf { day.getJSONObject(it).optInt("count") }
    } ?: 0
    val next = if (hit) "Under target: tomorrow's drops to ${Budget.minutes(config.plan.ifHitMin.toDouble())}." else "Over by ${Budget.minutes(n.usedMin - n.targetMin)}: tomorrow's target holds."
    val shorts = if (reels > 0) " $reels short videos." else ""
    Notifier.post(context, Notifier.ID_NIGHT, "Today: ${Budget.minutes(n.usedMin)} of ${Budget.minutes(n.targetMin.toDouble())}", "$next$shorts")
  }
}
