import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
    let preferences = FlutterMethodChannel(
      name: "com.enmori.app/preferences",
      binaryMessenger: engineBridge.applicationRegistrar.messenger()
    )
    preferences.setMethodCallHandler { call, result in
      let defaults = UserDefaults.standard
      switch call.method {
      case "readLanguage":
        result(defaults.string(forKey: "enmori.appLanguage"))
      case "writeLanguage":
        guard let arguments = call.arguments as? [String: Any],
              let language = arguments["language"] as? String,
              language == "en" || language == "zh" else {
          result(FlutterError(code: "LANGUAGE_INVALID", message: "Unsupported interface language.", details: nil))
          return
        }
        defaults.set(language, forKey: "enmori.appLanguage")
        result(defaults.string(forKey: "enmori.appLanguage") == language)
      default:
        result(FlutterMethodNotImplemented)
      }
    }
  }
}
