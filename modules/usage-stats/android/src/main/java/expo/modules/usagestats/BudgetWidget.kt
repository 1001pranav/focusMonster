package expo.modules.usagestats

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.widget.RemoteViews

/** Home-screen widget: wasted time left today, the target, and short videos watched. */
class BudgetWidget : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) = render(context, manager, ids)

  companion object {
    fun updateAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, BudgetWidget::class.java))
      if (ids.isNotEmpty()) render(context, manager, ids)
    }

    private fun render(context: Context, manager: AppWidgetManager, ids: IntArray) {
      val config = GateStore.config(context)
      val views = RemoteViews(context.packageName, R.layout.focus_widget)
      if (config.plan.day.isNotEmpty()) {
        val n = TodayNumbers.measure(context, config, System.currentTimeMillis())
        val left = n.targetMin - n.usedMin
        views.setTextViewText(R.id.focus_widget_main, if (left >= 0) "${Budget.minutes(left)} left" else "${Budget.minutes(-left)} over")
        views.setTextColor(R.id.focus_widget_main, if (left >= 0) 0xFFF2EFEA.toInt() else 0xFFFB923C.toInt())
        val videos = ShortVideoStore.read(context).optJSONObject(n.day)?.let { day -> day.keys().asSequence().sumOf { day.getJSONObject(it).optInt("count") } } ?: 0
        views.setTextViewText(R.id.focus_widget_sub, "of ${Budget.minutes(n.targetMin.toDouble())} · $videos short videos")
      }
      context.packageManager.getLaunchIntentForPackage(context.packageName)?.let {
        views.setOnClickPendingIntent(R.id.focus_widget_root, PendingIntent.getActivity(context, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
      }
      manager.updateAppWidget(ids, views)
    }
  }
}
