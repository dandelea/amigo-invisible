import { expect, type Browser, type Page } from '@playwright/test';

// Nombre único para las salas de los tests (el teardown las borra).
export const roomName = (label: string) =>
  `E2E · ${label} ${Date.now() % 100000}`;

// Crea una sala desde la interfaz y devuelve sus dos enlaces.
export async function createRoomViaUi(page: Page, name: string) {
  await page.goto('/');
  await page.getByRole('link', { name: 'Crear sala' }).first().click();
  await page.getByLabel('Nombre de la sala').fill(name);
  await page.getByLabel('Presupuesto sugerido (€)').fill('15');
  await page.getByRole('button', { name: 'Crear sala' }).click();
  await expect(
    page.getByRole('heading', { name: 'Sala creada' }),
  ).toBeVisible();
  const text = await page.locator('body').innerText();
  const invite = /https?:\/\/\S+\/s\/[A-Za-z0-9_-]{16}/.exec(text)![0];
  const manage = /https?:\/\/\S+\/o#[A-Za-z0-9_-]{43}/.exec(text)![0];
  return { invite, manage };
}

// Une a una persona desde su propio navegador y devuelve su página, ya en
// su sala personal.
export async function joinViaUi(
  browser: Browser,
  invite: string,
  name: string,
  options: { reducedMotion?: 'reduce' | 'no-preference' } = {},
) {
  const context = await browser.newContext({
    locale: 'es-ES',
    viewport: { width: 390, height: 844 },
    reducedMotion: options.reducedMotion ?? 'no-preference',
  });
  const page = await context.newPage();
  await page.goto(invite);
  await page.getByLabel('Tu nombre').fill(name);
  await page.getByRole('button', { name: 'Entrar en la sala' }).click();
  await expect(page.getByText('Guarda tu enlace personal')).toBeVisible();
  return page;
}
