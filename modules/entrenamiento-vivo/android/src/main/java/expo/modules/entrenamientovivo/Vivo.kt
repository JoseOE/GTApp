package expo.modules.entrenamientovivo

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.Icon
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import org.json.JSONArray
import org.json.JSONObject
import java.math.BigDecimal

// Notificación fija mientras el usuario entrena: el cronómetro corriendo (o la
// cuenta regresiva del descanso), el ejercicio y la serie que siguen, y botones
// para registrar la serie y ajustar el peso sin abrir la app.
//
// JavaScript manda el estado completo (mostrar) con la lista de series
// pendientes. Los botones avanzan por esa lista aquí mismo, aunque la app esté
// cerrada, y anotan lo que se hizo; JavaScript lo recoge después (tomarAcciones).
object Vivo {
  private const val CANAL_VIVO = "gymtrack-entrenamiento"
  private const val CANAL_DESCANSO = "gymtrack-descanso"
  private const val ID_VIVO = 7101
  private const val ID_DESCANSO = 7102
  private const val PREFS = "gymtrack_entrenamiento_vivo"

  const val ACCION_HECHA = "expo.modules.entrenamientovivo.HECHA"
  const val ACCION_MAS = "expo.modules.entrenamientovivo.MAS"
  const val ACCION_MENOS = "expo.modules.entrenamientovivo.MENOS"
  const val ACCION_FIN_DESCANSO = "expo.modules.entrenamientovivo.FIN_DESCANSO"

  // La pone el módulo mientras JavaScript está vivo.
  @Volatile
  var escucha: (() -> Unit)? = null

  private val handler = Handler(Looper.getMainLooper())
  private var tareaDescanso: Runnable? = null

  private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun mostrar(ctx: Context, estadoJson: String) {
    val estado = JSONObject(estadoJson)
    prefs(ctx).edit().putString("estado", estado.toString()).putInt("indice", 0).commit()
    pintar(ctx, estado, 0)
    programarDescanso(ctx, estado.optLong("descansoHasta", 0L))
  }

  fun ocultar(ctx: Context) {
    prefs(ctx).edit().remove("estado").remove("indice").remove("descansoProgramado").commit()
    cancelarDescanso(ctx)
    val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    nm.cancel(ID_VIVO)
    nm.cancel(ID_DESCANSO)
  }

  fun tomarAcciones(ctx: Context): String {
    val p = prefs(ctx)
    val acciones = p.getString("acciones", "[]") ?: "[]"
    p.edit().remove("acciones").commit()
    return acciones
  }

  private fun anotar(ctx: Context, accion: JSONObject) {
    val p = prefs(ctx)
    val lista = JSONArray(p.getString("acciones", "[]") ?: "[]")
    lista.put(accion)
    p.edit().putString("acciones", lista.toString()).commit()
  }

  fun alRecibir(ctx: Context, accion: String) {
    val p = prefs(ctx)
    val guardado = p.getString("estado", null) ?: return
    val estado = JSONObject(guardado)
    var indice = p.getInt("indice", 0)

    if (accion == ACCION_FIN_DESCANSO) {
      val programado = p.getLong("descansoProgramado", 0L)
      if (programado != 0L && System.currentTimeMillis() >= programado - 2000L) finDescanso(ctx, programado)
      return
    }

    val pendientes = estado.optJSONArray("pendientes") ?: JSONArray()
    if (indice >= pendientes.length()) return
    val actual = pendientes.getJSONObject(indice)

    when (accion) {
      ACCION_HECHA -> {
        val ahora = System.currentTimeMillis()
        anotar(
          ctx,
          JSONObject()
            .put("tipo", "hecha")
            .put("e", actual.getInt("e"))
            .put("s", actual.getInt("s"))
            .put("reps", if (actual.isNull("reps")) JSONObject.NULL else actual.getInt("reps"))
            .put("peso", if (actual.isNull("peso")) JSONObject.NULL else actual.getDouble("peso"))
            .put("seg", if (actual.isNull("seg")) JSONObject.NULL else actual.getInt("seg"))
            .put("t", ahora)
        )
        indice += 1
        // La siguiente serie del mismo ejercicio hereda el peso y las reps.
        if (indice < pendientes.length()) {
          val siguiente = pendientes.getJSONObject(indice)
          if (siguiente.getInt("e") == actual.getInt("e")) {
            if (siguiente.isNull("peso") && !actual.isNull("peso")) siguiente.put("peso", actual.getDouble("peso"))
            if (siguiente.isNull("reps") && !actual.isNull("reps")) siguiente.put("reps", actual.getInt("reps"))
            if (siguiente.isNull("seg") && !actual.isNull("seg")) siguiente.put("seg", actual.getInt("seg"))
          }
        }
        val descanso = actual.optInt("descanso", 0)
        val hasta = if (descanso > 0 && indice < pendientes.length()) ahora + descanso * 1000L else 0L
        estado.put("descansoHasta", hasta)
        p.edit().putString("estado", estado.toString()).putInt("indice", indice).commit()
        programarDescanso(ctx, hasta)
      }
      ACCION_MAS, ACCION_MENOS -> {
        val paso = estado.optDouble("paso", 2.5)
        val antes = if (actual.isNull("peso")) 0.0 else actual.getDouble("peso")
        val cambio = if (accion == ACCION_MAS) paso else -paso
        val nuevo = Math.max(0.0, antes + cambio)
        actual.put("peso", nuevo)
        anotar(
          ctx,
          JSONObject()
            .put("tipo", "peso")
            .put("e", actual.getInt("e"))
            .put("s", actual.getInt("s"))
            .put("peso", nuevo)
        )
        p.edit().putString("estado", estado.toString()).commit()
      }
      else -> return
    }
    pintar(ctx, estado, indice)
    escucha?.invoke()
  }

