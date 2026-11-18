import axios from "axios";
import useAuthStore from "../store/authStore";
import useNetworkStore from "../store/networkStore";
import { isNetworkError } from "../utils/errors";

const api = axios.create({
	baseURL: import.meta.env.VITE_API_URL ?? "/api",
	headers: { "Content-Type": "application/json" },
	withCredentials: true,
});

// Any answer from the server means we're online.
export function trackResponse(response) {
	useNetworkStore.setState({ offline: false });
	return response;
}

// No answer means offline; a 401 logs out.
export function trackError(error) {
	if (isNetworkError(error)) {
		useNetworkStore.setState({ offline: true });
	} else if (error.response) {
		useNetworkStore.setState({ offline: false });
		if (error.response.status === 401) {
			useAuthStore.getState().logout();
		}
	}
	return Promise.reject(error);
}

api.interceptors.response.use(trackResponse, trackError);

export default api;
