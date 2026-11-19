import { useEffect, useState } from "react";
import useAuthStore from "../../store/authStore";
import useAchievements from "../../hooks/useAchievements";
import useWorkouts from "../../hooks/useWorkouts";
import useWeightUnit from "../../hooks/useWeightUnit";
import Modal from "../Modal";
import { ListGroup } from "../ios/Ios";
import { Medal, MilestoneArt } from "./Achievement";
import {
	equivalentFor,
	newlyEarned,
	workoutVolume,
} from "../../utils/achievements";
import { localDateStr } from "../../utils/date";
import "./achievements.css";

const SEEN_KEY = (user) => `achievements.seen:${user}`;
// Set to "off" to never show the sheet (the e2e tests use this).
const OFF_KEY = "achievements.celebrate";

function readSeen(user) {
	try {
		const raw = localStorage.getItem(SEEN_KEY(user));
		return raw == null ? null : JSON.parse(raw);
	} catch {
		return null;
	}
}

function writeSeen(user, ids) {
	try {
		localStorage.setItem(SEEN_KEY(user), JSON.stringify(ids));
	} catch {
		/* storage blocked: the sheet may show again, nothing breaks */
	}
}

function celebrationsOff() {
	try {
		return localStorage.getItem(OFF_KEY) === "off";
	} catch {
		return false;
	}
}

/**
 * Shows a sheet once whenever something new is earned: today's total weight
 * lifted (and what it's about the weight of) plus the new badges. The first
 * time it runs for someone, it only remembers what they already have.
 */
export default function AchievementCelebration() {
	const user = useAuthStore((s) => s.username);
	const achievements = useAchievements();
	const { data: workouts } = useWorkouts();
	const { unit, toDisplay } = useWeightUnit();
	const [fresh, setFresh] = useState([]);

	const ids = achievements.earnedIds.join(",");
	useEffect(() => {
		if (achievements.loading || !user) return;
		const now = ids ? ids.split(",") : [];
		const seen = readSeen(user);
		if (seen == null) {
			writeSeen(user, now);
			return;
		}
		const added = newlyEarned(seen, now);
		if (added.length) {
			writeSeen(user, [...new Set([...seen, ...now])]);
			if (!celebrationsOff()) setFresh(added);
		}
	}, [ids, achievements.loading, user]);

	if (!fresh.length) return null;

	const today = localDateStr(new Date());
	const todayVolume = workouts
		.filter((w) => w.sessionDate === today)
		.reduce((sum, w) => sum + workoutVolume(w), 0);
	const equal = equivalentFor(todayVolume);
	const badges = achievements.allBadges.filter((b) => fresh.includes(b.id));
	const milestones = achievements.volume.milestones.filter((m) =>
		fresh.includes(`volume-${m.id}`),
	);
	const weight = (lbs) =>
		`${Math.round(toDisplay(lbs)).toLocaleString()} ${unit}`;

	return (
		<Modal title="Nice work" onClose={() => setFresh([])} grouped>
			{todayVolume > 0 && (
				<div className="celebration-card">
					<div className="celebration-kicker">Today you lifted a total of</div>
					<div className="celebration-total">{weight(todayVolume)}</div>
					{equal && (
						<>
							<div className="celebration-equal">
								About the weight of {equal.article}
							</div>
							<MilestoneArt milestone={equal} />
						</>
					)}
				</div>
			)}
			<ListGroup
				header={fresh.length === 1 ? "New achievement" : "New achievements"}
			>
				{milestones.map((m) => (
					<div key={m.id} className="ios-row milestone-row">
						<MilestoneArt milestone={m} width={56} />
						<span className="ios-row-text">
							<span className="ios-row-label">{m.name} lifted</span>
							<span className="ios-row-detail">{weight(m.lbs)} in total</span>
						</span>
					</div>
				))}
				{badges.map((b) => (
					<div key={b.id} className="ios-row">
						<Medal badge={b} size={40} />
						<span className="ios-row-text">
							<span className="ios-row-label">{b.name}</span>
							<span className="ios-row-detail">{b.detail}</span>
						</span>
					</div>
				))}
			</ListGroup>
		</Modal>
	);
}
