package com.zoya.assistant.tools

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.database.Cursor
import android.net.Uri
import android.provider.ContactsContract
import androidx.core.content.ContextCompat
import org.json.JSONObject
import java.net.URLEncoder

sealed class ToolResult {
    data class Success(val message: String, val intentTriggered: String) : ToolResult()
    data class PermissionDenied(val missingPermission: String, val sassyPrompt: String) : ToolResult()
    data class Error(val error: String) : ToolResult()
}

/**
 * Handles execution of Gemini Function Calling tools linked to native Android Intents.
 * Enforces runtime permission checks before firing Intents.
 */
class ToolExecutionEngine(private val context: Context) {

    fun openApp(packageName: String, appName: String? = null): ToolResult {
        return try {
            val launchIntent = context.packageManager.getLaunchIntentForPackage(packageName)
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(launchIntent)
                ToolResult.Success(
                    message = "Opened application successfully",
                    intentTriggered = "Launched $packageName ($appName)"
                )
            } else {
                // Fallback to Google Play Store if app not installed
                val playStoreIntent = Intent(
                    Intent.ACTION_VIEW,
                    Uri.parse("https://play.google.com/store/apps/details?id=$packageName")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(playStoreIntent)
                ToolResult.Success(
                    message = "App not installed locally, opened Play Store",
                    intentTriggered = "Play Store for $packageName"
                )
            }
        } catch (e: Exception) {
            ToolResult.Error("Failed to launch app: ${e.localizedMessage}")
        }
    }

    fun searchAndCallContact(contactName: String): ToolResult {
        // Permission check: READ_CONTACTS
        if (ContextCompat.checkSelfPermission(context, android.Manifest.permission.READ_CONTACTS)
            != PackageManager.PERMISSION_GRANTED) {
            return ToolResult.PermissionDenied(
                missingPermission = "READ_CONTACTS",
                sassyPrompt = "Sweetheart, I'd love to call $contactName for you, but you haven't given me Contacts permission yet! Turn it on so I can do my magic."
            )
        }

        // Permission check: CALL_PHONE
        if (ContextCompat.checkSelfPermission(context, android.Manifest.permission.CALL_PHONE)
            != PackageManager.PERMISSION_GRANTED) {
            return ToolResult.PermissionDenied(
                missingPermission = "CALL_PHONE",
                sassyPrompt = "Honey, you haven't granted me Phone Call permission! How am I supposed to dial without it? Toggle that switch!"
            )
        }

        var phoneNumber: String? = null
        var foundName: String? = null

        try {
            val uri = ContactsContract.CommonDataKinds.Phone.CONTENT_URI
            val projection = arrayOf(
                ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                ContactsContract.CommonDataKinds.Phone.NUMBER
            )
            val selection = "${ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME} LIKE ?"
            val selectionArgs = arrayOf("%$contactName%")

            val cursor: Cursor? = context.contentResolver.query(uri, projection, selection, selectionArgs, null)
            cursor?.use {
                if (it.moveToFirst()) {
                    val nameIndex = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
                    val numberIndex = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
                    foundName = it.getString(nameIndex)
                    phoneNumber = it.getString(numberIndex)
                }
            }
        } catch (e: Exception) {
            return ToolResult.Error("Failed to query Contacts provider: ${e.localizedMessage}")
        }

        if (phoneNumber == null) {
            return ToolResult.Error("No contact found matching '$contactName'")
        }

        return try {
            val callIntent = Intent(Intent.ACTION_CALL, Uri.parse("tel:$phoneNumber")).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(callIntent)
            ToolResult.Success(
                message = "Placed call to $foundName",
                intentTriggered = "ACTION_CALL to $phoneNumber"
            )
        } catch (e: Exception) {
            ToolResult.Error("Could not place phone call: ${e.localizedMessage}")
        }
    }

    fun sendWhatsAppMessage(contactName: String, message: String): ToolResult {
        // Query contact to get phone number if available
        var phoneNumber = ""
        if (ContextCompat.checkSelfPermission(context, android.Manifest.permission.READ_CONTACTS)
            == PackageManager.PERMISSION_GRANTED) {
            try {
                val uri = ContactsContract.CommonDataKinds.Phone.CONTENT_URI
                val selection = "${ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME} LIKE ?"
                val cursor = context.contentResolver.query(
                    uri,
                    arrayOf(ContactsContract.CommonDataKinds.Phone.NUMBER),
                    selection,
                    arrayOf("%$contactName%"),
                    null
                )
                cursor?.use {
                    if (it.moveToFirst()) {
                        val num = it.getString(0)
                        phoneNumber = num.replace("[^0-9+]".toRegex(), "")
                    }
                }
            } catch (e: Exception) {
                // non-fatal
            }
        }

        return try {
            val encodedMsg = URLEncoder.encode(message, "UTF-8")
            val targetUri = if (phoneNumber.isNotEmpty()) {
                Uri.parse("https://api.whatsapp.com/send?phone=$phoneNumber&text=$encodedMsg")
            } else {
                Uri.parse("https://api.whatsapp.com/send?text=$encodedMsg")
            }

            val whatsappIntent = Intent(Intent.ACTION_VIEW, targetUri).apply {
                setPackage("com.whatsapp")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            // Verify if WhatsApp is installed
            if (whatsappIntent.resolveActivity(context.packageManager) != null) {
                context.startActivity(whatsappIntent)
                ToolResult.Success(
                    message = "Launched WhatsApp with pre-filled message for $contactName",
                    intentTriggered = "com.whatsapp / UriIntent"
                )
            } else {
                // Fallback to browser or generic share
                val webIntent = Intent(Intent.ACTION_VIEW, targetUri).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(webIntent)
                ToolResult.Success(
                    message = "WhatsApp not installed, launched web chat link",
                    intentTriggered = "Web fallback for WhatsApp"
                )
            }
        } catch (e: Exception) {
            ToolResult.Error("Failed to trigger WhatsApp intent: ${e.localizedMessage}")
        }
    }

    fun sendGmail(recipientEmail: String, subject: String, body: String): ToolResult {
        return try {
            val emailIntent = Intent(Intent.ACTION_SENDTO).apply {
                data = Uri.parse("mailto:")
                putExtra(Intent.EXTRA_EMAIL, arrayOf(recipientEmail))
                putExtra(Intent.EXTRA_SUBJECT, subject)
                putExtra(Intent.EXTRA_TEXT, body)
                setPackage("com.google.android.gm")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            if (emailIntent.resolveActivity(context.packageManager) != null) {
                context.startActivity(emailIntent)
                ToolResult.Success(
                    message = "Opened Gmail with pre-filled email to $recipientEmail",
                    intentTriggered = "Gmail ACTION_SENDTO"
                )
            } else {
                // Fallback to generic email client chooser
                val genericIntent = Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:$recipientEmail")).apply {
                    putExtra(Intent.EXTRA_SUBJECT, subject)
                    putExtra(Intent.EXTRA_TEXT, body)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(genericIntent)
                ToolResult.Success(
                    message = "Opened default email client for $recipientEmail",
                    intentTriggered = "Generic ACTION_SENDTO"
                )
            }
        } catch (e: Exception) {
            ToolResult.Error("Failed to send email intent: ${e.localizedMessage}")
        }
    }
}
