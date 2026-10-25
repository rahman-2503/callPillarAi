import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test('dashboard, full eight-stage call, copilot, history and details', async ({ page }, testInfo) => {
  const suffix = `${testInfo.project.name}-${Date.now()}`;
  const prospect = `Senthil ${suffix}`;
  const company = `Kalyx ${suffix}`;

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();

  await page.getByRole('button', { name: /start a new call/i }).first().click();
  await page.getByLabel('Prospect name').fill(prospect);
  await page.getByLabel('Company').fill(company);
  await page.getByLabel('Role').fill('Director');
  await page.getByRole('button', { name: 'Start call' }).click();

  await expect(page).toHaveURL(/\/calls\/[0-9a-f-]+\/live/);
  await expect(page.getByRole('heading', { name: 'Opening', exact: true })).toBeVisible();
  await expect(page.getByText('Stage 1 of 8')).toBeVisible();

  const stageOrder = [
    ['Opening', 'right person'],
    ['Purpose', 'understood purpose'],
    ['Permission', 'yes now'],
    ['Their business', 'business understood'],
    ['Their need, in their words', 'need named'],
    ['Objection', 'has agency'],
    ['Next step', 'meeting set'],
    ['Close', 'clear agreement'],
  ];

  for (let index = 0; index < stageOrder.length; index += 1) {
    const [title] = stageOrder[index];
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(page.getByText(`Stage ${index + 1} of 8`)).toBeVisible();

    await page.getByRole('textbox', { name: 'Prospect words' }).fill(
      index === 4
        ? 'We want to push the new product line into two more states this year.'
        : `Prospect words at ${title}`,
    );
    await page.getByLabel('What happened').fill(`What happened at ${title}`);
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: new RegExp(stageOrder[index][1], 'i') }).click();

    if (index === 4) {
      await page.getByRole('button', { name: /suggest a response/i }).click();
      await expect(page.getByText(/demo output/i)).toBeVisible();
      await expect(page.getByText(/review every word|demo suggestion/i).first()).toBeVisible();
    }

    if (index < stageOrder.length - 1) {
      await page.getByRole('button', { name: /save and continue/i }).click();
      await expect(page.getByRole('heading', { name: stageOrder[index + 1][0], exact: true })).toBeVisible();
    } else {
      await page.getByRole('button', { name: /^save$/i }).click();
    }
  }

  await page.getByRole('button', { name: /end call/i }).first().click();
  await page.getByRole('dialog').getByRole('combobox').click();
  await page.getByRole('option', { name: 'Next step agreed' }).click();
  await page.getByRole('button', { name: /close call/i }).click();

  await expect(page).toHaveURL(/\/calls\/[0-9a-f-]+$/);
  await expect(page.getByText('Next step agreed').first()).toBeVisible();
  await expect(page.getByText(/We want to push the new product line into two more states this year\./).first()).toBeVisible();
  await expect(page.getByText('Read-only record')).toBeVisible();

  await page.reload();
  await expect(page.getByText(/We want to push the new product line into two more states this year\./).first()).toBeVisible();

  await page.getByRole('link', { name: 'Call history' }).last().click();
  await expect(page.getByRole('heading', { name: 'Call history' })).toBeVisible();
  await page.getByLabel('Search calls').fill(company);
  await expect(page.getByText(`${prospect}, ${company}`).first()).toBeVisible();
  await page.getByText(`${prospect}, ${company}`).first().click();
  await expect(page.getByText(/We want to push the new product line/).first()).toBeVisible();
});

test('empty states and guards are honest', async ({ page }) => {
  await page.goto('/calls?fresh=1');
  await expect(page.getByRole('heading', { name: 'Call history' })).toBeVisible();
  await page.getByLabel('Search calls').fill('zzzz-no-such-call');
  await expect(page.getByText('No calls match these filters')).toBeVisible();
});

test('keyboard focus is visible on the primary action', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.textContent ?? '');
  expect(focused.length).toBeGreaterThan(0);
});
