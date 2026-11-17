import Capacitor

/// The app's web view controller. Registers plugins that live in this app
/// (rather than in an npm package) with the Capacitor bridge.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(HealthImportPlugin())
        bridge?.registerPluginInstance(WidgetBridgePlugin())
        bridge?.registerPluginInstance(AppleSignInPlugin())
        bridge?.registerPluginInstance(BiometricLockPlugin())
    }
}
