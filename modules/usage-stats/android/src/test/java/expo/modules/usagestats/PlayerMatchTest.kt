package expo.modules.usagestats

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PlayerMatchTest {
  private val ids = listOf("clips_viewer_view_pager")

  @Test
  fun `matches the player itself`() {
    assertTrue(PlayerMatch.inPlayer(listOf("com.instagram.android:id/clips_viewer_view_pager"), ids))
  }

  @Test
  fun `matches the unnamed list inside ViewPager2`() {
    assertTrue(PlayerMatch.inPlayer(listOf(null, "com.instagram.android:id/clips_viewer_view_pager"), ids))
  }

  @Test
  fun `ignores other scrolling lists`() {
    assertFalse(PlayerMatch.inPlayer(listOf("com.instagram.android:id/comments_list", null, "com.instagram.android:id/root"), ids))
  }

  @Test
  fun `stops looking a few levels up`() {
    assertFalse(PlayerMatch.inPlayer(listOf(null, null, null, null, "com.instagram.android:id/clips_viewer_view_pager"), ids))
  }
}
