package expo.modules.usagestats

import expo.modules.usagestats.ForegroundTime.ACTIVITY_PAUSED
import expo.modules.usagestats.ForegroundTime.ACTIVITY_RESUMED
import expo.modules.usagestats.ForegroundTime.ACTIVITY_STOPPED
import expo.modules.usagestats.ForegroundTime.Event
import expo.modules.usagestats.ForegroundTime.SCREEN_NON_INTERACTIVE
import org.junit.Assert.assertEquals
import org.junit.Test

class ForegroundTimeTest {
  private val ig = "com.instagram.android"
  private val yt = "com.google.android.youtube"

  private fun compute(vararg events: Event, start: Long = 0, end: Long = 1000) = ForegroundTime.compute(events.asSequence(), start, end)

  @Test
  fun `counts a session from resume to pause`() {
    assertEquals(mapOf(ig to 100L), compute(Event(ACTIVITY_RESUMED, ig, "Main", 100), Event(ACTIVITY_PAUSED, ig, "Main", 200)))
  }

  @Test
  fun `ignores the stop that follows a pause`() {
    assertEquals(
      mapOf(ig to 100L),
      compute(Event(ACTIVITY_RESUMED, ig, "Main", 100), Event(ACTIVITY_PAUSED, ig, "Main", 200), Event(ACTIVITY_STOPPED, ig, "Main", 210)),
    )
  }

  @Test
  fun `moving between activities of one app is one session`() {
    assertEquals(
      mapOf(ig to 300L),
      compute(
        Event(ACTIVITY_RESUMED, ig, "Feed", 100),
        Event(ACTIVITY_RESUMED, ig, "Reels", 150),
        Event(ACTIVITY_PAUSED, ig, "Feed", 160),
        Event(ACTIVITY_PAUSED, ig, "Reels", 400),
      ),
    )
  }

  @Test
  fun `a session open at the start counts from the start`() {
    assertEquals(mapOf(yt to 50L), compute(Event(ACTIVITY_PAUSED, yt, "Main", 150), start = 100))
  }

  @Test
  fun `a session open at the end counts until the end`() {
    assertEquals(mapOf(yt to 100L), compute(Event(ACTIVITY_RESUMED, yt, "Main", 900)))
  }

  @Test
  fun `screen off ends every session and the next resume starts a new one`() {
    assertEquals(
      mapOf(ig to 150L),
      compute(
        Event(ACTIVITY_RESUMED, ig, "Main", 100),
        Event(SCREEN_NON_INTERACTIVE, "android", "", 200),
        Event(ACTIVITY_PAUSED, ig, "Main", 210),
        Event(ACTIVITY_RESUMED, ig, "Main", 500),
        Event(ACTIVITY_PAUSED, ig, "Main", 550),
      ),
    )
  }

  @Test
  fun `apps are counted separately`() {
    assertEquals(
      mapOf(ig to 100L, yt to 200L),
      compute(
        Event(ACTIVITY_RESUMED, ig, "Main", 0),
        Event(ACTIVITY_PAUSED, ig, "Main", 100),
        Event(ACTIVITY_RESUMED, yt, "Main", 100),
        Event(ACTIVITY_PAUSED, yt, "Main", 300),
      ),
    )
  }
}
