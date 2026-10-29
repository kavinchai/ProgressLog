import { useState } from "react";
import Modal from "./Modal";
import { sortLifts } from "../utils/chosenLifts";
import "./ChooseLiftsModal.css";

// "Choose lifts" dialog shared by Progress → Strength and Community.
// Each lift: { name, lastDate, stale, note, detail }. `stale` lifts are
// listed under "Older"; `note` sits beside the name, `detail` on the right.

/**
 * @param recentLabel     title of the group of lifts that aren't stale
 * @param rangeChipLabel  label of a "not stale only" filter chip; omit to hide it
 * @param defaults        names "Reset to featured" selects
 */
export default function ChooseLiftsModal({
	lifts,
	chosen,
	defaults,
	recentLabel,
	rangeChipLabel,
	onSave,
	onClose,
}) {
	const [draft, setDraft] = useState(() => new Set(chosen));
	const [query, setQuery] = useState("");
	const [filter, setFilter] = useState("all");

	const toggle = (name) =>
		setDraft((prev) => {
			const next = new Set(prev);
			if (next.has(name)) next.delete(name);
			else next.add(name);
			return next;
		});

	const q = query.trim().toLowerCase();
	const visible = lifts.filter(
		(l) =>
			(!q || l.name.toLowerCase().includes(q)) &&
			(filter !== "selected" || draft.has(l.name)) &&
			(filter !== "range" || !l.stale),
	);
	const trained = sortLifts(
		visible.filter((l) => !l.stale),
		"recent",
	);
	const older = sortLifts(
		visible.filter((l) => l.stale),
		"az",
	);
	const trainedCount = lifts.filter((l) => !l.stale).length;

	const chips = [
		{ key: "all", label: `All ${lifts.length}` },
		{ key: "selected", label: `Selected ${draft.size}` },
		...(rangeChipLabel
			? [{ key: "range", label: `${rangeChipLabel} · ${trainedCount}` }]
			: []),
	];

	const group = (label, items) =>
		items.length > 0 && (
			<div className="choose-group" role="group" aria-label={label}>
				<div className="choose-group-title">{label}</div>
				{items.map((l) => (
					<label
						key={l.name}
						className={
							"choose-row" + (draft.has(l.name) ? " choose-row-on" : "")
						}
					>
						<input
							type="checkbox"
							checked={draft.has(l.name)}
							onChange={() => toggle(l.name)}
						/>
						<span className="choose-row-name">
							{l.name}
							<span className="choose-row-last">{l.note}</span>
						</span>
						<span className="choose-row-max">{l.detail}</span>
					</label>
				))}
			</div>
		);

	return (
		<Modal title="Choose lifts" onClose={onClose}>
			<div className="choose-lifts">
				<input
					type="search"
					className="modal-input"
					placeholder={`Search ${lifts.length} exercises…`}
					aria-label="Search exercises"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
				/>
				<div className="choose-chips" role="group" aria-label="Filter lifts">
					{chips.map((c) => (
						<button
							key={c.key}
							type="button"
							aria-pressed={filter === c.key}
							className={
								"choose-chip" + (filter === c.key ? " choose-chip-on" : "")
							}
							onClick={() => setFilter(c.key)}
						>
							{c.label}
						</button>
					))}
				</div>
				<div className="choose-list">
					{group(recentLabel, trained)}
					{group("Older", older)}
					{visible.length === 0 && (
						<p className="choose-empty">No exercises match.</p>
					)}
				</div>
				<div className="choose-footer">
					<button
						type="button"
						className="btn btn-sm"
						onClick={() => setDraft(new Set(defaults))}
					>
						Reset to featured
					</button>
					<span className="choose-footer-spacer" />
					<button type="button" className="btn btn-sm" onClick={onClose}>
						Cancel
					</button>
					<button
						type="button"
						className="btn btn-sm btn-primary"
						onClick={() =>
							onSave(lifts.map((l) => l.name).filter((n) => draft.has(n)))
						}
					>
						Done
					</button>
				</div>
			</div>
		</Modal>
	);
}
