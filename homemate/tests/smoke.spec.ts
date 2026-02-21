import { test, expect } from "@playwright/test";

test("home loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("HomeMate")).toBeVisible();
});

test("transactions add flow", async ({ page }) => {
  await page.goto("/transactions");
  await expect(page.getByRole("heading", { name: "记账" })).toBeVisible();

  await page.getByRole("button", { name: "+ 添加记录" }).click();
  await expect(page.getByRole("dialog", { name: "新增记账" })).toBeVisible();

  await page.getByLabel("金额").fill("12.5");
  await page.getByLabel("币种").click();
  await page.getByRole("option", { name: "CNY" }).click();
  await page.getByLabel("日期").click();
  await page.keyboard.press("Enter");

  await page.getByRole("button", { name: "保存" }).click();
  await expect(page.getByRole("dialog", { name: "新增记账" })).toBeHidden();
  await expect(page.getByText("¥12.50")).toBeVisible();
});
