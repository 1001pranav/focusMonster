package expo.modules.usagestats

/**
 * Counts short videos watched from the scroll events of the Reels/Shorts player, and says when a
 * break is due. Free of Android types so it can be unit tested; the caller passes the clock.
 *
 * One swipe fires a burst of scroll events, so a reel is counted when a scroll comes more than
 * [burstGapMs] after the previous one. Leaving the player for longer than [sessionGapMs] ends the
 * session: the next visit starts counting toward a break from zero.
 */
class ReelTracker(private val burstGapMs: Long = 700, private val sessionGapMs: Long = 2 * 60_000L, private val idleMs: Long = 60_000L) {
  private var lastScroll = Long.MIN_VALUE / 2
  private var leftAt = Long.MIN_VALUE / 2
  private var enteredAt = 0L
  private var lastActivity = 0L

  var inFeed = false
    private set
  /** Reels this session, and since the last break. */
  var sessionCount = 0
    private set
  var sinceBreak = 0
    private set
  var sessionStartedAt = 0L
    private set

  /** The player opened. True when that starts a new session, whose first reel counts. */
  fun enter(now: Long): Boolean {
    if (inFeed) return false
    inFeed = true
    enteredAt = now
    lastActivity = now
    val newSession = now - leftAt > sessionGapMs
    if (newSession) {
      sessionCount = 0
      sinceBreak = 0
      sessionStartedAt = now
      count()
    }
    return newSession
  }

  /** A scroll of the player. True when it moved to a new reel. */
  fun scroll(now: Long): Boolean {
    if (!inFeed) return false
    val isNew = now - lastScroll > burstGapMs
    lastScroll = now
    lastActivity = now
    if (isNew) count()
    return isNew
  }

  /**
   * The player closed. Returns the milliseconds spent in it, cut off a minute after the last swipe:
   * a phone left on a paused reel isn't watching.
   */
  fun leave(now: Long): Long {
    if (!inFeed) return 0
    inFeed = false
    leftAt = now
    return (minOf(now, lastActivity + idleMs) - enteredAt).coerceAtLeast(0)
  }

  fun breakDue(limit: Int) = limit > 0 && sinceBreak >= limit

  fun tookBreak() {
    sinceBreak = 0
  }

  private fun count() {
    sessionCount++
    sinceBreak++
  }
}
