import "@testing-library/jest-dom";
import { afterEach } from "vitest";

// useFetch shares one module-level cache; start every test with it empty.
// Imported lazily so this file doesn't load ../api before a test's vi.mock.
afterEach(async () => {
	const { clearFetchCache } = await import("../hooks/useFetch");
	clearFetchCache();
});
