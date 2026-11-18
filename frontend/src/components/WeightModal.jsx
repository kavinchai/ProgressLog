import { useId, useState } from "react";
import api from "../api";
import { errorMessage } from "../utils/errors";
import { tapSuccess } from "../native/haptics";
import Modal from "./Modal";
import SheetField from "./SheetField";
import useWeightUnit from "../hooks/useWeightUnit";

export default function WeightModal({
	prefillDate,
	existing,
	onClose,
	onSaved,
}) {
	const formId = useId();
	const { unit, toDisplay, fromDisplay } = useWeightUnit();
	const [date, setDate] = useState(existing?.logDate ?? prefillDate ?? "");
	const [weight, setWeight] = useState(
		existing?.weightLbs != null ? String(toDisplay(existing.weightLbs)) : "",
	);
	const [err, setErr] = useState("");
	const [saving, setSaving] = useState(false);

	async function submit(e) {
		e.preventDefault();
		if (saving) return;
		setErr("");
		setSaving(true);
		try {
			await api.post("/weight", {
				logDate: date,
				weightLbs: fromDisplay(weight),
			});
			tapSuccess();
			onSaved();
			onClose();
		} catch (ex) {
			setErr(errorMessage(ex, "Failed to save."));
		} finally {
			setSaving(false);
		}
	}

	return (
		<Modal
			title={existing ? "Edit Weight" : "Log Weight"}
			onClose={onClose}
			form={{ id: formId, saving }}
		>
			<form id={formId} className="modal-form" onSubmit={submit}>
				{err && <div className="modal-error">{err}</div>}
				<div className="sheet-group">
					<SheetField
						label="Date"
						type="date"
						value={date}
						onChange={(e) => setDate(e.target.value)}
						required
					/>
					<SheetField
						label="Weight"
						type="number"
						inputMode="decimal"
						step="0.1"
						min="0"
						placeholder="0"
						unit={unit}
						value={weight}
						onChange={(e) => setWeight(e.target.value)}
						required
					/>
				</div>
			</form>
		</Modal>
	);
}
