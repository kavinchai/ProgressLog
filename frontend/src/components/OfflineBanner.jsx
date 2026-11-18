import { WifiOff } from "lucide-react";
import useNetworkStore from "../store/networkStore";
import useAuthStore from "../store/authStore";
import { savedAt } from "../utils/offlineCache";
import { localDateStr, shortDate } from "../utils/date";
import "./OfflineBanner.css";

// "2:14 PM" for today, "Mon 11/16" for an earlier day.
function when(at) {
	const date = new Date(at);
	return localDateStr(date) === localDateStr(new Date())
		? date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
		: shortDate(localDateStr(date));
}

export default function OfflineBanner() {
	const offline = useNetworkStore((s) => s.offline);
	const username = useAuthStore((s) => s.username);
	if (!offline) return null;
	const at = savedAt(username);
	return (
		<div className="offline-banner" role="status">
			<WifiOff size={16} aria-hidden="true" />
			{at ? `Offline · showing data from ${when(at)}` : "You're offline"}
		</div>
	);
}
