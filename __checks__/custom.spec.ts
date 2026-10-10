import { test, expect } from '@playwright/test'

// You can override the default Playwright test timeout of 30s
// test.setTimeout(60_000);

test('Picksy Studio route loads', async ({ page }) => {
  const response = await page.goto('/studio')
  expect(response?.status()).toBe(200)
  await expect(page.locator('#sanity')).toBeVisible()
})
