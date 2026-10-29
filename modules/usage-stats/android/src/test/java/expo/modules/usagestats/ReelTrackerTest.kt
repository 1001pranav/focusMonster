package expo.modules.usagestats

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ReelTrackerTest {
  private val min = 60_000L

  @Test
  fun `the first reel of a session counts`() {
    val t = ReelTracker()
    assertTrue(t.enter(0))
    assertEquals(1, t.sessionCount)
  }

  @Test
  fun `a burst of scroll events is one reel`() {
    val t = ReelTracker()
    t.enter(0)
    assertTrue(t.scroll(1000))
    assertFalse(t.scroll(1100))
    assertFalse(t.scroll(1300))
    assertTrue(t.scroll(5000))
    assertEquals(3, t.sessionCount)
  }

  @Test
  fun `scrolls outside the player don't count`() {
    val t = ReelTracker()
    assertFalse(t.scroll(1000))
    assertEquals(0, t.sessionCount)
  }

  @Test
  fun `a short trip away continues the session`() {
    val t = ReelTracker()
    t.enter(0)
    t.scroll(5000)
    t.leave(10_000)
    assertFalse(t.enter(10_000 + min))
    assertEquals(2, t.sessionCount)
  }

  @Test
  fun `a long absence starts a new session`() {
    val t = ReelTracker()
    t.enter(0)
    t.scroll(5000)
    t.leave(10_000)
    assertTrue(t.enter(10_000 + 3 * min))
    assertEquals(1, t.sessionCount)
  }

  @Test
  fun `a break is due after the limit and resets`() {
    val t = ReelTracker()
    t.enter(0)
    for (i in 1..19) t.scroll(i * 2000L)
    assertTrue(t.breakDue(20))
    t.tookBreak()
    assertFalse(t.breakDue(20))
    assertFalse(t.breakDue(0))
  }

  @Test
  fun `time in the player stops a minute after the last swipe`() {
    val t = ReelTracker()
    t.enter(0)
    t.scroll(30_000)
    assertEquals(90_000, t.leave(10 * min))
  }

  @Test
  fun `time in the player is the whole visit while swiping`() {
    val t = ReelTracker()
    t.enter(0)
    t.scroll(20_000)
    assertEquals(40_000, t.leave(40_000))
  }

  @Test
  fun `midnight starts a new session even mid-swipe`() {
    val t = ReelTracker()
    t.enter(0, "2026-11-02")
    for (i in 1..59) t.scroll(i * 2_000L, "2026-11-02")
    assertEquals(60, t.sessionCount)
    // Still swiping, but it's a new day now.
    assertTrue(t.scroll(122_000, "2026-11-03"))
    assertEquals(1, t.sessionCount)
    assertEquals(1, t.sinceBreak)
  }

  @Test
  fun `coming back to the player on a new day is a new session however short the gap`() {
    val t = ReelTracker()
    t.enter(0, "2026-11-02")
    t.scroll(5_000, "2026-11-02")
    t.leave(10_000)
    assertTrue(t.enter(20_000, "2026-11-03"))
    assertEquals(1, t.sessionCount)
  }
}
