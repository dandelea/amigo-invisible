import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { createRoomViaUi, joinViaUi, roomName } from './helpers';

// Accesibilidad con axe en un Chrome real (incluido el contraste de color),
// pantalla por pantalla, según WCAG 2.1 A y AA.
async function expectNoViolations(page: Page, label: string) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const summary = violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
  expect(summary, `Problemas de accesibilidad en «${label}»`).toEqual([]);
}

test('pantallas sin problemas de accesibilidad', async ({ page, browser }) => {
  await page.goto('/');
  await expect(
    page.getByRole('link', { name: 'Crear sala' }).first(),
  ).toBeVisible();
  await expectNoViolations(page, 'Inicio');

  await page.getByRole('link', { name: 'Crear sala' }).first().click();
  await page.getByLabel('Nombre de la sala').fill('ab');
  await page.getByRole('button', { name: 'Crear sala' }).click();
  await expect(page.getByText('al menos 3 caracteres')).toBeVisible();
  await expectNoViolations(page, 'Crear sala con errores');

  const { invite, manage } = await createRoomViaUi(page, roomName('Accesible'));
  await expectNoViolations(page, 'Sala creada');

  const other = await (await browser.newContext({ locale: 'es-ES' })).newPage();
  await other.goto(invite);
  await expect(other.getByLabel('Tu nombre')).toBeVisible();
  await expectNoViolations(other, 'Unirse');

  const ana = await joinViaUi(browser, invite, 'Ana');
  await joinViaUi(browser, invite, 'Luis');
  await joinViaUi(browser, invite, 'Marta');
  await expectNoViolations(ana, 'Sala del participante');
  await ana.getByRole('button', { name: 'Añadir' }).click();
  await expect(ana.getByRole('dialog')).toBeVisible();
  await expectNoViolations(ana, 'Editor de la lista de deseos');
  await ana.keyboard.press('Escape');

  await page.goto(manage);
  await expect(page.getByRole('switch')).toBeVisible();
  await expectNoViolations(page, 'Panel del organizador');
  await page.getByRole('button', { name: 'Marcar pareja' }).click();
  await expectNoViolations(page, 'Marcar pareja');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Sortear' }).click();
  await expect(page.getByText('Resultados vistos')).toBeVisible();
  await expectNoViolations(page, 'Organizador tras el sorteo');

  await ana.reload();
  await ana
    .getByRole('button', { name: 'Descubrir mi amigo invisible' })
    .click();
  await ana.getByRole('button', { name: 'Saltar animación' }).click();
  await expect(
    ana.getByRole('heading', { name: /tu amigo invisible es/ }),
  ).toBeVisible();
  await expectNoViolations(ana, 'Resultado');

  await page.goto(`/p#${'x'.repeat(43)}`);
  await expect(page.getByText('No encontrado')).toBeVisible();
  await expectNoViolations(page, 'No encontrado');
});

test('se puede crear una sala solo con el teclado', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('link', { name: 'Crear sala' }).first(),
  ).toBeVisible();
  // Tabular hasta «Crear sala» y pulsarlo con Enter.
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(
      () => document.activeElement?.textContent,
    );
    if (focused === 'Crear sala') break;
  }
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Nombre de la sala')).toBeVisible();
  await page.getByLabel('Nombre de la sala').focus();
  await page.keyboard.type(roomName('Teclado'));
  // El foco visible acompaña al campo activo.
  const outline = await page.evaluate(
    () => getComputedStyle(document.activeElement!).boxShadow,
  );
  expect(outline).not.toBe('none');
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Sala creada' }),
  ).toBeVisible();
});
