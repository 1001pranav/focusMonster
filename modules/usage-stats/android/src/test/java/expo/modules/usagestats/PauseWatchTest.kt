package expo.modules.usagestats

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class PauseWatchTest {
  private val bank = "com.sbi.lotusintouch"
  private val ig = "com.instagram.android"
  private val listed = setOf(bank)
  private val gated = setOf(ig)
  private val now = 1_000_000L

  private fun next(front: String?, lastListedAt: Long) = PauseWatch.next(front, now, lastListedAt, listed, gated)

  @Test
  fun `stays off while the bank is in front`() {
    assertEquals(now, next(bank, now - 600_000))
  }

  @Test
  fun `stays off for a moment after leaving, so the bank can be reopened`() {
    assertEquals(now - 10_000, next("com.android.launcher", now - 10_000))
  }

  @Test
  fun `turns back on once the user has been away long enough`() {
    assertNull(next("com.android.launcher", now - PauseWatch.GRACE_MS))
  }

  @Test
  fun `a gated app turns it back on at once`() {
    assertNull(next(ig, now - 1_000))
  }

  @Test
  fun `screen off or unknown keeps waiting without counting as the bank`() {
    assertEquals(now - 600_000, next(null, now - 600_000))
  }
}
