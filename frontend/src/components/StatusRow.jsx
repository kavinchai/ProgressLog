import { CircleCheck, CircleDashed, CircleMinus } from "lucide-react";
import "./StatusRow.css";

const ICONS = { done: CircleCheck, skipped: CircleMinus, empty: CircleDashed };

/** A log row's look: a status circle, the title, and a one-line detail. */
export default function StatusRow({ status, title, detail }) {
	const Icon = ICONS[status];
	return (
		<span className="status-row">
			<Icon
				size={20}
				className={`status-row-icon status-row-icon--${status}`}
				aria-hidden="true"
			/>
			<span className="status-row-text">
				<span className="status-row-title">{title}</span>
				{detail && <span className="status-row-detail">{detail}</span>}
			</span>
		</span>
	);
}

/** The row for something not logged yet: a dashed circle and "+ Add". */
export function AddRow({
	title,
	label,
	action = "+ Add",
	onClick,
	className = "",
}) {
	return (
		<button
			type="button"
			className={"status-add-row " + className}
			aria-label={label}
			onClick={onClick}
		>
			<StatusRow status="empty" title={title} />
			<span className="status-add-row-label">{action}</span>
		</button>
	);
}
