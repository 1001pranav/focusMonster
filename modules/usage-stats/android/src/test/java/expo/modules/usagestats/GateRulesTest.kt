package expo.modules.usagestats

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class GateRulesTest {
  private val ig = "com.instagram.android"
  private val me = "com.focusmonster.app"
  private val launcher = "com.android.launcher"
  private val min = 60_000L

  @Test
  fun `gates a wasted app when it opens`() {
    val rules = GateRules()
    rules.onForeground(launcher, 0, gated = false)
    assertTrue(rules.onForeground(ig, 1, gated = true))
  }

  @Test
  fun `never gates other apps`() {
    assertFalse(GateRules().onForeground(launcher, 0, gated = false))
  }

  @Test
  fun `a second window of the same app doesn't gate again`() {
    val rules = GateRules()
    assertTrue(rules.onForeground(ig, 0, gated = true))
    assertFalse(rules.onForeground(ig, 50, gated = true))
  }

  @Test
  fun `continue lets the user back in`() {
    val rules = GateRules()
    rules.onForeground(ig, 0, gated = true)
    rules.onForeground(me, 10, gated = false)
    rules.allow(ig, 5_000)
    assertFalse(rules.onForeground(ig, 5_100, gated = true))
  }

  @Test
  fun `a short trip away keeps the app allowed`() {
    val rules = GateRules()
    rules.allow(ig, 0)
    rules.onForeground(ig, 0, gated = true)
    rules.onForeground(launcher, 30 * min, gated = false)
    assertFalse(rules.onForeground(ig, 31 * min, gated = true))
  }

  @Test
  fun `a long absence is a new visit`() {
    val rules = GateRules()
    rules.allow(ig, 0)
    rules.onForeground(ig, 0, gated = true)
    rules.onForeground(launcher, 30 * min, gated = false)
    assertTrue(rules.onForeground(ig, 33 * min, gated = true))
  }

  @Test
  fun `closing leaves the app gated`() {
    val rules = GateRules()
    rules.onForeground(ig, 0, gated = true)
    rules.onForeground(me, 10, gated = false)
    rules.onForeground(launcher, 20, gated = false)
    assertTrue(rules.onForeground(ig, 30, gated = true))
  }

  @Test
  fun `the wait grows with the budget used`() {
    assertEquals(5, GateRules.waitSeconds(0.2))
    assertEquals(10, GateRules.waitSeconds(0.5))
    assertEquals(15, GateRules.waitSeconds(0.9))
    assertEquals(30, GateRules.waitSeconds(1.0))
  }
}
