/**
 * One row of a form sheet's grouped box: the label on the left, the value
 * typed on the right (with an optional unit), like iOS Settings.
 */
export default function SheetField({ label, inputLabel, unit, ...input }) {
	return (
		<label className="sheet-field">
			<span className="sheet-field-label">{label}</span>
			<input
				className="sheet-field-input"
				aria-label={inputLabel ?? label}
				{...input}
			/>
			{unit && (
				<span className="sheet-field-unit" aria-hidden="true">
					{unit}
				</span>
			)}
		</label>
	);
}
