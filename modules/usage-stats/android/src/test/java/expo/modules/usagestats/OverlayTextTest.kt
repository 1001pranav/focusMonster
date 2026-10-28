package expo.modules.usagestats

import org.junit.Assert.assertEquals
import org.junit.Test

class OverlayTextTest {
  private val pause = ShortsPolicy(ShortsPolicy.PAUSE, 20)
  private val count = ShortsPolicy(ShortsPolicy.COUNT, 0)

  @Test
  fun `shows progress to the next break`() {
    assertEquals(OverlayText.Pill("12 / 20 · 48 today", false), OverlayText.of(12, 6.0, 48, pause))
  }

  @Test
  fun `turns orange just before a break`() {
    assertEquals(true, OverlayText.of(17, 8.0, 17, pause).warn)
    assertEquals(false, OverlayText.of(16, 8.0, 16, pause).warn)
  }

  @Test
  fun `counts toward the next break after one was taken`() {
    assertEquals("23 / 40", OverlayText.of(23, 10.0, 23, pause).text)
  }

  @Test
  fun `shows time when only counting`() {
    assertEquals(OverlayText.Pill("5 · 2m · 30 today", false), OverlayText.of(5, 2.0, 30, count))
  }

  @Test
  fun `leaves out today when it's the same as the session`() {
    assertEquals("5 · 2m", OverlayText.of(5, 2.0, 5, count).text)
  }
}
