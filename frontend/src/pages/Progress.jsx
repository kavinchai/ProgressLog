import { Navigate, Route, Routes } from "react-router-dom";
import Strength from "./Strength";
import Achievements from "./Achievements";

export default function Progress() {
	return (
		<Routes>
			<Route index element={<Navigate to="strength" replace />} />
			<Route path="strength" element={<Strength />} />
			<Route path="achievements/*" element={<Achievements />} />
			<Route path="*" element={<Navigate to="strength" replace />} />
		</Routes>
	);
}
