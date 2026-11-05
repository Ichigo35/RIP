// Parcours complet de l'API contre un serveur local (npx wrangler dev), avec comptes @example.com.
// Lancement : node tests/parcours.mjs. Les données de test sont supprimées à la fin, même en cas d'échec.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const BASE = process.env.BASE ?? "http://localhost:8787";
const DATABASE_URL = readFileSync(new URL("../.dev.vars", import.meta.url), "utf8").match(/DATABASE_URL=["']?([^"'\n]+)/)[1];
const sql = neon(DATABASE_URL);
const stamp = Date.now();
let passed = 0;
const failures = [];

function check(label, condition, detail) {
  if (condition) passed += 1;
  else failures.push(`${label}${detail === undefined ? "" : ` : ${JSON.stringify(detail)}`}`);
}

function client() {
  let cookie = "";
  async function call(path, payload, headers = {}) {
    const r = await fetch(BASE + path, {
      method: payload === undefined ? "GET" : "POST",
      headers: { ...(payload === undefined ? {} : { "content-type": "application/json" }), ...(cookie ? { cookie } : {}), ...headers },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
    const setCookie = r.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    const text = await r.text();
    return { status: r.status, text, data: text ? JSON.parse(text) : {}, setCookie };
  }
  return call;
}

const tomb = (name, consent = true) => ({
  name, yearStart: "2023", yearEnd: "2025", epitaph: "Il voulait tout changer.", cause: "no_time",
  legacy: "Une app à 80 %", missing: "Dev mobile", will: "cofound", consent,
});
const email = (n) => `${n}-${stamp}@example.com`;
const PASSWORD = "mot-de-passe-solide";
const deckIds = async (c) => (await c("/api/deck")).data.tombs.map((t) => t.id);

async function run() {
  const anon = client();
  const [ana, bob, cam, dan] = [client(), client(), client(), client()];

  // sans compte
  check("me anonyme", (await anon("/api/me")).data.user === null);
  check("mes tombes anonyme = 401", (await anon("/api/my-tombs")).status === 401);
  check("reprises anonyme = 401", (await anon("/api/reprises")).status === 401);
  check("enterrer anonyme = 401", (await anon("/api/burials", tomb("Refus"))).status === 401);
  check("swipe anonyme = 401", (await anon("/api/swipes", { tombId: crypto.randomUUID(), action: "rest" })).status === 401);

  // inscription et connexion
  check("mot de passe court = 400", (await ana("/api/signup", { name: "Ana", email: email("ana"), password: "court" })).status === 400);
  check("e-mail invalide = 400", (await ana("/api/signup", { name: "Ana", email: "nope", password: PASSWORD })).status === 400);
  const signup = await ana("/api/signup", { name: "Ana", email: email("ana"), password: PASSWORD });
  check("inscription = 201", signup.status === 201, signup);
  check("cookie HttpOnly, Secure, Lax", /HttpOnly/.test(signup.setCookie) && /Secure/.test(signup.setCookie) && /SameSite=Lax/.test(signup.setCookie), signup.setCookie);
  check("session ouverte", (await ana("/api/me")).data.user?.name === "Ana");
  check("e-mail en double = 409", (await client()("/api/signup", { name: "Ana2", email: email("ana"), password: PASSWORD })).status === 409);
  for (const [c, n] of [[bob, "Bob"], [cam, "Cam"], [dan, "Dan"]]) await c("/api/signup", { name: n, email: email(n.toLowerCase()), password: PASSWORD });

  const relog = client();
  check("mauvais mot de passe = 401", (await relog("/api/login", { email: email("ana"), password: "faux-mot-de-passe" })).status === 401);
  check("e-mail inconnu = 401", (await relog("/api/login", { email: email("inconnu"), password: PASSWORD })).status === 401);
  check("bon mot de passe = 200", (await relog("/api/login", { email: email("ana").toUpperCase(), password: PASSWORD })).status === 200);
  check("connexion : session valide", (await relog("/api/me")).data.user?.name === "Ana");

  // enterrer
  check("enterrer (publique) = 201", (await ana("/api/burials", tomb("Publique"))).status === 201);
  check("enterrer (privée) = 201", (await ana("/api/burials", tomb("Privée", false))).status === 201);
  check("enterrer (seconde) = 201", (await ana("/api/burials", tomb("Seconde"))).status === 201);
  const mine = (await ana("/api/my-tombs")).data.tombs;
  const byName = (n) => mine.find((t) => t.name === n);
  const [pub, priv, second] = [byName("Publique"), byName("Privée"), byName("Seconde")];
  check("3 tombes chez Ana", mine.length === 3, mine.length);

  // la pile
  const bobDeck = await deckIds(bob);
  check("Bob voit les tombes publiques", bobDeck.includes(pub.id) && bobDeck.includes(second.id));
  check("Bob ne voit pas la tombe privée", !bobDeck.includes(priv.id));
  check("Ana ne voit pas ses tombes", !(await deckIds(ana)).some((id) => [pub.id, priv.id, second.id].includes(id)));
  check("sans compte, la pile est visible", (await deckIds(anon)).includes(pub.id));

  // gestes
  check("tombe mal formée = 400", (await bob("/api/swipes", { tombId: "1' OR '1'='1", action: "rest" })).status === 400);
  check("geste inconnu = 400", (await bob("/api/swipes", { tombId: pub.id, action: "voler" })).status === 400);
  check("ressusciter sans mot = 400", (await bob("/api/swipes", { tombId: pub.id, action: "revive", note: "court" })).status === 400);
  check("ressusciter = 201", (await bob("/api/swipes", { tombId: pub.id, action: "revive", note: "Je peux reprendre le code.", skills: "Flutter, Dart" })).status === 201);
  check("compétences reprises sur le profil", (await bob("/api/me")).data.user.skills === "Flutter, Dart");
  check("la tombe sort de la pile de Bob", !(await deckIds(bob)).includes(pub.id));
  check("Cam ressuscite aussi", (await cam("/api/swipes", { tombId: pub.id, action: "revive", note: "J'ai des utilisateurs prêts." })).status === 201);
  check("swiper sa propre tombe = 409", (await ana("/api/swipes", { tombId: pub.id, action: "flower" })).status === 409);
  check("swiper une tombe privée = 409", (await bob("/api/swipes", { tombId: priv.id, action: "flower" })).status === 409);

  // fleur, annulation, repos
  check("fleur = 201", (await dan("/api/swipes", { tombId: pub.id, action: "flower" })).status === 201);
  check("fleur comptée", (await ana("/api/my-tombs")).data.tombs.find((t) => t.id === pub.id).flowers === 1);
  check("annuler la fleur", (await dan("/api/swipes/undo", { tombId: pub.id })).status === 200);
  check("la tombe revient dans la pile", (await deckIds(dan)).includes(pub.id));
  await dan("/api/swipes", { tombId: second.id, action: "rest" });
  check("repos compté", (await dan("/api/deck")).data.rested === 1);
  await dan("/api/swipes/reset", {});
  check("revoir les tombes au repos", (await deckIds(dan)).includes(second.id));
  await dan("/api/swipes", { tombId: pub.id, action: "flower" });
  check("une fleur peut devenir une demande", (await dan("/api/swipes", { tombId: pub.id, action: "revive", note: "Finalement je me lance." })).status === 201);

  // la file du créateur
  const queue = (await ana("/api/my-tombs")).data.tombs.find((t) => t.id === pub.id).requests;
  check("3 demandes en file", queue.length === 3, queue.length);
  check("badge du créateur", (await ana("/api/me")).data.requests === 3);
  const idOf = (n) => queue.find((r) => r.name === n).user_id;

  // personne n'agit sur la tombe d'un autre
  check("Bob ne peut pas s'accepter lui-même", (await bob("/api/requests/decide", { tombId: pub.id, userId: idOf("Bob"), decision: "accept" })).status === 409);
  check("Bob ne peut pas décliner Cam", (await bob("/api/requests/decide", { tombId: pub.id, userId: idOf("Cam"), decision: "decline" })).status === 409);
  check("Bob ne peut pas retirer la tombe d'Ana", (await bob("/api/tombs/visibility", { tombId: pub.id, visible: false })).status === 409);

  // e-mails jamais exposés
  for (const [label, r] of [["file", await ana("/api/my-tombs")], ["pile", await bob("/api/deck")], ["cimetière", await anon("/api/graveyard")], ["reprises", await bob("/api/reprises")]]) {
    check(`aucun e-mail dans ${label}`, !r.text.includes("@example.com"));
    check(`aucun mot de passe dans ${label}`, !r.text.includes("pbkdf2"));
  }

  // décliner, accepter
  check("décliner Dan", (await ana("/api/requests/decide", { tombId: pub.id, userId: idOf("Dan"), decision: "decline" })).status === 200);
  check("Dan ne peut pas redemander", (await dan("/api/swipes", { tombId: pub.id, action: "revive", note: "Je réessaie encore." })).status === 409);
  check("Dan voit le refus", (await dan("/api/reprises")).data.items.find((i) => i.id === pub.id)?.decision === "declined");

  const match = await ana("/api/requests/decide", { tombId: pub.id, userId: idOf("Bob"), decision: "accept" });
  check("accepter = 201", match.status === 201, match);
  check("le match nomme la tombe et Bob", match.data.match?.tomb === "Publique" && match.data.match?.reviver === "Bob", match.data);
  check("une seule reprise à la fois", (await ana("/api/requests/decide", { tombId: pub.id, userId: idOf("Cam"), decision: "accept" })).status === 409);
  check("la tombe quitte la pile", !(await deckIds(dan)).includes(pub.id) && !(await deckIds(anon)).includes(pub.id));
  check("le cimetière public la marque", (await anon("/api/graveyard")).data.tombs.find((t) => t.name === "Publique")?.revived === true);
  const eve = client();
  await eve("/api/signup", { name: "Eve", email: email("eve"), password: PASSWORD });
  check("plus de swipe sur une tombe en reprise", (await eve("/api/swipes", { tombId: pub.id, action: "flower" })).status === 409);
  const after = (await ana("/api/my-tombs")).data.tombs.find((t) => t.id === pub.id);
  check("Ana voit Bob comme repreneur", after.reviver_name === "Bob" && after.requests.length === 1, after);
  check("le badge ne compte plus une tombe en reprise", (await ana("/api/me")).data.requests === 0);

  const bobMe = (await bob("/api/me")).data;
  check("Bob apprend le match", bobMe.unseen_match?.tomb === "Publique" && bobMe.unseen_match?.creator === "Ana", bobMe);
  check("Cam ne peut pas marquer le match de Bob", (await cam("/api/matches/seen", { matchId: bobMe.unseen_match.id })).status === 200
    && (await bob("/api/me")).data.unseen_match !== null);
  await bob("/api/matches/seen", { matchId: bobMe.unseen_match.id });
  check("le match n'est annoncé qu'une fois", (await bob("/api/me")).data.unseen_match === null);
  check("Bob voit sa reprise", (await bob("/api/reprises")).data.items.find((i) => i.id === pub.id)?.creator_name === "Ana");
  check("Cam voit que c'est pris", (await cam("/api/reprises")).data.items.find((i) => i.id === pub.id)?.taken === true);
  check("un geste accepté ne s'annule pas", (await bob("/api/swipes/undo", { tombId: pub.id })).status === 409);

  // deux acceptations en même temps : une seule passe
  await bob("/api/swipes", { tombId: second.id, action: "revive", note: "Je prends aussi celle-ci." });
  await cam("/api/swipes", { tombId: second.id, action: "revive", note: "Moi aussi je la veux." });
  const race = (await ana("/api/my-tombs")).data.tombs.find((t) => t.id === second.id).requests;
  const both = await Promise.all(race.map((r) => ana("/api/requests/decide", { tombId: second.id, userId: r.user_id, decision: "accept" })));
  check("course : un seul match", both.filter((r) => r.status === 201).length === 1 && both.filter((r) => r.status === 409).length === 1, both.map((r) => r.status));

  // publication
  check("publier la tombe privée", (await ana("/api/tombs/visibility", { tombId: priv.id, visible: true })).status === 200);
  check("elle arrive dans la pile", (await deckIds(bob)).includes(priv.id));

  // profil
  check("profil enregistré", (await bob("/api/profile", { name: "Bobby", skills: "Go", bio: "Bonjour" })).status === 200);
  check("nom trop court = 400", (await bob("/api/profile", { name: "B" })).status === 400);
  check("profil relu", (await bob("/api/me")).data.user.bio === "Bonjour");

  // origine et piège à robots
  check("autre origine = 403", (await ana("/api/swipes", { tombId: priv.id, action: "flower" }, { origin: "https://exemple-pirate.com" })).status === 403);
  check("origine null = 403", (await ana("/api/swipes", { tombId: priv.id, action: "flower" }, { origin: "null" })).status === 403);
  const trap = await client()("/api/signup", { name: "Robot", email: email("robot"), password: PASSWORD, website: "http://spam" });
  check("le piège fait semblant", trap.status === 200 && !trap.setCookie);

  // déconnexion
  check("déconnexion", (await bob("/api/logout", {})).status === 200);
  check("session fermée", (await bob("/api/me")).data.user === null);

  // brute force, en dernier : bloque cette adresse pour 15 minutes
  const guess = client();
  let last;
  for (let i = 0; i < 11; i += 1) last = await guess("/api/login", { email: email("ana"), password: `essai-numero-${i}` });
  check("après 10 échecs = 429", last.status === 429, last.status);
  check("même le bon mot de passe est bloqué", (await guess("/api/login", { email: email("ana"), password: PASSWORD })).status === 429);
}

async function cleanup() {
  const ips = ["local", "127.0.0.1", "::1"].map((ip) => createHash("sha256").update(`rip:${ip}`).digest("hex").slice(0, 24));
  await sql`DELETE FROM users WHERE email LIKE '%@example.com'`;
  await sql`DELETE FROM auth_attempts WHERE key LIKE '%@example.com' OR key = ANY(${ips.flatMap((ip) => [`signup:${ip}`, `ip:${ip}`])})`;
  const left = await sql`SELECT (SELECT count(*) FROM users WHERE email LIKE '%@example.com')::int AS users,
                                (SELECT count(*) FROM burials WHERE user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = burials.user_id))::int AS orphans`;
  console.log("Nettoyage :", JSON.stringify(left[0]));
}

try {
  await run();
} catch (e) {
  failures.push(`arrêt du parcours : ${e.stack}`);
} finally {
  await cleanup();
}
console.log(`${passed} contrôles réussis, ${failures.length} en échec`);
for (const f of failures) console.log(" ✗", f);
process.exit(failures.length ? 1 : 0);
