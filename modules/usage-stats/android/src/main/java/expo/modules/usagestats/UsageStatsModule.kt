package expo.modules.usagestats

import android.app.AppOpsManager
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Process
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray
import org.json.JSONObject

/**
 * Foreground time per app, rebuilt from the raw usage events rather than UsageStatsManager's daily
 * buckets: the buckets are in UTC-ish windows and round sessions that cross midnight.
 */
class UsageStatsModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("UsageStats")

    Function("hasUsageAccess") { hasUsageAccess() }

    Function("openUsageAccessSettings") {
      val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      try {
        // Android 10+ can open this app's own entry; older phones only know the list.
        context.startActivity(Intent(intent).setData(Uri.fromParts("package", context.packageName, null)))
      } catch (e: ActivityNotFoundException) {
        context.startActivity(intent)
      }
    }

    AsyncFunction("foregroundTime") { startMs: Double, endMs: Double ->
      foregroundTime(startMs.toLong(), minOf(endMs.toLong(), System.currentTimeMillis()))
    }

    AsyncFunction("launcherApps") { launcherApps() }

    /** JSON array of 24 numbers: milliseconds of the given apps per local hour, over the range. */
    AsyncFunction("byHour") { startMs: Double, endMs: Double, packages: List<String> ->
      JSONArray(UsageReader.byHour(context, startMs.toLong(), minOf(endMs.toLong(), System.currentTimeMillis()), packages.toSet()).toList()).toString()
    }
  }

  private fun hasUsageAccess(): Boolean {
    val ops = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        @Suppress("DEPRECATION")
        ops.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
      } else {
        @Suppress("DEPRECATION")
        ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
      }
    if (mode == AppOpsManager.MODE_DEFAULT) {
      return context.checkCallingOrSelfPermission(android.Manifest.permission.PACKAGE_USAGE_STATS) == PackageManager.PERMISSION_GRANTED
    }
    return mode == AppOpsManager.MODE_ALLOWED
  }

  private fun foregroundTime(start: Long, end: Long): String {
    val out = JSONObject()
    UsageReader.foregroundMs(context, start, end).forEach { (pkg, ms) -> out.put(pkg, ms) }
    return out.toString()
  }

  private fun launcherApps(): String {
    val pm = context.packageManager
    val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
    val apps = pm.queryIntentActivities(intent, 0)
      .map { it.activityInfo.packageName to it.loadLabel(pm).toString() }
      .filter { (pkg, _) -> pkg != context.packageName }
      .distinctBy { it.first }
      .sortedBy { it.second.lowercase() }
    val out = JSONArray()
    apps.forEach { (pkg, label) -> out.put(JSONObject().put("packageName", pkg).put("label", label)) }
    return out.toString()
  }
}
