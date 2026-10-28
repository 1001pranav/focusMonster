package expo.modules.usagestats

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class QuietHoursTest {
  private val night = QuietHours(true, 23 * 60, 7 * 60, 30)

  @Test
  fun `covers the night and the phone-free morning`() {
    assertTrue(night.active(23 * 60 + 30))
    assertTrue(night.active(3 * 60))
    assertTrue(night.active(7 * 60 + 15))
    assertFalse(night.active(7 * 60 + 30))
    assertFalse(night.active(22 * 60 + 59))
  }

  @Test
  fun `off when disabled`() {
    assertFalse(night.copy(enabled = false).active(3 * 60))
  }

  @Test
  fun `says when apps open`() {
    assertEquals("07:30", night.opensAt())
  }
}
