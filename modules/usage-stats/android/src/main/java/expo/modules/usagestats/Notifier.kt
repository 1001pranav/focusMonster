package expo.modules.usagestats

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/** Posts the worker's notifications on the same channel the JS side created ("daily"). */
object Notifier {
  private const val CHANNEL = "daily"
  const val CHANNEL_PAUSE = "pause"
  const val ID_ALERT = 4101
  const val ID_MORNING = 4102
  const val ID_NIGHT = 4103
  const val ID_PAUSED = 4104

  /** Creates the channel the first time; returns its id. */
  fun channel(context: Context, id: String): String {
    if (Build.VERSION.SDK_INT >= 26) {
      val system = context.getSystemService(NotificationManager::class.java)
      if (system.getNotificationChannel(id) == null) {
        val channel =
          if (id == CHANNEL_PAUSE) NotificationChannel(id, "While FocusMonster is off for an app", NotificationManager.IMPORTANCE_LOW)
          else NotificationChannel(id, "Morning plan and nightly recap", NotificationManager.IMPORTANCE_DEFAULT)
        system.createNotificationChannel(channel)
      }
    }
    return id
  }

  fun post(context: Context, id: Int, title: String, body: String) {
    val open = context.packageManager.getLaunchIntentForPackage(context.packageName)
    post(context, id, CHANNEL, title, body, open)
  }

  /** The service went off and only the user can turn it back on: one tap to its switch. */
  fun postTurnBackOn(context: Context, label: String) =
    post(context, ID_PAUSED, CHANNEL_PAUSE, "FocusMonster is off for $label", "Done? Tap to turn it back on.", ServiceSwitch.settingsIntent(context))

  private fun post(context: Context, id: Int, channelId: String, title: String, body: String, open: Intent?) {
    val manager = NotificationManagerCompat.from(context)
    if (!manager.areNotificationsEnabled()) return
    val tap = open?.let { PendingIntent.getActivity(context, id, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT) }
    val notification = NotificationCompat.Builder(context, channel(context, channelId))
      .setSmallIcon(context.applicationInfo.icon)
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(NotificationCompat.BigTextStyle().bigText(body))
      .setContentIntent(tap)
      .setAutoCancel(true)
      .build()
    try {
      manager.notify(id, notification)
    } catch (e: SecurityException) {
      // Notification permission was revoked between the check and the post.
    }
  }
}
