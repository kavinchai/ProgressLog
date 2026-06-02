export const CHART_COLORS = [
	"var(--accent)",
	"var(--success)",
	"var(--warning)",
	"#60a5fa",
	"var(--warning)",
];

export function normalizeActivityName(name) {
	if (!name) return name;
	const lower = name.toLowerCase();
	if (lower.includes("run")) return "run";
	return name;
}
