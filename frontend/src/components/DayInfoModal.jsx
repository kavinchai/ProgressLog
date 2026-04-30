import { useState } from "react";
import api from "../api";
import Modal from "./Modal";

export default function DayInfoModal({
	prefillDate,
	existing,
	onClose,
	onSaved,
}) {
	const [type, setType] = useState(existing?.dayType ?? "training");
	const [err, setErr] = useState("");
	const [saving, setSaving] = useState(false);

	async function submit(e) {
		e.preventDefault();
		setErr("");
		setSaving(true);
		try {
			await api.post("/nutrition", {
				logDate: existing?.logDate ?? prefillDate,
				dayType: type,
			});
			onSaved();
			onClose();
		} catch (ex) {
			setErr(ex.response?.data?.message ?? "Failed to save.");
		} finally {
			setSaving(false);
		}
	}

	return (
		<Modal title="Day Info" onClose={onClose}>
			<form className="modal-form" onSubmit={submit}>
				{err && <div className="modal-error">{err}</div>}
				<div className="modal-field">
					<label className="modal-label">Day Type</label>
					<select
						className="modal-input"
						value={type}
						onChange={(e) => setType(e.target.value)}
					>
						<option value="training">Training</option>
						<option value="rest">Rest</option>
					</select>
				</div>
				<div className="modal-actions">
					<button type="button" className="btn-ghost" onClick={onClose}>
						Cancel
					</button>
					<button type="submit" className="btn-primary" disabled={saving}>
						{saving ? "Saving..." : "Save"}
					</button>
				</div>
			</form>
		</Modal>
	);
}
