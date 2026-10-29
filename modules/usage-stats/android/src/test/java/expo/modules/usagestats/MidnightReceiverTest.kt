package expo.modules.usagestats

import org.junit.Assert.assertEquals
import org.junit.Test
import java.util.Calendar

class MidnightReceiverTest {
  private fun at(year: Int, month: Int, day: Int, hour: Int, minute: Int): Long =
    Calendar.getInstance().apply {
      clear()
      set(year, month - 1, day, hour, minute)
    }.timeInMillis

  @Test
  fun `runs a minute past the coming midnight`() {
    assertEquals(at(2026, 11, 3, 0, 1), MidnightReceiver.nextRun(at(2026, 11, 2, 23, 59)))
    assertEquals(at(2026, 11, 3, 0, 1), MidnightReceiver.nextRun(at(2026, 11, 2, 8, 0)))
  }

  @Test
  fun `crosses month and year ends`() {
    assertEquals(at(2027, 1, 1, 0, 1), MidnightReceiver.nextRun(at(2026, 12, 31, 22, 0)))
  }
}
