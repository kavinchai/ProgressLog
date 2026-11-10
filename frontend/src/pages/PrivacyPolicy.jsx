import { Link } from "react-router-dom";
import "./PrivacyPolicy.css";

const CONTACT_EMAIL = "kavinchai00@gmail.com";

export default function PrivacyPolicy() {
	return (
		<div className="privacy-page">
			<Link to="/" className="privacy-home">
				ProgressLog
			</Link>

			<h1 className="privacy-title">Privacy Policy</h1>
			<p className="privacy-date">Effective November 10, 2026</p>

			<p>
				This policy explains what ProgressLog collects, why, and the choices you
				have. It covers the ProgressLog website and iOS app.
			</p>

			<h2>What we collect</h2>
			<ul>
				<li>
					<strong>Account details:</strong> your username, email address and
					password. Passwords are stored only as a one-way hash.
				</li>
				<li>
					<strong>What you log:</strong> workouts (exercises, sets, reps and
					weights), meals with calories and protein, body weight and daily
					steps.
				</li>
				<li>
					<strong>Settings:</strong> your goals and sharing choices. Your weight
					unit and theme are saved only on your device.
				</li>
				<li>
					<strong>Claude integration:</strong> an API key, only if you create
					one.
				</li>
			</ul>
			<p>
				We don&apos;t collect your location, contacts, Apple Health data or
				advertising identifiers. The website counts page views with Vercel Web
				Analytics, which doesn&apos;t use cookies or identify you.
			</p>

			<h2>How we use it</h2>
			<p>
				Only to run ProgressLog: storing and showing your logs, working out your
				stats and personal records, and powering the leaderboard and calendar if
				you opt in. We don&apos;t sell your data, show ads or track you across
				other apps and websites.
			</p>

			<h2>What other people can see</h2>
			<p>
				Your data is private by default. If you turn on{" "}
				<em>Share data on leaderboard</em>, your username, exercise names and
				best lifts appear on the public leaderboard. If you turn on{" "}
				<em>Share on community calendar</em>, the days you trained appear on the
				public calendar. You can turn either off at any time in Settings ›
				Privacy.
			</p>

			<h2>Claude integration</h2>
			<p>
				If you create an API key and connect it to Claude, Claude can read and
				update your ProgressLog data on your behalf. Anthropic&apos;s privacy
				policy covers how it handles your conversations. Generating a new key in
				Settings › Integrations replaces the old one.
			</p>

			<h2>Where your data is stored</h2>
			<p>
				ProgressLog&apos;s server and database are hosted by Railway, and the
				website by Vercel. The website and app load the Inter font from Google
				Fonts, which receives your IP address. All traffic is encrypted with
				HTTPS.
			</p>

			<h2>Keeping and deleting your data</h2>
			<p>
				We keep your data while your account exists. Entries you delete stay
				recoverable with Undo for up to 30 days, then are erased.
			</p>
			<p>
				You can delete your account at any time in{" "}
				<strong>Settings › Account › Delete account</strong>. This immediately
				and permanently removes your account and everything you logged. Copies
				in our daily backups are erased when those backups expire, normally
				after 30 days and never more than 90.
			</p>

			<h2>Children</h2>
			<p>ProgressLog isn&apos;t intended for children under 13.</p>

			<h2>Changes</h2>
			<p>
				If this policy changes, we&apos;ll update it here and change the
				effective date above.
			</p>

			<h2>Contact</h2>
			<p>
				Questions or requests about your data:{" "}
				<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
			</p>
		</div>
	);
}