  private fun finDescanso(ctx: Context, hasta: Long) {
    val p = prefs(ctx)
    // Si el descanso cambió o ya se avisó, no se repite.
    if (p.getLong("descansoProgramado", 0L) != hasta) return
    p.edit().remove("descansoProgramado").commit()
    val estado = JSONObject(p.getString("estado", null) ?: return)
    val indice = p.getInt("indice", 0)
    avisarFinDescanso(ctx, estado, indice)
    pintar(ctx, estado, indice)
  }

  // ─── Notificaciones ───

  private fun builder(ctx: Context, canal: String): Notification.Builder =
    if (Build.VERSION.SDK_INT >= 26) Notification.Builder(ctx, canal)
    else @Suppress("DEPRECATION") Notification.Builder(ctx)

  private fun pintar(ctx: Context, estado: JSONObject, indice: Int) {
    asegurarCanales(ctx)
    val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val pendientes = estado.optJSONArray("pendientes") ?: JSONArray()
    val ahora = System.currentTimeMillis()
    val hasta = estado.optLong("descansoHasta", 0L)
    val inicio = estado.optLong("inicio", ahora)
    val enDescanso = hasta > ahora
    val titulo = estado.optString("titulo", "Entrenamiento")

    val b = builder(ctx, CANAL_VIVO)
      .setSmallIcon(icono(ctx))
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setShowWhen(true)
      .setUsesChronometer(true)
      .setCategory("workout")
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setContentIntent(abrirApp(ctx))
      .setSubText(titulo)
    color(estado)?.let { b.setColor(it) }
    if (Build.VERSION.SDK_INT < 26) {
      @Suppress("DEPRECATION")
      b.setPriority(Notification.PRIORITY_LOW)
    }
    // En descanso, el cronómetro cuenta hacia atrás hasta que se acaba; si no,
    // cuenta el tiempo entrenado desde el inicio.
    if (enDescanso) {
      b.setWhen(hasta)
      if (Build.VERSION.SDK_INT >= 24) b.setChronometerCountDown(true)
    } else {
      b.setWhen(inicio)
      if (Build.VERSION.SDK_INT >= 24) b.setChronometerCountDown(false)
    }

    if (indice < pendientes.length()) {
      val serie = pendientes.getJSONObject(indice)
      val nombre = serie.optString("nombre", "Ejercicio")
      b.setContentTitle(if (enDescanso) "Descanso · sigue $nombre" else nombre)
      b.setContentText(detalle(serie))
      // Las series por tiempo (plancha, cardio) no llevan botones de peso.
      if (serie.isNull("seg")) {
        val paso = estado.optDouble("paso", 2.5)
        b.addAction(accion(ctx, ACCION_MENOS, "−${kg(paso)}", 1))
        b.addAction(accion(ctx, ACCION_MAS, "+${kg(paso)}", 2))
      }
      b.addAction(accion(ctx, ACCION_HECHA, "✓ Serie hecha", 3))
    } else {
      b.setContentTitle("¡Terminaste todas las series!")
      b.setContentText("Abre GymTrack para guardar y ver tu resumen.")
    }
    nm.notify(ID_VIVO, b.build())
  }

  private fun avisarFinDescanso(ctx: Context, estado: JSONObject, indice: Int) {
    asegurarCanales(ctx)
    val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val pendientes = estado.optJSONArray("pendientes") ?: JSONArray()
    val texto = if (indice < pendientes.length()) {
      val serie = pendientes.getJSONObject(indice)
      "Sigue: ${serie.optString("nombre", "Ejercicio")} · ${detalle(serie)}"
    } else {
      "Abre GymTrack para ver tu resumen."
    }
    val b = builder(ctx, CANAL_DESCANSO)
      .setSmallIcon(icono(ctx))
      .setContentTitle("¡Se acabó el descanso!")
      .setContentText(texto)
      .setAutoCancel(true)
      .setCategory(Notification.CATEGORY_ALARM)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setContentIntent(abrirApp(ctx))
    color(estado)?.let { b.setColor(it) }
    if (Build.VERSION.SDK_INT >= 26) {
      b.setTimeoutAfter(60_000L)
    } else {
      @Suppress("DEPRECATION")
      b.setPriority(Notification.PRIORITY_HIGH)
      @Suppress("DEPRECATION")
      b.setDefaults(Notification.DEFAULT_ALL)
    }
    nm.notify(ID_DESCANSO, b.build())
  }

