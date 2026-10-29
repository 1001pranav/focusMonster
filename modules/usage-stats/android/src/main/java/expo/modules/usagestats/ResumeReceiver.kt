package expo.modules.usagestats

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Turns the service back on at a set time: the end of a manual pause, and a backstop in case the
 * pause watcher dies with the process. Only with the adb grant (ServiceSwitch).
 */
class ResumeReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (ServiceSwitch.isOn(context)) return
    val now = System.currentTimeMillis()
    val front = Visit.foreground(UsageReader.intervals(context, now - LOOKBACK_MS, now), now)
    // Still in a listed bank: not now, it would close on the user mid-payment.
    if (front != null && front in GateStore.config(context).pauseApps) return schedule(context, RECHECK_MIN)
    ServiceSwitch.turnOn(context)
  }

  companion object {
    private const val LOOKBACK_MS = 10 * 60_000L
    private const val RECHECK_MIN = 5

    fun schedule(context: Context, minutes: Int) {
      val alarms = context.getSystemService(AlarmManager::class.java) ?: return
      alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, System.currentTimeMillis() + minutes * 60_000L, intent(context))
    }

    /** Once the service is back on: a later off by the user must stay off. */
    fun cancel(context: Context) {
      context.getSystemService(AlarmManager::class.java)?.cancel(intent(context))
    }

    private fun intent(context: Context) =
      PendingIntent.getBroadcast(context, 1, Intent(context, ResumeReceiver::class.java), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  }
}
