import "./Navbar.css";

// Mobile-only top bar: just the brand. Theme and log out live in Settings;
// primary navigation lives in the BottomTabBar.
export default function Navbar() {
	return (
		<header className="navbar">
			<span className="navbar-brand">
				<img className="brand-mark" src="/favicon.svg" alt="" />
				ProgressLog
			</span>
		</header>
	);
}
