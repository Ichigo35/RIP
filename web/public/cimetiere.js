import { $, api, askAuth, askNote, CAUSES, chip, el, plural, shell, tombFace, toast, WILLS } from "/lib.js";

const THRESHOLD = 110;
const FLIGHT_MS = 320;
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const DONE = {
  revive: (name) => `Ta demande pour ${name} est partie.`,
  rest: (name) => `${name} repose en paix.`,
  flower: (name) => `Fleur déposée sur ${name}.`,
};
const FLIGHT = { revive: "translate(130vw,-4vh) rotate(16deg)", rest: "translate(-130vw,-4vh) rotate(-16deg)", flower: "translate(0,-130vh)" };

const stage = $("#stage");
const acts = $("#acts");
const count = $("#count");
const me = await shell("/cimetiere");

let queue = [];
let total = 0;
let rested = 0;
let busy = false;

function stamp(cls, text) {
  const s = el("span", `stamp ${cls}`, text);
  s.setAttribute("aria-hidden", "true");
  return s;
}

function cardEl(t) {
  const card = el("article", t.name.length > 22 ? "card long-name" : "card");
  const tomb = tombFace(t, "h2");
  tomb.append(el("hr"));
  const facts = el("dl", "facts");
  facts.append(el("dt", null, "De quoi il est mort"), el("dd", null, CAUSES[t.cause] || "Cause inconnue"));
  if (t.legacy) {
    const legacy = el("dd", "clamp", t.legacy);
    facts.append(el("dt", null, "Ce qui existe"), legacy);
  }
  tomb.append(facts);
  const chips = el("ul", "chips");
  if (t.missing) chips.append(chip(`Cherche : ${t.missing}`, "chip-miss"));
  chips.append(chip(WILLS[t.will] || "", "chip-will"));
  if (t.flowers) chips.append(chip(plural(t.flowers, "fleur")));
  tomb.append(chips);
  card.append(stamp("stamp-go", "Ressusciter"), stamp("stamp-rest", "Laisser reposer"), stamp("stamp-flower", "Une fleur"), tomb, el("div", "plinth"));
  drag(card);
  return card;
}

/* Le texte coupé ne se mesure qu'une fois la carte dans la page. */
function offerMore(card) {
  const legacy = $(".clamp", card);
  if (!legacy || legacy.scrollHeight <= legacy.clientHeight) return;
  const more = Object.assign(el("button", "more", "Lire tout"), { type: "button" });
  more.addEventListener("click", () => {
    legacy.classList.remove("clamp");
    more.remove();
    fit();
  });
  legacy.after(more);
}

/* Une tombe plus haute que l'écran doit laisser défiler la page au doigt. */
function fit() {
  $(".card", stage)?.classList.toggle("tall", document.documentElement.scrollHeight > innerHeight + 1);
}

function render() {
  const t = queue[0];
  stage.classList.toggle("has-next", total > 1);
  acts.hidden = !t;
  count.textContent = t ? `${plural(total, "tombe")} à visiter` : "";
  if (t) {
    const card = cardEl(t);
    stage.replaceChildren(card);
    offerMore(card);
    fit();
    return;
  }
  if (total > 0) return load();
  stage.replaceChildren(emptyEl());
}

function emptyEl() {
  const box = el("div", "deck-empty");
  box.append(el("h2", null, me ? "Tu as visité toutes les tombes" : "Le cimetière attend sa première tombe"));
  box.append(el("p", null, rested ? "Tu peux revoir celles que tu as laissées reposer, ou enterrer un projet à toi." : "Enterre un projet : quelqu'un le ressuscitera peut-être."));
  const row = el("div", "cta");
  if (rested) {
    const again = Object.assign(el("button", "btn btn-ghost", "Revoir les tombes au repos"), { type: "button" });
    again.addEventListener("click", async () => {
      const { ok, data } = await api("/api/swipes/reset", {});
      if (ok) load();
      else toast(data.error);
    });
    row.append(again);
  }
  const bury = el("a", "btn btn-go", "Enterrer un projet");
  bury.href = "/#enterrer";
  row.append(bury);
  box.append(row);
  return box;
}

