import { $, api, askConfirm, chip, el, member, plural, showMatch, toast, tombFace } from "/lib.js";

const view = $("#view");
await member("/mes-tombes", "Connecte-toi pour voir tes tombes.");

function requestEl(t, r) {
  const row = el("li", "request");
  row.append(el("span", "disc", r.name.slice(0, 1).toUpperCase()));
  const who = el("div", "request-who");
  who.append(el("b", null, r.name));
  if (r.skills) {
    const chips = el("ul", "tags");
    for (const s of r.skills.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 4)) chips.append(chip(s));
    who.append(chips);
  }
  who.append(el("p", "request-note", `« ${r.note} »`));
  if (r.bio) who.append(el("p", "request-bio", r.bio));
  row.append(who);
  if (!t.match_id) {
    const buttons = el("div", "request-acts");
    const yes = Object.assign(el("button", "btn btn-go", "Accepter"), { type: "button" });
    const no = Object.assign(el("button", "btn btn-ghost", "Décliner"), { type: "button" });
    yes.addEventListener("click", () => decide(t, r, "accept"));
    no.addEventListener("click", () => decide(t, r, "decline"));
    buttons.append(yes, no);
    row.append(buttons);
  }
  return row;
}

function queueEl(t) {
  const col = el("div", "plot-queue");
  const n = t.requests.length;
  if (t.match_id) {
    col.append(el("h2", null, t.revived_at ? `Ressuscité avec ${t.reviver_name}` : `En veillée avec ${t.reviver_name}`));
    col.append(el("p", "sub", t.revived_at ? "Vous avez conclu la reprise." : `Encore ${plural(t.days_left, "jour")} pour vous mettre d'accord. Ta tombe a quitté le cimetière pendant ce temps.`));
    const open = el("a", "btn btn-go", t.unread ? `Ouvrir la veillée (${t.unread})` : "Ouvrir la veillée");
    open.href = `/veillee?id=${t.match_id}`;
    col.append(open);
    if (n) col.append(el("h3", null, `${plural(n, "autre demande")} en file`));
  } else if (n) {
    col.append(el("h2", null, n > 1 ? `${n} personnes veulent le ressusciter` : "1 personne veut le ressusciter"));
  } else {
    col.append(el("h2", null, "Personne pour l'instant"));
    col.append(el("p", "sub", t.visible ? "Les repreneurs swipent le cimetière. Leurs demandes arriveront ici." : "Ta tombe est privée. Publie-la pour que les repreneurs la voient."));
  }
  if (n) {
    const list = el("ul", "requests");
    list.append(...t.requests.map((r) => requestEl(t, r)));
    col.append(list);
  }
  if (n && !t.match_id) col.append(el("p", "sheet-note", "Si tu déclines, un merci part tout seul."));
  for (const past of t.past) {
    const line = el("p", "past");
    const read = el("a", null, "Relire");
    read.href = `/veillee?id=${past.id}`;
    line.append(`Veillée terminée avec ${past.name}. `, read);
    col.append(line);
  }
  return col;
}

function plotEl(t) {
  const plot = el("section", "plot");
  const stone = el("div", "plot-stone");
  stone.append(tombFace(t, "h2"), el("div", "plinth"));
  const meta = el("div", "plot-meta");
  meta.append(el("span", null, t.flowers ? plural(t.flowers, "fleur") : "Pas encore de fleur"));
  if (t.hidden) {
    meta.append(el("b", null, "Retirée par la modération"));
  } else if (!t.match_id) {
    const toggle = Object.assign(el("button", "link", t.visible ? "Retirer du cimetière" : "Publier ma tombe"), { type: "button" });
    toggle.addEventListener("click", async () => {
      const { ok, data } = await api("/api/tombs/visibility", { tombId: t.id, visible: !t.visible });
      if (!ok) return toast(data.error || "Une erreur est survenue. Réessaie.");
      toast(t.visible ? `${t.name} a quitté le cimetière.` : `${t.name} est publiée.`);
      load();
    });
    meta.append(toggle);
  }
  stone.append(meta);
  plot.append(stone, queueEl(t));
  return plot;
}

async function decide(t, r, decision) {
  const accept = decision === "accept";
  const yes = await askConfirm(accept
    ? { title: `Accepter ${r.name} ?`, text: `${t.name} quitte le cimetière pendant la reprise. Les autres demandes restent en file.`, ok: "Accepter" }
    : { title: `Décliner ${r.name} ?`, text: "Un merci lui est envoyé à ta place. Ce choix est définitif.", ok: "Décliner", quiet: true });
  if (!yes) return;
  const { ok, data } = await api("/api/requests/decide", { tombId: t.id, userId: r.user_id, decision });
  if (!ok) toast(data.error || "Une erreur est survenue. Réessaie.");
  await load();
  if (ok && accept) {
    showMatch({
      sentence: `${r.name} va ressusciter ${t.name} avec toi.`,
      other: r.name,
      primary: { label: "Ouvrir la veillée", href: `/veillee?id=${data.match.id}` },
      secondary: { label: "Revenir à mes tombes", href: "/mes-tombes" },
    });
  }
}

async function load() {
  const { ok, data } = await api("/api/my-tombs");
  if (!ok) return view.replaceChildren(el("p", "empty", data.error || "Impossible de charger tes tombes pour l'instant."));
  /* Les tombes qui attendent une décision passent devant. */
  const waiting = (t) => (t.match_id ? 0 : t.requests.length);
  if (data.tombs.length) return view.replaceChildren(...data.tombs.sort((a, b) => waiting(b) - waiting(a)).map(plotEl));
  const box = el("div", "empty");
  const bury = el("a", "btn btn-go", "Enterrer un projet");
  bury.href = "/#enterrer";
  box.append(el("p", null, "Tu n'as encore rien enterré."), bury);
  view.replaceChildren(box);
}

load();
