package expo.modules.entrenamientovivo

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Puente con JavaScript. La lógica vive en Vivo, para que los botones de la
// notificación funcionen aunque la app esté cerrada.
class EntrenamientoVivoModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("EntrenamientoVivo")

    // Avisa a JavaScript que hay acciones nuevas (tomarAcciones las entrega).
    Events("onAccion")

    OnCreate {
      Vivo.escucha = { sendEvent("onAccion", mapOf<String, Any?>()) }
    }

    OnDestroy {
      Vivo.escucha = null
    }

    Function("mostrar") { estado: String ->
      Vivo.mostrar(contexto(), estado)
    }

    Function("ocultar") {
      Vivo.ocultar(contexto())
    }

    Function("tomarAcciones") {
      Vivo.tomarAcciones(contexto())
    }
  }

  private fun contexto(): Context =
    appContext.reactContext?.applicationContext ?: throw IllegalStateException("La app todavía no tiene contexto.")
}
