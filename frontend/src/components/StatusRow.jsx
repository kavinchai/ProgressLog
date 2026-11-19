import { useEffect, useRef } from "react";
import { CircleCheck, CircleDashed, CircleMinus } from "lucide-react";
import "./StatusRow.css";

const ICONS = { done: CircleCheck, skipped: CircleMinus, empty: CircleDashed };

// Titles shown as not logged yet this session. When one turns up as done
// (logging swaps the "+ Add" row for the logged row), its check pops.
const notDoneYet = new Set();

/** A log row's look: a status circle, the title, and a one-line detail. */
export default function StatusRow({ status, title, detail }) {
	const Icon = ICONS[status];
	const prev = useRef(null);
	const popped = useRef(false);
	const justDone =
		status === "done" &&
		(prev.current ? prev.current !== "done" : notDoneYet.has(title));
	if (justDone) popped.current = true;
	useEffect(() => {
		prev.current = status;
		if (status === "done") notDoneYet.delete(title);
		else notDoneYet.add(title);
	}, [status, title]);
	return (
		<span className="status-row">
			<Icon
				size={20}
				className={
					`status-row-icon status-row-icon--${status}` +
					(popped.current && status === "done" ? " status-row-icon--pop" : "")
				}
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
