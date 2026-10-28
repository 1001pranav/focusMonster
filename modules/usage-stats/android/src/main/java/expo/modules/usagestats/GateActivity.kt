package expo.modules.usagestats

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.os.CountDownTimer
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.window.OnBackInvokedDispatcher
import org.json.JSONObject

/**
 * The mindful gate: a pause before a wasted-time app, asking why it's being opened. "Close" goes
 * home; "Continue" unlocks once a reason is picked and the wait is over. The wait grows as the
 * day's budget runs out (GateRules.waitSeconds). Every decision is logged for the app's insights.
 */
class GateActivity : Activity() {
  companion object {
    const val EXTRA_PACKAGE = "package"
    const val EXTRA_MODE = "mode"
    const val EXTRA_REELS = "reels"
    const val EXTRA_SINCE = "since"
    /** Opening a wasted app, or a break in the middle of Reels/Shorts. */
    const val MODE_OPEN = "open"
    const val MODE_BREAK = "break"

    /** Stored keys; the JS side (src/domain/gate.ts) has the matching labels. */
    private val REASONS = listOf(
      "bored" to "Bored",
      "avoiding" to "Avoiding something",
      "tired" to "Tired",
      "lonely" to "Lonely",
      "habit" to "Just habit",
      "specific" to "Something specific",
    )

    private const val BG = 0xFF121110.toInt()
    private const val SURFACE = 0xFF272522.toInt()
    private const val TEXT = 0xFFF2EFEA.toInt()
    private const val MUTED = 0xFFA8A298.toInt()
    private const val PRIMARY = 0xFF8DA2FB.toInt()
    private const val PRIMARY_TEXT = 0xFF0E1330.toInt()
    private const val OVER = 0xFFFB923C.toInt()
  }

