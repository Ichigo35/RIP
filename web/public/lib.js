/* Socle commun : appels API, barre du haut, dialogues (compte, mot au créateur, confirmation), match. */

export const CAUSES = {
  no_time: "Plus le temps", no_money: "Plus d'argent", partner_left: "Associé parti",
  missing_skill: "Compétence manquante", no_market: "Pas trouvé de marché", motivation: "Démotivation",
  competitor: "Concurrent trop fort", technical: "Blocage technique", life_change: "Changement de vie",
};
export const WILLS = { cofound: "Cofonder", handover: "Transmettre", sell: "Céder", release: "Libérer" };
export const SPROUT = '<svg class="sprout" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 20h10M10 20c5.5-2.5.8-6.4 3-10M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8zm4.8-3.9c1.8-.4 3.7-.1 5.2.9-.4 2.2-1.4 3.4-2.7 4-1 .5-2.2.5-3.6.1.1-1.8.6-3.7 1.1-5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const LOGO = '<svg width="30" height="30" viewBox="0 0 64 64" aria-hidden="true"><path d="M15 62V36a17 17 0 0 1 34 0v26z" fill="#232428"/><rect x="11" y="58" width="42" height="5" rx="1.5" fill="#1A1B1E"/><path d="M32 19.5V8" stroke="#3F8F3A" stroke-width="3.2" stroke-linecap="round"/><path d="M31.5 13.5c-2.6-6.2-9.4-7.7-14-5.6 2 5.2 8.3 8 14 5.6z" fill="#3F8F3A"/><path d="M32.5 10.5c2.6-6.2 9.4-7.7 14-5.6-2 5.2-8.3 8-14 5.6z" fill="#5DAE4E"/></svg>';
const RISEN = '<svg class="risen" viewBox="0 0 200 240" aria-hidden="true"><path class="r-stone" d="M42 222V104a58 58 0 0 1 116 0v118z"/><rect class="r-base" x="26" y="218" width="148" height="12" rx="3"/><path class="r-crack" d="M100 222l-7-24 11-20-9-22 7-18"/><path class="r-stem" d="M100 190c-5-40 7-74 0-172"/><path class="r-leaf r-leaf1" d="M100 92c-16-12-34-12-46-2 12 16 34 18 46 2z"/><path class="r-leaf r-leaf2" d="M101 46c14-14 32-16 46-8-10 18-32 22-46 8z"/></svg>';

export const $ = (s, r = document) => r.querySelector(s);

export function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

export const chip = (text, cls) => el("li", "chip" + (cls ? " " + cls : ""), text);

export function dates(a, b) {
  if (a && b) return `${a} — ${b}`;
  return a ? `${a} — …` : b ? `… — ${b}` : "";
}

export const plural = (n, word) => `${n} ${word}${n > 1 ? "s" : ""}`;

/** Le haut de la pierre : pousse, nom gravé, dates, épitaphe. */
export function tombFace(t, heading = "h3") {
  const tomb = el("div", "tomb");
  tomb.insertAdjacentHTML("beforeend", SPROUT);
  tomb.append(el(heading, "engr", t.name), el("p", "dates", dates(t.year_start, t.year_end)), el("p", "epitaph", `« ${t.epitaph} »`));
  return tomb;
}

export async function api(path, payload) {
  const options = payload === undefined ? {} : {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
  };
  try {
    const r = await fetch(path, options);
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: "Connexion impossible. Vérifie ta connexion et réessaie." } };
  }
}

/* ---------- formulaires ---------- */

export function field(label, attrs, hint) {
  const wrap = el("label", "f", label);
  if (hint) wrap.append(" ", el("small", null, hint));
  const input = Object.assign(el(attrs.rows ? "textarea" : "input"), attrs);
  wrap.append(input, el("span", "err"));
  return wrap;
}

function clearErrors(form) {
  form.querySelectorAll(".err").forEach((n) => (n.textContent = ""));
  form.querySelectorAll("[aria-invalid]").forEach((n) => n.removeAttribute("aria-invalid"));
  const general = $(".form-err", form);
  if (general) general.textContent = "";
}

export function showError(form, data) {
  const input = data.field && form.elements[data.field];
  if (input) {
    input.setAttribute("aria-invalid", "true");
    input.closest(".f").querySelector(".err").textContent = data.error;
    input.focus();
  } else {
    $(".form-err", form).textContent = data.error || "Une erreur est survenue. Réessaie.";
  }
}

