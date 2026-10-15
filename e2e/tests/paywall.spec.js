// @ts-check
const { test, expect } = require("@playwright/test");

const API_URL = "http://localhost:5555";

// Every test gets a fresh browser context, so it starts with an empty session.

test.describe("API: /articles/<id> paywall", () => {
  test("allows three article views, then returns 401", async ({ playwright }) => {
    const api = await playwright.request.newContext({ baseURL: API_URL });

    for (const id of [1, 2, 3]) {
      const res = await api.get(`/articles/${id}`);
      expect(res.status()).toBe(200);
      expect(await res.json()).toMatchObject({ id, title: expect.any(String) });
    }

    const blocked = await api.get("/articles/4");
    expect(blocked.status()).toBe(401);
    expect(await blocked.json()).toEqual({ message: "Maximum pageview limit reached" });

    await api.dispose();
  });

  test("/clear resets the page view count", async ({ playwright }) => {
    const api = await playwright.request.newContext({ baseURL: API_URL });

    for (const id of [1, 2, 3, 4]) await api.get(`/articles/${id}`);
    expect((await api.get("/articles/5")).status()).toBe(401);

    expect((await api.get("/clear")).status()).toBe(200);
    expect((await api.get("/articles/5")).status()).toBe(200);

    await api.dispose();
  });
});

test.describe("UI: blog paywall", () => {
  test("home page lists articles", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Lorem Blogum" })).toBeVisible();
    await expect(page.locator("main article")).not.toHaveCount(0);
  });

  test("shows three articles, then the paywall", async ({ page }) => {
    for (const id of [1, 2, 3]) {
      await page.goto(`/articles/${id}`);
      await expect(page.getByText(/Written by/)).toBeVisible();
    }

    await page.goto("/articles/4");
    await expect(page.getByRole("heading", { name: "Maximum articles viewed" })).toBeVisible();
  });

  test("clicking through from the home page counts toward the limit", async ({ page }) => {
    await page.goto("/");
    const links = page.locator("main article h3 a");
    await expect(links.first()).toBeVisible();

    for (let i = 0; i < 3; i++) {
      await links.nth(i).click();
      await expect(page.getByText(/Written by/)).toBeVisible();
      await page.getByRole("link", { name: "Lorem Blogum" }).click();
      await expect(page).toHaveURL("/");
      await expect(links.nth(i + 1)).toBeVisible();
    }

    await links.nth(3).click();
    await expect(page.getByRole("heading", { name: "Maximum articles viewed" })).toBeVisible();
  });
});
