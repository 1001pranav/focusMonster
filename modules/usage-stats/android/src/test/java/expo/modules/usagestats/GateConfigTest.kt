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
}
