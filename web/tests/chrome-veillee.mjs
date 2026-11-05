// Parcours réel dans Chrome (Playwright), à lancer depuis n'importe quel dossier : BASE=<url> node web/tests/chrome-veillee.mjs <dossier-captures>
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
const mail = (n) => `${n}-${stamp}@example.com`;

function watch(page, who) {
  page.on("console", (m) => { if (["error", "warning"].includes(m.type()) && !/40[0-9]|429/.test(m.text())) problems.push(`[${who}] console ${m.type()}: ${m.text()}`); });
  page.on("pageerror", (e) => problems.push(`[${who}] exception: ${e.message}`));
  page.on("dialog", (d) => { problems.push(`[${who}] alerte JS : ${d.message()}`); d.dismiss(); });
}
async function overflow(page, label) {
  const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (o > 0) problems.push(`débordement horizontal ${o}px : ${label}`);
}
const shot = (page, name, full = false) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
async function account(ctx, name) {
  const r = await ctx.request.post(BASE + "/api/signup", { data: { name, email: mail(name.toLowerCase()), password: PASSWORD } });
  if (!r.ok()) problems.push("inscription " + name + " " + r.status());
}
const bury = (ctx, t) => ctx.request.post(BASE + "/api/burials", { data: { yearStart: "2024", yearEnd: "2025", cause: "missing_skill", will: "cofound", consent: true, ...t } });
const post = async (ctx, path, data) => (await ctx.request.post(BASE + path, { data })).json();
const get = async (ctx, path) => (await ctx.request.get(BASE + path)).json();

