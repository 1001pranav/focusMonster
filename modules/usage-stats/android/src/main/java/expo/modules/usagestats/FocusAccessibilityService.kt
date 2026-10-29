package expo.modules.usagestats

import android.accessibilityservice.AccessibilityService
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Handler
import android.os.Looper
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.widget.Toast

/** Shared by the service and the gate screen: both run in the app's one process. */
object Gate {
  val rules = GateRules()
  val reels = ReelTrackers()
}

/**
 * Watches the apps tagged as wasted time (and only those, see applyWatchList) and opens the mindful
 * gate when one comes to the foreground. Inside Instagram and YouTube it also checks whether the Reels or Shorts player is on
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
    /** Usage history looked at to tell an arrival from a screen change, and when the user last left. */
    private const val LOOKBACK_MS = 10 * 60_000L
    /** While the player is open, how often to check the user hasn't switched to an app that isn't watched. */
    private const val WATCHDOG_MS = 1_500L
    /** Stands for "some app the service doesn't watch" in the gate's memory. */
    private const val ELSEWHERE = "elsewhere"

    /** The running service, so a config change can narrow what it watches and the app can pause it. */
    @Volatile
    var instance: FocusAccessibilityService? = null
      private set
  }

  private val main = Handler(Looper.getMainLooper())

  private var foreground: String? = null
  /** The local day of the last event, to notice midnight. */
  private var currentDay: String? = null
  private val overlay by lazy { ReelOverlay(this) }
  private var lastWindow: String? = null
  private var playerApp: String? = null
  private var lastCheck = 0L

  override fun onAccessibilityEvent(event: AccessibilityEvent) {
    val pkg = event.packageName?.toString() ?: return
    val now = System.currentTimeMillis()
    val day = ShortVideoStore.dayOf(now)
    if (day != currentDay) {
      // Midnight: yesterday's "Continue" and Reels session end here, not at the next pause.
      if (currentDay != null) Gate.rules.newDay()
      currentDay = day
    }
    when (event.eventType) {
      AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> onWindow(pkg, now)
      AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED -> if (pkg in PLAYERS && now - lastCheck >= CHECK_EVERY_MS) checkPlayer(pkg, now)
      AccessibilityEvent.TYPE_VIEW_SCROLLED -> if (pkg in PLAYERS) onScroll(pkg, event, now)
    }
  }

  override fun onInterrupt() {}

  private fun onWindow(pkg: String, now: Long) {
    if (pkg == packageName) return
    val config = GateStore.config(this)
    // Only watched apps send events, so usage history says whether this is an arrival and when the
    // user last left; the gate's memory gets the departure it couldn't see.
    val arrival = Visit.of(UsageReader.intervals(this, now - LOOKBACK_MS, now).filter { it.packageName == pkg }, now)
    val newVisit = arrival.fresh || lastWindow != pkg
    if (arrival.fresh && lastWindow == pkg) Gate.rules.onForeground(ELSEWHERE, arrival.leftAt ?: (now - LOOKBACK_MS), gated = false)
    lastWindow = pkg

    // A focus session closes every wasted app, whether or not the gate is switched on, and an
    // earlier "Continue" doesn't count.
    val focusBlocked = config.focusActive(now) && pkg in config.wasted
    // Bedtime uses the gate's "allowed" memory, so "Open anyway" lasts the visit; a focus session doesn't.
    val minute = java.util.Calendar.getInstance().let { it.get(java.util.Calendar.HOUR_OF_DAY) * 60 + it.get(java.util.Calendar.MINUTE) }
    val bedtime = !focusBlocked && pkg in config.wasted && config.quietHours(now).active(minute)
    val gated = !focusBlocked && (bedtime || config.gates(pkg, now))
    if (Gate.rules.onForeground(pkg, now, gated)) openGate(pkg, if (bedtime) GateActivity.MODE_BEDTIME else GateActivity.MODE_OPEN)
    if (focusBlocked && newVisit) openGate(pkg, GateActivity.MODE_FOCUS)

    if (pkg != foreground) {
      foreground = pkg
      // Any switch ends the other app's Reels/Shorts session, including Instagram to YouTube.
      if (playerApp != null && playerApp != pkg) leavePlayer(now)
      if (pkg in PLAYERS) Detection.noteOpened(this, pkg, now)
    }
    // Scroll and content events only while a short-video app is open: elsewhere they are pure cost.
    setEvents(if (pkg in PLAYERS) PLAYER_EVENTS else BASE_EVENTS)
    if (pkg in PLAYERS) {
      checkPlayer(pkg, now)
      startWatchdog()
    }
  }

  /**
   * The apps the service receives events from: the wasted ones and the short-video apps. Every other
   * app, banking and UPI apps included, never has the service attached. Never empty: an empty list
   * would mean every app.
   */
  fun applyWatchList() {
    val info = serviceInfo ?: return
    val watched = (GateStore.config(this).wasted + PLAYERS.keys).toSortedSet()
    if (info.packageNames?.toSortedSet() == watched) return
    info.packageNames = watched.toTypedArray()
    serviceInfo = info
  }

  /** While a short-video app is open, notices the user switching to an app the service doesn't watch. */
  private val watchdog = object : Runnable {
    override fun run() {
      val now = System.currentTimeMillis()
      val current = Visit.foreground(UsageReader.intervals(this@FocusAccessibilityService, now - LOOKBACK_MS, now), now)
      if (current != null && current in PLAYERS) return scheduleWatchdog()
      foreground = current
      leavePlayer(now)
      setEvents(BASE_EVENTS)
    }
  }

  private fun startWatchdog() {
    main.removeCallbacks(watchdog)
    scheduleWatchdog()
  }

  private fun scheduleWatchdog() {
    main.postDelayed(watchdog, WATCHDOG_MS)
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
    val reels = Gate.reels.of(pkg)
    if (open && !reels.inFeed) enterPlayer(pkg, now)
    else if (!open && reels.inFeed) leavePlayer(now)
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
    if (playerApp != null && playerApp != pkg) leavePlayer(now)
    playerApp = pkg
    Detection.notePlayerSeen(this, pkg, now)
    if (Gate.reels.of(pkg).enter(now, ShortVideoStore.dayOf(now))) ShortVideoStore.add(this, pkg, now, count = 1)
    updateOverlay(pkg, now)
  }

  private fun leavePlayer(now: Long) {
    overlay.hide()
    val pkg = playerApp ?: return
    playerApp = null
    ShortVideoStore.add(this, pkg, now, ms = Gate.reels.of(pkg).leave(now))
  }

  private fun onScroll(pkg: String, event: AccessibilityEvent, now: Long) {
    if (GateStore.config(this).focusActive(now)) return
    val chain = idChain(event.source)
    Detection.noteScroll(this, pkg, chain)
    // Only swipes of the player itself: scrolling comments or the feed isn't a new video.
    if (!PlayerMatch.inPlayer(chain, PLAYERS.getValue(pkg))) return
    val reels = Gate.reels.of(pkg)
    if (!reels.inFeed) enterPlayer(pkg, now)
    if (!reels.inFeed || !reels.scroll(now, ShortVideoStore.dayOf(now))) return
    ShortVideoStore.add(this, pkg, now, count = 1)
    updateOverlay(pkg, now)
    val policy = GateStore.config(this).shortsPolicy(now)
    if (policy.mode == ShortsPolicy.PAUSE && reels.breakDue(policy.limit)) {
      reels.tookBreak()
      openGate(pkg, GateActivity.MODE_BREAK)
    }
  }

  private fun updateOverlay(pkg: String, now: Long) {
    val config = GateStore.config(this)
    if (!config.overlayOn(now)) return overlay.hide()
    val today = ShortVideoStore.read(this).optJSONObject(ShortVideoStore.dayOf(now))?.optJSONObject(pkg)?.optInt("count") ?: 0
    val reels = Gate.reels.of(pkg)
    val minutes = (now - reels.sessionStartedAt) / 60000.0
    runCatching { overlay.show(if (pkg.contains("youtube")) "Shorts" else "Reels", OverlayText.of(reels.sessionCount, minutes, today, config.shortsPolicy(now))) }
  }

  /** Screen off ends a Reels visit: no window event says so, and the pill mustn't sit on the lock screen. */
  private val screenOff = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) = leavePlayer(System.currentTimeMillis())
  }

  override fun onServiceConnected() {
    super.onServiceConnected()
    instance = this
    applyWatchList()
    registerReceiver(screenOff, IntentFilter(Intent.ACTION_SCREEN_OFF))
  }

  override fun onDestroy() {
    instance = null
    main.removeCallbacks(watchdog)
    runCatching { unregisterReceiver(screenOff) }
    overlay.hide()
    super.onDestroy()
  }

  /** Resource ids from the scrolled view up through its parents, null where a view has none. */
  private fun idChain(source: AccessibilityNodeInfo?): List<String?> {
    val out = ArrayList<String?>()
    var node = source
    while (node != null && out.size < PlayerMatch.MAX_DEPTH) {
      out.add(node.viewIdResourceName)
      node = node.parent
    }
    return out
  }

  private fun openGate(pkg: String, mode: String) {
    // Allowed from the background: a running accessibility service exempts its app.
    startActivity(
      Intent(this, GateActivity::class.java)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        .putExtra(GateActivity.EXTRA_PACKAGE, pkg)
        .putExtra(GateActivity.EXTRA_MODE, mode)
        .putExtra(GateActivity.EXTRA_REELS, Gate.reels.of(pkg).sessionCount)
        .putExtra(GateActivity.EXTRA_SINCE, Gate.reels.of(pkg).sessionStartedAt),
    )
  }
}
