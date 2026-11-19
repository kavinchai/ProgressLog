import { useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import useAchievements from "../hooks/useAchievements";
import useWeightUnit from "../hooks/useWeightUnit";
import Modal from "../components/Modal";
import { ListGroup, ListRow, PageHeader } from "../components/ios/Ios";
import { Medal, MilestoneArt } from "../components/achievements/Achievement";
import { monthDay } from "../utils/achievements";
import "../components/achievements/achievements.css";


const fullDate = (iso) =>
	new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});

function useFormat() {
	const { unit, toDisplay } = useWeightUnit();
	const weight = (lbs) =>
		`${Math.round(toDisplay(lbs)).toLocaleString()} ${unit}`;
	const progress = (b) => {
		if (b.unit === "lbs") {
			return `${Math.round(toDisplay(b.current)).toLocaleString()} / ${weight(b.target)}`;
		}
		if (b.unit === "steps")
			return `${Math.round(b.current / 1000)}k / ${b.target / 1000000}M`;
		const word = b.unit === "workouts" ? "" : ` ${b.unit}`;
		return `${b.current} / ${b.target}${word}`;
	};
	return { weight, progress };
}

function BackButton({ to, label }) {
	const navigate = useNavigate();
	return (
		<button type="button" onClick={() => navigate(to)}>
			<ChevronLeft size={26} aria-hidden="true" />
			{label}
		</button>
	);
}

// ── Badge sheet ─────────────────────────────────────────────────────────────

function BadgeSheet({ badge, siblings, onClose }) {
	const { weight, progress } = useFormat();
	const earned = Boolean(badge.earnedOn);
	return (
		<Modal title="Achievement" onClose={onClose} grouped>
			<div className="badge-sheet">
				<Medal badge={badge} size={120} />
				<h2 className="badge-sheet-title">{badge.name}</h2>
				<p className="badge-sheet-status">
					{earned
						? `Earned ${fullDate(badge.earnedOn)}`
						: `${progress(badge)} · ${Math.round(badge.progress * 100)}%`}
				</p>
				<p className="badge-sheet-detail">{badge.detail}</p>
			</div>
			{badge.unit === "lbs" && badge.current > 0 && (
				<ListGroup>
					<ListRow label="Your best" value={weight(badge.current)} />
				</ListGroup>
			)}
			<ListGroup header="Levels">
				{siblings.map((s) => (
					<ListRow
						key={s.id}
						icon={
							s.earnedOn ? (
								<Check size={16} strokeWidth={3} />
							) : (
								<Lock size={15} />
							)
						}
						iconColor={s.earnedOn ? "var(--success)" : "var(--text-subtle)"}
						label={s.name}
						value={s.earnedOn ? monthDay(s.earnedOn) : progress(s)}
					/>
				))}
			</ListGroup>
		</Modal>
	);
}

// ── Achievements ────────────────────────────────────────────────────────────

function VolumeCard({ volume }) {
	const navigate = useNavigate();
	const { weight } = useFormat();
	const earned = volume.milestones.filter((m) => m.earnedOn);
	const latest = earned[earned.length - 1];
	const shown = latest ?? volume.milestones[0];
	return (
		<ListGroup header="Lifetime weight lifted">
			<button
				type="button"
				className="volume-card"
				onClick={() => navigate("/progress/achievements/weight")}
				aria-label={`Lifetime weight lifted: ${weight(volume.total)}`}
			>
				<span className="volume-card-top">
					<MilestoneArt milestone={shown} width={76} />
					<span className="volume-card-text">
						<span className="volume-card-total">{weight(volume.total)}</span>
						<span className="volume-card-sub">
							{latest
								? `More than ${latest.article}`
								: `First milestone: ${shown.article}`}
						</span>
					</span>
					<ChevronRight
						size={16}
						className="ios-row-chevron"
						aria-hidden="true"
					/>
				</span>
				{volume.next && (
					<>
						<span className="achievement-bar">
							<span
								style={{ width: `${Math.round(volume.next.progress * 100)}%` }}
							/>
						</span>
						<span className="volume-card-foot">
							<span>
								{earned.length} of {volume.milestones.length} milestones
							</span>
							<span>
								Next: {volume.next.name.toLowerCase()} ·{" "}
								{weight(volume.next.lbs - volume.total)} to go
							</span>
						</span>
					</>
				)}
			</button>
		</ListGroup>
	);
}

