import "./Avatar.css";

// Colours picked per username, so a lifter keeps theirs everywhere.
const USER_COLORS = [
	"#1e40af",
	"#166534",
	"#9d174d",
	"#854d0e",
	"#5b21b6",
	"#991b1b",
	"#0f766e",
	"#9a3412",
];

function userColor(username) {
	let h = 0;
	for (let i = 0; i < username.length; i++)
		h = (h * 31 + username.charCodeAt(i)) >>> 0;
	return USER_COLORS[h % USER_COLORS.length];
}

/** A lifter's coloured initial. Decorative: the name is always shown beside it. */
export default function Avatar({ username, className = "" }) {
	return (
		<span
			className={`avatar ${className}`}
			style={{ background: userColor(username) }}
			aria-hidden="true"
		>
			{username[0].toUpperCase()}
		</span>
	);
}
