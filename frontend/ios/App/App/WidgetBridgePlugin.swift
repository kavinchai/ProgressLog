import Capacitor
import Foundation
import WidgetKit

/// Saves today's totals where the home-screen widget (ProgressWidget) can read
/// them, then asks iOS to redraw it. Called from frontend/src/native/widget.js.
@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise),
    ]

    /// Shared with the widget extension; must match ProgressWidget's App Group.
    static let appGroup = "group.com.kavin.progresslog"
    static let todayKey = "today"

    private static let numberKeys = [
        "calories", "calorieGoal", "protein", "proteinGoal", "steps", "stepsGoal",
    ]

    @objc func update(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: Self.appGroup) else {
            call.reject("Widget storage is unavailable.")
            return
        }
        var today: [String: Any] = ["date": call.getString("date") ?? ""]
        for key in Self.numberKeys {
            today[key] = call.getDouble(key) ?? 0
        }
        defaults.set(today, forKey: Self.todayKey)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    @objc func clear(_ call: CAPPluginCall) {
        UserDefaults(suiteName: Self.appGroup)?.removeObject(forKey: Self.todayKey)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }
}
