import { $, api, askNote, dates, el, member, toast } from "/lib.js";

const view = $("#view");
const me = await member("/reprises", "Connecte-toi pour voir tes reprises.");

function button(label, cls, run) {
  const b = Object.assign(el("button", cls, label), { type: "button" });
  b.addEventListener("click", run);
  return b;
}

function rowEl(item, text, actions = []) {
  const row = el("li", "reprise");
  const body = el("div");
  const title = el("h3", "reprise-name", item.name);
  const when = dates(item.year_start, item.year_end);
  body.append(title);
  if (when) body.append(el("p", "reprise-dates", when));
  body.append(el("p", "reprise-text", text));
  if (item.note) body.append(el("p", "request-note", `« ${item.note} »`));
  row.append(body);
  if (actions.length) {
    const box = el("div", "request-acts");
    box.append(...actions);
    row.append(box);
  }
  return row;
}

async function withdraw(item, message) {
  const { ok, data } = await api("/api/swipes/undo", { tombId: item.id });
  if (!ok) return toast(data.error || "Une erreur est survenue. Réessaie.");
  toast(message);
  load();
}

async function revive(item) {
  const answer = await askNote(item, me);
  if (!answer) return;
  const { ok, data } = await api("/api/swipes", { tombId: item.id, action: "revive", ...answer });
  if (!ok) return toast(data.error || "Une erreur est survenue. Réessaie.");
  if (answer.skills) me.user.skills = answer.skills;
  toast(`Ta demande pour ${item.name} est partie.`);
  load();
}

function group(title, rows) {
  if (!rows.length) return [];
  const section = el("section", "group");
  const list = el("ul", "reprises");
  list.append(...rows);
  section.append(el("h2", null, title), list);
  return [section];
}

async function load() {
  const { ok, data } = await api("/api/reprises");
  if (!ok) return view.replaceChildren(el("p", "empty", data.error || "Impossible de charger tes reprises pour l'instant."));
  const items = data.items;
  const live = items.filter((i) => i.match_id);
  const waiting = items.filter((i) => i.action === "revive" && !i.decision);
  const declined = items.filter((i) => i.decision === "declined");
  const flowers = items.filter((i) => i.action === "flower");

  const sections = [
    ...group("Ils revivent", live.map((i) => rowEl(i, `${i.creator_name} a accepté. La veillée de 14 jours arrive bientôt.`))),
    ...group("En attente du créateur", waiting.map((i) => rowEl(i,
      i.taken ? "Une autre reprise est en cours. Ta demande reste en file." : "Le créateur n'a pas encore répondu.",
      [button("Retirer ma demande", "link", () => withdraw(i, `Ta demande pour ${i.name} est retirée.`))]))),
    ...group("Mes fleurs", flowers.map((i) => rowEl(i,
      i.taken ? "Ce projet est en cours de reprise." : "Tu soutiens ce projet.",
      [...(i.taken ? [] : [button("Ressusciter", "btn btn-go", () => revive(i))]),
        button("Retirer ma fleur", "link", () => withdraw(i, `Fleur retirée de ${i.name}.`))]))),
    ...group("Merci pour ta proposition", declined.map((i) => rowEl(i, "Le créateur te remercie. Ce projet prend une autre voie."))),
  ];

  if (sections.length) return view.replaceChildren(...sections);
  const box = el("div", "empty");
  const go = el("a", "btn btn-go", "Entrer dans le cimetière");
  go.href = "/cimetiere";
  box.append(el("p", null, "Tu n'as encore rien demandé ni fleuri."), go);
  view.replaceChildren(box);
}

load();
