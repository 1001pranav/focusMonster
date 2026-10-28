package expo.modules.usagestats

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.accessibility.AccessibilityEvent

/** Shared by the service and the gate screen: both run in the app's one process. */
object Gate {
  val rules = GateRules()
}

/**
 * Watches which app comes to the foreground and opens the mindful gate for apps tagged as wasted
 * time. It listens to window changes only; it never reads what is on screen.
 */
class FocusAccessibilityService : AccessibilityService() {
  override fun onAccessibilityEvent(event: AccessibilityEvent) {
    if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
    val pkg = event.packageName?.toString() ?: return
    val config = GateStore.config(this)
    val gated = config.enabled && pkg in config.wasted
    if (Gate.rules.onForeground(pkg, System.currentTimeMillis(), gated)) {
      // Allowed from the background: a running accessibility service exempts its app.
      startActivity(
        Intent(this, GateActivity::class.java)
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
          .putExtra(GateActivity.EXTRA_PACKAGE, pkg),
      )
    }
  }

  override fun onInterrupt() {}
}
