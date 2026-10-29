package expo.modules.usagestats

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import java.util.Calendar

/**
 * Wakes just after midnight so the home-screen widget shows the new day at once, instead of
 * yesterday's "40m over" until the next background run (which Doze can delay for hours).
 * Re-arms itself each night; the background worker re-arms it too, which covers reboots.
 */
class MidnightReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val done = goAsync()
    val app = context.applicationContext
    Thread {
      try {
        runCatching { BudgetWidget.updateAll(app) }
        schedule(app)
      } finally {
        done.finish()
      }
    }.start()
  }

  companion object {
    /** A minute past local midnight, so the new day has begun when it runs. */
    fun nextRun(now: Long): Long =
      Calendar.getInstance().apply {
        timeInMillis = now
        add(Calendar.DAY_OF_YEAR, 1)
        set(Calendar.HOUR_OF_DAY, 0)
        set(Calendar.MINUTE, 1)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
      }.timeInMillis

    /** Inexact but allowed in Doze, and needs no exact-alarm permission. Re-arming replaces the old one. */
    fun schedule(context: Context) {
      val alarms = context.getSystemService(AlarmManager::class.java) ?: return
      val intent = PendingIntent.getBroadcast(context, 0, Intent(context, MidnightReceiver::class.java), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
      alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextRun(System.currentTimeMillis()), intent)
    }
  }
}
