import { test as base, expect } from '@playwright/test';

/**
 * Default e2e page fixture.
 *
 * Software WebGL in headless browsers is extremely slow, so unless a test
 * explicitly opts into the real 3D scene (see `webgl.spec.ts`, which imports
 * the raw Playwright test and runs in the `chromium-webgl` project), WebGL is
 * blocked before any page script runs. Every page then uses the documented
 * accessible fallback, which is itself part of the product contract.
 */
const blockWebGl = () => {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
    if (typeof type === 'string' && /webgl/i.test(type)) return null;
    return (original as any).call(this, type, ...args);
  } as typeof HTMLCanvasElement.prototype.getContext;
};

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(blockWebGl);
    await use(page);
  },
});

export { expect };
