/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { test, expect, type Page, type Locator } from "@playwright/test";
import { loadTestPage, awaitIdle } from "../utils";

const report = "#abledom-report";
// Individual issues inside groups (excludes group titles which also have .abledom-issue).
const groupedIssueSelector = `${report} .abledom-issue-group-issues .abledom-issue`;
// Standalone issues not inside any group.
const standaloneIssueSelector = `${report} > .abledom-issues-container > div:not(.abledom-issue-group) .abledom-issue`;
// All actual issues (both standalone and grouped, excluding group titles).
const allIssueSelector = `${groupedIssueSelector}, ${standaloneIssueSelector}`;
const allIssueWrapperSelector = `${report} .abledom-issue-container-wrapper`;
const groupSelector = `${report} .abledom-issue-group`;
const groupTitleSelector = `${report} .abledom-issue-group-title`;
const menuContainerSelector = `${report} .abledom-menu-container`;
const menuSelector = `${report} .abledom-menu`;
const issueCountSelector = `${report} .issues-count`;

async function hoverMenu(page: Page): Promise<void> {
  await page.locator(menuContainerSelector).hover();
}

function getShowAllButton(page: Page): Locator {
  return page.locator(`${menuSelector} button[title="Show all issues"]`);
}

function getHideAllButton(page: Page): Locator {
  return page.locator(`${menuSelector} button[title="Hide all issues"]`);
}

function getMuteButton(page: Page): Locator {
  return page.locator(
    `${menuSelector} button[title="Mute newly appearing issues"], ${menuSelector} button[title="Unmute newly appearing issues"]`,
  );
}

function getIssueCountElement(page: Page): Locator {
  return page.locator(issueCountSelector);
}

async function sendNotification(page: Page, message: string): Promise<void> {
  await page.evaluate((msg) => {
    (
      window as Window & {
        __notifyRule?: { customNotify: (m: string) => void };
      }
    ).__notifyRule?.customNotify(msg);
  }, message);
}

async function clearButtonLabels(page: Page): Promise<void> {
  await page.evaluate(() => {
    for (const id of ["btn-1", "btn-2", "btn-3"]) {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = "";
      }
    }
  });
}

async function restoreButtonLabels(page: Page): Promise<void> {
  await page.evaluate(() => {
    const labels: Record<string, string> = {
      "btn-1": "Button 1",
      "btn-2": "Button 2",
      "btn-3": "Button 3",
    };
    for (const [id, text] of Object.entries(labels)) {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = text;
      }
    }
  });
}

async function getVisibleIssueCount(page: Page): Promise<number> {
  return page
    .locator(allIssueWrapperSelector)
    .evaluateAll(
      (elements) =>
        elements.filter(
          (element) => (element as HTMLElement).style.display !== "none",
        ).length,
    );
}

async function getTotalIssueCount(page: Page): Promise<number> {
  return page.locator(allIssueWrapperSelector).count();
}

