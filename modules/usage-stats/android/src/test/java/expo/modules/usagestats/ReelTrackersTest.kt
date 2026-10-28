package expo.modules.usagestats

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ReelTrackersTest {
  private val ig = "com.instagram.android"
  private val yt = "com.google.android.youtube"

  @Test
  fun `Shorts start from zero after six Reels`() {
    val trackers = ReelTrackers()
    val reels = trackers.of(ig)
    reels.enter(0)
    for (i in 1..5) reels.scroll(i * 2_000L)
    assertEquals(6, reels.sessionCount)
    reels.leave(12_000)

    val shorts = trackers.of(yt)
    assertTrue(shorts.enter(13_000))
    assertEquals(1, shorts.sessionCount)
    assertTrue(shorts.scroll(15_000))
    assertEquals(2, shorts.sessionCount)
    assertEquals(6, reels.sessionCount)
  }

  @Test
  fun `each app keeps its own place in the player`() {
    val trackers = ReelTrackers()
    trackers.of(ig).enter(0)
    assertFalse(trackers.of(yt).inFeed)
  }

  @Test
  fun `the same app gets the same tracker back`() {
    val trackers = ReelTrackers()
    assertTrue(trackers.of(ig) === trackers.of(ig))
  }
}
