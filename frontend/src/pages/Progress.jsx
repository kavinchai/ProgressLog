import { Navigate, Route, Routes } from "react-router-dom";
import Strength from "./Strength";

export default function Progress() {
	return (
		<Routes>
			<Route index element={<Navigate to="strength" replace />} />
			<Route path="strength" element={<Strength />} />
			<Route path="*" element={<Navigate to="strength" replace />} />
		</Routes>
	);
}
