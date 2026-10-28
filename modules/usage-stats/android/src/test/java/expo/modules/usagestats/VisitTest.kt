package expo.modules.usagestats

import expo.modules.usagestats.ForegroundTime.Interval
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class VisitTest {
  private val ig = "com.instagram.android"
  private val now = 1_000_000L

  @Test
  fun `a stretch that just started is a fresh arrival, with when the user last left`() {
    val v = Visit.of(listOf(Interval(ig, 100_000, 900_000), Interval(ig, now - 1_000, now)), now)
    assertEquals(Visit.Arrival(fresh = true, leftAt = 900_000), v)
  }

  @Test
  fun `a long stretch means a screen change inside the same visit`() {
    assertEquals(false, Visit.of(listOf(Interval(ig, now - 60_000, now)), now).fresh)
  }

  @Test
  fun `history that hasn't caught up yet counts as an arrival`() {
    val v = Visit.of(listOf(Interval(ig, 100_000, 900_000)), now)
    assertEquals(Visit.Arrival(fresh = true, leftAt = 900_000), v)
  }

  @Test
  fun `a first visit has no time of leaving`() {
    assertNull(Visit.of(listOf(Interval(ig, now - 500, now)), now).leftAt)
  }

  @Test
  fun `finds the app in the foreground`() {
    val all = listOf(Interval(ig, 0, 500_000), Interval("com.whatsapp", now - 10_000, now))
    assertEquals("com.whatsapp", Visit.foreground(all, now))
    assertNull(Visit.foreground(listOf(Interval(ig, 0, 500_000)), now))
  }
}