function sheet(title, text) {
  const d = el("dialog", "sheet");
  const close = el("button", "sheet-x", "×");
  close.type = "button";
  close.setAttribute("aria-label", "Fermer");
  close.addEventListener("click", () => d.close());
  d.append(close, el("h2", null, title));
  if (text) d.append(el("p", "sheet-text", text));
  document.body.append(d);
  return d;
}

/** Ouvre le dialogue et rend sa valeur à la fermeture. */
function opened(d, value) {
  return new Promise((resolve) => {
    d.addEventListener("close", () => {
      d.remove();
      resolve(value());
    });
    d.showModal();
  });
}

/* ---------- compte ---------- */

/** Demande de créer un compte ou de se connecter. Rend true si la personne est connectée. */
export function askAuth(reason, mode = "signup") {
  let done = false;
  const d = sheet("", reason);
  const title = $("h2", d);
  const form = el("form", "sheet-form");
  form.noValidate = true;
  const name = field("Prénom ou pseudo", { name: "name", maxLength: 40, autocomplete: "nickname", required: true });
  const email = field("E-mail", { name: "email", type: "email", autocomplete: "email", required: true }, "(jamais affiché)");
  const password = field("Mot de passe", { name: "password", type: "password", required: true });
  const trap = Object.assign(el("input", "hp"), { name: "website", tabIndex: -1, autocomplete: "off" });
  trap.setAttribute("aria-hidden", "true");
  const warn = el("p", "sheet-note", "Garde bien ce mot de passe : on ne peut pas encore le réinitialiser par e-mail.");
  const submit = Object.assign(el("button", "btn btn-go btn-big"), { type: "submit" });
  const swap = Object.assign(el("button", "link"), { type: "button" });
  form.append(name, email, password, trap, warn, submit, el("p", "form-err"), swap);
  d.append(form);

  function apply() {
    const signup = mode === "signup";
    title.textContent = signup ? "Créer ton compte" : "Te connecter";
    name.hidden = warn.hidden = !signup;
    submit.textContent = signup ? "Créer mon compte" : "Me connecter";
    swap.textContent = signup ? "J'ai déjà un compte" : "Créer un compte";
    form.elements.password.autocomplete = signup ? "new-password" : "current-password";
    form.elements.password.minLength = signup ? 10 : 0;
    $(".f small", password)?.remove();
    if (signup) password.firstChild.after(" ", el("small", null, "(10 caractères au moins)"));
    clearErrors(form);
  }
  swap.addEventListener("click", () => {
    mode = mode === "signup" ? "login" : "signup";
    apply();
  });
  apply();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors(form);
    const v = (n) => form.elements[n].value;
    submit.disabled = true;
    const payload = { email: v("email").trim(), password: v("password"), website: v("website") };
    const { ok, data } = await api(mode === "signup" ? "/api/signup" : "/api/login", mode === "signup" ? { ...payload, name: v("name").trim() } : payload);
    submit.disabled = false;
    if (!ok) return showError(form, data);
    done = true;
    d.close();
  });
  return opened(d, () => done);
}

/** Pages réservées aux membres : sans compte, on propose de se connecter, sinon retour à l'accueil. */
export async function member(active, reason) {
  const me = await shell(active);
  if (me) return me;
  if (await askAuth(reason, "login")) location.reload();
  else location.href = "/";
  return new Promise(() => {});
}

/* ---------- barre du haut ---------- */

const TABS = [["/cimetiere", "Cimetière"], ["/mes-tombes", "Mes tombes"], ["/reprises", "Reprises"], ["/profil", "Profil"]];

