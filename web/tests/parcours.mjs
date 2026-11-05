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

  // tombes d'exemple : visibles, marquées, jamais comptées, et personne n'attend de réponse
  const demoDeck = (await anon("/api/deck")).data.tombs;
  const demo = demoDeck.find((t) => t.example);
  check("les tombes d'exemple sont dans la pile", demoDeck.filter((t) => t.example).length === 5, demoDeck.length);
  check("les vraies tombes passent devant", demoDeck.findIndex((t) => t.example) > demoDeck.findLastIndex((t) => !t.example));
  const realCount = (await sql`SELECT count(*)::int AS n FROM burials WHERE NOT is_example`)[0].n;
  check("les exemples ne comptent pas", (await anon("/api/graveyard")).data.burials === realCount, realCount);
  const memberCount = (await sql`SELECT count(*)::int AS n FROM users`)[0].n - 1;
  check("le gardien ne compte pas parmi les membres", (await anon("/api/graveyard")).data.users === memberCount, memberCount);
  check("ressusciter un exemple = 409", (await bob("/api/swipes", { tombId: demo.id, action: "revive", note: "Je veux le reprendre." })).status === 409);
  check("aucune demande créée", !(await bob("/api/reprises")).data.items.some((i) => i.id === demo.id));
  check("un exemple se laisse reposer", (await bob("/api/swipes", { tombId: demo.id, action: "rest" })).status === 201);
  await bob("/api/swipes/undo", { tombId: demo.id });
  check("un exemple se fleurit", (await bob("/api/swipes", { tombId: demo.id, action: "flower" })).status === 201);
  check("la fleur est marquée exemple", (await bob("/api/reprises")).data.items.find((i) => i.id === demo.id)?.example === true);
  check("une fleur d'exemple ne devient pas une demande", (await bob("/api/swipes", { tombId: demo.id, action: "revive", note: "Je veux le reprendre." })).status === 409);
  await bob("/api/swipes/undo", { tombId: demo.id });
  await bob("/api/reports", { kind: "tomb", tombId: demo.id, reason: "fake" });
  check("un exemple ne se signale pas", (await sql`SELECT count(*)::int AS n FROM reports WHERE burial_id = ${demo.id}`)[0].n === 0);
  await bob("/api/swipes/undo", { tombId: demo.id });
  check("le gardien ne peut pas se connecter", (await client()("/api/login", { email: "gardien@rip.invalid", password: "disabled-disabled" })).status === 401);

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
  check("le cimetière public la marque", (await anon("/api/graveyard")).data.tombs.find((t) => t.name === "Publique")?.state === "vigil");
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

  // la veillée
  const matchId = match.data.match.id;
  const open = await bob(`/api/vigil?id=${matchId}`);
  check("Bob ouvre la veillée", open.status === 200 && open.data.vigil.other_name === "Ana" && open.data.vigil.days_left === 14 && open.data.vigil.open === true, open.data);
  check("la demande de Bob sert d'ouverture", open.data.vigil.note === "Je peux reprendre le code.");
  check("pas d'e-mail dans la veillée", !open.text.includes("@example.com"));
  check("identifiant mal formé = 404", (await bob("/api/vigil?id=abc")).status === 404);

  // personne d'autre n'y entre
  check("Cam ne lit pas la veillée", (await cam(`/api/vigil?id=${matchId}`)).status === 404);
  check("sans compte, pas de veillée", (await anon(`/api/vigil?id=${matchId}`)).status === 401);
  check("Cam n'écrit pas dans la veillée", (await cam("/api/vigil/message", { matchId, body: "Intrus" })).status === 409);
  check("Cam ne ferme pas la veillée", (await cam("/api/vigil/end", { matchId })).status === 409);
  check("Cam ne conclut pas la veillée", (await cam("/api/vigil/seal", { matchId })).status === 409);

  // messages
  check("message vide = 400", (await bob("/api/vigil/message", { matchId, body: "   " })).status === 400);
  const sent = await bob("/api/vigil/message", { matchId, body: "Bonjour Ana,\n\nje commence quand ?" });
  check("message envoyé", sent.status === 201 && sent.data.message.mine === true, sent.data);
  check("les retours à la ligne sont gardés", sent.data.message.body.includes("\n\n"));
  check("message tronqué à 1000", (await ana("/api/vigil/message", { matchId, body: "x".repeat(1500) })).data.message.body.length === 1000);
  const anaThread = await ana(`/api/vigil?id=${matchId}`);
  check("Ana lit les deux messages", anaThread.data.messages.length === 2, anaThread.data.messages.length);
  check("chacun reconnaît les siens", anaThread.data.messages[0].mine === false && anaThread.data.messages[1].mine === true);
  const lastSeen = anaThread.data.messages[1].id;
  await bob("/api/vigil/message", { matchId, body: "Tu es là ?" });
  check("seuls les nouveaux messages reviennent", (await ana(`/api/vigil?id=${matchId}&after=${lastSeen}`)).data.messages.length === 1);
  check("pastille de messages non lus", (await ana("/api/me")).data.unread_tombs === 2, (await ana("/api/me")).data.unread_tombs);
  check("non lus sur la tombe", (await ana("/api/my-tombs")).data.tombs.find((t) => t.id === pub.id).unread === 2);
  await ana("/api/vigil/read", { matchId });
  check("lu : la pastille disparaît", (await ana("/api/me")).data.unread_tombs === 0);
  check("non lus côté repreneur", (await bob("/api/me")).data.unread_reprises === 1);
  await cam("/api/vigil/read", { matchId });
  check("Cam ne marque rien comme lu", (await bob("/api/me")).data.unread_reprises === 1);

  // conclure : il faut les deux
  const firstSeal = await bob("/api/vigil/seal", { matchId });
  check("un seul accord ne suffit pas", firstSeal.data.revived === false, firstSeal.data);
  check("Ana voit que Bob a conclu", (await ana(`/api/vigil?id=${matchId}`)).data.vigil.sealed_by_other === true);
  check("Bob attend Ana", (await bob(`/api/vigil?id=${matchId}`)).data.vigil.sealed_by_me === true);
  const bothSeal = await ana("/api/vigil/seal", { matchId });
  check("deux accords : ressuscité", bothSeal.data.revived === true, bothSeal.data);
  check("le cimetière public affiche Ressuscité", (await anon("/api/graveyard")).data.tombs.find((t) => t.name === "Publique")?.state === "risen");
  check("une tombe ressuscitée ne revient pas", !(await deckIds(eve)).includes(pub.id));
  check("la file se referme pour Cam", (await cam("/api/reprises")).data.items.find((i) => i.id === pub.id)?.decision === "declined");
  check("on ne ferme plus une reprise conclue", (await bob("/api/vigil/end", { matchId })).status === 409);
  check("on peut encore s'écrire", (await bob("/api/vigil/message", { matchId, body: "On continue !" })).status === 201);

  // quitter : la tombe retourne au cimetière et la file repart
  const raceMatch = both.find((r) => r.status === 201).data.match;
  const left = race.find((r) => r.name === raceMatch.reviver);
  const leaver = raceMatch.reviver === "Bob" ? bob : cam;
  const waiter = raceMatch.reviver === "Bob" ? cam : bob;
  check("quitter la veillée", (await leaver("/api/vigil/end", { matchId: raceMatch.id })).status === 200);
  check("quitter deux fois = 409", (await ana("/api/vigil/end", { matchId: raceMatch.id })).status === 409);
  check("la tombe retourne dans la pile", (await deckIds(eve)).includes(second.id));
  check("plus de message après la fin", (await ana("/api/vigil/message", { matchId: raceMatch.id, body: "Encore là ?" })).status === 409);
  check("plus d'accord après la fin", (await ana("/api/vigil/seal", { matchId: raceMatch.id })).status === 409);
  const closedView = (await ana(`/api/vigil?id=${raceMatch.id}`)).data.vigil;
  check("la veillée reste à relire", closedView.open === false && closedView.end_reason === "left" && closedView.ended_by_me === false, closedView);
  const secondAfter = (await ana("/api/my-tombs")).data.tombs.find((t) => t.id === second.id);
  check("l'historique reste chez le créateur", secondAfter.past.length === 1 && secondAfter.past[0].name === raceMatch.reviver, secondAfter.past);
  check("la veillée terminée reste chez le repreneur", !!(await leaver("/api/reprises")).data.items.find((i) => i.id === second.id)?.ended_at);
  check("l'autre demande peut être acceptée", secondAfter.requests.length === 1 && secondAfter.requests[0].name !== left.name);

  // 14 jours sans accord : la bougie s'éteint
  const again = await ana("/api/requests/decide", { tombId: second.id, userId: secondAfter.requests[0].user_id, decision: "accept" });
  check("nouvelle veillée après la première", again.status === 201, again.data);
  await sql`UPDATE matches SET ends_at = now() - interval '1 minute' WHERE id = ${again.data.match.id}`;
  check("après 14 jours, plus de message", (await waiter("/api/vigil/message", { matchId: again.data.match.id, body: "Trop tard ?" })).status === 409);
  check("après 14 jours, plus d'accord", (await waiter("/api/vigil/seal", { matchId: again.data.match.id })).status === 409);
  check("la tombe est de retour dès qu'on regarde le cimetière", (await deckIds(eve)).includes(second.id));
  check("la bougie s'est éteinte", (await ana(`/api/vigil?id=${again.data.match.id}`)).data.vigil.end_reason === "expired");

  // limite d'envoi
  const limits = [];
  for (let i = 0; i < 21; i += 1) limits.push((await bob("/api/vigil/message", { matchId, body: `Message ${i}` })).status);
  check("trop de messages en une minute = 429", limits.at(-1) === 429, limits.slice(-3));

  // signalement
  check("signaler sans compte = 401", (await anon("/api/reports", { kind: "tomb", tombId: second.id, reason: "fake" })).status === 401);
  check("motif inconnu = 400", (await eve("/api/reports", { kind: "tomb", tombId: second.id, reason: "ennui" })).status === 400);
  check("motif d'un autre type = 400", (await eve("/api/reports", { kind: "tomb", tombId: second.id, reason: "harassment" })).status === 400);
  check("signaler une tombe", (await eve("/api/reports", { kind: "tomb", tombId: second.id, reason: "fake", details: "Ce projet n'existe pas." })).status === 201);
  check("la tombe signalée sort de sa pile", !(await deckIds(eve)).includes(second.id));
  await eve("/api/reports", { kind: "tomb", tombId: second.id, reason: "fake" });
  await ana("/api/reports", { kind: "tomb", tombId: second.id, reason: "fake" });
  const count = async () => (await sql`SELECT count(*)::int AS n FROM reports WHERE burial_id = ${second.id}`)[0].n;
  check("un signalement par personne, pas sur sa propre tombe", (await count()) === 1, await count());
  check("la modération est interdite aux membres", (await eve("/api/moderation")).status === 403);
  check("résoudre est interdit aux membres", (await eve("/api/moderation/resolve", { reportId: crypto.randomUUID(), action: "dismiss" })).status === 403);
  check("la modération est interdite sans compte", (await anon("/api/moderation")).status === 401);
  const [frank, gina] = [client(), client()];
  await frank("/api/signup", { name: "Frank", email: email("frank"), password: PASSWORD });
  await gina("/api/signup", { name: "Gina", email: email("gina"), password: PASSWORD });
  await frank("/api/reports", { kind: "tomb", tombId: second.id, reason: "offensive" });
  check("2 signalements : la tombe reste", (await deckIds(gina)).includes(second.id));
  await gina("/api/reports", { kind: "tomb", tombId: second.id, reason: "stolen" });
  check("3 signalements : la tombe se retire", !(await anon("/api/graveyard")).data.tombs.some((t) => t.name === "Seconde"));
  check("le créateur ne peut pas la republier", (await ana("/api/tombs/visibility", { tombId: second.id, visible: true })).status === 409);
  check("le créateur le voit", (await ana("/api/my-tombs")).data.tombs.find((t) => t.id === second.id).hidden === true);

  // signaler une personne dans une veillée
  check("Cam ne peut pas signaler dans une veillée étrangère", (await cam("/api/reports", { kind: "person", matchId, reason: "scam" })).status === 201
    && (await sql`SELECT count(*)::int AS n FROM reports r JOIN users u ON u.id = r.reporter_id WHERE r.kind = 'person' AND u.email LIKE '%@example.com'`)[0].n === 0);
  check("Ana signale Bob", (await ana("/api/reports", { kind: "person", matchId, reason: "harassment", details: "Il insiste." })).status === 201);

  // l'administrateur traite
  await sql`UPDATE users SET is_admin = true WHERE email = ${email("dan")}`;
  check("l'administrateur voit le compteur", (await dan("/api/me")).data.open_reports === 4, (await dan("/api/me")).data.open_reports);
  check("un membre n'a pas de compteur", (await eve("/api/me")).data.open_reports === 0);
  const queueOpen = (await dan("/api/moderation")).data.reports;
  check("4 signalements ouverts", queueOpen.length === 4, queueOpen.length);
  const person = queueOpen.find((r) => r.kind === "person");
  check("la conversation est jointe", person.target === "Bob" && person.messages.length > 0, person);
  const tombReport = queueOpen.find((r) => r.kind === "tomb");
  check("classer rend la tombe", (await dan("/api/moderation/resolve", { reportId: tombReport.id, action: "dismiss" })).status === 200 && (await deckIds(gina)).length >= 0);
  check("la tombe revient au cimetière", (await anon("/api/graveyard")).data.tombs.some((t) => t.name === "Seconde"));
  check("classer ferme ses signalements", (await dan("/api/moderation")).data.reports.length === 1);
  check("traiter deux fois = 409", (await dan("/api/moderation/resolve", { reportId: tombReport.id, action: "dismiss" })).status === 409);

  // retirer une tombe : d'abord un nouveau signalement, sur la tombe de Frank
  await frank("/api/burials", tomb("À retirer"));
  const toRemove = (await frank("/api/my-tombs")).data.tombs[0];
  await gina("/api/reports", { kind: "tomb", tombId: toRemove.id, reason: "offensive" });
  const removeReport = (await dan("/api/moderation")).data.reports.find((r) => r.tomb === "À retirer");
  check("retirer la tombe", (await dan("/api/moderation/resolve", { reportId: removeReport.id, action: "remove" })).status === 200);
  check("la tombe a disparu", !(await deckIds(eve)).includes(toRemove.id));
  check("retirer une personne n'a pas de sens", (await dan("/api/moderation/resolve", { reportId: person.id, action: "remove" })).status === 400);

  // bloquer : Bob est reconnecté d'abord pour vérifier que sa session tombe
  const bobAgain = client();
  await bobAgain("/api/login", { email: email("bob"), password: PASSWORD });
  await eve("/api/burials", tomb("Tombe d'Eve"));
  const eveTomb = (await eve("/api/my-tombs")).data.tombs[0];
  await bob("/api/swipes", { tombId: eveTomb.id, action: "revive", note: "Je reprends aussi celle-ci." });
  const eveMatch = await eve("/api/requests/decide", { tombId: eveTomb.id, userId: queue.find((r) => r.name === "Bob").user_id, decision: "accept" });
  check("Bob entre en veillée avec Eve", eveMatch.status === 201, eveMatch.data);
  check("bloquer Bob", (await dan("/api/moderation/resolve", { reportId: person.id, action: "ban" })).status === 200);
  check("sa session tombe", (await bobAgain("/api/me")).data.user === null);
  check("il ne peut plus se connecter", (await client()("/api/login", { email: email("bob"), password: PASSWORD })).status === 403);
  check("sa veillée en cours se ferme", (await eve(`/api/vigil?id=${eveMatch.data.match.id}`)).data.vigil.end_reason === "banned");
  check("une reprise conclue ne se ferme pas", (await ana(`/api/vigil?id=${matchId}`)).data.vigil.revived_at !== null && (await ana(`/api/vigil?id=${matchId}`)).data.vigil.ended_at === null);

  // un administrateur ne peut pas être bloqué
  await dan("/api/burials", tomb("Tombe de Dan"));
  const danTomb = (await dan("/api/my-tombs")).data.tombs.find((t) => t.name === "Tombe de Dan");
  await gina("/api/reports", { kind: "tomb", tombId: danTomb.id, reason: "fake" });
  const danReport = (await dan("/api/moderation")).data.reports.find((r) => r.tomb === "Tombe de Dan");
  check("un administrateur ne se bloque pas", (await dan("/api/moderation/resolve", { reportId: danReport.id, action: "ban" })).status === 409);

  // publication
  check("publier la tombe privée", (await ana("/api/tombs/visibility", { tombId: priv.id, visible: true })).status === 200);
  check("elle arrive dans la pile", (await deckIds(cam)).includes(priv.id));

  // profil
  check("profil enregistré", (await cam("/api/profile", { name: "Camille", skills: "Go", bio: "Bonjour" })).status === 200);
  check("nom trop court = 400", (await cam("/api/profile", { name: "B" })).status === 400);
  check("profil relu", (await cam("/api/me")).data.user.bio === "Bonjour");

  // origine et piège à robots
  check("autre origine = 403", (await ana("/api/swipes", { tombId: priv.id, action: "flower" }, { origin: "https://exemple-pirate.com" })).status === 403);
  check("origine null = 403", (await ana("/api/swipes", { tombId: priv.id, action: "flower" }, { origin: "null" })).status === 403);
  const trap = await client()("/api/signup", { name: "Robot", email: email("robot"), password: PASSWORD, website: "http://spam" });
  check("le piège fait semblant", trap.status === 200 && !trap.setCookie);

  // déconnexion
  check("déconnexion", (await cam("/api/logout", {})).status === 200);
  check("session fermée", (await cam("/api/me")).data.user === null);

  // suppression de compte : Eve a une tombe et a parlé avec Bob
  check("supprimer sans compte = 401", (await anon("/api/account/delete", { password: PASSWORD })).status === 401);
  check("supprimer depuis un autre site = 403", (await eve("/api/account/delete", { password: PASSWORD }, { origin: "https://exemple-pirate.com" })).status === 403);
  check("mauvais mot de passe = 403", (await eve("/api/account/delete", { password: "pas-le-bon-mot-de-passe" })).status === 403);
  check("rien n'est supprimé", (await eve("/api/me")).data.user?.name === "Eve");
  await gina("/api/swipes", { tombId: eveTomb.id, action: "flower" }).catch(() => {});
  const gone = await eve("/api/account/delete", { password: PASSWORD });
  check("compte supprimé", gone.status === 200, gone.data);
  check("le cookie est effacé", /Max-Age=0/.test(gone.setCookie), gone.setCookie);
  check("la session est fermée", (await eve("/api/me")).data.user === null);
  const leftovers = await sql`SELECT (SELECT count(*) FROM burials WHERE id = ${eveTomb.id})::int AS tombs,
                                     (SELECT count(*) FROM matches WHERE id = ${eveMatch.data.match.id})::int AS matches,
                                     (SELECT count(*) FROM swipes WHERE burial_id = ${eveTomb.id})::int AS swipes,
                                     (SELECT count(*) FROM auth_attempts WHERE key = ${`login:${email("eve")}`})::int AS attempts`;
  check("ses données sont parties", Object.values(leftovers[0]).every((n) => n === 0), leftovers[0]);
  check("connexion impossible", (await client()("/api/login", { email: email("eve"), password: PASSWORD })).status === 401);
  check("l'e-mail est de nouveau libre", (await client()("/api/signup", { name: "Eve", email: email("eve"), password: PASSWORD })).status === 201);

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
