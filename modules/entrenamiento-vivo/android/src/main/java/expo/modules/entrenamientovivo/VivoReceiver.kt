package expo.modules.entrenamientovivo

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class VivoReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val accion = intent.action ?: return
    try {
      Vivo.alRecibir(context.applicationContext, accion)
    } catch (e: Exception) {
      Log.w("EntrenamientoVivo", "No se pudo atender $accion", e)
    }
  }
}
