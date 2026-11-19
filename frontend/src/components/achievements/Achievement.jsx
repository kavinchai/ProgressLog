import {
	CalendarCheck,
	Dumbbell,
	Flame,
	Footprints,
	Star,
	Drumstick,
} from "lucide-react";
import "./achievements.css";

const ICONS = {
	barbell: Dumbbell,
	calendar: CalendarCheck,
	flame: Flame,
	protein: Drumstick,
	steps: Footprints,
	star: Star,
};

const RING = 2 * Math.PI * 28;

/**
 * A round badge: filled indigo when earned, grey with a ring filling up when
 * not. `size` is the diameter in px.
 */
export function Medal({ badge, size = 64 }) {
	const Icon = ICONS[badge.icon] ?? Star;
	const earned = Boolean(badge.earnedOn);
	const progress = earned ? 1 : badge.progress;
	return (
		<span
			className={"medal" + (earned ? " medal--earned" : "")}
			style={{ width: size, height: size }}
			aria-hidden="true"
		>
			<svg
				className="medal-rings"
				viewBox="0 0 64 64"
				width={size}
				height={size}
			>
				<circle className="medal-face" cx="32" cy="32" r="30" />
				<circle className="medal-track" cx="32" cy="32" r="28" />
				<circle
					className="medal-ring"
					cx="32"
					cy="32"
					r="28"
					strokeDasharray={`${(RING * progress).toFixed(1)} ${RING.toFixed(1)}`}
					transform="rotate(-90 32 32)"
				/>
			</svg>
			<Icon
				className="medal-icon"
				size={Math.round(size * 0.4)}
				strokeWidth={2}
			/>
		</span>
	);
}

/** A milestone's drawing, from public/achievements/ so it can be swapped. */
export function MilestoneArt({ milestone, className = "", width = 160 }) {
	return (
		<img
			className={"milestone-art " + className}
			src={`/achievements/${milestone.art}`}
			alt=""
			width={width}
			height={Math.round((width * 104) / 160)}
		/>
	);
}
