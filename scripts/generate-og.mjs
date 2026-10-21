/**
 * Generates the social share image (1200×630) and Apple touch icon (180×180).
 *
 * Usage:
 *   npm run preview -- --port 4173        # in one terminal
 *   node scripts/generate-og.mjs          # in another
 *
 * If the preview server is reachable, the script screenshots the live 3D hero
 * stage and composes it into the card. Otherwise it falls back to a vector body.
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.env.OG_BASE_URL ?? 'http://127.0.0.1:4173';
const OUT = 'public';

mkdirSync(OUT, { recursive: true });

async function captureHero(browser) {
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
    await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
    const canvas = page.locator('.home-hero__stage canvas, .viewer-canvas').first();
    await canvas.waitFor({ state: 'visible', timeout: 30000 });
    // Let the lazy three.js chunk compile and the camera settle on the model.
    await page.waitForTimeout(7000);
    const buffer = await canvas.screenshot({ type: 'png', timeout: 90000 });
    await page.close();
    return `data:image/png;base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.warn('Could not capture hero, using vector fallback:', error.message);
    return null;
  }
}

function figureSvg() {
  return `
  <svg viewBox="0 0 420 560" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <radialGradient id="aura" cx="50%" cy="35%" r="55%">
        <stop offset="0%" stop-color="#c9973f" stop-opacity=".28"/>
        <stop offset="100%" stop-color="#c9973f" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f4eee3" stop-opacity=".20"/>
        <stop offset="100%" stop-color="#f4eee3" stop-opacity=".04"/>
      </linearGradient>
      <filter id="glow"><feGaussianBlur stdDeviation="7"/></filter>
    </defs>
    <rect width="420" height="560" fill="url(#aura)"/>
    <g stroke="#f4eee3" stroke-opacity=".38" fill="none" stroke-width="1.5">
      <ellipse cx="210" cy="74" rx="35" ry="44" fill="url(#skin)"/>
      <path d="M198 116 L198 140 M222 116 L222 140"/>
      <path d="M210 138 C166 138 150 166 148 210 L150 292 C152 318 178 322 182 298 L188 224 L188 306 L188 430 C188 456 204 462 210 462 C216 462 232 456 232 430 L232 306 L232 224 L238 298 C242 322 268 318 270 292 L272 210 C270 166 254 138 210 138 Z" fill="url(#skin)"/>
      <path d="M174 180 C156 200 148 240 146 282 C144 320 150 350 158 370" stroke-opacity=".25"/>
      <path d="M246 180 C264 200 272 240 274 282 C276 320 270 350 262 370" stroke-opacity=".25"/>
      <path d="M188 430 C180 470 178 505 180 530 M232 430 C240 470 242 505 240 530" stroke-opacity=".3"/>
    </g>
    <g stroke="#f4eee3" stroke-opacity=".30" stroke-width="1" fill="none">
      <path d="M210 150 L210 420 M188 190 L232 190 M184 218 L236 218 M182 246 L238 246 M182 274 L238 274 M186 302 L234 302"/>
      <path d="M170 172 C186 160 234 160 250 172 M164 198 C184 184 236 184 256 198 M160 226 C182 212 238 212 260 226 M160 254 C182 240 238 240 260 254"/>
    </g>
    <g filter="url(#glow)">
      <circle cx="210" cy="62" r="14" fill="#c9973f" opacity=".7"/>
      <ellipse cx="198" cy="210" rx="17" ry="21" fill="#b23a4a" opacity=".8"/>
      <ellipse cx="183" cy="250" rx="16" ry="26" fill="#6a8f8b" opacity=".55"/>
      <ellipse cx="237" cy="250" rx="16" ry="26" fill="#6a8f8b" opacity=".55"/>
      <ellipse cx="214" cy="298" rx="24" ry="18" fill="#9a6b3f" opacity=".65"/>
      <ellipse cx="192" cy="350" rx="8" ry="13" fill="#5c7a9e" opacity=".6"/>
      <ellipse cx="228" cy="350" rx="8" ry="13" fill="#5c7a9e" opacity=".6"/>
    </g>
    <g fill="#f4eee3" opacity=".75">
      <circle cx="348" cy="120" r="2"/><circle cx="348" cy="150" r="2"/><circle cx="372" cy="135" r="2"/>
      <circle cx="64" cy="300" r="2"/><circle cx="40" cy="330" r="2"/>
    </g>
    <g stroke="#f4eee3" stroke-opacity=".16" stroke-width="1">
      <path d="M348 120 L300 140 M348 150 L296 200 M64 300 L120 330 M40 330 L100 360"/>
    </g>
  </svg>`;
}

async function main() {
  // Headed Chromium uses the real GPU (Metal on macOS), avoiding slow/hanging
  // software-WebGL screenshots. This script is a local authoring tool, not CI.
  const browser = await chromium.launch({ headless: process.env.OG_HEADLESS === '1' });
  const hero = await captureHero(browser);

  const stage = hero
    ? `<div class="stage"><img src="${hero}" alt=""/></div>`
    : `<div class="stage stage--vector">${figureSvg()}</div>`;

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,560;1,9..144,400&family=Inter:wght@400;500;600&display=swap" rel="stylesheet"/>
<style>
  *{box-sizing:border-box;margin:0}
  body{width:1200px;height:630px;overflow:hidden;background:#14110e;color:#f4eee3;font-family:'Inter',system-ui,sans-serif;}
  .card{position:relative;width:1200px;height:630px;display:grid;grid-template-columns:1.15fr .85fr;padding:64px 72px;background:
    radial-gradient(900px 560px at 82% 30%, rgba(185,134,59,.22), transparent 65%),
    radial-gradient(700px 500px at 8% 100%, rgba(166,61,47,.16), transparent 60%),
    #14110e;}
  .card:before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(244,238,227,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(244,238,227,.05) 1px,transparent 1px);background-size:72px 72px;mask-image:radial-gradient(circle at 30% 50%, black, transparent 85%);}
  .brand{display:flex;align-items:center;gap:12px;font-size:13px;letter-spacing:.22em;text-transform:uppercase;color:#d8b170;font-weight:600;}
  .mark{width:34px;height:34px;border-radius:50%;border:1px solid rgba(244,238,227,.5);display:grid;place-items:center;position:relative;}
  .mark:after{content:'';width:10px;height:10px;border-radius:50%;background:#a63d2f;}
  h1{font-family:'Fraunces',Georgia,serif;font-weight:500;font-size:94px;line-height:.94;letter-spacing:-.045em;margin-top:40px;max-width:8ch;}
  h1 em{font-style:italic;color:#c56a56;}
  p{font-size:21px;line-height:1.45;color:rgba(244,238,227,.72);margin-top:26px;max-width:32ch;}
  .stats{display:flex;gap:36px;margin-top:44px;padding-top:24px;border-top:1px solid rgba(244,238,227,.16);}
  .stats div{display:flex;flex-direction:column;gap:4px;}
  .stats strong{font-family:'Fraunces',Georgia,serif;font-size:34px;font-weight:500;color:#f4eee3;}
  .stats span{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:rgba(244,238,227,.5);}
  .stage{position:relative;border-radius:28px;overflow:hidden;background:radial-gradient(circle at 50% 35%,#2c2620,#14110e 72%);box-shadow:0 50px 100px -30px rgba(0,0,0,.7);}
  .stage img{width:100%;height:100%;object-fit:cover;}
  .stage--vector svg{width:100%;height:100%;}
  .tag{position:absolute;left:50%;bottom:22px;transform:translateX(-50%);font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:rgba(244,238,227,.45);white-space:nowrap;}
</style>
</head>
<body>
  <div class="card">
    <div>
      <div class="brand"><span class="mark"></span> Anatomy Atlas</div>
      <h1>Every part of you, <em>explained</em>.</h1>
      <p>Rotate the body. Zoom into an organ. Follow the systems that keep you alive.</p>
      <div class="stats">
        <div><strong>12</strong><span>body systems</span></div>
        <div><strong>95</strong><span>structures</span></div>
        <div><strong>Free</strong><span>forever</span></div>
      </div>
    </div>
    <div style="position:relative">
      ${stage}
      <div class="tag">Interactive 3D · anatomy-atlas-b2m.pages.dev</div>
    </div>
  </div>
</body>
</html>`;

  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/og.png`, type: 'png' });
  await page.close();

  // Apple touch icon
  const icon = await browser.newPage({ viewport: { width: 180, height: 180 }, deviceScaleFactor: 1 });
  await icon.setContent(`<body style="margin:0;background:#f4eee3;display:grid;place-items:center;width:180px;height:180px">
    <svg viewBox="0 0 64 64" width="130" height="130"><rect width="64" height="64" rx="14" fill="#f4eee3"/>
    <circle cx="32" cy="32" r="19" fill="none" stroke="#1e1b17" stroke-width="2"/>
    <path d="M32 14c-5 6-7 11-7 18s2 12 7 18" fill="none" stroke="#a63d2f" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M32 14c5 6 7 11 7 18s-2 12-7 18" fill="none" stroke="#a63d2f" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="32" cy="32" r="4" fill="#a63d2f"/></svg></body>`);
  await icon.screenshot({ path: `${OUT}/apple-touch-icon.png`, omitBackground: true });
  await icon.close();

  await browser.close();
  console.log('Wrote public/og.png and public/apple-touch-icon.png');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