export async function shell(active) {
  const top = $("#top");
  const brand = el("a", "brand");
  brand.href = "/";
  brand.setAttribute("aria-label", "RIP, accueil");
  brand.insertAdjacentHTML("beforeend", LOGO);
  brand.append(el("span", null, "RIP"));
  top.replaceChildren(brand);

  const { data } = await api("/api/me");
  const me = data.user ? data : null;

  const nav = el("nav");
  nav.setAttribute("aria-label", "Principal");
  const tabs = el("div", me ? "tabs" : "tabs tabs-out");
  for (const [href, label] of me ? TABS : TABS.slice(0, 1)) {
    const a = el("a", null, label);
    a.href = href;
    if (href === active) a.setAttribute("aria-current", "page");
    if (href === "/mes-tombes" && me.requests > 0) {
      const badge = el("span", "badge", me.requests);
      badge.setAttribute("aria-label", `${plural(me.requests, "demande")} en attente`);
      a.append(badge);
    }
    tabs.append(a);
  }
  if (!me) {
    const login = Object.assign(el("button", "link", "Se connecter"), { type: "button" });
    login.addEventListener("click", async () => {
      if (await askAuth("Retrouve tes tombes et tes reprises.", "login")) location.reload();
    });
    tabs.append(login);
  }
  const bury = el("a", "btn btn-small", "Enterrer un projet");
  bury.href = "/#enterrer";
  nav.append(tabs, bury);
  top.append(nav);
  document.body.classList.toggle("has-tabs", !!me);

  if (me?.unseen_match) {
    const { id, tomb, creator } = me.unseen_match;
    api("/api/matches/seen", { matchId: id });
    showMatch({
      sentence: `${creator} a accepté ta demande : ${tomb} repart avec toi.`,
      other: creator,
      primary: { label: "Voir mes reprises", href: "/reprises" },
      secondary: { label: "Continuer à swiper", href: "/cimetiere" },
    });
  }
  return me;
}

/* ---------- dialogues ---------- */

/** Le mot au créateur, obligatoire pour ressusciter. Rend { note, skills } ou null. */
export function askNote(tomb, me) {
  let answer = null;
  const d = sheet("Un mot au créateur", `Dis pourquoi tu veux reprendre ${tomb.name}. Le créateur choisit à partir de ce message.`);
  const form = el("form", "sheet-form");
  form.noValidate = true;
  const note = field("Ton message", { name: "note", rows: 4, maxLength: 300, required: true, placeholder: "J'ai testé la démo, je peux reprendre le code et finir l'app en deux mois." });
  form.append(note);
  if (!me.user.skills) form.append(field("Ce que tu sais faire", { name: "skills", maxLength: 200, placeholder: "Dev web, design, marketing…" }));
  const submit = Object.assign(el("button", "btn btn-go btn-big", "Envoyer ma demande"), { type: "submit" });
  form.append(submit, el("p", "form-err"));
  d.append(form);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    clearErrors(form);
    const text = form.elements.note.value.trim();
    if (text.length < 10) return showError(form, { error: "Écris au moins 10 caractères au créateur.", field: "note" });
    answer = { note: text, skills: form.elements.skills?.value.trim() ?? "" };
    d.close();
  });
  return opened(d, () => answer);
}

export function askConfirm({ title, text, ok, quiet }) {
  let yes = false;
  const d = sheet(title, text);
  const row = el("div", "sheet-row");
  const confirm = Object.assign(el("button", `btn ${quiet ? "btn-ghost" : "btn-go"}`, ok), { type: "button" });
  const cancel = Object.assign(el("button", "link", "Annuler"), { type: "button" });
  confirm.addEventListener("click", () => {
    yes = true;
    d.close();
  });
  cancel.addEventListener("click", () => d.close());
  row.append(confirm, cancel);
  d.append(row);
  return opened(d, () => yes);
}

/** L'écran « Il revit ! ». */
export function showMatch({ sentence, other, primary, secondary }) {
  const d = el("dialog", "revit");
  const box = el("div", "revit-box");
  box.insertAdjacentHTML("beforeend", RISEN);
  const pair = el("div", "pair");
  pair.append(el("span", "disc disc-other", other.slice(0, 1).toUpperCase()), el("span", "pair-line"), el("span", "disc disc-me", "Toi"));
  const go = el("a", "btn btn-go btn-big", primary.label);
  go.href = primary.href;
  box.append(el("h2", null, "Il revit !"), el("p", "revit-text", sentence), pair, el("p", "revit-soon", "La veillée de 14 jours arrive bientôt."), go);
  if (secondary) {
    const next = el("a", "revit-next", secondary.label);
    next.href = secondary.href;
    box.append(next);
  }
  d.append(box);
  document.body.append(d);
  d.addEventListener("close", () => d.remove());
  d.showModal();
  go.focus();
}

let toastTimer;
export function toast(message, action) {
  $(".toast")?.remove();
  clearTimeout(toastTimer);
  const t = el("div", "toast");
  t.setAttribute("role", "status");
  t.append(el("span", null, message));
  if (action) {
    const b = Object.assign(el("button", null, action.label), { type: "button" });
    b.addEventListener("click", () => {
      t.remove();
      action.run();
    });
    t.append(b);
  }
  document.body.append(t);
  toastTimer = setTimeout(() => t.remove(), 6000);
}
