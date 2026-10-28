package expo.modules.usagestats

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/** Posts the worker's notifications on the same channel the JS side created ("daily"). */
object Notifier {
  private const val CHANNEL = "daily"
  const val ID_ALERT = 4101
  const val ID_MORNING = 4102
  const val ID_NIGHT = 4103

  fun post(context: Context, id: Int, title: String, body: String) {
    val manager = NotificationManagerCompat.from(context)
    if (!manager.areNotificationsEnabled()) return
    if (Build.VERSION.SDK_INT >= 26) {
      val system = context.getSystemService(NotificationManager::class.java)
      if (system.getNotificationChannel(CHANNEL) == null) {
        system.createNotificationChannel(NotificationChannel(CHANNEL, "Morning plan and nightly recap", NotificationManager.IMPORTANCE_DEFAULT))
      }
    }
    val open = context.packageManager.getLaunchIntentForPackage(context.packageName)
    val tap = open?.let { PendingIntent.getActivity(context, id, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT) }
    val notification = NotificationCompat.Builder(context, CHANNEL)
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
