package expo.modules.usagestats

/**
 * Whether a scroll came from the short-video player. The view that scrolls is often an unnamed
 * child of the player (ViewPager2 generates its inner list's id), so the scrolled view and a few
 * of its ancestors are checked. Only a few: further up, every view in the app is "inside" something.
 */
object PlayerMatch {
  const val MAX_DEPTH = 4

  /** [chain]: resource ids from the scrolled view upward, null for views without one. */
  fun inPlayer(chain: List<String?>, playerIds: List<String>): Boolean =
    chain.take(MAX_DEPTH).any { id -> id != null && id.substringAfter(":id/") in playerIds }
}
