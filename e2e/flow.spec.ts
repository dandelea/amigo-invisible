import { expect, test } from '@playwright/test';
import { createRoomViaUi, joinViaUi, roomName } from './helpers';

// Recorrido completo, cada persona en su propio navegador: crear la sala,
// unirse, marcar una pareja, sortear, descubrir el resultado y ver cómo el
// contador del organizador se actualiza solo.
test('de crear la sala a ver el resultado', async ({ page, browser }) => {
  const { invite, manage } = await createRoomViaUi(page, roomName('Cena'));

  const ana = await joinViaUi(browser, invite, 'Ana', {
    reducedMotion: 'reduce',
  });
  await joinViaUi(browser, invite, 'Luis');
  const marta = await joinViaUi(browser, invite, 'Marta');
  await joinViaUi(browser, invite, 'Pablo');

  // La sala de Ana ve llegar a los demás en tiempo real.
  await expect(ana.getByText('Abierta · 4/30')).toBeVisible();

  // Organizador: pareja Ana–Luis y sorteo.
  await page.goto(manage);
  await page.getByRole('button', { name: 'Marcar pareja' }).click();
  await page.getByRole('checkbox', { name: /Ana/ }).check();
  await page.getByRole('checkbox', { name: /Luis/ }).check();
  await page.getByRole('button', { name: 'Confirmar pareja' }).click();
  await expect(
    page.getByRole('group', { name: 'Pareja: Ana y Luis' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Sortear' }).click();
  await expect(page.getByText('Resultados vistos')).toBeVisible();

  // Ana (movimiento reducido): resultado directo, nunca ella ni su pareja.
  await ana
    .getByRole('button', { name: 'Descubrir mi amigo invisible' })
    .click();
  await expect(
    ana.getByRole('heading', { name: 'Ana, tu amigo invisible es' }),
  ).toBeVisible();
  const anaResult = await ana
    .locator('.sr-only', { hasText: 'Tu amigo invisible es' })
    .innerText();
  expect(anaResult).toMatch(/Tu amigo invisible es (Marta|Pablo)\./);

  // Marta: ruleta, que salta con «Saltar animación».
  await marta
    .getByRole('button', { name: 'Descubrir mi amigo invisible' })
    .click();
  await expect(marta.getByText('Sorteando…').first()).toBeVisible();
  await marta.getByRole('button', { name: 'Saltar animación' }).click();
  await expect(
    marta.getByRole('heading', { name: 'Marta, tu amigo invisible es' }),
  ).toBeVisible();

  // El contador del organizador sube solo, y nunca ve asignaciones.
  await expect(page.getByRole('progressbar', { name: /2 de 4/ })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('tu amigo invisible es');

  // Tras el sorteo, la sala de invitación está cerrada.
  await page.goto(invite);
  await expect(page.getByText('Sala cerrada')).toBeVisible();
});

test('nombre repetido y enlace inválido', async ({ page, browser }) => {
  const { invite } = await createRoomViaUi(page, roomName('Repetido'));
  await joinViaUi(browser, invite, 'Ana');
  await page.goto(invite);
  await page.getByLabel('Tu nombre').fill('ANÁ');
  await page.getByRole('button', { name: 'Entrar en la sala' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Ya hay alguien llamado «ANÁ»',
  );

  await page.goto(`/p#${'x'.repeat(43)}`);
  await expect(page.getByText('No encontrado')).toBeVisible();
});
