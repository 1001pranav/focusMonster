package expo.modules.usagestats

import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat

/**
 * Runs while the accessibility service is off for a listed app, and turns it back on once the user
 * has left that app (PauseWatch). The accessibility service can't do this itself: it's off. Needs
 * the adb grant to turn it back on; without it the service never starts this.
 */
class PauseService : Service() {
  companion object {
    private const val EXTRA_LABEL = "label"
    private const val ACTION_RESUME = "expo.modules.usagestats.RESUME"
    private const val POLL_MS = 1_500L
    /** Screen off: nothing changes in front, so look rarely. */
    private const val IDLE_POLL_MS = 15_000L
    private const val LOOKBACK_MS = 10 * 60_000L

    /** False if Android refused to start it; the caller then pauses the manual way. */
    fun start(context: Context, label: String): Boolean =
      try {
        ContextCompat.startForegroundService(context, Intent(context, PauseService::class.java).putExtra(EXTRA_LABEL, label))
        true
      } catch (e: Exception) {
        // ForegroundServiceStartNotAllowedException and friends.
        false
      }
  }

  private val main = Handler(Looper.getMainLooper())
  private var lastListedAt = 0L

  private val poll = object : Runnable {
    override fun run() {
      // Turned back on some other way, by the user or the backstop alarm.
      if (ServiceSwitch.isOn(this@PauseService)) return stop()
      val now = System.currentTimeMillis()
      val config = GateStore.config(this@PauseService)
      val front = Visit.foreground(UsageReader.intervals(this@PauseService, now - LOOKBACK_MS, now), now)
      val gated = config.wasted + FocusAccessibilityService.PLAYERS.keys
      lastListedAt = PauseWatch.next(front, now, lastListedAt, config.pauseApps - gated, gated) ?: return resume()
      val awake = getSystemService(PowerManager::class.java)?.isInteractive != false
      main.postDelayed(this, if (awake) POLL_MS else IDLE_POLL_MS)
    }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_RESUME) {
      resume()
      return START_NOT_STICKY
    }
    val label = intent?.getStringExtra(EXTRA_LABEL) ?: "this app"
    val type = if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0
    try {
      ServiceCompat.startForeground(this, Notifier.ID_PAUSED, notification(label), type)
    } catch (e: Exception) {
      // Not allowed to run: the backstop alarm turns the service back on instead.
      stopSelf()
      return START_NOT_STICKY
    }
    lastListedAt = System.currentTimeMillis()
    main.removeCallbacks(poll)
    main.postDelayed(poll, POLL_MS)
    return START_NOT_STICKY
  }

  private fun notification(label: String) =
    NotificationCompat.Builder(this, Notifier.channel(this, Notifier.CHANNEL_PAUSE))
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle("FocusMonster is off while you use $label")
      .setContentText("It turns back on by itself when you leave.")
      .setOngoing(true)
      .setSilent(true)
      .addAction(0, "Turn back on now", PendingIntent.getService(this, 0, Intent(this, PauseService::class.java).setAction(ACTION_RESUME), PendingIntent.FLAG_IMMUTABLE))
      .build()

  private fun resume() {
    ServiceSwitch.turnOn(this)
    stop()
  }

  private fun stop() {
    main.removeCallbacks(poll)
    ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  override fun onDestroy() {
    main.removeCallbacks(poll)
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null
}
