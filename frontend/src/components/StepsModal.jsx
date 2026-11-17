import { useId, useState } from "react";
import api from "../api";
import { tapSuccess } from "../native/haptics";
import Modal from "./Modal";
import SheetField from "./SheetField";

export default function StepsModal({
	prefillDate,
	existing,
	onClose,
	onSaved,
}) {
	const formId = useId();
	const [date, setDate] = useState(existing?.logDate ?? prefillDate ?? "");
	const [steps, setSteps] = useState(
		existing?.steps != null ? String(existing.steps) : "",
	);
	const [err, setErr] = useState("");
	const [saving, setSaving] = useState(false);

	async function submit(e) {
		e.preventDefault();
		if (saving) return;
		setErr("");
		setSaving(true);
		try {
			await api.post("/steps", { logDate: date, steps: parseInt(steps, 10) });
			tapSuccess();
			onSaved();
			onClose();
		} catch (ex) {
			setErr(ex.response?.data?.message ?? "Failed to save.");
		} finally {
			setSaving(false);
		}
	}

	return (
		<Modal
			title={existing ? "Edit Steps" : "Log Steps"}
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
						label="Steps"
						type="number"
						inputMode="numeric"
						min="0"
						placeholder="0"
						unit="steps"
						value={steps}
						onChange={(e) => setSteps(e.target.value)}
						required
					/>
				</div>
			</form>
		</Modal>
	);
}
