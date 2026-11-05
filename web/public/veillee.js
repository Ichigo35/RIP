import { $, api, askConfirm, askReport, chip, el, member, plural, REPORT_PERSON, RISEN, showMatch, toast } from "/lib.js";

const POLL_MS = 5000;
const TOTAL_DAYS = 14;
const id = new URLSearchParams(location.search).get("id") ?? "";
const view = $("#view");
const touch = matchMedia("(hover: none)").matches;
const when = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

await member(null, "Connecte-toi pour ouvrir ta veillée.");

const side = el("aside", "vigil-side");
const panel = el("section", "vigil-panel");
panel.setAttribute("aria-label", "Conversation");
const thread = el("div", "thread");
thread.setAttribute("role", "log");
thread.tabIndex = 0;
const closed = el("p", "thread-closed");
closed.hidden = true;
const form = el("form", "composer");
const input = Object.assign(el("textarea"), { name: "body", rows: 1, maxLength: 1000, placeholder: "Écris ton message…" });
input.setAttribute("aria-label", "Ton message");
const send = Object.assign(el("button", "btn btn-go", "Envoyer"), { type: "submit" });
const sendError = el("p", "form-err");
form.append(input, send, sendError);
panel.append(thread, closed, form);

const seen = new Set();
let state = null;
let lastId = 0;
let started = false;

/* La bougie se consume : sa hauteur suit les jours restants. */
function candle(part, lit) {
  const top = 212 - Math.round(26 + 150 * Math.min(1, Math.max(0, part)));
  const flame = lit ? `<path class="flame" d="M60 ${top - 44}c11 13 15 21 15 28a15 15 0 0 1-30 0c0-7 4-15 15-28z"/>` : "";
  return `<svg class="candle" viewBox="0 0 120 232" aria-hidden="true">${flame}<path class="wick" d="M60 ${top - 10}v10"/><rect class="wax" x="40" y="${top}" width="40" height="${212 - top}" rx="3"/><rect class="plate" x="24" y="212" width="72" height="9" rx="2"/><rect class="plate" x="12" y="221" width="96" height="9" rx="2"/></svg>`;
}

function overText(s) {
  if (s.end_reason === "left") return s.ended_by_me ? "Tu as mis fin à la veillée." : `${s.other_name} a mis fin à la veillée.`;
  if (s.end_reason === "banned") return "La modération a fermé cette veillée.";
  return "Les 14 jours sont passés sans accord.";
}

function action(label, cls, run) {
  const b = Object.assign(el("button", cls, label), { type: "button" });
  b.addEventListener("click", run);
  return b;
}

function renderSide(s) {
  const time = el("div", "vigil-time");
  if (s.revived_at) {
    time.insertAdjacentHTML("beforeend", RISEN);
    time.append(el("p", "vigil-days", "Ressuscité"), el("p", "vigil-left", "Vous avez conclu la reprise."));
  } else if (s.open) {
    time.insertAdjacentHTML("beforeend", candle(s.days_left / TOTAL_DAYS, true));
    time.append(el("p", "vigil-days", plural(s.days_left, "jour")), el("p", "vigil-left", "avant que la bougie s'éteigne"));
  } else {
    time.insertAdjacentHTML("beforeend", candle(0, false));
    time.append(el("p", "vigil-days", "Éteinte"), el("p", "vigil-left", overText(s)));
  }

  const who = el("div", "vigil-who");
  who.append(el("h1", "vigil-tomb", s.tomb), el("p", "vigil-with", `Avec ${s.other_name}`));
  if (s.other_skills) {
    const tags = el("ul", "tags");
    tags.append(...s.other_skills.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 4).map((x) => chip(x)));
    who.append(tags);
  }
  if (s.other_bio) who.append(el("p", "request-bio", s.other_bio));

  const acts = el("div", "vigil-acts");
  if (s.open && !s.revived_at) {
    if (s.sealed_by_me) acts.append(el("p", "vigil-wait", `Tu as conclu. En attente de ${s.other_name}.`));
    else {
      if (s.sealed_by_other) acts.append(el("p", "vigil-wait", `${s.other_name} veut conclure la reprise.`));
      acts.append(action("Conclure la reprise", "btn btn-go", conclude));
      acts.append(el("p", "seal-note", "Quand vous êtes d'accord tous les deux, la tombe devient Ressuscitée."));
    }
  }
  const links = el("div", "vigil-links");
  if (s.open && !s.revived_at) links.append(action("Mettre fin à la veillée", "link", leave));
  links.append(action("Signaler", "link", signal));
  acts.append(links);

  const back = el("a", "vigil-back", s.is_creator ? "Retour à mes tombes" : "Retour à mes reprises");
  back.href = s.is_creator ? "/mes-tombes" : "/reprises";
  side.replaceChildren(back, time, who, acts);
}

