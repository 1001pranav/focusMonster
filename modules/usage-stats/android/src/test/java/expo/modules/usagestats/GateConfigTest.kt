package expo.modules.usagestats

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class GateConfigTest {
  private val ig = "com.instagram.android"
  private val config = GateConfig(enabled = true, wasted = setOf(ig), targetMin = 60, nextTask = null, why = null)

  @Test
  fun `gates wasted apps only`() {
    assertTrue(config.gates(ig, 0))
    assertFalse(config.gates("com.whatsapp", 0))
  }

  @Test
  fun `stays on until the lock runs out`() {
    val leaving = config.copy(offAt = 1000)
    assertTrue(leaving.gates(ig, 999))
    assertFalse(leaving.gates(ig, 1000))
  }

  @Test
  fun `an app being untagged is gated until its time`() {
    val leaving = config.copy(releaseAt = mapOf(ig to 1000L))
    assertTrue(leaving.gates(ig, 999))
    assertFalse(leaving.gates(ig, 1000))
  }

  @Test
  fun `nothing is gated while switched off`() {
    assertFalse(config.copy(enabled = false).gates(ig, 0))
  }

  @Test
  fun `a weaker short-video policy starts when its lock runs out`() {
    val c = config.copy(shorts = ShortsPolicy(ShortsPolicy.BLOCK, 0), shortsNext = ShortsPolicy(ShortsPolicy.COUNT, 0), shortsNextAt = 1000)
    org.junit.Assert.assertEquals(ShortsPolicy.BLOCK, c.shortsPolicy(999).mode)
    org.junit.Assert.assertEquals(ShortsPolicy.COUNT, c.shortsPolicy(1000).mode)
  }

  @Test
  fun `a focus session runs until its end`() {
    val c = config.copy(focusUntil = 1000)
    assertTrue(c.focusActive(999))
    assertFalse(c.focusActive(1000))
    assertFalse(config.focusActive(0))
  }

  @Test
  fun `turns off for listed apps, never for a gated one`() {
    val listed = config.copy(pauseApps = setOf("com.sbi.lotusintouch", ig))
    assertTrue(listed.pausesFor("com.sbi.lotusintouch"))
    assertFalse(listed.pausesFor(ig))
    assertFalse(listed.pausesFor("com.whatsapp"))
  }
}
