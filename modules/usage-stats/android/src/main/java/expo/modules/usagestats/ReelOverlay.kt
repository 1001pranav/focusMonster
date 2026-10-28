package expo.modules.usagestats

import android.accessibilityservice.AccessibilityService
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.WindowManager
import android.widget.TextView

/**
 * The live counter shown over the Reels/Shorts player: a small pill at the top of the screen.
 * An accessibility overlay needs no "draw over other apps" permission, and with FLAG_NOT_TOUCHABLE
 * every tap goes straight through to the app underneath.
 */
class ReelOverlay(private val service: AccessibilityService) {
  private val windows = service.getSystemService(WindowManager::class.java)
  private var view: TextView? = null

  /** [feed]: "Reels" or "Shorts", so the count is never mistaken for the other app's. */
  fun show(feed: String, pill: OverlayText.Pill) {
    val label = view ?: create().also { view = it }
    label.text = "🎬 $feed ${pill.text}"
    (label.background as GradientDrawable).setColor(if (pill.warn) 0xE6C2410C.toInt() else 0xB3121110.toInt())
  }

  fun hide() {
    val label = view ?: return
    view = null
    runCatching { windows.removeView(label) }
  }

  private fun create(): TextView {
    val density = service.resources.displayMetrics.density
    val label = TextView(service).apply {
      textSize = 14f
      typeface = Typeface.DEFAULT_BOLD
      setTextColor(0xFFFFFFFF.toInt())
      setPadding((12 * density).toInt(), (6 * density).toInt(), (12 * density).toInt(), (6 * density).toInt())
      background = GradientDrawable().apply { cornerRadius = 20 * density }
    }
    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.WRAP_CONTENT,
      WindowManager.LayoutParams.WRAP_CONTENT,
      WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
      PixelFormat.TRANSLUCENT,
    ).apply {
      gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
      // Below the status bar, clear of the app's own top bar icons.
      y = (40 * density).toInt()
    }
    windows.addView(label, params)
    return label
  }
}
