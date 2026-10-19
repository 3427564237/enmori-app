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

android {
    namespace = "com.enmori.app"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.enmori.app"
        manifestPlaceholders["enmoriApplicationLabel"] = "enmori"
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
            signingConfig = signingConfigs.getByName("debug")
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