try {
  const karim = await browser.newContext({ viewport: { width: 1360, height: 820 } });
  const lea = await browser.newContext({ viewport: { width: 1360, height: 820 } });
  await account(karim, "Karim"); await account(lea, "Lea");
  await post(lea, "/api/profile", { name: "Léa", skills: "Pixel art, Animation", bio: "Dix ans de jeu indé." });
  await bury(karim, { name: "Pixel Paddock", epitaph: "Mort à 80 %, il ne lui manquait qu'un artiste.", legacy: "Jeu Godot jouable, 12 niveaux", missing: "Graphiste pixel art" });
  await bury(karim, { name: "Mangetout", epitaph: "Il voulait que plus rien ne finisse à la poubelle.", legacy: "App Flutter à 80 %", missing: "Dev mobile", will: "handover" });
  const tombs = (await get(karim, "/api/my-tombs")).tombs;
  const pixel = tombs.find((t) => t.name === "Pixel Paddock");
  const mange = tombs.find((t) => t.name === "Mangetout");
  await post(lea, "/api/swipes", { tombId: pixel.id, action: "revive", note: "J'ai joué au niveau 4, je peux refaire tous les sprites." });
  await post(lea, "/api/swipes", { tombId: mange.id, action: "revive", note: "Je connais bien les banques alimentaires." });

  // accepter dans le navigateur : le bouton mène à la veillée
  const k = await karim.newPage(); watch(k, "créateur");
  await k.goto(BASE + "/mes-tombes", { waitUntil: "networkidle" });
  await k.waitForSelector(".request");
  await k.click('.plot:has-text("Pixel Paddock") .request .btn-go');
  await k.click("dialog.sheet .btn-go");
  await k.waitForSelector("dialog.revit[open]");
  await k.waitForTimeout(1500);
  await shot(k, "30-il-revit");
  const href = await k.getAttribute(".revit .btn-go", "href");
  if (!/^\/veillee\?id=/.test(href)) problems.push("Il revit ne mène pas à la veillée : " + href);
  await Promise.all([k.waitForNavigation(), k.click(".revit .btn-go")]);
  await k.waitForSelector(".thread");
  await k.waitForTimeout(400);
  await shot(k, "31-veillee-vide");
  await overflow(k, "veillée vide");
  if (!(await k.$(".candle .flame"))) problems.push("pas de flamme");
  const id = new URL(k.url()).searchParams.get("id");

  // le repreneur arrive et les deux se parlent, sans recharger
  const l = await lea.newPage(); watch(l, "repreneur");
  await l.goto(BASE + "/cimetiere", { waitUntil: "networkidle" });
  await l.waitForSelector("dialog.revit[open]");
  await Promise.all([l.waitForNavigation(), l.click(".revit .btn-go")]);
  await l.waitForSelector(".thread");
  await l.fill(".composer textarea", "Bonjour Karim, je commence quand tu veux.");
  await l.keyboard.press("Enter");
  await l.waitForSelector(".msg-mine .msg-body >> text=je commence");
  await k.waitForSelector("text=je commence quand tu veux", { timeout: 9000 });
  console.log("message reçu sans recharger : oui");
  await k.fill(".composer textarea", "Top, on se fixe une démo dans 3 semaines ?\n\nJe t'envoie le dépôt ce soir.");
  await k.click(".composer .btn-go");
  await l.waitForSelector("text=démo dans 3 semaines", { timeout: 9000 });
  const pieges = "<img src=x onerror=alert(1)><script>alert(2)</script>";
  await l.fill(".composer textarea", pieges);
  await l.click(".composer .btn-go");
  await k.waitForSelector("text=onerror=alert(1)", { timeout: 9000 });
  if (await k.$(".thread img, .thread script")) problems.push("un message a injecté du HTML");
  await k.waitForTimeout(300);
  await shot(k, "32-veillee-conversation");

  // bougie à mi-chemin (9 jours)
  await sql`UPDATE matches SET ends_at = now() + interval '8 days 20 hours' WHERE id = ${id}`;
  await k.reload({ waitUntil: "networkidle" });
  await k.waitForSelector(".thread .msg");
  await k.waitForTimeout(400);
  await shot(k, "33-bougie-9-jours");
  if (!/9 jours/.test(await k.textContent(".vigil-days"))) problems.push("le compte à rebours ne dit pas 9 jours");

  // pastilles de messages non lus
  await k.close();
  await post(lea, "/api/vigil/message", { matchId: id, body: "Tu as vu mon dernier message ?" });
  const k2 = await karim.newPage(); watch(k2, "créateur 2");
  await k2.goto(BASE + "/mes-tombes", { waitUntil: "networkidle" });
  await k2.waitForSelector(".plot");
  const badge = await k2.textContent('.tabs a[href="/mes-tombes"] .badge').catch(() => "");
  if (!badge) problems.push("pas de pastille pour le message non lu");
  await shot(k2, "34-mes-tombes-non-lu", true);
  await overflow(k2, "mes tombes");
  await k2.click('a[href^="/veillee"]');
  await k2.waitForSelector(".thread .msg");
  await k2.waitForTimeout(500);

  // signaler dans la veillée
  await k2.click('.vigil-links .link:has-text("Signaler")');
  await k2.waitForSelector("dialog.sheet[open]");
  await k2.click('dialog button[type="submit"]');
  await k2.waitForSelector("dialog .form-err:not(:empty)");
  await k2.click('dialog .will:has(input[value="harassment"])');
  await k2.fill('dialog textarea[name="details"]', "Elle insiste beaucoup.");
  await shot(k2, "35-signaler-personne");
  await k2.click('dialog button[type="submit"]');
  await k2.waitForSelector(".toast");

  // conclure : Karim d'abord, Léa voit la demande, puis Ressuscité des deux côtés
  await k2.click('.vigil-acts .btn-go');
  await k2.click("dialog.sheet .btn-go");
  await k2.waitForSelector(".vigil-wait");
  await shot(k2, "36-en-attente-de-lea");
  await l.reload({ waitUntil: "networkidle" });
  await l.waitForSelector(".vigil-acts .vigil-wait");
  await l.click('.vigil-acts .btn-go');
  await l.click("dialog.sheet .btn-go");
  await l.waitForSelector("dialog.revit[open]");
  await l.waitForTimeout(1600);
  await shot(l, "37-ressuscite");
  await k2.waitForSelector("dialog.revit[open]", { timeout: 9000 });
  console.log("l'autre personne voit Ressuscité sans recharger : oui");
  await l.goto(BASE + `/veillee?id=${id}`, { waitUntil: "networkidle" });
  await l.waitForSelector(".thread .msg");
  await l.waitForTimeout(1500);
  await shot(l, "38-veillee-ressuscitee");

  // seconde veillée : quitter
  const accept = await post(karim, "/api/requests/decide", { tombId: mange.id, userId: (await get(karim, "/api/my-tombs")).tombs.find((t) => t.id === mange.id).requests[0].user_id, decision: "accept" });
  const l2 = await lea.newPage(); watch(l2, "repreneur 2");
  await l2.goto(BASE + `/veillee?id=${accept.match.id}`, { waitUntil: "networkidle" });
  await l2.waitForSelector(".thread");
  await l2.click('.vigil-links .link:has-text("Mettre fin")');
  await l2.waitForSelector("dialog.sheet[open]");
  await shot(l2, "39-mettre-fin");
  await l2.click("dialog.sheet .btn-ghost");
  await l2.waitForSelector(".thread-closed:not([hidden])");
  await l2.waitForTimeout(300);
  await shot(l2, "40-bougie-eteinte");
  if (await l2.isVisible(".composer")) problems.push("le champ de saisie reste après la fin");
  await l2.goto(BASE + "/reprises", { waitUntil: "networkidle" });
  await l2.waitForSelector(".reprise");
  await shot(l2, "41-reprises", true);

  // signaler une tombe depuis le cimetière
  const eve = await browser.newContext({ viewport: { width: 1360, height: 820 } });
  await account(eve, "Eve");
  const e = await eve.newPage(); watch(e, "visiteur");
  await e.goto(BASE + "/cimetiere", { waitUntil: "networkidle" });
  await e.waitForSelector(".card");
  await shot(e, "42-cimetiere-drapeau");
  await e.click(".flag");
  await e.waitForSelector("dialog.sheet[open]");
  await e.click('dialog .will:has(input[value="fake"])');
  await shot(e, "43-signaler-tombe");
  await e.click('dialog button[type="submit"]');
  await e.waitForSelector(".toast");
  await e.waitForSelector(".card .sample");

  // la modération
  await sql`UPDATE users SET is_admin = true WHERE email = ${mail("eve")}`;
  await e.goto(BASE + "/profil", { waitUntil: "networkidle" });
  await e.waitForSelector(".profile");
  await Promise.all([e.waitForNavigation(), e.click('a[href="/moderation"]')]);
  await e.waitForSelector(".report");
  await shot(e, "44-moderation", true);
  await overflow(e, "modération");
  if ((await e.$$(".report")).length !== 2) problems.push("2 signalements attendus : " + (await e.$$(".report")).length);
  await e.click('.report:has-text("Mangetout") .link');
  await e.waitForFunction(() => document.querySelectorAll(".report").length === 1);
  const karimPage = await lea.newPage();
  await karimPage.close();

  // non-administrateur : renvoyé à l'accueil
  const n = await lea.newPage(); watch(n, "non admin");
  await n.goto(BASE + "/moderation");
  await n.waitForURL(BASE + "/");

  // téléphone
  const phone = await browser.newContext({ ...devices["iPhone 13"], storageState: await lea.storageState() });
  const p = await phone.newPage(); watch(p, "téléphone");
  await post(lea, "/api/vigil/message", { matchId: id, body: "Un message un peu plus long pour voir comment la bulle se comporte sur un petit écran de téléphone." });
  await p.goto(BASE + `/veillee?id=${id}`, { waitUntil: "networkidle" });
  await p.waitForSelector(".thread .msg");
  await p.waitForTimeout(1600);
  await overflow(p, "veillée téléphone");
  await shot(p, "45-mobile-veillee-ressuscitee");
  await sql`UPDATE matches SET revived_at = NULL, reviver_sealed_at = NULL, creator_sealed_at = NULL, ends_at = now() + interval '8 days 20 hours' WHERE id = ${id}`;
  await p.reload({ waitUntil: "networkidle" });
  await p.waitForSelector(".thread .msg");
  await p.waitForTimeout(400);
  await overflow(p, "veillée téléphone active");
  await shot(p, "46-mobile-veillee");
  await p.tap(".composer textarea");
  await p.fill(".composer textarea", "Depuis mon téléphone.");
  await p.tap(".composer .btn-go");
  await p.waitForSelector("text=Depuis mon téléphone");
  const box = await p.$eval(".composer", (c) => { const r = c.getBoundingClientRect(); return { bottom: r.bottom, vh: innerHeight }; });
  if (box.bottom > box.vh - 40) problems.push("le champ de saisie passe sous les onglets : " + JSON.stringify(box));
  // suppression de compte, depuis le profil
  const del = await lea.newPage(); watch(del, "suppression");
  await del.goto(BASE + "/profil", { waitUntil: "networkidle" });
  await del.waitForSelector(".danger-zone");
  await del.click(".danger-zone .btn");
  await del.waitForSelector("dialog.sheet[open]");
  await del.fill('dialog input[name="password"]', "ce-n-est-pas-le-bon");
  await del.click("dialog .btn-danger");
  await del.waitForSelector("dialog .err:not(:empty)");
  await shot(del, "47-supprimer-erreur");
  if ((await get(lea, "/api/me")).user?.name !== "Léa") problems.push("mauvais mot de passe : le compte a changé");
  await del.close();

  // expiration : 14 jours écoulés, la bougie s'éteint à la prochaine consultation
  await sql`UPDATE matches SET ends_at = now() - interval '1 minute' WHERE id = ${id}`;
  await get(eve, "/api/deck");
  const expired = (await get(lea, `/api/vigil?id=${id}`)).vigil;
  if (expired.end_reason !== "expired" || expired.open) problems.push("la veillée n'a pas expiré : " + JSON.stringify(expired));
  else console.log("expiration après 14 jours : oui");

  const del2 = await lea.newPage(); watch(del2, "suppression 2");
  await del2.goto(BASE + "/profil", { waitUntil: "networkidle" });
  await del2.waitForSelector(".danger-zone");
  await shot(del2, "48-profil", true);
  await del2.click(".danger-zone .btn");
  await del2.waitForSelector("dialog.sheet[open]");
  await del2.fill('dialog input[name="password"]', PASSWORD);
  await Promise.all([del2.waitForNavigation(), del2.click("dialog .btn-danger")]);
  await del2.waitForSelector("#top nav");
  if (del2.url() !== BASE + "/") problems.push("pas de retour à l'accueil : " + del2.url());
  if ((await get(lea, "/api/me")).user) problems.push("la session reste après suppression");
  const gone = await karim.request.get(BASE + `/api/vigil?id=${id}`);
  if (gone.status() !== 404) problems.push("la veillée reste après suppression : " + gone.status());
  await shot(del2, "49-accueil-exemples");
  console.log("suppression de compte : oui");
} catch (e) {
  problems.push("ARRÊT : " + e.message.split("\n").slice(0, 3).join(" "));
  for (const c of browser.contexts()) for (const pg of c.pages()) await pg.screenshot({ path: `${OUT}/zz-erreur-${Date.now()}.png` }).catch(() => {});
} finally {
  await browser.close();
  await sql`DELETE FROM users WHERE email LIKE '%@example.com'`;
  await sql`DELETE FROM auth_attempts WHERE key LIKE 'signup:%' OR key LIKE 'ip:%' OR key LIKE '%@example.com'`;
  const left = await sql`SELECT (SELECT count(*) FROM users)::int AS users, (SELECT count(*) FROM burials)::int AS burials, (SELECT count(*) FROM messages)::int AS messages, (SELECT count(*) FROM reports)::int AS reports`;
  console.log("base après nettoyage :", JSON.stringify(left[0]));
}
console.log(problems.length ? "PROBLÈMES :\n" + problems.join("\n") : "Aucun problème");
