package expo.modules.usagestats

import android.Manifest
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.provider.Settings

/**
 * Whether the accessibility service is on, and turning it back on. Android lets an app turn its
 * own service off (disableSelf) but not on, unless it holds WRITE_SECURE_SETTINGS, which only adb
 * can grant: `adb shell pm grant com.focusmonster.app android.permission.WRITE_SECURE_SETTINGS`.
 */
object ServiceSwitch {
  private fun component(context: Context) = ComponentName(context, FocusAccessibilityService::class.java)

  fun canTurnOn(context: Context) = context.checkSelfPermission(Manifest.permission.WRITE_SECURE_SETTINGS) == PackageManager.PERMISSION_GRANTED

  fun isOn(context: Context) =
    contains(Settings.Secure.getString(context.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES), context.packageName, FocusAccessibilityService::class.java.name)

  /** False without the grant. Leaves every other enabled service as it was. */
  fun turnOn(context: Context): Boolean {
    if (!canTurnOn(context)) return false
    if (isOn(context)) return true
    return try {
      val resolver = context.contentResolver
      val list = Settings.Secure.getString(resolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES)
      Settings.Secure.putString(resolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES, added(list, component(context).flattenToString()))
      Settings.Secure.putInt(resolver, Settings.Secure.ACCESSIBILITY_ENABLED, 1)
      true
    } catch (e: SecurityException) {
      false
    }
  }

  /**
   * Accessibility settings with FocusMonster's row highlighted, on phones whose Settings honour the
   * highlight extras (Pixel and most others; the rest just open the list). The direct on/off screen
   * is closed to apps.
   */
  fun settingsIntent(context: Context): Intent {
    val key = component(context).flattenToString()
    return Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
      .putExtra(":settings:fragment_args_key", key)
      .putExtra(":settings:show_fragment_args", Bundle().apply { putString(":settings:fragment_args_key", key) })
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
  }

  /** [list] is Android's colon-separated setting; entries are "pkg/full.Class" or "pkg/.Class". */
  internal fun contains(list: String?, pkg: String, cls: String): Boolean {
    val short = if (cls.startsWith("$pkg.")) "$pkg/${cls.removePrefix(pkg)}" else null
    return list.orEmpty().split(':').any { it == "$pkg/$cls" || it == short }
  }

  internal fun added(list: String?, entry: String): String = if (list.isNullOrBlank()) entry else "$list:$entry"
}
