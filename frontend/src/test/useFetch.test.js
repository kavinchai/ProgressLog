import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import useFetch from "../hooks/useFetch";
import useAuthStore from "../store/authStore";

vi.mock("../api", () => ({
	default: { get: vi.fn() },
}));

import api from "../api";

beforeEach(() => {
	vi.clearAllMocks();
});

describe("useFetch", () => {
	it("starts in loading state with empty data", () => {
		api.get.mockResolvedValue({ data: [] });
		const { result } = renderHook(() => useFetch("/test"));
		expect(result.current.loading).toBe(true);
		expect(result.current.data).toEqual([]);
		expect(result.current.error).toBeNull();
	});

	it("sets data and clears loading on success", async () => {
		const payload = [{ id: 1 }, { id: 2 }];
		api.get.mockResolvedValue({ data: payload });

		const { result } = renderHook(() => useFetch("/test"));
		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.data).toEqual(payload);
		expect(result.current.error).toBeNull();
	});

	it("sets error and clears loading on failure", async () => {
		api.get.mockRejectedValue(new Error("Server error"));

		const { result } = renderHook(() => useFetch("/test"));
		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.error).toBe("Server error");
		expect(result.current.data).toEqual([]);
	});

	it("uses fallback error message when error has no message", async () => {
		api.get.mockRejectedValue({});

		const { result } = renderHook(() => useFetch("/test"));
		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.error).toBe("Failed to load data");
	});

	it("calls the correct endpoint", async () => {
		api.get.mockResolvedValue({ data: [] });

		renderHook(() => useFetch("/workouts"));
		await waitFor(() => expect(api.get).toHaveBeenCalledWith("/workouts"));
	});

	it("keeps loading false during a refetch so open UI is not unmounted", async () => {
		api.get.mockResolvedValue({ data: [{ id: 1 }] });
		const { result } = renderHook(() => useFetch("/test"));
		await waitFor(() => expect(result.current.loading).toBe(false));

		// Make the next fetch hang so we can observe state mid-refetch.
		let resolve;
		api.get.mockReturnValue(
			new Promise((r) => {
				resolve = r;
			}),
		);
		act(() => {
			result.current.refetch();
		});

		// While the refetch is in flight, loading must stay false (stale data shown).
		expect(result.current.loading).toBe(false);

		await act(async () => {
			resolve({ data: [{ id: 1 }, { id: 2 }] });
		});
		expect(result.current.data).toHaveLength(2);
	});

	it("refetch triggers a second API call", async () => {
		api.get.mockResolvedValue({ data: [] });

		const { result } = renderHook(() => useFetch("/test"));
		await waitFor(() => expect(result.current.loading).toBe(false));

		result.current.refetch();
		await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
	});

	it("re-fetches when endpoint changes", async () => {
		api.get.mockResolvedValue({ data: [] });

		const { rerender } = renderHook(({ ep }) => useFetch(ep), {
			initialProps: { ep: "/workouts" },
		});
		await waitFor(() => expect(api.get).toHaveBeenCalledWith("/workouts"));

		rerender({ ep: "/nutrition" });
		await waitFor(() => expect(api.get).toHaveBeenCalledWith("/nutrition"));
	});
});

describe("useFetch — shared cache", () => {
	it("a second user of the same endpoint gets cached data instantly, then revalidates", async () => {
		api.get.mockResolvedValue({ data: [{ id: 1 }] });
		const first = renderHook(() => useFetch("/cached"));
		await waitFor(() => expect(first.result.current.loading).toBe(false));
		first.unmount();

		api.get.mockResolvedValue({ data: [{ id: 1 }, { id: 2 }] });
		const second = renderHook(() => useFetch("/cached"));
		// Cached value is shown immediately, without a loading state
		expect(second.result.current.loading).toBe(false);
		expect(second.result.current.data).toEqual([{ id: 1 }]);
		// ...and is refreshed in the background
		await waitFor(() => expect(second.result.current.data).toHaveLength(2));
		expect(api.get).toHaveBeenCalledTimes(2);
	});

	it("components mounting together share one request", async () => {
		api.get.mockResolvedValue({ data: [{ id: 1 }] });
		const a = renderHook(() => useFetch("/shared"));
		const b = renderHook(() => useFetch("/shared"));
		await waitFor(() => expect(b.result.current.loading).toBe(false));
		expect(a.result.current.data).toEqual([{ id: 1 }]);
		expect(api.get).toHaveBeenCalledTimes(1);
	});

	it("refetch in one component updates every component on that endpoint", async () => {
		api.get.mockResolvedValue({ data: [{ id: 1 }] });
		const a = renderHook(() => useFetch("/sync"));
		const b = renderHook(() => useFetch("/sync"));
		await waitFor(() => expect(b.result.current.loading).toBe(false));

		api.get.mockResolvedValue({ data: [{ id: 1 }, { id: 9 }] });
		await act(async () => {
			a.result.current.refetch();
		});
		await waitFor(() => expect(b.result.current.data).toHaveLength(2));
	});

	it("keeps showing cached data when a background refresh fails", async () => {
		api.get.mockResolvedValue({ data: [{ id: 1 }] });
		const first = renderHook(() => useFetch("/flaky"));
		await waitFor(() => expect(first.result.current.loading).toBe(false));
		first.unmount();

		api.get.mockRejectedValue(new Error("offline"));
		const second = renderHook(() => useFetch("/flaky"));
		await waitFor(() => expect(second.result.current.error).toBe("offline"));
		expect(second.result.current.data).toEqual([{ id: 1 }]);
	});

	it("logging out clears the cache", async () => {
		api.get.mockResolvedValue({ data: [{ id: 1 }] });
		const first = renderHook(() => useFetch("/private"));
		await waitFor(() => expect(first.result.current.loading).toBe(false));
		first.unmount();

		act(() => {
			useAuthStore.getState().login("kavin");
			useAuthStore.getState().logout();
		});

		api.get.mockReturnValue(new Promise(() => {}));
		const second = renderHook(() => useFetch("/private"));
		expect(second.result.current.loading).toBe(true);
		expect(second.result.current.data).toEqual([]);
	});

	it("switching to a different user clears the cache", async () => {
		act(() => useAuthStore.getState().login("alice"));
		api.get.mockResolvedValue({ data: [{ id: 1 }] });
		const first = renderHook(() => useFetch("/mine"));
		await waitFor(() => expect(first.result.current.loading).toBe(false));
		first.unmount();

		act(() => useAuthStore.getState().login("bob"));
		api.get.mockReturnValue(new Promise(() => {}));
		const second = renderHook(() => useFetch("/mine"));
		expect(second.result.current.data).toEqual([]);
		act(() => useAuthStore.getState().logout());
	});
});
