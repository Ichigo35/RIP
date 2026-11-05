// Parcours réel dans Chrome (Playwright), à lancer depuis n'importe quel dossier : BASE=<url> node web/tests/chrome-parcours.mjs <dossier-captures>
// BASE vaut http://localhost:8787 par défaut. Nettoie ses comptes @example.com à la fin.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const WEB = "/Users/jimnytcha/Dembs lab/Reboot/web/";
const require = createRequire("/Users/jimnytcha/job-search-thailand/package.json");
const { chromium, devices } = require("playwright");
const { neon } = createRequire(WEB + "package.json")("@neondatabase/serverless");
const BASE = process.env.BASE ?? "http://localhost:8787";
const OUT = process.argv[2];
const sql = neon(readFileSync(WEB + ".dev.vars", "utf8").match(/DATABASE_URL=["']?([^"'\n]+)/)[1]);
const stamp = Date.now();
const PASSWORD = "mot-de-passe-solide";
const problems = [];
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });

function watch(page, who) {
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) problems.push(`[${who}] console ${m.type()}: ${m.text()}`); });
  page.on("pageerror", (e) => problems.push(`[${who}] exception: ${e.message}`));
}
async function overflow(page, label) {
  const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (o > 0) problems.push(`débordement horizontal ${o}px : ${label}`);
}
const shot = (page, name, full = false) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
async function signup(page, name) {
  await page.fill('dialog input[name="name"]', name);
  await page.fill('dialog input[name="email"]', `${name.toLowerCase()}-${stamp}@example.com`);
  await page.fill('dialog input[name="password"]', PASSWORD);
  await page.click('dialog button[type="submit"]');
}
async function burySome(ctx, list) {
  for (const t of list) {
    const r = await ctx.request.post(BASE + "/api/burials", { data: t });
    if (!r.ok()) problems.push("enterrer " + t.name + " : " + r.status());
  }
}
try {
  // 1. Accueil sans compte : formulaire puis compte
  const creator = await browser.newContext({ viewport: { width: 1360, height: 820 } });
  const a = await creator.newPage(); watch(a, "créateur");
  await a.goto(BASE + "/", { waitUntil: "networkidle" });
  await shot(a, "01-accueil");
  await a.click('a[href="#enterrer"].btn-go');
  await a.fill('#bury input[name="name"]', "Pixel Paddock");
  await a.fill('#bury input[name="yearStart"]', "2024");
  await a.fill('#bury input[name="yearEnd"]', "2025");
  await a.fill('#bury input[name="epitaph"]', "Mort à 80 %, il ne lui manquait qu'un artiste.");
  await a.selectOption('#bury select[name="cause"]', "missing_skill");
  await a.fill('#bury textarea[name="legacy"]', "Jeu Godot jouable, 12 niveaux, musique originale");
  await a.fill('#bury input[name="missing"]', "Graphiste pixel art");
  await a.click('#bury .will:has(input[value="cofound"])');
  await a.check('#bury input[name="consent"]');
  await a.click("#submit");
  await a.waitForSelector("dialog.sheet[open]");
  await shot(a, "02-compte-apres-formulaire");
  await signup(a, "Karim");
  await a.waitForSelector("#done:not([hidden])");
  await a.waitForTimeout(600);
  await shot(a, "03-tombe-creusee");
  const nom = await a.textContent("#top");
  if (!nom.includes("Mes tombes")) problems.push("barre du haut pas mise à jour après inscription : " + nom);

  await burySome(creator, [
    { name: "Mangetout", yearStart: "2023", yearEnd: "2025", epitaph: "Il voulait que plus rien ne finisse à la poubelle.", cause: "no_time", legacy: "App Flutter terminée à 80 %, 340 inscrits, nom de domaine.", missing: "Dev mobile, marketing", will: "handover", consent: true },
    { name: "Le très long nom de projet abandonné n°42", yearStart: "2021", epitaph: "Une épitaphe assez longue pour voir comment la pierre réagit quand on remplit tout le champ prévu.", cause: "no_market", legacy: "Un héritage très long. ".repeat(26), missing: "Dev web, design, marketing, finance, juridique, support client, data, produit", will: "sell", consent: true },
    { name: "Carnet Noir", yearEnd: "2022", epitaph: "Un carnet privé, jamais publié.", cause: "motivation", will: "release", consent: false },
  ]);

  // 2. Visiteur sans compte dans le cimetière
  const visitor = await browser.newContext({ viewport: { width: 1360, height: 820 } });
  const b = await visitor.newPage(); watch(b, "repreneur");
  await b.goto(BASE + "/cimetiere", { waitUntil: "networkidle" });
  await b.waitForSelector(".card");
  await shot(b, "04-cimetiere-sans-compte");
  await overflow(b, "cimetière bureau");
  await b.keyboard.press("ArrowRight");
  await b.waitForSelector("dialog.sheet[open]");
  await shot(b, "05-compte-au-premier-geste");
  await Promise.all([b.waitForEvent("load"), signup(b, "Lea")]);
  await b.waitForSelector(".card");
  await b.waitForTimeout(300);

  // 3. Les gestes à la souris et au clavier (ordre : la plus récente d'abord)
  const names = async () => (await b.textContent(".card .engr")).trim();
  const first = await names();
  if (!/long nom/.test(first)) problems.push("première tombe inattendue : " + first);
  await shot(b, "06-tombe-longue");
  const more = await b.$(".more");
  if (!more) problems.push("pas de bouton Lire tout sur un héritage long");
  else { await more.click(); await b.waitForTimeout(150); await shot(b, "07-lire-tout", true); }
  await overflow(b, "tombe longue");

  // repos à la souris, puis annulation
  const box = await (await b.$(".card")).boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await b.mouse.move(cx, cy); await b.mouse.down();
  await b.mouse.move(cx - 80, cy + 4, { steps: 6 }); await b.waitForTimeout(80);
  await shot(b, "08-glisse-gauche");
  await b.mouse.move(cx - 180, cy + 8, { steps: 6 }); await b.mouse.up();
  await b.waitForSelector(".toast"); await b.waitForTimeout(450);
  const after = await names();
  if (after === first) problems.push("le swipe à gauche n'a pas changé de tombe");
  await b.click(".toast button"); await b.waitForTimeout(500);
  if ((await names()) !== first) problems.push("Annuler n'a pas remis la tombe");
  await b.keyboard.press("ArrowLeft"); await b.waitForTimeout(600);

  // un petit glissé ne déclenche rien
  const box2 = await (await b.$(".card")).boundingBox();
  const c2x = box2.x + box2.width / 2, c2y = box2.y + box2.height / 2;
  const before = await names();
  await b.mouse.move(c2x, c2y); await b.mouse.down(); await b.mouse.move(c2x + 50, c2y, { steps: 4 }); await b.mouse.up();
  await b.waitForTimeout(350);
  if ((await names()) !== before || await b.$("dialog[open]")) problems.push("un petit glissé a déclenché un geste");

  // ressusciter à la souris
  await b.mouse.move(c2x, c2y); await b.mouse.down();
  await b.mouse.move(c2x + 95, c2y - 6, { steps: 6 }); await b.waitForTimeout(160);
  await shot(b, "09-glisse-droite");
  await b.mouse.move(c2x + 190, c2y - 8, { steps: 6 }); await b.mouse.up();
  await b.waitForSelector("dialog.sheet[open]");
  await b.click('dialog button[type="submit"]');
  await b.waitForSelector("dialog .err:not(:empty)");
  await shot(b, "10-mot-au-createur-erreur");
  await b.fill('dialog textarea[name="note"]', "J'ai testé l'app, je peux finir le code et relancer les 340 inscrits en deux mois.");
  await b.fill('dialog input[name="skills"]', "Flutter, Dart, Growth");
  await b.click('dialog button[type="submit"]');
  await b.waitForSelector(".toast"); await b.waitForTimeout(450);
  await shot(b, "11-apres-ressusciter");

  // fleur au clavier
  await b.keyboard.press("ArrowUp"); await b.waitForSelector(".toast"); await b.waitForTimeout(600);
  await b.waitForSelector(".card .sample");
  await shot(b, "11b-tombe-exemple");
  if (await b.$(".card .flag")) problems.push("une tombe d'exemple propose de signaler");
  await b.keyboard.press("ArrowRight"); await b.waitForTimeout(600);
  if (await b.$("dialog[open]")) problems.push("ressusciter un exemple ouvre un dialogue");
  const demoToast = await b.textContent(".toast");
  if (!/exemple/.test(demoToast)) problems.push("pas d'explication sur l'exemple : " + demoToast);
  await shot(b, "11c-exemple-ressuscite");
  await b.keyboard.press("ArrowUp"); await b.waitForTimeout(600);
  for (let i = 0; i < 3; i += 1) { await b.keyboard.press("ArrowLeft"); await b.waitForTimeout(600); }
  await b.waitForSelector(".deck-empty");
  await shot(b, "12-pile-vide");
  await b.click(".deck-empty .btn-ghost");
  await b.waitForSelector(".card");

  // 4. Le créateur choisit
  await a.goto(BASE + "/mes-tombes", { waitUntil: "networkidle" });
  await a.waitForSelector(".plot");
  if (!(await a.$(".badge"))) problems.push("pas de pastille sur Mes tombes");
  await shot(a, "13-mes-tombes", true);
  await overflow(a, "mes tombes bureau");
  await a.click('.request .btn-go');
  await a.waitForSelector("dialog.sheet[open]");
  await shot(a, "14-confirmer");
  await a.click("dialog.sheet .btn-go");
  await a.waitForSelector("dialog.revit[open]");
  await a.waitForTimeout(1700);
  await shot(a, "15-il-revit-createur");
  await a.click(".revit-next");
  await a.waitForSelector(".plot");
  await a.waitForTimeout(200);
  await shot(a, "16-mes-tombes-apres", true);

  // 5. Le repreneur l'apprend à sa prochaine visite, une seule fois
  await b.goto(BASE + "/cimetiere", { waitUntil: "networkidle" });
  await b.waitForSelector("dialog.revit[open]");
  await b.waitForTimeout(1700);
  await shot(b, "17-il-revit-repreneur");
  await b.goto(BASE + "/reprises", { waitUntil: "networkidle" });
  await b.waitForSelector(".reprise");
  await shot(b, "18-reprises", true);
  await overflow(b, "reprises bureau");
  if (await b.$("dialog.revit[open]")) problems.push("le match est annoncé une deuxième fois");
  await b.goto(BASE + "/profil", { waitUntil: "networkidle" });
  await b.waitForSelector(".profile");
  await b.fill('.profile textarea[name="bio"]', "Dix ans de mobile, du temps le soir.");
  await b.click(".profile .btn-go");
  await b.waitForSelector(".toast");
  await shot(b, "19-profil");

  // 6. Téléphone
  const phone = await browser.newContext({ ...devices["iPhone 13"], storageState: await visitor.storageState() });
  const p = await phone.newPage(); watch(p, "téléphone");
  for (const [path, sel, name] of [["/cimetiere", ".card,.deck-empty", "20-mobile-cimetiere"], ["/reprises", ".reprise", "21-mobile-reprises"], ["/profil", ".profile", "22-mobile-profil"], ["/", ".hero", "23-mobile-accueil"]]) {
    await p.goto(BASE + path, { waitUntil: "networkidle" });
    await p.waitForSelector(sel);
    await overflow(p, "mobile " + path);
    await shot(p, name);
  }
  const phoneA = await browser.newContext({ ...devices["iPhone 13"], storageState: await creator.storageState() });
  const pa = await phoneA.newPage(); watch(pa, "téléphone créateur");
  await pa.goto(BASE + "/mes-tombes", { waitUntil: "networkidle" });
  await pa.waitForSelector(".plot");
  await overflow(pa, "mobile mes tombes");
  await shot(pa, "24-mobile-mes-tombes", true);

  // swipe au doigt sur téléphone, avec un 3e compte
  const fresh = await browser.newContext({ ...devices["iPhone 13"] });
  const f = await fresh.newPage(); watch(f, "doigt");
  await f.goto(BASE + "/cimetiere", { waitUntil: "networkidle" });
  await f.waitForSelector(".card");
  await shot(f, "25-mobile-sans-compte");
  await overflow(f, "mobile cimetière sans compte");
  await f.click('.act[data-action="flower"]');
  await f.waitForSelector("dialog.sheet[open]");
  await Promise.all([f.waitForEvent("load"), signup(f, "Sam")]);
  await f.waitForSelector(".card");
  await f.waitForTimeout(400);
  // tombe longue : la page doit défiler au doigt, le swipe vers le haut n'est plus actif
  const tall = await f.$eval(".card", (c) => c.classList.contains("tall"));
  console.log("tombe longue : classe tall =", tall, "hauteur doc", await f.evaluate(() => document.documentElement.scrollHeight), "écran", await f.evaluate(() => innerHeight));
  await f.keyboard.press("ArrowLeft");
  await f.waitForTimeout(700);
  await shot(f, "25b-mobile-tombe-normale");
  const fb = await (await f.$(".card")).boundingBox();
  const cdp = await fresh.newCDPSession(f);
  const point = (x, y) => [{ x, y, id: 1 }];
  const startX = fb.x + fb.width / 2, startY = fb.y + fb.height / 2;
  const name0 = await f.textContent(".card .engr");
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: point(startX, startY) });
  for (let i = 1; i <= 10; i += 1) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: point(startX, startY - i * 18) });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await f.waitForTimeout(700);
  const toastText = await f.textContent(".toast").catch(() => "");
  if (!/Fleur/.test(toastText)) problems.push("swipe vers le haut au doigt sans effet : " + toastText);
  await shot(f, "26-mobile-fleur-au-doigt");
  console.log("doigt :", name0, "→", toastText);
} catch (e) {
  problems.push("ARRÊT : " + e.message);
  for (const c of browser.contexts()) for (const pg of c.pages()) await pg.screenshot({ path: `${OUT}/zz-erreur-${Date.now()}.png` }).catch(() => {});
} finally {
  await browser.close();
  await sql`DELETE FROM users WHERE email LIKE '%@example.com'`;
  await sql`DELETE FROM auth_attempts WHERE key LIKE 'signup:%' OR key LIKE 'ip:%' OR key LIKE '%@example.com'`;
  const left = await sql`SELECT (SELECT count(*) FROM users)::int AS users, (SELECT count(*) FROM burials)::int AS burials`;
  console.log("base après nettoyage :", JSON.stringify(left[0]));
}
console.log(problems.length ? "PROBLÈMES :\n" + problems.join("\n") : "Aucun problème");
