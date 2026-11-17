import useWeightUnit from "../hooks/useWeightUnit";
import StatusRow from "./StatusRow";
import "./ExerciseRow.css";

/** An exercise as a log row: name, PR badge and weight, then a pill per set's reps. */
export default function ExerciseRow({ name, weight, sets, isPR }) {
	const { unit, toDisplay } = useWeightUnit();
	return (
		<StatusRow
			status="done"
			title={
				<span className="exercise-row-name">
					{name}
					{isPR && <span className="pr-badge">PR</span>}
					{Number.isFinite(weight) && (
						<span className="exercise-row-weight">
							{toDisplay(weight)} {unit}
						</span>
					)}
				</span>
			}
			detail={
				<span className="set-pills">
					{sets.map((s) => (
						<span key={s.id} className="set-pill">
							{s.reps ?? "--"}
						</span>
					))}
				</span>
			}
		/>
	);
}
