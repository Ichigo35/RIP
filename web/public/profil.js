import { $, api, el, field, member, showError, toast } from "/lib.js";

const me = await member("/profil", "Connecte-toi pour voir ton profil.");

const form = el("form", "profile");
form.noValidate = true;
const name = field("Prénom ou pseudo", { name: "name", maxLength: 40, required: true, autocomplete: "nickname", value: me.user.name });
const skills = field("Ce que tu sais faire", { name: "skills", maxLength: 200, value: me.user.skills, placeholder: "Dev web, design, marketing" }, "(séparé par des virgules)");
const bio = field("Qui es-tu ?", { name: "bio", rows: 4, maxLength: 300, value: me.user.bio, placeholder: "Dix ans de dev mobile, deux apps publiées, du temps le soir." });
const save = Object.assign(el("button", "btn btn-go", "Enregistrer"), { type: "submit" });
form.append(el("p", "profile-email", `Ton compte : ${me.user.email}`), name, skills, bio, save, el("p", "form-err"));

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  $(".form-err", form).textContent = "";
  form.querySelectorAll(".err").forEach((n) => (n.textContent = ""));
  const v = (n) => form.elements[n].value.trim();
  save.disabled = true;
  const { ok, data } = await api("/api/profile", { name: v("name"), skills: v("skills"), bio: v("bio") });
  save.disabled = false;
  if (!ok) return showError(form, data);
  toast("Profil enregistré.");
});

const out = Object.assign(el("button", "link", "Me déconnecter"), { type: "button" });
out.addEventListener("click", async () => {
  await api("/api/logout", {});
  location.href = "/";
});

$("#view").append(form, out);