async function getReportedIssueCount(page: Page): Promise<number> {
  const countText = (await getIssueCountElement(page).textContent()) || "";
  const match = countText.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

async function getVisibleGroupCount(page: Page): Promise<number> {
  return page.locator(groupSelector).filter({ visible: true }).count();
}

function getGroupByName(page: Page, name: string): Locator {
  return page.locator(groupSelector).filter({ hasText: name }).first();
}

async function ensureGroupExpanded(group: Locator): Promise<void> {
  const issuesContainer = group.locator(".abledom-issue-group-issues");

  if (!(await issuesContainer.isVisible())) {
    await group
      .locator(`.abledom-issue-group-title button[title="Toggle group"]`)
      .click();
    await expect(issuesContainer).toBeVisible();
  }
}

async function setup(page: Page): Promise<void> {
  await loadTestPage(page, "tests/notificationsUI/notificationsUI.html");
  await awaitIdle(page);
}

test.describe("Notifications UI", () => {
  test.describe("Standalone issues (CustomNotifyRule)", () => {
    test("standalone notification appears in the UI", async ({ page }) => {
      await setup(page);

      const initialCount = await getVisibleIssueCount(page);

      await sendNotification(page, "Test notification 1");
      await awaitIdle(page);

      expect(await getVisibleIssueCount(page)).toBe(initialCount + 1);
    });

    test("multiple standalone notifications appear independently", async ({
      page,
    }) => {
      await setup(page);
      const initialCount = await getVisibleIssueCount(page);

      await sendNotification(page, "Notification A");
      await awaitIdle(page);
      await sendNotification(page, "Notification B");
      await awaitIdle(page);

      expect(await getVisibleIssueCount(page)).toBe(initialCount + 2);
    });

    test("closing a standalone notification removes it (non-anchored dispose)", async ({
      page,
    }) => {
      await setup(page);
      const initialCount = await getVisibleIssueCount(page);

      await sendNotification(page, "Will be closed");
      await awaitIdle(page);
      expect(await getVisibleIssueCount(page)).toBe(initialCount + 1);

      // Click the close button on the last standalone issue.
      const standaloneIssues = page.locator(standaloneIssueSelector);
      await standaloneIssues.last().locator('button[title="Hide"]').click();

      // Non-anchored issues get disposed on hide, so count drops.
      expect(await getVisibleIssueCount(page)).toBe(initialCount);
    });

    test("standalone notification does not appear in a group", async ({
      page,
    }) => {
      await setup(page);
      const initialGroupCount = await getVisibleGroupCount(page);

      await sendNotification(page, "Standalone check");
      await awaitIdle(page);

      // Notification should not create a new group.
      expect(await getVisibleGroupCount(page)).toBe(initialGroupCount);
    });
  });

  test.describe("Grouped issues (label rule)", () => {
    test("label rule issues appear in a single group", async ({ page }) => {
      await setup(page);
      const initialGroupCount = await getVisibleGroupCount(page);

      await clearButtonLabels(page);
      await awaitIdle(page);

      // 3 label issues should form one group.
      const labelGroups = page.locator(
        `${groupTitleSelector}:has-text("Missing text label")`,
      );
      await expect(labelGroups).toHaveCount(1);
      expect(await getVisibleGroupCount(page)).toBe(initialGroupCount + 1);
    });

    test("fixing all label issues removes issues from the group", async ({
      page,
    }) => {
      await setup(page);

      await clearButtonLabels(page);
      await awaitIdle(page);

      const issuesBefore = await getVisibleIssueCount(page);

      await restoreButtonLabels(page);
      await awaitIdle(page);

      // All 3 label issues should be gone.
      expect(await getVisibleIssueCount(page)).toBe(issuesBefore - 3);
    });

    test("group close button hides all issues within the group", async ({
      page,
    }) => {
      await setup(page);

      await clearButtonLabels(page);
      await awaitIdle(page);

      const labelGroup = getGroupByName(page, "Missing text label");

      await expect(labelGroup).toBeVisible();

      // Click the close button on the group title.
      await labelGroup
        .locator(`.abledom-issue-group-title button[title="Hide"]`)
        .click();

      // The group should be hidden.
      await expect(labelGroup).toBeHidden();
    });

    test("individual issue close button hides only that issue", async ({
      page,
    }) => {
      await setup(page);

      await clearButtonLabels(page);
      await awaitIdle(page);

      const labelGroup = getGroupByName(page, "Missing text label");
      await ensureGroupExpanded(labelGroup);

      const issueWrappers = labelGroup.locator(
        `.abledom-issue-group-issues > div`,
      );
      const wrapperCountBefore = await issueWrappers.count();
      expect(wrapperCountBefore).toBe(3);

      // Close just the first issue wrapper.
      await issueWrappers.first().locator('button[title="Hide"]').click();

      // Group still visible (2 remaining).
      await expect(labelGroup).toBeVisible();

      const visibleWrappers = issueWrappers.filter({ visible: true });
      expect(await visibleWrappers.count()).toBe(wrapperCountBefore - 1);
    });

    test("closing all individual issues in a group hides the group", async ({
      page,
    }) => {
      await setup(page);

      await clearButtonLabels(page);
      await awaitIdle(page);

      const labelGroup = getGroupByName(page, "Missing text label");
      await ensureGroupExpanded(labelGroup);

      // Close each issue individually.
      const wrappers = labelGroup.locator(`.abledom-issue-group-issues > div`);
      const count = await wrappers.count();

      for (let i = 0; i < count; i++) {
        await wrappers.nth(i).locator('button[title="Hide"]').click();
      }

      // Group should now be hidden since all children are hidden.
      await expect(labelGroup).toBeHidden();
    });
  });

  test.describe("Grouped issues (contrast rule)", () => {
    test("contrast issues appear in groups", async ({ page }) => {
      await setup(page);

      // The two bad-contrast buttons produce issues.
      expect(await getVisibleIssueCount(page)).toBeGreaterThanOrEqual(2);
      expect(await getVisibleGroupCount(page)).toBeGreaterThanOrEqual(1);
    });

    test("adding a new contrast issue dynamically updates the UI", async ({
      page,
    }) => {
      await setup(page);
      const initialIssues = await getVisibleIssueCount(page);

      // Make the good-contrast element bad.
      await page.evaluate(() => {
        const el = document.getElementById("contrast-good");
        if (el) {
          el.style.color = "#fff";
          el.style.backgroundColor = "#fff";
        }
      });
      await awaitIdle(page);

      expect(await getVisibleIssueCount(page)).toBeGreaterThan(initialIssues);
    });
  });

  test.describe("Group toggle button (chevron)", () => {
    test("clicking toggle collapses the group issues", async ({ page }) => {
      await setup(page);

      await clearButtonLabels(page);
      await awaitIdle(page);

      const labelGroup = getGroupByName(page, "Missing text label");

      const issuesContainer = labelGroup.locator(".abledom-issue-group-issues");
      await ensureGroupExpanded(labelGroup);

      // Click the toggle button (chevron).
      await labelGroup
        .locator(`.abledom-issue-group-title button[title="Toggle group"]`)
        .click();

      // Issues container should be hidden.
      await expect(issuesContainer).toBeHidden();
    });

    test("clicking toggle again expands the group issues", async ({ page }) => {
      await setup(page);

      await clearButtonLabels(page);
      await awaitIdle(page);

      const labelGroup = getGroupByName(page, "Missing text label");

      const issuesContainer = labelGroup.locator(".abledom-issue-group-issues");
      const toggleBtn = labelGroup.locator(
        `.abledom-issue-group-title button[title="Toggle group"]`,
      );

      // Collapse then expand.
      await ensureGroupExpanded(labelGroup);
      await toggleBtn.click();
      await expect(issuesContainer).toBeHidden();

      await toggleBtn.click();
      await expect(issuesContainer).toBeVisible();
    });

    test("group shows issue count", async ({ page }) => {
      await setup(page);

      await clearButtonLabels(page);
      await awaitIdle(page);

      const labelGroup = getGroupByName(page, "Missing text label");

      const countEl = labelGroup.locator(".abledom-issue-group-count");
      await expect(countEl).toHaveText("3");
    });

    test("collapsing group does not affect show/hide all buttons (issues remain shown)", async ({
      page,
    }) => {
      await setup(page);

      await clearButtonLabels(page);
      await awaitIdle(page);

      // All visible, so show-all should be hidden.
      await hoverMenu(page);
      await expect(getShowAllButton(page)).toBeHidden();

      // Collapse the label group (toggle does not call issue.toggle).
      const labelGroup = getGroupByName(page, "Missing text label");
      await ensureGroupExpanded(labelGroup);
      await labelGroup
        .locator(`.abledom-issue-group-title button[title="Toggle group"]`)
        .click();

      // Show-all should still be hidden since issues aren't actually hidden.
      await hoverMenu(page);
      await expect(getShowAllButton(page)).toBeHidden();
    });
  });

  test.describe("Show all / Hide all buttons", () => {
    test("hide all button hides every issue", async ({ page }) => {
      await setup(page);

      await clearButtonLabels(page);
      await awaitIdle(page);

      expect(await getVisibleIssueCount(page)).toBeGreaterThan(0);

      await hoverMenu(page);
      await getHideAllButton(page).click();

      expect(await getVisibleIssueCount(page)).toBe(0);
    });

    test("show all button shows every issue after hide all", async ({
      page,
    }) => {
      await setup(page);

      await clearButtonLabels(page);
      await awaitIdle(page);
      const totalIssues = await getVisibleIssueCount(page);

      await hoverMenu(page);
      await getHideAllButton(page).click();
      expect(await getVisibleIssueCount(page)).toBe(0);

      await hoverMenu(page);
      await getShowAllButton(page).click();

      expect(await getVisibleIssueCount(page)).toBe(totalIssues);
    });

    test("hide all button is hidden when all issues are already hidden", async ({
      page,
    }) => {
      await setup(page);

      await hoverMenu(page);
      await getHideAllButton(page).click();

      await hoverMenu(page);
      await expect(getHideAllButton(page)).toBeHidden();
    });

    test("show all button is hidden when all issues are already visible", async ({
      page,
    }) => {
      await setup(page);

      // All issues visible initially.
      await hoverMenu(page);
      await expect(getShowAllButton(page)).toBeHidden();
    });

    test("show all button appears after hiding one issue", async ({ page }) => {
      await setup(page);

      // Initially show-all is hidden.
      await hoverMenu(page);
      await expect(getShowAllButton(page)).toBeHidden();

      // Hide one issue via group close button.
      const firstGroup = page.locator(groupSelector).first();
      await firstGroup
        .locator(`.abledom-issue-group-title button[title="Hide"]`)
        .click();

      // Show all button should now appear.
      await hoverMenu(page);
      await expect(getShowAllButton(page)).toBeVisible();
    });

    test("hide all button disappears after all issues are hidden individually", async ({
      page,
    }) => {
      await setup(page);

      // Hide all groups via their close buttons.
      const groups = page.locator(groupSelector);
      const groupCount = await groups.count();

      for (let i = 0; i < groupCount; i++) {
        const group = groups.nth(i);
        if (await group.isVisible()) {
          await group
            .locator(`.abledom-issue-group-title button[title="Hide"]`)
            .click();
        }
      }

      await hoverMenu(page);
      await expect(getHideAllButton(page)).toBeHidden();
    });

    test("show all restores group visibility after group close", async ({
      page,
    }) => {
      await setup(page);

      await clearButtonLabels(page);
      await awaitIdle(page);

      // Close the label group.
      const labelGroup = getGroupByName(page, "Missing text label");
      await labelGroup
        .locator(`.abledom-issue-group-title button[title="Hide"]`)
        .click();
      await expect(labelGroup).toBeHidden();

      // Show all should restore everything.
      await hoverMenu(page);
      await getShowAllButton(page).click();
      await expect(labelGroup).toBeVisible();
    });
  });

  test.describe("Issue count display", () => {
    test("issue count shows correct number", async ({ page }) => {
      await setup(page);

      const totalCount = await getTotalIssueCount(page);
      const countText = await getIssueCountElement(page).textContent();

      expect(await getReportedIssueCount(page)).toBe(totalCount);
      expect(countText).toContain("issue");
    });

    test("issue count updates when new issues appear", async ({ page }) => {
      await setup(page);
      const initialCount = await getTotalIssueCount(page);

      await clearButtonLabels(page);
      await awaitIdle(page);
      const newCount = await getTotalIssueCount(page);

      expect(newCount).toBe(initialCount + 3);
      expect(await getReportedIssueCount(page)).toBe(newCount);
    });

    test("clicking issue count toggles all issues", async ({ page }) => {
      await setup(page);

      const totalIssues = await getVisibleIssueCount(page);
      expect(totalIssues).toBeGreaterThan(0);

      // All visible → toggleAll() hides all.
      await getIssueCountElement(page).click();
      expect(await getVisibleIssueCount(page)).toBe(0);

      // All hidden → toggleAll() shows all.
      await getIssueCountElement(page).click();
      expect(await getVisibleIssueCount(page)).toBe(totalIssues);
    });
  });

  test.describe("Mute button", () => {
    test("muting prevents new issues from showing", async ({ page }) => {
      await setup(page);

      const initialVisible = await getVisibleIssueCount(page);
      const initialTotal = await getTotalIssueCount(page);

      // Click mute.
      await hoverMenu(page);
      await getMuteButton(page).click();

      // Add new issues while muted.
      await clearButtonLabels(page);
      await awaitIdle(page);

      // Visible list should stay the same; new label issues are hidden.
      expect(await getVisibleIssueCount(page)).toBe(initialVisible);

      // Total count should include muted issues as well.
      const totalAfterMute = await getTotalIssueCount(page);
      expect(totalAfterMute).toBe(initialTotal + 3);
      expect(await getReportedIssueCount(page)).toBe(totalAfterMute);

      // The group title should not be visible either.
      const labelGroup = getGroupByName(page, "Missing text label");
      await expect(labelGroup).toBeHidden();
    });

    test("unmuting and showing all reveals muted issues", async ({ page }) => {
      await setup(page);

      // Mute.
      await hoverMenu(page);
      await getMuteButton(page).click();

      // Create new issues.
      await clearButtonLabels(page);
      await awaitIdle(page);

      // Unmute.
      await hoverMenu(page);
      await getMuteButton(page).click();

      // Show all to reveal previously muted issues.
      await hoverMenu(page);
      await getShowAllButton(page).click();

      // All issues should now be visible.
      const total = await page.locator(allIssueSelector).count();
      expect(await getVisibleIssueCount(page)).toBe(total);
    });

    test("mute button toggles title text", async ({ page }) => {
      await setup(page);

      await hoverMenu(page);
      const muteBtn = getMuteButton(page);

      await expect(muteBtn).toHaveAttribute(
        "title",
        "Mute newly appearing issues",
      );

      await muteBtn.click();

      await expect(muteBtn).toHaveAttribute(
        "title",
        "Unmute newly appearing issues",
      );

      await muteBtn.click();

      await expect(muteBtn).toHaveAttribute(
        "title",
        "Mute newly appearing issues",
      );
    });
  });

  test.describe("Mixed standalone and grouped issues", () => {
    test("hiding a group does not affect standalone issues", async ({
      page,
    }) => {
      await setup(page);

      await clearButtonLabels(page);
      await sendNotification(page, "Standalone mixed test");
      await awaitIdle(page);

      const standaloneIssues = page.locator(standaloneIssueSelector);
      const standaloneCountBefore = await standaloneIssues.count();
      expect(standaloneCountBefore).toBeGreaterThan(0);

      // Close the label group.
      const labelGroup = getGroupByName(page, "Missing text label");
      await labelGroup
        .locator(`.abledom-issue-group-title button[title="Hide"]`)
        .click();

      // Standalone issues should still be visible.
      const visibleStandalone = standaloneIssues.filter({ visible: true });
      expect(await visibleStandalone.count()).toBe(standaloneCountBefore);
    });

    test("hide all hides both standalone and grouped issues", async ({
      page,
    }) => {
      await setup(page);

      await clearButtonLabels(page);
      await sendNotification(page, "Standalone to be hidden");
      await awaitIdle(page);

      expect(await getVisibleIssueCount(page)).toBeGreaterThan(0);

      await hoverMenu(page);
      await getHideAllButton(page).click();

      expect(await getVisibleIssueCount(page)).toBe(0);
    });

    test("show all restores grouped issues but not disposed standalone issues", async ({
      page,
    }) => {
      await setup(page);

      await clearButtonLabels(page);
      await sendNotification(page, "Standalone to restore");
      await awaitIdle(page);

      const standaloneBefore = await page
        .locator(standaloneIssueSelector)
        .filter({ visible: true })
        .count();
      const totalVisibleBefore = await getVisibleIssueCount(page);
      expect(standaloneBefore).toBeGreaterThan(0);

      await hoverMenu(page);
      await getHideAllButton(page).click();
      expect(await getVisibleIssueCount(page)).toBe(0);

      await hoverMenu(page);
      await getShowAllButton(page).click();

      // Grouped (anchored) issues are restored; standalone (non-anchored)
      // issues were disposed when hidden.
      expect(await getVisibleIssueCount(page)).toBe(
        totalVisibleBefore - standaloneBefore,
      );
    });
  });

  test.describe("Menu visibility", () => {
    test("menu is visible when there are issues", async ({ page }) => {
      await setup(page);

      const menu = page.locator(menuContainerSelector);
      await expect(menu).toBeVisible();
    });
  });

  test.describe("Show/hide button state consistency", () => {
    test("after hiding some issues: both buttons visible", async ({ page }) => {
      await setup(page);

      await clearButtonLabels(page);
      await awaitIdle(page);

      // Hide just one group.
      const firstGroup = page.locator(groupSelector).first();
      await firstGroup
        .locator(`.abledom-issue-group-title button[title="Hide"]`)
        .click();

      // Both buttons should be visible (some hidden, some shown).
      await hoverMenu(page);
      await expect(getShowAllButton(page)).toBeVisible();
      await expect(getHideAllButton(page)).toBeVisible();
    });

    test("after show all: hide all visible, show all hidden", async ({
      page,
    }) => {
      await setup(page);

      // Hide all first.
      await hoverMenu(page);
      await getHideAllButton(page).click();

      // Show all.
      await hoverMenu(page);
      await getShowAllButton(page).click();

      await hoverMenu(page);
      await expect(getShowAllButton(page)).toBeHidden();
      await expect(getHideAllButton(page)).toBeVisible();
    });

    test("after hide all: show all visible, hide all hidden", async ({
      page,
    }) => {
      await setup(page);

      await hoverMenu(page);
      await getHideAllButton(page).click();

      await hoverMenu(page);
      await expect(getHideAllButton(page)).toBeHidden();
      await expect(getShowAllButton(page)).toBeVisible();
    });

    test("group close updates show/hide button state", async ({ page }) => {
      await setup(page);

      await clearButtonLabels(page);
      await awaitIdle(page);

      // All visible initially.
      await hoverMenu(page);
      await expect(getShowAllButton(page)).toBeHidden();

      // Close the label group.
      const labelGroup = page
        .locator(groupSelector)
        .filter({
          has: page.locator(`:has-text("Missing text label")`),
        })
        .first();
      await labelGroup
        .locator(`.abledom-issue-group-title button[title="Hide"]`)
        .click();

      // Now some are hidden, so show all button should appear.
      await hoverMenu(page);
      await expect(getShowAllButton(page)).toBeVisible();
      // And hide all should still be visible (contrast issues still showing).
      await expect(getHideAllButton(page)).toBeVisible();
    });
  });
});
