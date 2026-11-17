import Capacitor
import LocalAuthentication
import UIKit

/// Face ID (or Touch ID / passcode) for the app lock in Settings
/// (frontend/src/native/biometricLock.js). While the lock is on it also
/// covers the screen whenever the app leaves the foreground, so the app
/// switcher never shows your data.
@objc(BiometricLockPlugin)
public class BiometricLockPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BiometricLockPlugin"
    public let jsName = "BiometricLock"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "biometryType", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "unlock", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setPrivacyCover", returnType: CAPPluginReturnPromise),
    ]

    private var coverEnabled = false
    private var cover: UIView?

    override public func load() {
        let center = NotificationCenter.default
        center.addObserver(
            self, selector: #selector(showCover),
            name: UIApplication.willResignActiveNotification, object: nil)
        center.addObserver(
            self, selector: #selector(hideCover),
            name: UIApplication.didBecomeActiveNotification, object: nil)
    }

    @objc func biometryType(_ call: CAPPluginCall) {
        let context = LAContext()
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
        else {
            call.resolve(["type": "none"])
            return
        }
        switch context.biometryType {
        case .faceID: call.resolve(["type": "faceID"])
        case .touchID: call.resolve(["type": "touchID"])
        default: call.resolve(["type": "none"])
        }
    }

    @objc func unlock(_ call: CAPPluginCall) {
        let reason = call.getString("reason") ?? "Unlock Progress Logger"
        // Falls back to the iPhone passcode if Face ID fails.
        LAContext().evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) {
            success, _ in
            call.resolve(["unlocked": success])
        }
    }

    @objc func setPrivacyCover(_ call: CAPPluginCall) {
        coverEnabled = call.getBool("enabled") ?? false
        call.resolve()
    }

    @objc private func showCover() {
        guard coverEnabled, cover == nil, let window = bridge?.webView?.window else { return }
        let view = UIView(frame: window.bounds)
        view.backgroundColor = .systemBackground
        view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        window.addSubview(view)
        cover = view
    }

    @objc private func hideCover() {
        cover?.removeFromSuperview()
        cover = nil
    }
}
