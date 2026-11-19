import {
	Navigate,
	Route,
	Routes,
	useLocation,
	useNavigate,
} from "react-router-dom";
import { PageHeader, SegmentedControl } from "../components/ios/Ios";
import WeeklyStats from "./WeeklyStats";
import TotalStats from "./TotalStats";

export default function History() {
	const { pathname, state } = useLocation();
	const navigate = useNavigate();
	const view = pathname.startsWith("/history/total") ? "total" : "weekly";
	// "Today" remounts the view, which puts it back on the current period.
	const resetKey = state?.reset ?? "";

	return (
		<div>
			<PageHeader
				title="History"
				trailing={
					<button
						type="button"
						onClick={() =>
							navigate(`/history/${view}`, { state: { reset: Date.now() } })
						}
					>
						Today
					</button>
				}
			/>
			<SegmentedControl
				label="History views"
				options={[
					{ value: "weekly", label: "Week" },
					{ value: "total", label: "Month" },
				]}
				value={view}
				onChange={(v) => navigate(`/history/${v}`)}
			/>

			<Routes>
				<Route index element={<Navigate to="weekly" replace />} />
				<Route path="weekly" element={<WeeklyStats key={resetKey} />} />
				<Route path="total" element={<TotalStats key={resetKey} />} />
				<Route path="*" element={<Navigate to="weekly" replace />} />
			</Routes>
		</div>
	);
}
