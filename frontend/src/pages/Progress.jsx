import { Navigate, Route, Routes } from "react-router-dom";
import Strength from "./Strength";
import Achievements from "./Achievements";
import AchievementsEntry from "../components/achievements/AchievementsEntry";

export default function Progress() {
	return (
		<Routes>
			<Route index element={<Navigate to="strength" replace />} />
			<Route
				path="strength"
				element={<Strength above={<AchievementsEntry />} />}
			/>
			<Route path="achievements/*" element={<Achievements />} />
			<Route path="*" element={<Navigate to="strength" replace />} />
		</Routes>
	);
}