function paint(s) {
  const before = state;
  if (JSON.stringify(s) === JSON.stringify(before)) return;
  state = s;
  renderSide(s);
  form.hidden = !s.open;
  closed.hidden = s.open;
  closed.textContent = s.open ? "" : `${overText(s)} La conversation reste à relire.`;
  if (!s.open) $(".thread-hint", thread)?.remove();
  if (before && !before.revived_at && s.revived_at) celebrate(s);
}

function celebrate(s) {
  showMatch({
    title: "Ressuscité !",
    sentence: `${s.tomb} repart, avec ${s.other_name} et toi.`,
    other: s.other_name,
    soon: "La suite est entre vos mains.",
    primary: { label: "Revenir à la veillée", href: `/veillee?id=${id}` },
  });
}

function bubble(m) {
  const row = el("div", m.mine ? "msg msg-mine" : "msg");
  row.append(el("p", "msg-body", m.body), el("time", "msg-time", when.format(new Date(m.created_at))));
  return row;
}

function firstNote(s) {
  if (!s.note) return;
  const row = el("div", s.is_creator ? "msg msg-note" : "msg msg-note msg-mine");
  row.append(el("p", "msg-label", s.is_creator ? `La demande de ${s.other_name}` : "Ta demande"), el("p", "msg-body", s.note));
  thread.append(row);
}

function add(messages) {
  const fresh = messages.filter((m) => !seen.has(m.id));
  if (!fresh.length) return;
  const follow = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 90;
  $(".thread-hint", thread)?.remove();
  for (const m of fresh) {
    seen.add(m.id);
    thread.append(bubble(m));
    lastId = Math.max(lastId, Number(m.id));
  }
  if (follow || fresh.at(-1).mine) thread.scrollTop = thread.scrollHeight;
  if (fresh.some((m) => !m.mine) && !document.hidden) api("/api/vigil/read", { matchId: id });
}

async function refresh() {
  const { ok, data } = await api(`/api/vigil?id=${encodeURIComponent(id)}&after=${lastId}`);
  if (!ok) {
    if (!started) view.replaceChildren(el("p", "empty", data.error || "Impossible d'ouvrir cette veillée pour l'instant."));
    return;
  }
  if (!started) {
    started = true;
    view.replaceChildren(side, panel);
    firstNote(data.vigil);
    if (!data.messages.length) thread.append(el("p", "thread-hint", "À vous de jouer : dites-vous ce que chacun peut apporter."));
  }
  add(data.messages);
  paint(data.vigil);
}

async function conclude() {
  const yes = await askConfirm({
    title: "Conclure la reprise ?",
    text: `Quand ${state.other_name} aura aussi conclu, ${state.tomb} deviendra Ressuscité et ne retournera plus au cimetière. Ce choix est définitif.`,
    ok: "Conclure",
  });
  if (!yes) return;
  const { ok, data } = await api("/api/vigil/seal", { matchId: id });
  if (!ok) toast(data.error || "Une erreur est survenue. Réessaie.");
  refresh();
}

async function leave() {
  const yes = await askConfirm({
    title: "Mettre fin à la veillée ?",
    text: `La conversation s'arrête pour vous deux et ${state.tomb} retourne au cimetière. Ce choix est définitif.`,
    ok: "Mettre fin à la veillée",
    quiet: true,
  });
  if (!yes) return;
  const { ok, data } = await api("/api/vigil/end", { matchId: id });
  if (!ok) toast(data.error || "Une erreur est survenue. Réessaie.");
  refresh();
}

async function signal() {
  const answer = await askReport({
    title: `Signaler ${state.other_name}`,
    text: "La modération pourra lire cette conversation pour traiter ton signalement.",
    reasons: REPORT_PERSON,
  });
  if (!answer) return;
  const { ok, data } = await api("/api/reports", { kind: "person", matchId: id, ...answer });
  toast(ok ? "Merci, ton signalement est envoyé." : data.error || "Une erreur est survenue. Réessaie.");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text || send.disabled) return;
  send.disabled = true;
  sendError.textContent = "";
  const { ok, data } = await api("/api/vigil/message", { matchId: id, body: text });
  send.disabled = false;
  if (!ok) {
    sendError.textContent = data.error || "Ton message n'est pas parti. Réessaie.";
    return refresh();
  }
  input.value = "";
  input.style.height = "";
  add([data.message]);
  input.focus();
});

input.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" || e.shiftKey || touch) return;
  e.preventDefault();
  form.requestSubmit();
});

input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight + 3, 140)}px`;
});

setInterval(() => {
  if (!document.hidden && state?.open) refresh();
}, POLL_MS);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refresh();
});

refresh();