async function load() {
  const { ok, data } = await api("/api/deck");
  if (!ok) {
    stage.replaceChildren(el("p", "empty", data.error || "Impossible de charger le cimetière pour l'instant."));
    return;
  }
  queue = data.tombs;
  total = queue.length ? data.total : 0;
  rested = data.rested;
  render();
}

/* ---------- le geste ---------- */

function paint(card, dx, dy) {
  card.style.transform = `translate(${dx}px,${dy}px) rotate(${dx * 0.04}deg)`;
  const part = (v) => Math.min(1, Math.max(0, v / THRESHOLD));
  const up = -dy > Math.abs(dx);
  card.style.setProperty("--go", up ? 0 : part(dx));
  card.style.setProperty("--rest", up ? 0 : part(-dx));
  card.style.setProperty("--flower", up ? part(-dy) : 0);
}

function settle(card) {
  card.style.transform = "";
  for (const p of ["--go", "--rest", "--flower"]) card.style.removeProperty(p);
}

function gesture(dx, dy) {
  if (dy < -THRESHOLD && -dy > Math.abs(dx)) return "flower";
  if (dx > THRESHOLD) return "revive";
  if (dx < -THRESHOLD) return "rest";
  return null;
}

function drag(card) {
  let start = null;
  card.addEventListener("pointerdown", (e) => {
    if (busy || e.button !== 0 || e.target.closest("button")) return;
    start = { x: e.clientX, y: e.clientY };
    card.setPointerCapture(e.pointerId);
    card.classList.add("dragging");
  });
  card.addEventListener("pointermove", (e) => {
    if (start) paint(card, e.clientX - start.x, e.clientY - start.y);
  });
  card.addEventListener("pointerup", (e) => {
    if (!start) return;
    const action = gesture(e.clientX - start.x, e.clientY - start.y);
    start = null;
    card.classList.remove("dragging");
    if (action) act(action);
    else settle(card);
  });
  card.addEventListener("pointercancel", () => {
    start = null;
    card.classList.remove("dragging");
    settle(card);
  });
}

async function act(action) {
  const t = queue[0];
  const card = $(".card", stage);
  if (!t || !card || busy) return;

  if (!me) {
    settle(card);
    if (await askAuth("Crée ton compte pour garder tes gestes et écrire aux créateurs.")) location.reload();
    return;
  }

  let extra = {};
  if (action === "revive") {
    settle(card);
    const answer = await askNote(t, me);
    if (!answer) return;
    extra = answer;
    if (answer.skills) me.user.skills = answer.skills;
  }

  busy = true;
  const sending = api("/api/swipes", { tombId: t.id, action, ...extra });
  if (!calm) {
    card.classList.add("leaving", `leaving-${action}`);
    card.style.transform = FLIGHT[action];
    await sleep(FLIGHT_MS);
  }
  const { ok, data } = await sending;
  busy = false;
  if (!ok) {
    toast(data.error || "Une erreur est survenue. Réessaie.");
    return load();
  }
  queue.shift();
  total -= 1;
  if (action === "rest") rested += 1;
  render();
  toast(DONE[action](t.name), { label: "Annuler", run: () => undo(t, action) });
}

async function undo(t, action) {
  const { ok, data } = await api("/api/swipes/undo", { tombId: t.id });
  if (!ok) return toast(data.error || "Ce geste ne peut plus être annulé.");
  queue.unshift(t);
  total += 1;
  if (action === "rest") rested -= 1;
  render();
}

acts.addEventListener("click", (e) => {
  const button = e.target.closest("[data-action]");
  if (button) act(button.dataset.action);
});

addEventListener("resize", fit);

document.addEventListener("keydown", (e) => {
  if ($("dialog[open]") || e.target.matches("input,textarea,select") || e.metaKey || e.ctrlKey || e.altKey) return;
  const action = { ArrowRight: "revive", ArrowLeft: "rest", ArrowUp: "flower" }[e.key];
  if (!action) return;
  e.preventDefault();
  act(action);
});

load();
