#!/usr/bin/env node
/**
 * Audit responsive automatisé — Responsive Interface Guardian
 *
 * Rôle : transformer la matrice de validation (references/validation-matrix.md)
 * en preuve exécutable plutôt qu'en déclaration verbale. Ne remplace pas
 * l'inspection humaine des captures, mais élimine les faux "validé".
 *
 * Prérequis : Playwright doit déjà être disponible dans le projet
 * (devDependency ou installé globalement). Le script échoue explicitement
 * si ce n'est pas le cas — ne jamais installer Playwright juste pour cet audit
 * sans l'accord de l'utilisateur ; utiliser à la place l'inspection manuelle
 * décrite dans validation-matrix.md.
 *
 * Usage :
 *   node scripts/audit-viewports.mjs --url http://localhost:3000 [--out ./audit-out] \
 *     [--groups phones,tablets] [--landscape] [--zoom 1.5] [--selector "#app"]
 *
 * Sortie :
 *   - <out>/report.json      résultats structurés par viewport
 *   - <out>/<w>x<h>[-landscape][-zoom].png   captures d'écran
 *   - Résumé lisible imprimé sur stdout (statuts au format de validation-matrix.md)
 */

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = { out: "./audit-out", groups: null, landscape: false, zoom: null, selector: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--url") args.url = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--groups") args.groups = argv[++i].split(",").map((s) => s.trim());
    else if (a === "--landscape") args.landscape = true;
    else if (a === "--zoom") args.zoom = parseFloat(argv[++i]);
    else if (a === "--selector") args.selector = argv[++i];
  }
  if (!args.url) {
    console.error(
      "Usage: node audit-viewports.mjs --url <URL> [--out DIR] [--groups g1,g2] [--landscape] [--zoom N] [--selector CSS]",
    );
    process.exit(1);
  }
  return args;
}

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    console.error(
      "Playwright introuvable dans ce projet. Ce script ne doit pas installer de dépendance " +
        "sans accord explicite : utiliser à la place l'inspection manuelle décrite dans " +
        "references/validation-matrix.md, ou demander l'ajout de playwright comme devDependency.",
    );
    process.exit(2);
  }
}

// Injecté dans la page : détecte overflow horizontal, chevauchements entre
// éléments interactifs, et cibles tactiles sous 44x44px.
function pageAudit() {
  const results = { horizontalOverflow: null, overlaps: [], tinyTargets: [] };

  const docEl = document.documentElement;
  const overflowPx = docEl.scrollWidth - docEl.clientWidth;
  results.horizontalOverflow = overflowPx > 1 ? overflowPx : 0;

  const interactiveSelector =
    'a, button, input, select, textarea, [role="button"], [role="link"], [role="menuitem"], [tabindex]:not([tabindex="-1"])';
  const nodes = Array.from(document.querySelectorAll(interactiveSelector)).filter((el) => {
    const style = getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden" && el.offsetParent !== null;
  });

  const rects = nodes.map((el) => ({ el, rect: el.getBoundingClientRect() }));

  // Cibles tactiles trop petites
  for (const { el, rect } of rects) {
    if (rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)) {
      results.tinyTargets.push({
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 40),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    }
  }

  // Chevauchements entre éléments interactifs non imbriqués l'un dans l'autre
  function intersects(a, b) {
    return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
  }
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const A = rects[i];
      const B = rects[j];
      if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
      if (A.rect.width === 0 || A.rect.height === 0 || B.rect.width === 0 || B.rect.height === 0)
        continue;
      if (intersects(A.rect, B.rect)) {
        results.overlaps.push({
          a: {
            tag: A.el.tagName.toLowerCase(),
            text: (A.el.textContent || "").trim().slice(0, 30),
          },
          b: {
            tag: B.el.tagName.toLowerCase(),
            text: (B.el.textContent || "").trim().slice(0, 30),
          },
        });
      }
    }
  }

  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { chromium } = await loadPlaywright();

  const viewportsPath = path.join(__dirname, "viewports.json");
  const allGroups = JSON.parse(readFileSync(viewportsPath, "utf8"));
  const groupNames = args.groups && args.groups.length ? args.groups : Object.keys(allGroups);

  mkdirSync(args.out, { recursive: true });

  const browser = await chromium.launch();
  const report = { url: args.url, generatedAt: new Date().toISOString(), viewports: [] };

  for (const groupName of groupNames) {
    const list = allGroups[groupName];
    if (!list) {
      console.warn(`Groupe inconnu ignoré : ${groupName}`);
      continue;
    }
    for (const [w, h] of list) {
      const orientations = args.landscape
        ? [
            [w, h],
            [h, w],
          ]
        : [[w, h]];
      for (const [vw, vh] of orientations) {
        const isLandscape = vw !== w;
        const context = await browser.newContext({
          viewport: { width: vw, height: vh },
          deviceScaleFactor: args.zoom || 1,
        });
        const page = await context.newPage();
        let status = "validé";
        let error = null;
        let audit = null;
        try {
          await page.goto(args.url, { waitUntil: "networkidle", timeout: 30000 });
          if (args.selector) {
            await page.waitForSelector(args.selector, { timeout: 10000 });
          }
          audit = await page.evaluate(pageAudit);
          if (
            audit.horizontalOverflow > 0 ||
            audit.overlaps.length > 0 ||
            audit.tinyTargets.length > 0
          ) {
            status = "échec restant";
          }
        } catch (e) {
          status = "non testé";
          error = String(e.message || e);
        }

        const suffix = [
          `${vw}x${vh}`,
          isLandscape ? "landscape" : null,
          args.zoom ? `zoom${args.zoom}` : null,
        ]
          .filter(Boolean)
          .join("-");
        const screenshotPath = path.join(args.out, `${suffix}.png`);
        try {
          await page.screenshot({ path: screenshotPath, fullPage: true });
        } catch {
          /* capture impossible, déjà reflété par le statut */
        }

        report.viewports.push({
          group: groupName,
          width: vw,
          height: vh,
          landscape: isLandscape,
          zoom: args.zoom || 1,
          status,
          error,
          audit,
          screenshot: screenshotPath,
        });

        console.log(
          `${status === "validé" ? "✓" : status === "non testé" ? "?" : "✗"} ${suffix.padEnd(22)} ${groupName.padEnd(22)} ${
            status
          }${error ? ` — ${error}` : ""}`,
        );
        if (audit && status !== "validé") {
          if (audit.horizontalOverflow > 0)
            console.log(`   overflow horizontal: ${audit.horizontalOverflow}px`);
          if (audit.overlaps.length) console.log(`   chevauchements: ${audit.overlaps.length}`);
          if (audit.tinyTargets.length)
            console.log(`   cibles < 44x44: ${audit.tinyTargets.length}`);
        }

        await context.close();
      }
    }
  }

  await browser.close();

  const reportPath = path.join(args.out, "report.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  const total = report.viewports.length;
  const failed = report.viewports.filter((v) => v.status === "échec restant").length;
  const untested = report.viewports.filter((v) => v.status === "non testé").length;
  console.log("\n---");
  console.log(
    `${total} viewports testés — ${total - failed - untested} validés, ${failed} en échec, ${untested} non testés.`,
  );
  console.log(`Rapport détaillé : ${reportPath}`);
  if (failed > 0 || untested > 0) process.exitCode = 1;
}

main();