function AchievementsHome() {
	const achievements = useAchievements();
	const { progress } = useFormat();
	const [open, setOpen] = useState(null);

	// The other levels of the same badge: every club for a lift, every workout
	// count, or the badges sharing its icon (protein, steps, streaks).
	const siblingsOf = (badge) => {
		if (badge.lift) {
			return achievements.allBadges.filter((b) => b.lift === badge.lift);
		}
		const group = achievements.groups.find((g) =>
			g.badges.some((b) => b.id === badge.id),
		);
		return group.id === "workouts"
			? group.badges
			: group.badges.filter((b) => b.icon === badge.icon);
	};

	return (
		<div className="achievements-page">
			<PageHeader
				title="Achievements"
				subtitle={`${achievements.earnedCount} of ${achievements.totalCount} earned`}
				leading={<BackButton to="/progress" label="Progress" />}
			/>
			<VolumeCard volume={achievements.volume} />
			{achievements.groups.map((g) => (
				<ListGroup
					key={g.id}
					label={g.title}
					header={
						<>
							<span>{g.title}</span>
							<span>
								{g.earned} of {g.total}
							</span>
						</>
					}
				>
					<div className="badge-grid">
						{g.badges.map((b) => (
							<button
								key={b.id}
								type="button"
								className="badge-cell"
								aria-label={`${b.name}, ${b.earnedOn ? "earned" : "not earned yet"}`}
								onClick={() => setOpen(b)}
							>
								<Medal badge={b} />
								<span className="badge-cell-name">{b.name}</span>
								<span className="badge-cell-sub">
									{b.earnedOn ? monthDay(b.earnedOn) : progress(b)}
								</span>
							</button>
						))}
					</div>
				</ListGroup>
			))}
			{open && (
				<BadgeSheet
					badge={open}
					siblings={siblingsOf(open)}
					onClose={() => setOpen(null)}
				/>
			)}
		</div>
	);
}

// ── Lifetime weight lifted ──────────────────────────────────────────────────

function WeightLifted() {
	const { volume } = useAchievements();
	const { weight } = useFormat();
	return (
		<div className="achievements-page">
			<div className="ios-nav weight-nav">
				<BackButton to="/progress/achievements" label="Achievements" />
			</div>
			<div className="weight-hero">
				<h1 className="weight-hero-total">{weight(volume.total)}</h1>
				<p className="weight-hero-sub">
					lifted in total · sets × reps × weight
				</p>
			</div>
			<div className="weight-stats">
				<div>
					<span className="weight-stat-label">Biggest workout</span>
					<span className="weight-stat-value">
						{volume.biggest ? weight(volume.biggest.volume) : "--"}
					</span>
					<span className="weight-stat-sub">
						{volume.biggest
							? [volume.biggest.name, monthDay(volume.biggest.date)]
									.filter(Boolean)
									.join(" · ")
							: "No workouts yet"}
					</span>
				</div>
				<div>
					<span className="weight-stat-label">This month</span>
					<span className="weight-stat-value">
						{weight(volume.thisMonth.volume)}
					</span>
					<span className="weight-stat-sub">
						{volume.thisMonth.workouts}{" "}
						{volume.thisMonth.workouts === 1 ? "workout" : "workouts"}
					</span>
				</div>
			</div>
			<ListGroup header="Milestones" label="Milestones">
				{volume.milestones.map((m) => (
					<div key={m.id} className="ios-row milestone-row">
						<MilestoneArt
							milestone={m}
							width={56}
							className={m.earnedOn ? "" : "milestone-art--locked"}
						/>
						<span className="ios-row-text">
							<span className="ios-row-label">{m.name}</span>
							<span className="ios-row-detail">{weight(m.lbs)}</span>
						</span>
						{m.earnedOn ? (
							<span className="milestone-earned">{monthDay(m.earnedOn)}</span>
						) : (
							<span className="milestone-progress">
								{Math.round(m.progress * 100)}%
								<span className="achievement-bar achievement-bar--small">
									<span style={{ width: `${Math.round(m.progress * 100)}%` }} />
								</span>
							</span>
						)}
					</div>
				))}
			</ListGroup>
		</div>
	);
}

export default function Achievements() {
	return (
		<Routes>
			<Route index element={<AchievementsHome />} />
			<Route path="weight" element={<WeightLifted />} />
		</Routes>
	);
}
