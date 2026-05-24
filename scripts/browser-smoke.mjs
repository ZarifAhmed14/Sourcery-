import assert from "node:assert/strict"
import { chromium } from "playwright"

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000"

async function chooseSelect(page, label, option) {
  await page.getByLabel(label).click()
  await page.getByRole("option", { name: option, exact: true }).click()
}

async function expectWorkspaceSelection(page, category, product, type) {
  await page.waitForLoadState("networkidle")
  await assert.equal(await page.getByLabel("Category").textContent(), category)
  await assert.equal(await page.getByLabel("Product").textContent(), product)
  await assert.match(await page.getByText(type, { exact: true }).first().textContent(), new RegExp(type))
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext()
const page = await context.newPage()

try {
  await page.goto(`${baseUrl}/app`, { waitUntil: "networkidle" })

  await chooseSelect(page, "Category", "Apparel")
  await chooseSelect(page, "Product", "Organic cotton hoodies")
  await page.getByRole("button", { name: /Pullover hoodie/i }).click()
  await page.getByRole("button", { name: /Find suppliers/i }).click()
  await page.waitForURL(/\/app$/)
  await page.waitForSelector("text=Ranked suppliers", { timeout: 15000 })
  await page.waitForSelector("text=Pullover hoodie", { timeout: 15000 })

  const firstSupplierLink = page.locator('a[href^="/app/suppliers/"]').first()
  await firstSupplierLink.click()
  await page.waitForURL(/\/app\/suppliers\//)
  await page.goBack({ waitUntil: "networkidle" })
  await expectWorkspaceSelection(page, "Apparel", "Organic cotton hoodies", "Pullover hoodie")

  await page.locator('a[href^="/app/compare"]').first().click()
  await page.waitForURL(/\/app\/compare/)
  await page.goBack({ waitUntil: "networkidle" })
  await expectWorkspaceSelection(page, "Apparel", "Organic cotton hoodies", "Pullover hoodie")

  await page.goto(`${baseUrl}/app/dashboard`, { waitUntil: "networkidle" })
  const rerunButton = page.getByRole("link", { name: /Re-run/i }).first()
  await assert.equal(await rerunButton.count() > 0, true)
  await rerunButton.click()
  await page.waitForURL(/\/app\?rerun=1/)
  await page.waitForSelector("text=Ranked suppliers", { timeout: 15000 })
  await expectWorkspaceSelection(page, "Apparel", "Organic cotton hoodies", "Pullover hoodie")

  console.log("browser smoke passed")
} finally {
  await browser.close()
}
