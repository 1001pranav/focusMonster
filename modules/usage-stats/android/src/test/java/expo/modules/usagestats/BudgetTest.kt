package expo.modules.usagestats

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class BudgetTest {
  private val plan = TargetPlan(day = "2026-11-02", targetMin = 300, ifHitMin = 296, ifMissMin = 300)

  @Test
  fun `today's target is the one sent`() {
    assertEquals(300, Budget.targetFor(plan, "2026-11-02", "2026-11-01") { error("not needed") })
  }

  @Test
  fun `the next day drops after a hit and holds after a miss`() {
    assertEquals(296, Budget.targetFor(plan, "2026-11-03", "2026-11-02") { 250.0 })
    assertEquals(300, Budget.targetFor(plan, "2026-11-03", "2026-11-02") { 301.0 })
  }

  @Test
  fun `after a longer gap the target holds`() {
    assertEquals(300, Budget.targetFor(plan, "2026-11-05", "2026-11-04") { 0.0 })
  }

  @Test
  fun `no plan means no target`() {
    assertEquals(0, Budget.targetFor(TargetPlan("", 0, 0, 0), "2026-11-02", "2026-11-01") { 0.0 })
  }

  @Test
  fun `sends the highest level reached once`() {
    assertNull(Budget.alertDue(100.0, 300, emptySet()))
    assertEquals(50, Budget.alertDue(150.0, 300, emptySet()))
    assertNull(Budget.alertDue(160.0, 300, setOf(50)))
    assertEquals(100, Budget.alertDue(320.0, 300, setOf(50)))
    assertNull(Budget.alertDue(320.0, 0, emptySet()))
  }

  @Test
  fun `the morning plan has a three-hour window`() {
    assertFalse(Budget.morningDue(7 * 60 + 59, 8 * 60, false))
    assertTrue(Budget.morningDue(8 * 60 + 10, 8 * 60, false))
    assertFalse(Budget.morningDue(11 * 60, 8 * 60, false))
    assertFalse(Budget.morningDue(8 * 60 + 10, 8 * 60, true))
  }

  @Test
  fun `the recap goes out until midnight`() {
    assertTrue(Budget.nightDue(23 * 60, 21 * 60 + 30, false))
    assertFalse(Budget.nightDue(21 * 60, 21 * 60 + 30, false))
  }

  @Test
  fun `parses and formats times`() {
    assertEquals(21 * 60 + 30, Budget.minuteOf("21:30"))
    assertEquals("2h 05m", Budget.minutes(125.0))
  }
}