  private lateinit var pkg: String
  private var mode = MODE_OPEN
  private var reason: String? = null
  private var waitLeft = 0
  private var waitTotal = 0
  private var decided = false
  private var timer: CountDownTimer? = null
  private lateinit var continueButton: Button
  private val chips = mutableListOf<Pair<String, TextView>>()

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    pkg = intent.getStringExtra(EXTRA_PACKAGE) ?: return finish()
    mode = intent.getStringExtra(EXTRA_MODE) ?: MODE_OPEN
    val config = GateStore.config(this)
    val usedMin = wastedMinutesToday(config)
    val ratio = if (config.targetMin > 0) usedMin / config.targetMin else 0.0
    // A break mid-scroll is never shorter than 10 s: it has to outlast the urge to swipe.
    waitTotal = GateRules.waitSeconds(ratio).let { if (mode == MODE_BREAK) maxOf(10, it) else it }
    waitLeft = waitTotal
    setContentView(layout(config, usedMin, ratio))
    if (Build.VERSION.SDK_INT >= 33) {
      onBackInvokedDispatcher.registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT) { close() }
    }
    startTimer()
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    // Another wasted app was opened while the gate was up: start over for that one.
    if (intent.getStringExtra(EXTRA_PACKAGE) != pkg || intent.getStringExtra(EXTRA_MODE) != mode) {
      setIntent(intent)
      recreate()
    }
  }

  @Deprecated("Back before Android 13")
  @Suppress("DEPRECATION")
  override fun onBackPressed() = close()

  override fun onDestroy() {
    timer?.cancel()
    // Left without choosing, e.g. with the home button.
    if (!decided && ::pkg.isInitialized) log("left")
    super.onDestroy()
  }

  private fun wastedMinutesToday(config: GateConfig): Double =
    runCatching {
      UsageReader.foregroundMs(this, UsageReader.startOfToday(), System.currentTimeMillis())
        .filterKeys { it in config.wasted }
        .values.sum() / 60000.0
    }.getOrDefault(0.0)

  private fun appLabel(): String =
    runCatching { packageManager.getApplicationLabel(packageManager.getApplicationInfo(pkg, 0)).toString() }.getOrDefault(pkg)

  private fun layout(config: GateConfig, usedMin: Double, ratio: Double): View {
    val column = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(dp(24), dp(56), dp(24), dp(32))
    }
    val label = appLabel()
    if (mode == MODE_BREAK) {
      val reels = intent.getIntExtra(EXTRA_REELS, 0)
      val since = intent.getLongExtra(EXTRA_SINCE, System.currentTimeMillis())
      val kind = if (pkg.contains("youtube")) "Shorts" else "reels"
      column.addView(text("$reels $kind in a row", 26f, TEXT, bold = true))
      column.addView(space(8))
      column.addView(text("That's ${minutes((System.currentTimeMillis() - since) / 60000.0)} of swiping. Why keep going?", 17f, MUTED))
    } else {
      column.addView(text("Opening $label", 26f, TEXT, bold = true))
      column.addView(space(8))
      column.addView(text("Why are you opening it?", 17f, MUTED))
    }
    column.addView(space(16))
    column.addView(reasonChips())

    if (config.targetMin > 0) {
      column.addView(space(24))
      val over = ratio >= 1
      column.addView(
        text(
          if (over) "You're ${minutes(usedMin - config.targetMin)} over today's target."
          else "${minutes(usedMin)} of today's ${minutes(config.targetMin.toDouble())} used.",
          15f,
          if (over) OVER else TEXT,
        ),
      )
    }
    config.why?.let {
      column.addView(space(24))
      column.addView(text("WHY YOU STARTED", 12f, MUTED, bold = true))
      column.addView(text("“$it”", 17f, TEXT, bold = true))
    }
    config.nextTask?.let {
      column.addView(space(24))
      column.addView(text("YOUR NEXT TASK", 12f, MUTED, bold = true))
      column.addView(text(it, 17f, TEXT))
    }

    column.addView(space(32))
    column.addView(button("Close $label", PRIMARY, PRIMARY_TEXT) { close() })
    column.addView(space(12))
    continueButton = button("", SURFACE, TEXT) { proceed() }
    column.addView(continueButton)
    updateContinue()

    return ScrollView(this).apply {
      setBackgroundColor(BG)
      addView(column)
    }
  }

  private fun reasonChips(): View {
    val grid = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
    REASONS.chunked(2).forEach { row ->
      val line = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
      row.forEach { (key, title) ->
        val chip = text(title, 15f, TEXT).apply {
          gravity = Gravity.CENTER
          minHeight = dp(48)
          background = rounded(SURFACE)
          setOnClickListener {
            reason = key
            chips.forEach { (k, v) ->
              v.background = rounded(if (k == key) PRIMARY else SURFACE)
              v.setTextColor(if (k == key) PRIMARY_TEXT else TEXT)
            }
            updateContinue()
          }
        }
        chips.add(key to chip)
        line.addView(chip, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply { setMargins(dp(4), dp(4), dp(4), dp(4)) })
      }
      grid.addView(line)
    }
    return grid
  }

  private fun startTimer() {
    timer = object : CountDownTimer(waitTotal * 1000L, 1000L) {
      override fun onTick(msLeft: Long) {
        waitLeft = ((msLeft + 999) / 1000).toInt()
        updateContinue()
      }

      override fun onFinish() {
        waitLeft = 0
        updateContinue()
      }
    }.start()
  }

  private fun updateContinue() {
    if (!::continueButton.isInitialized) return
    val ready = waitLeft == 0 && reason != null
    continueButton.isEnabled = ready
    continueButton.alpha = if (ready) 1f else 0.5f
    continueButton.text = when {
      waitLeft > 0 -> "Continue in ${waitLeft}s"
      reason == null -> "Pick a reason to continue"
      else -> "Continue to ${appLabel()}"
    }
  }

  private fun close() {
    decided = true
    log("closed")
    startActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    finish()
  }

  private fun proceed() {
    decided = true
    log("continued")
    Gate.rules.allow(pkg, System.currentTimeMillis())
    finish()
  }

  private fun log(choice: String) {
    GateStore.appendLog(
      this,
      JSONObject()
        .put("at", System.currentTimeMillis())
        .put("package", pkg)
        .put("reason", reason ?: JSONObject.NULL)
        .put("choice", choice)
        .put("waitSec", waitTotal)
        .put("kind", mode),
    )
  }

  private fun minutes(min: Double): String {
    val m = Math.round(min).toInt().coerceAtLeast(0)
    return if (m < 60) "${m}m" else "${m / 60}h ${"%02d".format(m % 60)}m"
  }

  private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

  private fun space(h: Int) = View(this).apply { minimumHeight = dp(h) }

  private fun rounded(color: Int) = GradientDrawable().apply {
    setColor(color)
    cornerRadius = dp(12).toFloat()
  }

  private fun text(value: String, size: Float, color: Int, bold: Boolean = false) = TextView(this).apply {
    text = value
    textSize = size
    setTextColor(color)
    if (bold) typeface = Typeface.DEFAULT_BOLD
    setLineSpacing(0f, 1.15f)
  }

  private fun button(title: String, bg: Int, fg: Int, onClick: () -> Unit) = Button(this).apply {
    text = title
    isAllCaps = false
    textSize = 16f
    setTextColor(fg)
    background = rounded(bg)
    minHeight = dp(52)
    stateListAnimator = null
    setOnClickListener { onClick() }
  }
}
