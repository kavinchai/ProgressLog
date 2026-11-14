import SwiftUI
import WidgetKit

// Home-screen widget: today's calories, protein and steps against their goals.
// The app writes the numbers to shared storage (App/WidgetBridgePlugin.swift);
// the widget only reads them and never talks to the server.

private let appGroup = "group.com.kavin.progresslog"
private let todayKey = "today"

struct Totals {
    let calories: Double
    let calorieGoal: Double
    let protein: Double
    let proteinGoal: Double
    let steps: Double
    let stepsGoal: Double

    static let zero = Totals(calories: 0, calorieGoal: 2000, protein: 0, proteinGoal: 150, steps: 0, stepsGoal: 10000)
    static let sample = Totals(calories: 1257, calorieGoal: 2000, protein: 102, proteinGoal: 180, steps: 6842, stepsGoal: 10000)
}

struct TodayEntry: TimelineEntry {
    let date: Date
    /// nil until the app has saved today's numbers.
    let totals: Totals?
}

private let dayFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.calendar = Calendar(identifier: .gregorian)
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = .current
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter
}()

/// Today's totals, or nil if what's stored belongs to another day.
func loadTotals(on day: Date) -> Totals? {
    guard
        let stored = UserDefaults(suiteName: appGroup)?.dictionary(forKey: todayKey),
        stored["date"] as? String == dayFormatter.string(from: day)
    else { return nil }
    func number(_ key: String) -> Double { (stored[key] as? NSNumber)?.doubleValue ?? 0 }
    return Totals(
        calories: number("calories"), calorieGoal: number("calorieGoal"),
        protein: number("protein"), proteinGoal: number("proteinGoal"),
        steps: number("steps"), stepsGoal: number("stepsGoal"))
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> TodayEntry {
        TodayEntry(date: Date(), totals: .sample)
    }

    func getSnapshot(in context: Context, completion: @escaping (TodayEntry) -> Void) {
        let now = Date()
        completion(TodayEntry(date: now, totals: context.isPreview ? .sample : loadTotals(on: now)))
    }

    /// Shows today's numbers now and switches to the empty state at midnight,
    /// so yesterday's totals never linger. The app reloads the widget whenever
    /// it saves new numbers.
    func getTimeline(in context: Context, completion: @escaping (Timeline<TodayEntry>) -> Void) {
        let now = Date()
        let calendar = Calendar.current
        let midnight = calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: now)) ?? now
        let entries = [
            TodayEntry(date: now, totals: loadTotals(on: now)),
            TodayEntry(date: midnight, totals: nil),
        ]
        completion(Timeline(entries: entries, policy: .after(midnight)))
    }
}

private let caloriesColor = Color(red: 0xD4 / 255, green: 0x93 / 255, blue: 0x4E / 255)
private let proteinColor = Color(red: 0x4F / 255, green: 0xAA / 255, blue: 0x78 / 255)
private let stepsColor = Color(red: 0x8A / 255, green: 0x7E / 255, blue: 0xC8 / 255)

private func formatted(_ value: Double) -> String {
    let formatter = NumberFormatter()
    formatter.numberStyle = .decimal
    formatter.maximumFractionDigits = 0
    return formatter.string(from: NSNumber(value: value.rounded())) ?? "\(Int(value))"
}

private func fraction(_ value: Double, of goal: Double) -> Double {
    goal > 0 ? min(value / goal, 1) : 0
}

private struct Header: View {
    let title: String

    var body: some View {
        HStack(spacing: 6) {
            RoundedRectangle(cornerRadius: 4)
                .fill(Color(red: 0x0C / 255, green: 0x0A / 255, blue: 0x09 / 255))
                .frame(width: 14, height: 14)
                .overlay(
                    RoundedRectangle(cornerRadius: 1)
                        .fill(Color(red: 0xFB / 255, green: 0x92 / 255, blue: 0x3C / 255))
                        .frame(width: 8, height: 5))
            Text(title)
                .font(.caption2)
                .foregroundColor(.secondary)
                .lineLimit(1)
        }
    }
}

private struct BarRow: View {
    let label: String
    let value: String
    let fraction: Double
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack {
                Text(label).font(.caption2).foregroundColor(.secondary)
                Spacer()
                Text(value).font(.caption.weight(.semibold))
            }
            GeometryReader { proxy in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.secondary.opacity(0.2))
                    Capsule().fill(color).frame(width: proxy.size.width * fraction)
                }
            }
            .frame(height: 5)
        }
    }
}

private struct Ring: View {
    let value: String
    let caption: String
    let fraction: Double
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            ZStack {
                Circle().stroke(Color.secondary.opacity(0.2), lineWidth: 6)
                Circle()
                    .trim(from: 0, to: fraction)
                    .stroke(color, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                    .rotationEffect(.degrees(-90))
            }
            .frame(width: 50, height: 50)
            Text(value).font(.subheadline.weight(.semibold)).lineLimit(1).minimumScaleFactor(0.7)
            Text(caption).font(.caption2).foregroundColor(.secondary).lineLimit(1).minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity)
    }
}

private struct StaleNote: View {
    var body: some View {
        Text("Open Progress Logger to update")
            .font(.caption2)
            .foregroundColor(.secondary)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
    }
}

struct SmallView: View {
    let totals: Totals
    let stale: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Header(title: "Today")
            BarRow(label: "Calories", value: formatted(totals.calories),
                   fraction: fraction(totals.calories, of: totals.calorieGoal), color: caloriesColor)
            BarRow(label: "Protein", value: "\(formatted(totals.protein)) g",
                   fraction: fraction(totals.protein, of: totals.proteinGoal), color: proteinColor)
            BarRow(label: "Steps", value: formatted(totals.steps),
                   fraction: fraction(totals.steps, of: totals.stepsGoal), color: stepsColor)
            if stale { StaleNote() }
        }
    }
}

struct MediumView: View {
    let totals: Totals
    let stale: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Header(title: "Progress Logger · Today")
            HStack {
                Ring(value: formatted(totals.calories),
                     caption: "of \(formatted(totals.calorieGoal)) kcal",
                     fraction: fraction(totals.calories, of: totals.calorieGoal), color: caloriesColor)
                Ring(value: "\(formatted(totals.protein)) g",
                     caption: "of \(formatted(totals.proteinGoal)) g",
                     fraction: fraction(totals.protein, of: totals.proteinGoal), color: proteinColor)
                Ring(value: formatted(totals.steps),
                     caption: "of \(formatted(totals.stepsGoal))",
                     fraction: fraction(totals.steps, of: totals.stepsGoal), color: stepsColor)
            }
            if stale { StaleNote() }
        }
    }
}

struct ProgressWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: TodayEntry

    var body: some View {
        let totals = entry.totals ?? .zero
        let stale = entry.totals == nil
        Group {
            if family == .systemMedium {
                MediumView(totals: totals, stale: stale)
            } else {
                SmallView(totals: totals, stale: stale)
            }
        }
        .widgetBackground()
    }
}

private extension View {
    /// iOS 17+ draws widget backgrounds through containerBackground; older
    /// versions need explicit padding and a background.
    @ViewBuilder
    func widgetBackground() -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            containerBackground(Color(.systemBackground), for: .widget)
        } else {
            padding().background(Color(.systemBackground))
        }
    }
}

@main
struct ProgressWidget: Widget {
    let kind = "ProgressWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            ProgressWidgetView(entry: entry)
        }
        .configurationDisplayName("Today")
        .description("Today's calories, protein and steps.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