  // "Serie 2 de 4 · 60 kg × 10"
  private fun detalle(serie: JSONObject): String {
    val partes = mutableListOf(serie.optString("serie", ""))
    val peso = if (serie.isNull("peso")) null else serie.getDouble("peso")
    val reps = if (serie.isNull("reps")) null else serie.getInt("reps")
    val seg = if (serie.isNull("seg")) null else serie.getInt("seg")
    if (seg != null) {
      if (peso != null && peso > 0) partes.add(kg(peso))
      partes.add(if (seg < 60) "$seg s" else if (seg % 60 == 0) "${seg / 60} min" else "${seg / 60}:${String.format("%02d", seg % 60)} min")
      return partes.filter { it.isNotBlank() }.joinToString(" · ")
    }
    when {
      peso != null && peso > 0 && reps != null -> partes.add("${kg(peso)} × $reps")
      peso != null && peso > 0 -> partes.add(kg(peso))
      reps != null -> partes.add("$reps reps")
    }
    return partes.filter { it.isNotBlank() }.joinToString(" · ")
  }

  private fun kg(valor: Double): String =
    BigDecimal.valueOf(valor).stripTrailingZeros().toPlainString() + " kg"

  private fun color(estado: JSONObject): Int? {
    val hex = estado.optString("color", "")
    if (hex.isBlank()) return null
    return try {
      Color.parseColor(hex)
    } catch (e: IllegalArgumentException) {
      null
    }
  }

  private fun icono(ctx: Context): Int {
    // El ícono que genera expo-notifications; si no está, el de la app.
    val id = ctx.resources.getIdentifier("notification_icon", "drawable", ctx.packageName)
    return if (id != 0) id else ctx.applicationInfo.icon
  }

  private fun pendiente(ctx: Context, accion: String, codigo: Int): PendingIntent {
    val intent = Intent(ctx, VivoReceiver::class.java).setAction(accion).setPackage(ctx.packageName)
    return PendingIntent.getBroadcast(
      ctx,
      codigo,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  private fun accion(ctx: Context, accion: String, titulo: String, codigo: Int): Notification.Action =
    Notification.Action.Builder(Icon.createWithResource(ctx, icono(ctx)), titulo, pendiente(ctx, accion, codigo)).build()

  private fun abrirApp(ctx: Context): PendingIntent {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("gymtrack://entrenando"))
      .setPackage(ctx.packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    return PendingIntent.getActivity(
      ctx,
      10,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  private fun asegurarCanales(ctx: Context) {
    if (Build.VERSION.SDK_INT < 26) return
    val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (nm.getNotificationChannel(CANAL_VIVO) == null) {
      val canal = NotificationChannel(CANAL_VIVO, "Entrenamiento en curso", NotificationManager.IMPORTANCE_LOW)
      canal.description = "El cronómetro y la serie que sigue mientras entrenas."
      canal.setShowBadge(false)
      nm.createNotificationChannel(canal)
    }
    if (nm.getNotificationChannel(CANAL_DESCANSO) == null) {
      val canal = NotificationChannel(CANAL_DESCANSO, "Fin del descanso", NotificationManager.IMPORTANCE_HIGH)
      canal.description = "Te avisa cuando se acaba el descanso entre series."
      canal.enableVibration(true)
      canal.vibrationPattern = longArrayOf(0, 300, 150, 300)
      nm.createNotificationChannel(canal)
    }
  }

  // ─── Fin del descanso ───
  // Dos caminos, porque ninguno basta solo: el temporizador es exacto mientras
  // la app sigue viva, y la alarma despierta al teléfono si Android la cerró.

  private fun programarDescanso(ctx: Context, hasta: Long) {
    cancelarDescanso(ctx)
    val ahora = System.currentTimeMillis()
    if (hasta <= ahora) {
      prefs(ctx).edit().remove("descansoProgramado").commit()
      return
    }
    prefs(ctx).edit().putLong("descansoProgramado", hasta).commit()
    val app = ctx.applicationContext
    val tarea = Runnable { finDescanso(app, hasta) }
    tareaDescanso = tarea
    handler.postDelayed(tarea, hasta - ahora)

    val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val pi = pendiente(ctx, ACCION_FIN_DESCANSO, 4)
    try {
      if (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) {
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, hasta, pi)
      } else {
        am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, hasta, pi)
      }
    } catch (e: SecurityException) {
      am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, hasta, pi)
    }
  }

  private fun cancelarDescanso(ctx: Context) {
    tareaDescanso?.let { handler.removeCallbacks(it) }
    tareaDescanso = null
    val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    am.cancel(pendiente(ctx, ACCION_FIN_DESCANSO, 4))
  }
}
