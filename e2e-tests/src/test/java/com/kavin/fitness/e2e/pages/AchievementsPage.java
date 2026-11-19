package com.kavin.fitness.e2e.pages;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import com.microsoft.playwright.options.LoadState;
import java.util.List;

/**
 * Achievements: the card at the top of Progress, the Achievements screen with
 * its badges, the badge sheet, and the lifetime weight screen.
 */
public class AchievementsPage {
    private final Page page;

    public AchievementsPage(Page page) {
        this.page = page;
    }

    /** Opens Progress and taps its Achievements card. */
    public void openFromProgress(String baseUrl) {
        page.navigate(baseUrl + "/progress/strength");
        page.waitForLoadState(LoadState.NETWORKIDLE);
        page.locator("button.achievements-entry").click();
        page.getByRole(AriaRole.HEADING,
                new Page.GetByRoleOptions().setName("Achievements").setExact(true)).waitFor();
    }

    private Locator badge(String name, boolean earned) {
        return page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions()
                .setName(name + ", " + (earned ? "earned" : "not earned yet")).setExact(true));
    }

    /** Waits up to 5s for the badge to show as earned. */
    public boolean isBadgeEarned(String name) {
        try {
            badge(name, true).waitFor(new Locator.WaitForOptions().setTimeout(5000));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** Taps a badge (earned or not) and returns its sheet. */
    public Locator openBadge(String name) {
        page.locator("button.badge-cell[aria-label^='" + name + ", ']").click();
        Locator sheet = page.getByRole(AriaRole.DIALOG);
        sheet.waitFor();
        return sheet;
    }

    public void closeSheet() {
        page.locator(".modal-box .modal-close").click();
        page.locator(".modal-box").waitFor(
                new Locator.WaitForOptions().setState(com.microsoft.playwright.options.WaitForSelectorState.DETACHED));
    }

    /** Taps the lifetime weight card and waits for its screen. */
    public void openWeightLifted() {
        page.locator("button.volume-card").click();
        page.locator(".weight-hero-total").waitFor();
    }

    /** The drawing file each weight milestone shows, top to bottom. */
    public List<String> milestoneDrawings() {
        Locator list = page.getByRole(AriaRole.REGION, new Page.GetByRoleOptions().setName("Milestones"));
        list.locator("img").first().waitFor();
        return list.locator("img").evaluateAll("imgs => imgs.map(i => i.getAttribute('src'))")
                instanceof List<?> raw
                ? raw.stream().map(String::valueOf).toList()
                : List.of();
    }
}
