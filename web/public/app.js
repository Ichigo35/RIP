import { $, api, askAuth, CAUSES, chip, dates, el, plural, shell, tombFace, WILLS } from "/lib.js";

let session = shell(null);

/* ---------- cimetière public ---------- */
function graveEl(t) {
  const fig = el("article", "grave");
  const tomb = tombFace(t);
  tomb.append(el("hr"));
  const chips = el("ul", "chips");
  chips.append(chip(CAUSES[t.cause] || "Cause inconnue"));
  if (t.legacy) chips.append(chip(t.legacy.length > 48 ? t.legacy.slice(0, 47) + "…" : t.legacy));
  if (t.missing) chips.append(chip("Cherche : " + (t.missing.length > 36 ? t.missing.slice(0, 35) + "…" : t.missing), "chip-miss"));
  chips.append(chip(WILLS[t.will] || "", "chip-will"));
  if (t.state) chips.append(chip(t.state === "risen" ? "Ressuscité" : "En veillée", "chip-life"));
  tomb.append(chips);
  fig.append(tomb, el("div", "plinth"));
  return fig;
}

async function loadYard() {
  const grid = $("#graves");
  const { ok, data } = await api("/api/graveyard");
  if (!ok) {
    grid.replaceChildren(el("p", "empty", "Impossible de charger le cimetière pour l'instant."));
    return;
  }
  grid.replaceChildren(...(data.tombs.length ? data.tombs.map(graveEl) : [el("p", "empty", "Le cimetière est encore vide. La première tombe peut être la tienne.")]));
  if (data.burials > 0) {
    $("#yard-sub").textContent = `${plural(data.burials, "projet")} enterré${data.burials > 1 ? "s" : ""}, ${plural(data.users, "membre")}.`;
    const proof = $("#proof");
    proof.textContent = `${plural(data.burials, "projet")} déjà enterré${data.burials > 1 ? "s" : ""}.`;
    proof.hidden = false;
  }
}

/* ---------- aperçu en direct ---------- */
const form = $("#bury");
function preview() {
  const v = (n) => form.elements[n].value.trim();
  $("#pv-name").textContent = v("name") || "Ton projet";
  $("#pv-dates").textContent = dates(v("yearStart"), v("yearEnd")) || " ";
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

/* ---------- enterrer ---------- */
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
    consent: f.elements.consent.checked, website: val("website"),
  };

  const missing = [
    [!payload.name, "name", "Donne un nom à ton projet."],
    [payload.epitaph.length < 5, "epitaph", "L'épitaphe doit faire au moins 5 caractères."],
    [!payload.cause, "cause", "Choisis une cause du décès."],
    [!payload.will, "will", "Choisis un testament."],
  ].find(([bad]) => bad);
  if (missing) { showErrors(f, missing[1], missing[2]); return; }

  /* Le compte vient après le formulaire : rien de ce qui est saisi n'est perdu. */
  if (!(await session) && !(await signIn())) return;

  const btn = $("#submit");
  btn.disabled = true;
  btn.textContent = "Creusement en cours…";
  let result = await api("/api/burials", payload);
  if (result.status === 401 && (await signIn())) result = await api("/api/burials", payload);
  btn.disabled = false;
  btn.textContent = "Enterrer mon projet";

  const { ok, data } = result;
  if (!ok) {
    if (!(data.field && showErrors(f, data.field, data.error))) $("#form-err").textContent = data.error || "Une erreur est survenue. Réessaie.";
    return;
  }
  f.hidden = true;
  $(".bury-grid").classList.add("is-done");
  $("#done-text").textContent = payload.consent
    ? "Elle repose maintenant au cimetière. Les repreneurs peuvent la swiper, et leurs demandes arriveront dans Mes tombes."
    : "Elle reste privée pour l'instant. Tu peux la publier quand tu veux depuis Mes tombes.";
  $("#done").hidden = false;
  $("#done").scrollIntoView({ behavior: "smooth", block: "center" });
  loadYard();
});

async function signIn() {
  if (!(await askAuth("Un compte gratuit te permet de voir qui veut ressusciter ton projet et de choisir."))) return false;
  session = shell(null);
  return session;
}

loadYard();
