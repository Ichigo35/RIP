import { $, api, askConfirm, chip, el, member, plural, REPORT_PERSON, REPORT_TOMB, toast } from "/lib.js";

const REASONS = { ...REPORT_TOMB, ...REPORT_PERSON };
const when = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const view = $("#view");

const me = await member("/profil", "Connecte-toi pour ouvrir la modération.");
if (!me.user.is_admin) location.href = "/";

async function act(r, action, confirmation) {
  if (confirmation && !(await askConfirm(confirmation))) return;
  const { ok, data } = await api("/api/moderation/resolve", { reportId: r.id, action });
  if (!ok) toast(data.error || "Une erreur est survenue. Réessaie.");
  load();
}

function button(label, cls, run) {
  const b = Object.assign(el("button", cls, label), { type: "button" });
  b.addEventListener("click", run);
  return b;
}

function reportEl(r) {
  const row = el("li", "report");
  const body = el("div", "report-body");
  const tomb = r.kind === "tomb";
  const target = tomb ? r.creator : r.target;
  body.append(el("h2", null, tomb ? r.tomb : `${r.reporter} signale ${r.target}`));
  body.append(el("p", "sub", tomb ? `Signalé par ${r.reporter}, le ${when.format(new Date(r.created_at))}` : `Pendant la veillée de ${r.tomb}, le ${when.format(new Date(r.created_at))}`));
  const tags = el("ul", "tags");
  tags.append(chip(REASONS[r.reason] ?? r.reason));
  body.append(tags);
  if (tomb) body.append(el("p", "request-note", `« ${r.epitaph} »`));
  if (tomb && r.legacy) body.append(el("p", "request-bio", r.legacy));
  if (r.details) body.append(el("p", "report-details", r.details));
  if (tomb && r.hidden) body.append(el("p", "sheet-note", "Retirée automatiquement en attendant ta décision. Classer la remet au cimetière."));
  if (r.messages.length) {
    const box = el("ol", "report-thread");
    box.append(...r.messages.map((m) => {
      const line = el("li");
      line.append(el("b", null, `${m.sender} : `), m.body);
      return line;
    }));
    body.append(box);
  }
  const acts = el("div", "report-acts");
  if (tomb) acts.append(button("Retirer la tombe", "btn btn-small", () => act(r, "remove")));
  acts.append(button(`Bloquer ${target}`, "btn btn-ghost", () => act(r, "ban", {
    title: `Bloquer ${target} ?`,
    text: "Ses tombes sont retirées, ses veillées fermées et son compte ne peut plus se connecter.",
    ok: "Bloquer le compte",
    quiet: true,
  })));
  acts.append(button("Classer", "link", () => act(r, "dismiss")));
  row.append(body, acts);
  return row;
}

async function load() {
  const { ok, data } = await api("/api/moderation");
  if (!ok) return view.replaceChildren(el("p", "empty", data.error || "Impossible de charger la modération pour l'instant."));
  $("#sub").textContent = data.reports.length ? `${plural(data.reports.length, "signalement")} à traiter` : "";
  if (!data.reports.length) return view.replaceChildren(el("p", "empty", "Aucun signalement à traiter."));
  const list = el("ul", "report-list");
  list.append(...data.reports.map(reportEl));
  view.replaceChildren(list);
}

load();
