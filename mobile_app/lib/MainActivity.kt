package com.example.mobile_app

import android.os.Build
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File
import java.util.UUID

class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "communitycare/device")
            .setMethodCallHandler { call, result ->
                if (call.method != "getRegistrationInfo") {
                    result.notImplemented()
                } else {
                    try {
                        // Not a hardware identifier. Excluded from Android backup/restore.
                        val file = File(noBackupFilesDir, "communitycare_installation_id")
                        val existing = if (file.exists()) file.readText().trim() else null
                        val id = if (existing != null) UUID.fromString(existing).toString()
                                 else UUID.randomUUID().toString().also { file.writeText(it) }
                        result.success(mapOf(
                            "installation_id" to id,
                            "manufacturer" to Build.MANUFACTURER,
                            "model" to Build.MODEL,
                            "os_version" to Build.VERSION.RELEASE
                        ))
                    } catch (_: Exception) {
                        result.error("DEVICE_INFO_FAILED", "Could not read device registration information.", null)
                    }
                }
            }
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "communitycare/alerts")
            .setMethodCallHandler { call, result ->
                try {
                    val account = UUID.fromString(call.argument<String>("accountId")).toString()
                    val file = File(noBackupFilesDir, "pending_sos_${account}.txt")
                    when (call.method) {
                        "getPendingRequest" -> {
                            val key = if (file.exists()) UUID.fromString(file.readText().trim()).toString()
                                      else UUID.randomUUID().toString().also { file.writeText(it) }
                            result.success(key)
                        }
                        "clearPendingRequest" -> {
                            val expected = call.argument<String>("requestId")
                            if (file.exists() && file.readText().trim() == expected && !file.delete()) {
                                result.error("STORAGE_FAILED", "Could not clear confirmed request.", null)
                            } else { result.success(null) }
                        }
                        else -> result.notImplemented()
                    }
                } catch (_: Exception) {
                    result.error("STORAGE_FAILED", "Could not access pending SOS request.", null)
                }
            }
    }
}
