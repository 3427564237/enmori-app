import java.util.Properties
import java.util.Base64

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// The isolated Persona harness opts in for its debug APK only. A separate
// application ID prevents Flutter's test installer from replacing the real app.
val personaAndroidTestFlag = providers.environmentVariable("ENMORI_PERSONA_ANDROID_TEST").orNull
check(personaAndroidTestFlag == null || personaAndroidTestFlag == "true") {
    "ENMORI_PERSONA_ANDROID_TEST must be absent or exactly true"
}
// HCI fixtures coexist with the original connected .personatest candidate.
val hciAndroidTestFlag = providers.environmentVariable("ENMORI_HCI_ANDROID_TEST").orNull
check(hciAndroidTestFlag == null || hciAndroidTestFlag == "true") {
    "ENMORI_HCI_ANDROID_TEST must be absent or exactly true"
}
val sponsorDemoFlag = providers.environmentVariable("ENMORI_SPONSOR_DEMO").orNull
check(sponsorDemoFlag == null || sponsorDemoFlag == "true") {
    "ENMORI_SPONSOR_DEMO must be absent or exactly true"
}
val coreAndroidTestFlag = providers.environmentVariable("ENMORI_CORE_ANDROID_TEST").orNull
check(coreAndroidTestFlag == null || coreAndroidTestFlag == "true")
check(listOf(personaAndroidTestFlag, hciAndroidTestFlag, sponsorDemoFlag, coreAndroidTestFlag).count { it != null } <= 1) {
    "Select only one isolated Android test package"
}

val groupRelease = providers.environmentVariable("ENMORI_GROUP_RELEASE").orNull == "true"

// Use the same explicitly supplied client configuration as Dart. Firebase's
// native provider needs these resources before Dart starts for a cold FCM tap.
// No google-services plugin, service-account material or ambient lookup.
val companionDefineKeys = setOf(
    "ENMORI_AI_COMPANION_FIRST_FLOW", "ENMORI_REMOTE_GROUP",
    "ENMORI_FIREBASE_API_KEY", "ENMORI_FIREBASE_APP_ID",
    "ENMORI_FIREBASE_MESSAGING_SENDER_ID", "ENMORI_FIREBASE_PROJECT_ID",
)
val companionDefines = mutableMapOf<String, String>()
(project.findProperty("dart-defines")?.toString() ?: "").split(',')
    .filter { it.isNotEmpty() }.forEach { encoded ->
        val decoded = try { String(Base64.getDecoder().decode(encoded), Charsets.UTF_8) }
            catch (_: IllegalArgumentException) { error("Invalid Dart define encoding") }
        val separator = decoded.indexOf('=')
        if (separator > 0) {
            val key = decoded.substring(0, separator)
            if (key in companionDefineKeys) {
                check(!companionDefines.containsKey(key)) { "Duplicate companion build define" }
                companionDefines[key] = decoded.substring(separator + 1)
            }
        }
    }
val companionNative = companionDefines["ENMORI_AI_COMPANION_FIRST_FLOW"] == "true"
// Group updates must preserve the approved companion entries. Missing defines
// previously produced a valid APK with these existing features silently absent.
check(!groupRelease || companionNative) {
    "Group release requires ENMORI_AI_COMPANION_FIRST_FLOW=true; companion entries must not silently disappear"
}
check(companionDefines["ENMORI_AI_COMPANION_FIRST_FLOW"] in setOf(null, "true", "false")) {
    "Invalid companion build selection"
}
val companionResources = if (companionNative) {
    check(companionDefines["ENMORI_REMOTE_GROUP"] == "true") { "Native companion requires the selected group configuration" }
    val apiKey = companionDefines["ENMORI_FIREBASE_API_KEY"] ?: error("Missing Firebase client configuration")
    val appId = companionDefines["ENMORI_FIREBASE_APP_ID"] ?: error("Missing Firebase client configuration")
    val senderId = companionDefines["ENMORI_FIREBASE_MESSAGING_SENDER_ID"] ?: error("Missing Firebase client configuration")
    val projectId = companionDefines["ENMORI_FIREBASE_PROJECT_ID"] ?: error("Missing Firebase client configuration")
    check(Regex("[A-Za-z0-9_-]{20,256}").matches(apiKey) &&
        Regex("1:[0-9]+:android:[a-fA-F0-9]+").matches(appId) &&
        Regex("[0-9]+").matches(senderId) && appId.split(':')[1] == senderId &&
        projectId == "enmori-rmvp-controlled") { "Invalid Firebase client configuration" }
    mapOf("google_api_key" to apiKey, "google_app_id" to appId,
        "gcm_defaultSenderId" to senderId, "project_id" to projectId)
} else emptyMap()

val groupSigning = Properties()
if (groupRelease) {
    check(listOf(personaAndroidTestFlag, hciAndroidTestFlag, sponsorDemoFlag, coreAndroidTestFlag).all { it == null })
    val path = providers.environmentVariable("ENMORI_RELEASE_KEY_PROPERTIES").orNull
    check(path != null) { "Private release signing properties required" }
    file(path).inputStream().use { groupSigning.load(it) }
}

android {
    namespace = "com.enmori.app"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    buildFeatures {
        resValues = companionNative
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.enmori.app"
        manifestPlaceholders["enmoriApplicationLabel"] = "enmori"
        companionResources.forEach { (name, value) -> resValue("string", name, value) }
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        // Uses the version code from pubspec.yaml. When using split APKs, 1000 * ABI_VERSION
        // is added automatically by Flutter. (https://developer.android.com/studio/build/configure-apk-splits#configure-APK-versions)
        // You can force using the value of versionCode by specifying the `-P force-version-code-ignoring-abi=true`
        // flag during build.
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (groupRelease) create("groupRelease") {
            storeFile = file(groupSigning.getProperty("storeFile"))
            storePassword = groupSigning.getProperty("storePassword")
            keyAlias = groupSigning.getProperty("keyAlias")
            keyPassword = groupSigning.getProperty("keyPassword")
        }
    }
    buildTypes {
        getByName("debug") {
            if (personaAndroidTestFlag == "true") {
                applicationIdSuffix = ".personatest"
            }
            if (coreAndroidTestFlag == "true") {
                applicationIdSuffix = ".coretest"
                manifestPlaceholders["enmoriApplicationLabel"] = "ENMORI Core verification"
            }
            if (sponsorDemoFlag == "true") {
                applicationIdSuffix = ".sponsordemo"
                manifestPlaceholders["enmoriApplicationLabel"] = "ENMORI Sponsor demo"
            }
            if (hciAndroidTestFlag == "true") {
                applicationIdSuffix = ".hcitest"
                manifestPlaceholders["enmoriApplicationLabel"] = "ENMORI HCI (offline)"
            }
        }
        release {
            // TODO: Add your own signing config for the release build.
            // Signing with the debug keys for now, so `flutter run --release` works.
            if (groupRelease) {
                applicationIdSuffix = ".group"
                manifestPlaceholders["enmoriApplicationLabel"] = "ENMORI"
                signingConfig = signingConfigs.getByName("groupRelease")
            } else signingConfig = signingConfigs.getByName("debug")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
