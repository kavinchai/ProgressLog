import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import useAchievements from "../../hooks/useAchievements";
import useWeightUnit from "../../hooks/useWeightUnit";
import { Medal } from "./Achievement";
import "./achievements.css";

/** The Achievements card at the top of Progress. */
export default function AchievementsEntry() {
	const navigate = useNavigate();
	const { allBadges, earnedCount, totalCount, volume } = useAchievements();
	const { unit, toDisplay } = useWeightUnit();
	const weight = (lbs) =>
		`${Math.round(toDisplay(lbs)).toLocaleString()} ${unit}`;
	const latest = allBadges
		.filter((b) => b.earnedOn)
		.sort((a, b) => b.earnedOn.localeCompare(a.earnedOn))
		.slice(0, 3);

	return (
		<section className="ios-section" aria-label="Achievements">
			<div className="ios-group">
				<button
					type="button"
					className="achievements-entry"
					onClick={() => navigate("/progress/achievements")}
				>
					<span className="achievements-entry-head">
						<span className="achievements-entry-title">Achievements</span>
						<span className="achievements-entry-count">
							{earnedCount} of {totalCount}
						</span>
						<ChevronRight
							size={16}
							className="ios-row-chevron"
							aria-hidden="true"
						/>
					</span>
					{latest.length > 0 && (
						<span className="achievements-entry-medals">
							{latest.map((b) => (
								<Medal key={b.id} badge={b} size={34} />
							))}
							<span className="achievements-entry-latest">
								Latest: {latest[0].name}
							</span>
						</span>
					)}
					{volume.next && (
						<>
							<span className="achievement-bar">
								<span
									style={{
										width: `${Math.round(volume.next.progress * 100)}%`,
									}}
								/>
							</span>
							<span className="achievements-entry-foot">
								{weight(volume.total)} lifted ·{" "}
								{weight(volume.next.lbs - volume.total)} to{" "}
								{volume.next.article}
							</span>
						</>
					)}
				</button>
			</div>
		</section>
	);
}
