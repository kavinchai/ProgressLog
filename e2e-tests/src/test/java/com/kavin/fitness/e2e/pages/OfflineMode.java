package com.kavin.fitness.e2e.pages;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Route;
import com.microsoft.playwright.options.WaitForSelectorState;

import java.net.URI;
import java.util.function.Consumer;
import java.util.function.Predicate;

/**
 * Cuts the app off from the server (every /api request fails, as with no
 * signal) while the page itself still loads, like the iOS app whose screens
 * are bundled. Also the offline banner and the save error a sheet shows.
 */
public class OfflineMode {
    private final Page page;
    private final Predicate<String> apiRequest =
            url -> URI.create(url).getPath().startsWith("/api/");
    private final Consumer<Route> fail = Route::abort;

    public OfflineMode(Page page) {
        this.page = page;
    }

    public void cutOffServer() {
        page.route(apiRequest, fail);
    }

    public void reconnect() {
        page.unroute(apiRequest, fail);
    }

    private Locator banner() {
        return page.locator(".offline-banner");
    }

    /** Waits for the offline banner to show text containing {@code text}. */
    public void waitForBanner(String text) {
        banner().filter(new Locator.FilterOptions().setHasText(text)).waitFor();
    }

    public void waitForNoBanner() {
        banner().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.DETACHED));
    }

    /** Presses Save on the open sheet and waits for its error message; the sheet stays open. */
    public void pressSaveExpectingError(String message) {
        page.locator(".modal-box .modal-header-save").click();
        page.locator(".modal-box .modal-error").filter(
                new Locator.FilterOptions().setHasText(message)).waitFor();
    }
}
