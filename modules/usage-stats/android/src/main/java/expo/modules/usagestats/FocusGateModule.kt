package expo.modules.usagestats

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** JS side of the mindful gate: setup checks, the config the gate reads, and its decision log. */
class FocusGateModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("FocusGate")

    Function("isServiceEnabled") {
      val enabled = Settings.Secure.getString(context.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: ""
      val me = ComponentName(context, FocusAccessibilityService::class.java)
      enabled.split(':').any { ComponentName.unflattenFromString(it) == me }
    }

    Function("openAccessibilitySettings") {
      context.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    // Android 13+ blocks accessibility for sideloaded apps until "Allow restricted settings" is
    // tapped in the ⋮ menu of the app's info screen.
    Function("openAppDetails") {
      context.startActivity(
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", context.packageName, null)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
      )
    }

    Function("configure") { json: String ->
      GateStore.saveConfig(context, json)
      // Measuring usage for the widget takes a moment: off the JS thread.
      val app = context.applicationContext
      Thread { runCatching { BudgetWidget.updateAll(app) } }.start()
    }

    Function("drainLog") { GateStore.drainLog(context) }

    /** Starts the background worker once; later calls keep the running schedule. */
    Function("scheduleBackground") { BudgetWorker.schedule(context) }

    /**
     * Turns the accessibility service off, for apps (mostly banks) that refuse to run while any is
     * on. Only the user can turn it back on, in Accessibility settings. False if it wasn't running.
     */
    Function("pauseService") {
      val service = FocusAccessibilityService.instance ?: return@Function false
      service.disableSelf()
      true
    }

    Function("detectionInfo") { Detection.read(context) }

    Function("shortVideoDays") { ShortVideoStore.read(context).toString() }
  }
}
