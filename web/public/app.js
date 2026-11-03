"use strict";

const CAUSES = {
  no_time: "Plus le temps", no_money: "Plus d'argent", partner_left: "Associé parti",
  missing_skill: "Compétence manquante", no_market: "Pas trouvé de marché", motivation: "Démotivation",
  competitor: "Concurrent trop fort", technical: "Blocage technique", life_change: "Changement de vie",
};
const WILLS = { cofound: "Cofonder", handover: "Transmettre", sell: "Céder", release: "Libérer" };
const SPROUT = '<svg class="sprout" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 20h10M10 20c5.5-2.5.8-6.4 3-10M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8zm4.8-3.9c1.8-.4 3.7-.1 5.2.9-.4 2.2-1.4 3.4-2.7 4-1 .5-2.2.5-3.6.1.1-1.8.6-3.7 1.1-5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const $ = (s, r = document) => r.querySelector(s);

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function chip(text, cls) {
  return el("li", "chip" + (cls ? " " + cls : ""), text);
}

function dates(a, b) {
  if (a && b) return `${a} — ${b}`;
  return a ? `${a} — …` : b ? `… — ${b}` : "";
}

/* ---------- cimetière public ---------- */
function graveEl(t) {
  const fig = el("article", "grave");
  const tomb = el("div", "tomb");
  tomb.insertAdjacentHTML("beforeend", SPROUT);
  tomb.append(el("h3", "engr", t.name), el("p", "dates", dates(t.year_start, t.year_end)), el("p", "epitaph", `« ${t.epitaph} »`), el("hr"));
  const chips = el("ul", "chips");
  chips.append(chip(CAUSES[t.cause] || "Cause inconnue"));
  if (t.legacy) chips.append(chip(t.legacy.length > 48 ? t.legacy.slice(0, 47) + "…" : t.legacy));
  if (t.missing) chips.append(chip("Cherche : " + (t.missing.length > 36 ? t.missing.slice(0, 35) + "…" : t.missing), "chip-miss"));
  chips.append(chip(WILLS[t.will] || "", "chip-will"));
  tomb.append(chips);
  fig.append(tomb, el("div", "plinth"));
  return fig;
}

async function loadYard() {
  const grid = $("#graves");
  try {
    const r = await fetch("/api/graveyard");
    if (!r.ok) throw new Error();
    const d = await r.json();
    grid.replaceChildren(...(d.tombs.length ? d.tombs.map(graveEl) : [el("p", "empty", "Le cimetière est encore vide. La première tombe peut être la tienne.")]));
    if (d.burials > 0) {
      $("#yard-sub").textContent = `${d.burials} projet${d.burials > 1 ? "s" : ""} enterré${d.burials > 1 ? "s" : ""}, ${d.resurrectors} repreneur${d.resurrectors > 1 ? "s" : ""} en attente.`;
      const proof = $("#proof");
      proof.textContent = `${d.burials} projet${d.burials > 1 ? "s" : ""} déjà enterré${d.burials > 1 ? "s" : ""}.`;
      proof.hidden = false;
    }
  } catch {
    grid.replaceChildren(el("p", "empty", "Impossible de charger le cimetière pour l'instant."));
  }
}

/* ---------- aperçu en direct ---------- */
const form = $("#bury");
function preview() {
  const v = (n) => form.elements[n].value.trim();
  $("#pv-name").textContent = v("name") || "Ton projet";
  $("#pv-dates").textContent = dates(v("yearStart"), v("yearEnd")) || " ";
  $("#pv-epi").textContent = v("epitaph") ? `« ${v("epitaph")} »` : "Son épitaphe apparaîtra ici.";
  $("#count").textContent = v("epitaph").length;
  const chips = $("#pv-chips");
  chips.replaceChildren();
  if (v("cause")) chips.append(chip(CAUSES[v("cause")]));
  if (v("legacy")) chips.append(chip(v("legacy").length > 48 ? v("legacy").slice(0, 47) + "…" : v("legacy")));
  if (v("missing")) chips.append(chip("Cherche : " + v("missing").slice(0, 36), "chip-miss"));
  const will = form.elements.will.value;
  if (will) chips.append(chip(WILLS[will], "chip-will"));
}
form.addEventListener("input", preview);
preview();

/* ---------- envois ---------- */
function showErrors(f, field, message) {
  const slot = $(`.err[data-for="${field}"]`, f);
  if (slot) {
    slot.textContent = message;
    const input = f.elements[field];
    if (input && input.setAttribute) input.setAttribute("aria-invalid", "true");
    if (input && input.focus) input.focus();
    return true;
  }
  return false;
}

async function send(path, payload) {
  const r = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  let data = {};
  try { data = await r.json(); } catch { /* réponse vide */ }
  return { ok: r.ok, status: r.status, data };
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = form;
  f.querySelectorAll(".err").forEach((n) => (n.textContent = ""));
  f.querySelectorAll("[aria-invalid]").forEach((n) => n.removeAttribute("aria-invalid"));
  $("#form-err").textContent = "";

  const val = (n) => f.elements[n].value.trim();
  const payload = {
    name: val("name"), yearStart: val("yearStart"), yearEnd: val("yearEnd"), epitaph: val("epitaph"),
    cause: val("cause"), legacy: val("legacy"), missing: val("missing"), will: f.elements.will.value,
    email: val("email"), consent: f.elements.consent.checked, website: val("website"),
  };

  const missing = [
    [!payload.name, "name", "Donne un nom à ton projet."],
    [payload.epitaph.length < 5, "epitaph", "L'épitaphe doit faire au moins 5 caractères."],
    [!payload.cause, "cause", "Choisis une cause du décès."],
    [!payload.will, "will", "Choisis un testament."],
    [!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(payload.email), "email", "Cet e-mail n'a pas l'air valide."],
  ].find(([bad]) => bad);
  if (missing) { showErrors(f, missing[1], missing[2]); return; }

  const btn = $("#submit");
  btn.disabled = true;
  btn.textContent = "Creusement en cours…";
  try {
    const { ok, data } = await send("/api/burials", payload);
    if (!ok) {
      if (!(data.field && showErrors(f, data.field, data.error))) $("#form-err").textContent = data.error || "Une erreur est survenue. Réessaie.";
      return;
    }
    f.hidden = true;
    $(".bury-grid").classList.add("is-done");
    $("#done").hidden = false;
    $("#done").scrollIntoView({ behavior: "smooth", block: "center" });
    loadYard();
  } catch {
    $("#form-err").textContent = "Connexion impossible. Vérifie ta connexion et réessaie.";
  } finally {
    btn.disabled = false;
    btn.textContent = "Enterrer mon projet";
  }
});

const revive = $("#revive");
revive.addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("#revive-err");
  err.textContent = "";
  const email = revive.elements.email.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { err.textContent = "Cet e-mail n'a pas l'air valide."; revive.elements.email.focus(); return; }
  const btn = revive.querySelector("button");
  btn.disabled = true;
  try {
    const { ok, data } = await send("/api/resurrectors", { email, skills: revive.elements.skills.value.trim(), website: revive.elements.website.value });
    if (!ok) { err.textContent = data.error || "Une erreur est survenue. Réessaie."; return; }
    $("#revive-ok").hidden = false;
    btn.hidden = true;
    loadYard();
  } catch {
    err.textContent = "Connexion impossible. Vérifie ta connexion et réessaie.";
  } finally {
    btn.disabled = false;
  }
});

loadYard();
