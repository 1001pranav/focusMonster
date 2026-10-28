package expo.modules.usagestats

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.widget.Toast

/** Shared by the service and the gate screen: both run in the app's one process. */
object Gate {
  val rules = GateRules()
  val reels = ReelTracker()
}

/**
 * Watches which app comes to the foreground and opens the mindful gate for apps tagged as wasted
 * time. Inside Instagram and YouTube it also checks whether the Reels or Shorts player is on
 * screen, by the player's view id, to count videos, pause the user every few of them, or block the
 * player. It never reads text, posts or messages.
 */
class FocusAccessibilityService : AccessibilityService() {
  companion object {
    /** View ids of the short-video players. Apps rename these in updates; see the README. */
    val PLAYERS = mapOf(
      "com.instagram.android" to listOf("clips_viewer_view_pager", "clips_viewer_container", "clips_video_container"),
      "com.google.android.youtube" to listOf("reel_recycler", "reel_player_page_container", "reel_watch_player"),
    )
    private const val BASE_EVENTS = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
    private const val PLAYER_EVENTS = BASE_EVENTS or AccessibilityEvent.TYPE_VIEW_SCROLLED or AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
    /** Looking for the player walks the view tree, so content changes are checked at most this often. */
    private const val CHECK_EVERY_MS = 400L
  }

  private var foreground: String? = null
  private var playerApp: String? = null
  private var lastCheck = 0L

  override fun onAccessibilityEvent(event: AccessibilityEvent) {
    val pkg = event.packageName?.toString() ?: return
    val now = System.currentTimeMillis()
    when (event.eventType) {
      AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> onWindow(pkg, now)
      AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED -> if (pkg in PLAYERS && now - lastCheck >= CHECK_EVERY_MS) checkPlayer(pkg, now)
      AccessibilityEvent.TYPE_VIEW_SCROLLED -> if (pkg in PLAYERS) onScroll(pkg, event, now)
    }
  }

  override fun onInterrupt() {}

  private fun onWindow(pkg: String, now: Long) {
    val gated = GateStore.config(this).gates(pkg, now)
    if (Gate.rules.onForeground(pkg, now, gated)) openGate(pkg, GateActivity.MODE_OPEN)

    if (pkg == foreground) {
      if (pkg in PLAYERS) checkPlayer(pkg, now)
      return
    }
    // Keyboards and the notification shade come and go on top; they don't close the player.
    if (pkg == "com.android.systemui" || pkg.contains("inputmethod") || pkg.contains("keyboard")) return
    foreground = pkg
    if (pkg !in PLAYERS) leavePlayer(now)
    // Scroll and content events only while a short-video app is open: elsewhere they are pure cost.
    setEvents(if (pkg in PLAYERS) PLAYER_EVENTS else BASE_EVENTS)
    if (pkg in PLAYERS) checkPlayer(pkg, now)
  }

  private fun setEvents(types: Int) {
    val info = serviceInfo ?: return
    if (info.eventTypes == types) return
    info.eventTypes = types
    serviceInfo = info
  }

  private fun checkPlayer(pkg: String, now: Long) {
    lastCheck = now
    val open = playerVisible(pkg)
    if (open && !Gate.reels.inFeed) enterPlayer(pkg, now)
    else if (!open && Gate.reels.inFeed) leavePlayer(now)
  }

  private fun playerVisible(pkg: String): Boolean {
    val root = rootInActiveWindow ?: return false
    if (root.packageName?.toString() != pkg) return false
    return PLAYERS.getValue(pkg).any { id -> root.findAccessibilityNodeInfosByViewId("$pkg:id/$id").any(AccessibilityNodeInfo::isVisibleToUser) }
  }

  private fun enterPlayer(pkg: String, now: Long) {
    val policy = GateStore.config(this).shortsPolicy(now)
    if (policy.mode == ShortsPolicy.BLOCK) {
      ShortVideoStore.add(this, pkg, now, blocked = 1)
      performGlobalAction(GLOBAL_ACTION_BACK)
      Toast.makeText(this, if (pkg.contains("youtube")) "Shorts are blocked. The rest of YouTube is yours." else "Reels are blocked. The rest of Instagram is yours.", Toast.LENGTH_SHORT).show()
      return
    }
    playerApp = pkg
    if (Gate.reels.enter(now)) ShortVideoStore.add(this, pkg, now, count = 1)
  }

  private fun leavePlayer(now: Long) {
    val pkg = playerApp ?: return
    playerApp = null
    ShortVideoStore.add(this, pkg, now, ms = Gate.reels.leave(now))
  }

  private fun onScroll(pkg: String, event: AccessibilityEvent, now: Long) {
    // Only swipes of the player itself: scrolling comments or the feed isn't a new video.
    val id = event.source?.viewIdResourceName?.substringAfter(":id/") ?: return
    if (id !in PLAYERS.getValue(pkg)) return
    if (!Gate.reels.inFeed) enterPlayer(pkg, now)
    if (!Gate.reels.inFeed || !Gate.reels.scroll(now)) return
    ShortVideoStore.add(this, pkg, now, count = 1)
    val policy = GateStore.config(this).shortsPolicy(now)
    if (policy.mode == ShortsPolicy.PAUSE && Gate.reels.breakDue(policy.limit)) {
      Gate.reels.tookBreak()
      openGate(pkg, GateActivity.MODE_BREAK)
    }
  }

  private fun openGate(pkg: String, mode: String) {
    // Allowed from the background: a running accessibility service exempts its app.
    startActivity(
      Intent(this, GateActivity::class.java)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        .putExtra(GateActivity.EXTRA_PACKAGE, pkg)
        .putExtra(GateActivity.EXTRA_MODE, mode)
        .putExtra(GateActivity.EXTRA_REELS, Gate.reels.sessionCount)
        .putExtra(GateActivity.EXTRA_SINCE, Gate.reels.sessionStartedAt),
    )
  }
}
