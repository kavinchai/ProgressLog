import Capacitor
import Foundation
import HealthKit

/// Reads daily steps and body weight from Apple Health for the web app's
/// Apple Health import (frontend/src/native/health.js). Read-only: it never
/// writes to Health.
@objc(HealthImportPlugin)
public class HealthImportPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthImportPlugin"
    public let jsName = "HealthImport"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "dailySteps", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "dailyWeights", returnType: CAPPluginReturnPromise),
    ]

    private let store = HKHealthStore()
    private let stepType = HKObjectType.quantityType(forIdentifier: .stepCount)!
    private let weightType = HKObjectType.quantityType(forIdentifier: .bodyMass)!

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("Apple Health is not available on this device.")
            return
        }
        store.requestAuthorization(toShare: nil, read: [stepType, weightType]) { _, error in
            if let error = error {
                call.reject(error.localizedDescription)
                return
            }
            call.resolve()
        }
    }

    /// One total per day for the last `days` days (today included). Uses a
    /// statistics query so steps counted by both iPhone and Apple Watch
    /// aren't double-counted.
    @objc func dailySteps(_ call: CAPPluginCall) {
        let start = Self.startOfRange(days: call.getInt("days") ?? 7)
        let now = Date()
        let query = HKStatisticsCollectionQuery(
            quantityType: stepType,
            quantitySamplePredicate: HKQuery.predicateForSamples(
                withStart: start, end: now, options: .strictStartDate),
            options: .cumulativeSum,
            anchorDate: start,
            intervalComponents: DateComponents(day: 1)
        )
        query.initialResultsHandler = { _, results, error in
            if let error = error, !Self.isNoData(error) {
                call.reject(error.localizedDescription)
                return
            }
            var days: [[String: Any]] = []
            results?.enumerateStatistics(from: start, to: now) { stats, _ in
                let steps = stats.sumQuantity()?.doubleValue(for: .count()) ?? 0
                days.append(["date": Self.dayString(stats.startDate), "steps": Int(steps.rounded())])
            }
            call.resolve(["days": days])
        }
        store.execute(query)
    }

    /// The latest weigh-in of each day for the last `days` days, in pounds.
    @objc func dailyWeights(_ call: CAPPluginCall) {
        let start = Self.startOfRange(days: call.getInt("days") ?? 7)
        let query = HKSampleQuery(
            sampleType: weightType,
            predicate: HKQuery.predicateForSamples(withStart: start, end: Date(), options: .strictStartDate),
            limit: HKObjectQueryNoLimit,
            sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)]
        ) { _, samples, error in
            if let error = error, !Self.isNoData(error) {
                call.reject(error.localizedDescription)
                return
            }
            var seen = Set<String>()
            var days: [[String: Any]] = []
            for case let sample as HKQuantitySample in samples ?? [] {
                let day = Self.dayString(sample.startDate)
                if seen.insert(day).inserted {
                    days.append(["date": day, "pounds": sample.quantity.doubleValue(for: .pound())])
                }
            }
            call.resolve(["days": days])
        }
        store.execute(query)
    }

    private static func startOfRange(days: Int) -> Date {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        return calendar.date(byAdding: .day, value: -(max(days, 1) - 1), to: today) ?? today
    }

    private static func isNoData(_ error: Error) -> Bool {
        (error as? HKError)?.code == .errorNoData
    }

    private static let dayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = .current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    private static func dayString(_ date: Date) -> String {
        dayFormatter.string(from: date)
    }
}
