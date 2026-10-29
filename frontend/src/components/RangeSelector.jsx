import { RANGE_OPTIONS } from "../utils/dateRange";

// Time-range button row for the Strength page.
// `classPrefix` ("strength") selects the page's CSS classes.
export default function RangeSelector({ classPrefix, activeKey, onSelect }) {
	return (
		<div className={`${classPrefix}-range-row`}>
			<span className={`${classPrefix}-range-label`}>Range</span>
			<div
				className={`${classPrefix}-range-buttons`}
				role="group"
				aria-label="Time range"
			>
				{RANGE_OPTIONS.map((r) => {
					const isActive = r.key === activeKey;
					return (
						<button
							key={r.key}
							type="button"
							aria-pressed={isActive}
							className={
								`${classPrefix}-range-btn` +
								(isActive ? ` ${classPrefix}-range-btn-active` : "")
							}
							onClick={() => onSelect(r.key)}
						>
							{r.label}
						</button>
					);
				})}
			</div>
		</div>
	);
}
