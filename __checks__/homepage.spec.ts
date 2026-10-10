import { test, expect } from '@playwright/test'

// This test is being used as a Browser check
// See browserCheck.testMatch in your checkly.config.ts to configure

test('Picksy homepage responds and identifies the site', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.status()).toBe(200)
  await expect(page).toHaveTitle(/Picksy/)
  await expect(page.getByRole('link', { name: /Picksy/ }).first()).toBeVisible()
})
