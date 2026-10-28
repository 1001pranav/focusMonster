package expo.modules.usagestats

/**
 * One ReelTracker per short-video app. A single shared one let Shorts carry on from Instagram's
 * Reels count: the session, its count and the next break all leaked across apps.
 */
class ReelTrackers(private val make: () -> ReelTracker = { ReelTracker() }) {
  private val byApp = HashMap<String, ReelTracker>()

  fun of(pkg: String): ReelTracker = byApp.getOrPut(pkg, make)
}
