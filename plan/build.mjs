// Planches du plan RIP (cimetière à projets) : HTML -> Playwright x2 -> PNG -> JPEG (sips).
// Usage : node build.mjs [nom1 nom2 ...]   (sans argument : toutes les planches)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { execFileSync } from 'child_process';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'out');
fs.mkdirSync(OUT, { recursive: true });

const ico = (n, cls = '') => {
  const svg = fs.readFileSync(path.join(ROOT, 'assets/icons', `${n}.svg`), 'utf8')
    .replace(/<!--[\s\S]*?-->/, '')
    .replace(/\s(width|height)="24"/g, '');
  return `<span class="ic ${cls}">${svg}</span>`;
};

// Logo : pierre tombale d'où sort une pousse
const MARK = (s = 64) => `<svg width="${s}" height="${s}" viewBox="0 0 64 64" aria-hidden="true">
<path d="M15 62V36a17 17 0 0 1 34 0v26z" fill="#232428"/><rect x="11" y="58" width="42" height="5" rx="1.5" fill="#1A1B1E"/>
<path d="M32 19.5V8" stroke="#3F8F3A" stroke-width="3.2" stroke-linecap="round"/>
<path d="M31.5 13.5c-2.6-6.2-9.4-7.7-14-5.6 2 5.2 8.3 8 14 5.6z" fill="#3F8F3A"/>
<path d="M32.5 10.5c2.6-6.2 9.4-7.7 14-5.6-2 5.2-8.3 8-14 5.6z" fill="#5DAE4E"/>
<path d="M24 40h16" stroke="#C9A65A" stroke-width="1.6" stroke-linecap="round" opacity=".8"/></svg>`;

const CSS = `
:root{--granit:#E4E4DF;--marbre:#F8F8F5;--noir:#232428;--or:#C9A65A;--or2:#E2CD98;--chrys:#8A2D78;--chrysbg:#F2E2EF;--pousse:#3F8F3A;--poussebg:#E0EEDA;--encre:#1F2023;--gris:#5C5E64;--trait:#C9C9C3;--repos:#7C7E84}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--granit);font-family:'Schibsted Grotesk',system-ui,sans-serif;color:var(--encre);-webkit-font-smoothing:antialiased;font-size:16px;line-height:1.35}
#p{width:840px;padding:28px;background-color:var(--granit);background-image:radial-gradient(rgba(40,40,45,.075) .8px,transparent 1.3px),radial-gradient(rgba(40,40,45,.05) .8px,transparent 1.3px);background-size:9px 9px,14px 14px;background-position:0 0,5px 7px}
.d{font-family:'Gloock',serif;font-weight:400;letter-spacing:-.005em;line-height:1.08}
.ic{display:inline-flex;align-items:center;justify-content:center;flex:none;width:20px;height:20px}
.ic svg{width:100%;height:100%;stroke-width:1.9}
.stone{background-color:var(--noir);background-image:radial-gradient(rgba(255,255,255,.075) .8px,transparent 1.3px),radial-gradient(rgba(255,255,255,.045) .8px,transparent 1.3px);background-size:8px 8px,13px 13px;background-position:0 0,4px 6px;color:#E7E4DB}
.eng{font-family:'Gloock',serif;color:var(--or);text-transform:uppercase;letter-spacing:.07em;text-shadow:0 1px 0 rgba(0,0,0,.6),0 -1px 0 rgba(255,255,255,.08)}
.panel{background:var(--marbre);border-radius:18px;border:1px solid #D3D3CD}
.mut{color:var(--gris)}
.note{font-size:13px;color:var(--gris);margin-top:14px}
.bub{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;flex:none}
.bub .ic{width:55%;height:55%}
.b-stone{background:var(--noir);color:var(--or2)}
.b-green{background:var(--pousse);color:#fff}
.b-greenl{background:var(--poussebg);color:var(--pousse)}
.b-chrys{background:var(--chrysbg);color:var(--chrys)}
.b-grey{background:#D9D9D3;color:#55575C}
.b-white{background:#fff;color:var(--repos)}
.pill{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:3px 10px;font-size:12.5px;font-weight:600;white-space:nowrap;line-height:1.3}
.p-stone{background:var(--noir);color:var(--or2)}
.p-green{background:var(--pousse);color:#fff}
.p-both{background:#fff;color:var(--encre);box-shadow:inset 0 0 0 1.3px var(--encre)}
.p-soft{background:#DCDCD6;color:#46484D}
/* pierre tombale */
.tomb{position:relative;text-align:center;border-radius:200px 200px 12px 12px/118px 118px 12px 12px;padding:38px 18px 20px;box-shadow:inset 0 0 0 1.5px #3C3E44}
.tomb .sp{color:#6CBF5C;display:flex;justify-content:center}
.tomb .sp .ic{width:24px;height:24px}
.tomb .nm{font-size:30px;line-height:1.05;margin-top:6px}
.tomb .dt{font-size:13.5px;color:var(--or2);letter-spacing:.14em;margin-top:6px}
.tomb .ep{font-style:italic;color:#D2CEC3;font-size:15px;margin:12px auto 0;max-width:250px;line-height:1.35}
.tomb hr{border:0;height:1px;background:linear-gradient(90deg,transparent,var(--or),transparent);margin:16px 6px 4px}
.tomb .row{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:10px}
.socle{height:15px;border-radius:4px;background:#1A1B1E;margin:0 -12px}
.ch{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:5px 11px;font-size:13px;font-weight:500;white-space:nowrap;line-height:1.2}
.ch .ic{width:14px;height:14px}
.ch.s{background:#3B3D43;color:#EEEBE3}
.ch.m{box-shadow:inset 0 0 0 1.3px var(--or);color:var(--or2);background-image:none}
.ch.t{background:var(--chrys);color:#fff}
.tomb .ft{display:flex;justify-content:center;gap:16px;margin-top:14px;font-size:13px;color:#BDB9AE}
.tomb .ft span{display:inline-flex;align-items:center;gap:6px}
.tomb .ft .ic{width:15px;height:15px}
.tomb .ft .fl .ic{color:#D98BC8}
/* telephone */
.phone{background:#141517;border-radius:30px;padding:7px;box-shadow:0 22px 40px -22px rgba(0,0,0,.55)}
.scr{position:relative;border-radius:24px;overflow:hidden;background-color:#EFEFEB}
.scr.stone{background-color:var(--noir)}
.sb{display:flex;justify-content:space-between;font-size:10px;font-weight:700;padding:8px 18px 0;color:#2a2a2a}
`;

const page = (body, wait = false) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Gloock&family=Schibsted+Grotesk:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body${wait ? ' data-wait="1"' : ''}><div id="p">${body}</div></body></html>`;

// Petite pierre tombale (cartes du fil de swipe)
const miniTomb = ({ name, dates, epi, chips }) => `
<div class="tomb stone mini">
  <div class="sp">${ico('sprout')}</div>
  <div class="nm eng">${name}</div>
  <div class="dt">${dates}</div>
  <div class="ep">${epi}</div>
  <hr>
  <div class="row">${chips}</div>
</div><div class="socle"></div>`;

const P = {};

// ---------- 1. Couverture ----------
P.cover = () => `
<style>
.cv{display:grid;grid-template-columns:1fr 262px;gap:40px;align-items:center;padding:6px 4px 4px}
.wm{display:flex;align-items:flex-end;gap:12px}
.wm .d{font-size:120px;line-height:.8;letter-spacing:.07em}
.tag{font-family:'Gloock',serif;font-size:28px;margin-top:22px;line-height:1.1}
.tag .rip{display:block;font-size:17px;color:var(--gris);font-family:'Schibsted Grotesk';font-weight:600;letter-spacing:.06em;margin-bottom:6px}
.tag b{color:var(--chrys);font-weight:400}
.lede{color:var(--gris);font-size:16.5px;margin-top:14px;max-width:400px}
.gs{margin-top:26px;display:flex;flex-direction:column;gap:13px}
.g{display:grid;grid-template-columns:46px 26px 1fr;align-items:center;gap:12px}
.g .bub{width:46px;height:46px}
.g .ar{color:var(--gris)} .g .ar .ic{width:24px;height:24px}
.g b{display:block;font-size:17px;font-weight:700}
.g span{color:var(--gris);font-size:14.5px}
.cv .scr{height:500px}
.hd{display:flex;justify-content:space-between;align-items:center;padding:12px 16px 4px}
.hd .d{font-size:21px}
.hd .ic{width:19px;height:19px;color:var(--gris)}
.flt{display:flex;gap:5px;padding:4px 16px 0}
.flt span{font-size:10.5px;font-weight:600;border-radius:999px;padding:2px 8px;box-shadow:inset 0 0 0 1px #B9B9B2;color:#46484d}
.stack{position:relative;height:350px;margin-top:22px}
.stack .card{position:absolute;left:20px;width:208px}
.stack .back{top:16px;transform:scale(.93);opacity:.55;filter:saturate(.6)}
.stack .front{top:6px;transform:translateX(16px) rotate(6deg);transform-origin:50% 100%}
.mini .nm{font-size:22px}
.mini{padding:30px 12px 16px}
.mini .sp .ic{width:19px;height:19px}
.mini .dt{font-size:11px}
.mini .ep{font-size:12.5px;max-width:170px;margin-top:9px}
.mini hr{margin:11px 4px 0}
.mini .row{gap:4px;margin-top:9px}
.mini .ch{font-size:10.5px;padding:3px 8px;gap:4px}
.mini .ch .ic{width:11px;height:11px}
.mini + .socle{height:11px;margin:0 -8px}
.stamp{position:absolute;top:2px;left:-6px;font-family:'Gloock';font-size:21px;color:var(--pousse);background:rgba(255,255,255,.92);border:3px solid var(--pousse);border-radius:9px;padding:1px 10px 2px;transform:rotate(-16deg);z-index:3}
.btns{position:absolute;bottom:20px;left:0;right:0;display:flex;justify-content:center;align-items:center;gap:20px}
.btns .bub{box-shadow:0 6px 14px -6px rgba(0,0,0,.35)}
</style>
<div class="cv">
  <div>
    <div class="wm">${MARK(80)}<span class="d">RIP</span></div>
    <div class="tag"><b>R</b>eprise <b>I</b>mmédiate <b>P</b>ossible</div>
    <p class="lede">L'app où l'on enterre ses projets abandonnés, et où d'autres viennent les ressusciter avec leur créateur.</p>
    <div class="gs">
      <div class="g"><span class="bub b-green">${ico('sprout')}</span><span class="ar">${ico('arrow-right')}</span><div><b>Ressusciter</b><span>je veux reprendre ce projet</span></div></div>
      <div class="g"><span class="bub b-grey">${ico('moon-star')}</span><span class="ar">${ico('arrow-left')}</span><div><b>Laisser reposer</b><span>pas pour moi</span></div></div>
      <div class="g"><span class="bub b-chrys">${ico('flower-2')}</span><span class="ar">${ico('arrow-up')}</span><div><b>Déposer une fleur</b><span>je soutiens et je garde en favori</span></div></div>
    </div>
  </div>
  <div class="phone"><div class="scr">
    <div class="sb"><span>9:41</span><span>●●● ▮</span></div>
    <div class="hd"><span class="d">Cimetière</span>${ico('sliders-horizontal')}</div>
    <div class="flt"><span>Flutter</span><span>Cofonder</span><span>Marketing</span></div>
    <div class="stack">
      <div class="card back">${miniTomb({ name: 'Bouquin Club', dates: '2022 — 2024', epi: '« Il lisait plus vite que ses membres. »', chips: `<span class="ch s">${ico('users')}1 200 membres</span>` })}</div>
      <div class="card front"><span class="stamp">Ressusciter</span>${miniTomb({ name: 'Mangetout', dates: '2023 — 2025', epi: '« Il voulait que plus rien ne finisse à la poubelle. »', chips: `<span class="ch s">${ico('code-xml')}App à 80 %</span><span class="ch s">${ico('users')}340 inscrits</span><span class="ch m">Dev mobile</span><span class="ch t">${ico('handshake')}Cofonder</span>` })}</div>
    </div>
    <div class="btns"><span class="bub b-white" style="width:46px;height:46px">${ico('moon-star')}</span><span class="bub b-white" style="width:38px;height:38px;color:var(--chrys)">${ico('flower-2')}</span><span class="bub b-green" style="width:56px;height:56px">${ico('sprout')}</span></div>
  </div></div>
</div>`;

// ---------- 2. Les deux publics ----------
P.publics = () => {
  const has = [['code-xml', 'Du code'], ['pen-tool', 'Des maquettes'], ['globe', 'Un nom de domaine'], ['users', 'Des premiers inscrits'], ['megaphone', 'Une petite audience']];
  const want = [['rocket', 'Un projet à lancer sans partir de zéro'], ['users-round', 'Une équipe à rejoindre'], ['briefcase', 'Un projet pour leur portfolio'], ['hand-coins', 'Une affaire à racheter']];
  const pairs = [['hourglass', 'Du temps', 'Du temps'], ['wrench', 'Une compétence', 'Son métier'], ['user-x', 'Un associé', 'Un partenaire'], ['battery-low', "L'envie", 'Une énergie neuve'], ['wallet', "De l'argent", 'Parfois un budget']];
  return `
<style>
.pb{display:grid;grid-template-columns:212px 1fr 212px;gap:18px;align-items:stretch}
.pb .panel{padding:20px 18px}
.pb h3{font-size:25px;margin-top:12px}
.pb .sub{color:var(--gris);font-size:14.5px;margin-top:2px}
.pb .lbl{font-size:13px;font-weight:700;color:var(--gris);margin:18px 0 8px}
.pb ul{list-style:none;display:flex;flex-direction:column;gap:9px}
.pb li{display:flex;gap:9px;align-items:flex-start;font-size:15px;line-height:1.25}
.pb li .ic{width:18px;height:18px;margin-top:1px;color:var(--gris)}
.mid{display:flex;flex-direction:column;justify-content:center;padding:0 2px}
.mid h4{font-family:'Gloock';font-weight:400;font-size:22px;text-align:center;line-height:1.15}
.cols{display:grid;grid-template-columns:1fr 34px 1fr;font-size:12.5px;font-weight:700;color:var(--gris);margin:16px 0 8px;text-align:center}
.pr{display:grid;grid-template-columns:1fr 34px 1fr;align-items:center;margin-top:9px}
.pr > span{display:flex;align-items:center;justify-content:center;gap:6px;border-radius:999px;padding:7px 8px;font-size:14px;font-weight:600;white-space:nowrap}
.pr .l{background:var(--noir);color:#EEEBE3}
.pr .l .ic{width:15px;height:15px;color:var(--or2)}
.pr .r{background:var(--poussebg);color:#2C6A28}
.pr i{height:2px;background:repeating-linear-gradient(90deg,var(--pousse) 0 4px,transparent 4px 7px);margin:0 3px}
</style>
<div class="pb">
  <div class="panel">
    <span class="bub b-stone" style="width:50px;height:50px">${ico('shovel')}</span>
    <h3 class="d">Les créateurs</h3><div class="sub">ont un projet qui dort</div>
    <div class="lbl">Ils ont déjà</div>
    <ul>${has.map(([i, t]) => `<li>${ico(i)}<span>${t}</span></li>`).join('')}</ul>
  </div>
  <div class="mid">
    <h4>Ce qui manque à l'un,<br>l'autre l'apporte</h4>
    <div class="cols"><span>Il manque au créateur</span><span></span><span>Le repreneur apporte</span></div>
    ${pairs.map(([i, a, b]) => `<div class="pr"><span class="l">${ico(i)}${a}</span><i></i><span class="r">${b}</span></div>`).join('')}
  </div>
  <div class="panel">
    <span class="bub b-green" style="width:50px;height:50px">${ico('sprout')}</span>
    <h3 class="d">Les repreneurs</h3><div class="sub">cherchent un projet</div>
    <div class="lbl">Ils cherchent</div>
    <ul>${want.map(([i, t]) => `<li>${ico(i)}<span>${t}</span></li>`).join('')}</ul>
  </div>
</div>`;
};

// ---------- 3. Anatomie de la pierre tombale ----------
P.anatomie = () => {
  const L = [['a-nom', 'Nom et dates', 'sa naissance et sa mort'], ['a-epi', 'Épitaphe', 'le pitch, en une phrase'], ['a-cause', 'Autopsie', 'la cause du décès, choisie dans une liste'], ['a-fleur', 'Fleurs', 'le soutien reçu, sans engagement']];
  const R = [['a-herit', 'Héritage', 'ce qui existe déjà'], ['a-manque', 'Il manque', 'les compétences recherchées'], ['a-test', 'Testament', 'ce que le créateur accepte'], ['a-coffre', 'Coffre', 'fichiers et accès, ouverts après le match']];
  const co = (side) => ([id, t, s]) => `<div class="co ${side}" data-for="${id}"><b>${t}</b><span>${s}</span></div>`;
  return `
<style>
.an{position:relative;height:510px}
.an .tw{position:absolute;left:236px;top:6px;width:312px}
.an .tomb{padding:40px 16px 18px}
.an .nm{font-size:31px}
.co{position:absolute;width:196px;font-size:13.5px;line-height:1.3}
.co b{display:block;font-size:16px;font-weight:700;margin-bottom:2px}
.co span{color:var(--gris)}
.co.L{left:0;text-align:right}
.co.R{left:588px}
.an > svg.ln{position:absolute;left:0;top:0;width:784px;height:640px;overflow:visible;pointer-events:none}
</style>
<div class="an">
  <div class="tw">
    <div class="tomb stone">
      <div class="sp">${ico('sprout')}</div>
      <div id="a-nom"><div class="nm eng">Mangetout</div><div class="dt">2023 — 2025</div></div>
      <div class="ep" id="a-epi">« Il voulait que plus rien ne finisse à la poubelle. »</div>
      <hr>
      <div class="row" id="a-cause"><span class="ch s">${ico('hourglass')}Plus le temps</span></div>
      <div class="row" id="a-herit"><span class="ch s">${ico('code-xml')}App Flutter à 80 %</span><span class="ch s">${ico('users')}340 inscrits</span><span class="ch s">${ico('globe')}Nom de domaine</span></div>
      <div class="row" id="a-manque"><span class="ch m">Dev mobile</span><span class="ch m">Marketing</span></div>
      <div class="row" id="a-test"><span class="ch t">${ico('handshake')}Cofonder avec moi</span></div>
      <div class="ft"><span class="fl" id="a-fleur">${ico('flower-2')}27 fleurs</span><span id="a-coffre">${ico('lock')}Coffre : 6 fichiers</span></div>
    </div>
    <div class="socle"></div>
  </div>
  ${L.map(co('L')).join('')}
  ${R.map(co('R')).join('')}
  <svg class="ln" id="ln"></svg>
</div>
<script>
document.fonts.ready.then(() => {
  const an = document.querySelector('.an'), base = an.getBoundingClientRect();
  const svg = document.getElementById('ln'); let out = '';
  const place = side => {
    const items = [...document.querySelectorAll('.co.' + side)];
    let last = -1e9;
    items.forEach(c => {
      const el = document.getElementById(c.dataset.for).getBoundingClientRect();
      const cy = el.top + el.height / 2 - base.top;
      let topY = Math.max(cy - 11, last + 14);
      c.style.top = topY + 'px';
      last = topY + c.offsetHeight;
      const ly = topY + 11;
      const ex = side === 'L' ? el.left - base.left - 6 : el.right - base.left + 6;
      const x0 = side === 'L' ? 204 : 580;
      out += '<path d="M' + x0 + ' ' + ly + ' H' + (side === 'L' ? Math.min(x0 + 18, ex) : Math.max(x0 - 18, ex)) + ' L' + ex + ' ' + cy + '" fill="none" stroke="#8B8D93" stroke-width="1.2"/>';
      out += '<circle cx="' + ex + '" cy="' + cy + '" r="3.2" fill="#C9A65A" stroke="#E4E4DF" stroke-width="1.5"/>';
    });
  };
  place('L'); place('R');
  svg.innerHTML = out;
  document.body.dataset.ready = '1';
});
</script>`;
};

// ---------- 4. La mécanique ----------
P.mecanique = () => {
  const who = { c: '<span class="pill p-stone">Créateur</span>', r: '<span class="pill p-green">Repreneur</span>', b: '<span class="pill p-both">Les deux</span>' };
  const card = (n, i, t, w, s, exit = '', cls = '') => `<div class="st ${cls}"><div class="top"><span class="n">${n}</span>${ico(i)}</div><h4 class="d">${t}</h4>${who[w]}<p>${s}</p>${exit ? `<div class="ex">${ico('moon-star')}<span>${exit}</span></div>` : ''}</div>`;
  return `
<style>
.mc{position:relative;height:472px}
.st{position:absolute;width:178px;height:210px;background:var(--marbre);border:1px solid #D3D3CD;border-radius:16px;padding:14px 14px 12px;display:flex;flex-direction:column;gap:7px}
.st .top{display:flex;justify-content:space-between;align-items:center}
.st .n{font-family:'Gloock';font-size:22px;color:var(--or);line-height:1}
.st .top .ic{width:22px;height:22px;color:var(--encre)}
.st h4{font-size:23px}
.st .pill{align-self:flex-start}
.st p{font-size:13.5px;color:var(--gris);line-height:1.3}
.st .ex{margin-top:auto;display:flex;gap:6px;align-items:flex-start;font-size:12px;color:#55575C;background:#E9E9E4;border-radius:9px;padding:5px 8px;line-height:1.25}
.st .ex .ic{width:13px;height:13px;margin-top:1px}
.st.win{width:380px;background:var(--poussebg);border-color:#BFD8B6}
.st.win .top .ic{color:var(--pousse)}
.mc > svg{position:absolute;left:0;top:0;overflow:visible}
</style>
<div class="mc">
  <svg width="784" height="472">
    <defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#6E7076"/></marker></defs>
    <g fill="none" stroke="#6E7076" stroke-width="1.5">
      <path d="M180 105H226" marker-end="url(#ar)"/><path d="M382 105H428" marker-end="url(#ar)"/><path d="M584 105H630" marker-end="url(#ar)"/>
      <path d="M695 211V236H89V259" marker-end="url(#ar)"/>
      <path d="M180 367H226" marker-end="url(#ar)"/><path d="M382 367H428" marker-end="url(#ar)"/>
    </g>
  </svg>
  <div style="left:0;top:0" class="st-w">${card(1, 'shovel', 'Enterrer', 'c', 'Il décrit son projet en 5 minutes, aidé par le Médium (IA).')}</div>
  <div style="left:202px;top:0" class="st-w">${card(2, 'hand', 'Swiper', 'r', 'Ressusciter, laisser reposer ou fleurir. Ressusciter = un mot au créateur.')}</div>
  <div style="left:404px;top:0" class="st-w">${card(3, 'inbox', 'Choisir', 'c', 'Il voit qui veut reprendre et accepte ou décline.', 'Décliné : un merci part tout seul')}</div>
  <div style="left:606px;top:0" class="st-w">${card(4, 'heart-handshake', 'Match', 'b', 'Les deux sont prévenus&nbsp;: la reprise devient possible.')}</div>
  <div style="left:0;top:262px" class="st-w">${card(5, 'flame', 'Veillée', 'b', 'Messagerie et coffre ouvert pendant 14 jours.', 'Sans pacte : retour au cimetière')}</div>
  <div style="left:202px;top:262px" class="st-w">${card(6, 'signature', 'Pacte', 'b', 'Un accord type, selon le testament, signé en ligne.')}</div>
  <div style="left:404px;top:262px" class="st-w">${card(7, 'sprout', 'Renaissance', 'b', 'La tombe devient « Ressuscité ». Le projet donne des nouvelles à 30 et 90 jours, visibles dans le fil des renaissances.', '', 'win')}</div>
</div>
<style>.st-w{position:absolute}.st-w .st{position:relative}</style>`;
};

// ---------- 5. Les 4 testaments ----------
P.testaments = () => {
  const T = [
    ['users-round', 'Cofonder', 'Il garde le projet et cherche un associé.', 'reste à bord', 'des parts du projet'],
    ['key-round', 'Transmettre', 'Il passe les clés et reste conseiller.', 'conseille', 'à négocier, souvent symbolique'],
    ['hand-coins', 'Céder', 'Il vend ce qui existe : code, domaine, comptes.', 'part', 'un prix'],
    ['gift', 'Libérer', 'Il donne tout, librement ou en open source.', 'part', 'aucune'],
  ];
  return `
<style>
.ax{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;font-size:14px;font-weight:700;margin-bottom:16px}
.ax .bar{height:6px;border-radius:3px;background:linear-gradient(90deg,var(--chrys),#B07FA6 40%,#C9C9C3)}
.ax span:first-child{color:var(--chrys)} .ax span:last-child{color:var(--gris)}
.ts{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.tc{padding:18px 16px 16px;display:flex;flex-direction:column;gap:9px}
.tc .bub{width:46px;height:46px}
.tc h4{font-size:26px}
.tc p{font-size:14.5px;color:var(--gris);min-height:57px}
.tc dl{border-top:1px solid #DADAD4;padding-top:10px;display:grid;grid-template-columns:auto 1fr;gap:5px 8px;font-size:13px}
.tc dt{color:var(--gris)} .tc dd{font-weight:600}
</style>
<div class="ax"><span>Le créateur reste</span><span class="bar"></span><span>Le créateur s'en va</span></div>
<div class="ts">${T.map(([i, n, s, c, k], j) => `<div class="tc panel"><span class="bub ${j === 0 ? 'b-chrys' : 'b-grey'}" style="${j === 0 ? '' : `background:${['', '#E6D6E2', '#E1DCE0', '#DDDDD8'][j]};color:${['', '#7A3A6C', '#6B5566', '#55575C'][j]}`}">${ico(i)}</span><h4 class="d">${n}</h4><p>${s}</p><dl><dt>Créateur</dt><dd>${c}</dd><dt>Contrepartie</dt><dd>${k}</dd></dl></div>`).join('')}</div>
<p class="note">Le testament est choisi à l'enterrement : le repreneur sait d'avance ce qu'il peut obtenir.</p>`;
};

// ---------- 6. Écrans clés ----------
P.ecrans = () => `
<style>
.ec{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.ec .phone{border-radius:26px;padding:6px}
.ec .scr{height:372px;border-radius:21px;font-size:11px}
.ec .sb{font-size:9px;padding:7px 14px 0}
.cap{text-align:center;font-family:'Gloock';font-size:19px;margin-top:12px}
.h{display:flex;align-items:center;justify-content:space-between;padding:9px 12px 4px}
.h .d{font-size:15px;white-space:nowrap}
.h .ic{width:16px;height:16px;color:var(--gris)}
.e1 .stack{position:relative;margin:8px 12px 0}
.e1 .tomb{padding:24px 8px 12px}
.e1 .nm{font-size:17px}
.e1 .sp .ic{width:15px;height:15px}
.e1 .dt{font-size:9.5px;margin-top:4px}
.e1 .ep{font-size:10.5px;max-width:140px;margin-top:7px}
.e1 hr{margin:9px 2px 0}
.e1 .row{gap:4px;margin-top:7px}
.e1 .ch{font-size:9.5px;padding:3px 7px;gap:3px}
.e1 .ch .ic{width:10px;height:10px}
.e1 .socle{height:9px;margin:0 -6px}
.e1 .btns{position:absolute;bottom:14px;left:0;right:0;display:flex;justify-content:center;align-items:center;gap:14px}
.sec{padding:0 12px;margin-top:9px}
.sec .k{font-size:9.5px;font-weight:700;color:var(--gris);margin-bottom:4px}
.li{display:flex;gap:6px;align-items:center;font-size:11px;margin-top:4px}
.li .ic{width:12px;height:12px;color:var(--gris)}
.chl{white-space:nowrap;display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:3px 8px;font-size:10px;font-weight:600}
.chl .ic{width:10px;height:10px}
.cta{position:absolute;left:12px;right:12px;bottom:14px;border-radius:12px;padding:9px;text-align:center;font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;gap:6px}
.cta .ic{width:14px;height:14px}
.vault{margin:10px 12px 0;border-radius:10px;background:#E2E2DD;padding:8px 9px;display:flex;gap:7px;align-items:center;font-size:10.5px;color:#46484D;line-height:1.25}
.vault .ic{width:15px;height:15px}
.e3{height:100%;display:flex;flex-direction:column;align-items:center;text-align:center;padding:0 14px}
.e3 .big{margin-top:40px;color:#6CBF5C} .e3 .big .ic{width:46px;height:46px}
.e3 .d{font-size:30px;color:var(--or);margin-top:10px}
.e3 p{font-size:11.5px;color:#CFCBC0;margin-top:8px;line-height:1.35}
.av{display:flex;align-items:center;gap:8px;margin-top:22px}
.av span{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px}
.av .t{width:26px;height:32px;border-radius:13px 13px 3px 3px;background:#3B3D43;box-shadow:inset 0 0 0 1px #55575c}
.bb{margin-top:auto;margin-bottom:16px;width:100%}
.bb div{border-radius:12px;padding:9px;font-weight:700;font-size:12px}
.msg{margin:6px 10px 0;padding:7px 9px;border-radius:12px;font-size:10.5px;line-height:1.3;max-width:80%}
.msg.in{background:#fff;border-bottom-left-radius:4px}
.msg.out{background:var(--noir);color:#EEEBE3;margin-left:auto;border-bottom-right-radius:4px}
.sys{margin:8px 10px 0;text-align:center;font-size:9.5px;color:var(--gris);display:flex;justify-content:center;gap:4px;align-items:center}
.sys .ic{width:11px;height:11px}
.tabs{display:flex;gap:6px;padding:4px 12px 2px}
.tabs span{font-size:10px;font-weight:700;padding:3px 9px;border-radius:999px}
</style>
<div class="ec">
  <div><div class="phone"><div class="scr e1">
    <div class="sb"><span>9:41</span><span>●●● ▮</span></div>
    <div class="h"><span class="d">Cimetière</span>${ico('sliders-horizontal')}</div>
    <div class="stack"><div class="tomb stone"><div class="sp">${ico('sprout')}</div><div class="nm eng">Pixel Paddock</div><div class="dt">2024 — 2025</div><div class="ep">« Mort à 80 %, il ne lui manquait qu'un artiste. »</div><hr><div class="row"><span class="ch s">${ico('code-xml')}Jeu jouable</span><span class="ch m">Graphiste</span><span class="ch t">${ico('handshake')}Cofonder</span></div></div><div class="socle"></div></div>
    <div class="btns"><span class="bub b-white" style="width:36px;height:36px">${ico('moon-star')}</span><span class="bub b-white" style="width:30px;height:30px;color:var(--chrys)">${ico('flower-2')}</span><span class="bub b-green" style="width:44px;height:44px">${ico('sprout')}</span></div>
  </div></div><div class="cap">Le cimetière</div></div>

  <div><div class="phone"><div class="scr">
    <div class="sb"><span>9:41</span><span>●●● ▮</span></div>
    <div class="h"><span style="display:flex;align-items:center;gap:4px">${ico('chevron-left')}<span class="d">Pixel Paddock</span></span>${ico('flower-2')}</div>
    <div class="sec"><div class="k">Autopsie</div><span class="chl" style="background:#DCDCD6">${ico('wrench')}Pas de graphiste</span></div>
    <div class="sec"><div class="k">Héritage</div>
      <div class="li">${ico('code-xml')}Jeu Godot jouable</div><div class="li">${ico('flag')}12 niveaux</div><div class="li">${ico('megaphone')}Musique originale</div></div>
    <div class="sec"><div class="k">Il manque</div><span class="chl" style="box-shadow:inset 0 0 0 1px var(--or);color:#8A6A22">Graphiste pixel art</span></div>
    <div class="sec"><div class="k">Testament</div><span class="chl" style="background:var(--chrys);color:#fff">${ico('handshake')}Cofonder</span></div>
    <div class="vault">${ico('lock')}<span>Coffre : 9 fichiers,<br>ouvert après le match</span></div>
    <div class="cta" style="background:var(--pousse);color:#fff">${ico('sprout')}Ressusciter</div>
  </div></div><div class="cap">La tombe</div></div>

  <div><div class="phone"><div class="scr stone">
    <div class="sb" style="color:#ddd"><span>9:41</span><span>●●● ▮</span></div>
    <div class="e3">
      <div class="big">${ico('sprout')}</div>
      <div class="d">Il revit !</div>
      <p>Léa veut ressusciter Pixel Paddock avec toi.</p>
      <div class="av"><span style="background:var(--poussebg);color:var(--pousse)">L</span><span class="t"></span><span style="background:#E9E6DD;color:var(--noir)">Toi</span></div>
      <div class="bb"><div style="background:var(--pousse);color:#fff">Ouvrir la veillée</div><div style="color:#BDB9AE;font-weight:600">Plus tard</div></div>
    </div>
  </div></div><div class="cap">Le match</div></div>

  <div><div class="phone"><div class="scr">
    <div class="sb"><span>9:41</span><span>●●● ▮</span></div>
    <div class="h"><span class="d">Pixel Paddock</span><span class="pill" style="background:#F6E7C8;color:#7A5A14;font-size:9.5px;padding:2px 7px">${ico('flame').replace('class="ic "', 'class="ic " style="width:11px;height:11px"')}13 jours</span></div>
    <div class="tabs"><span style="background:var(--noir);color:#fff">Messages</span><span style="background:#E0E0DB">Coffre</span></div>
    <div class="msg in">J'ai joué au niveau 4, j'adore. Je peux refaire tous les sprites.</div>
    <div class="msg out">Top ! Je t'ouvre le coffre.</div>
    <div class="sys">${ico('lock-open')}Coffre ouvert : 9 fichiers</div>
    <div class="msg in">On se fixe une démo dans 3 semaines ?</div>
    <div class="cta" style="background:var(--noir);color:var(--or2)">${ico('signature')}Proposer le pacte</div>
  </div></div><div class="cap">La veillée</div></div>
</div>`;

// ---------- 7. Positionnement ----------
P.marche = () => {
  const dots = [
    // [x 0..1 (vendre -> continuer), y 0..1 (vivants -> abandonnés), nom, ligne, ancrage]
    [0.13, 0.88, 'Dead Acquire', 'projets morts à vendre', 'l'],
    [0.13, 0.66, 'NanoAcquire', 'projets à moins de 2 000 $', 'l'],
    [0.40, 0.69, 'failedUps', 'repreneur ou cofondateur, sans swipe', 'l'],
    [0.13, 0.24, 'SideProjectors', 'projets à vendre, souvent avec revenus', 'l'],
    [0.57, 0.45, 'Solodoers', 'MVP confiés à une équipe, à la main', 'l'],
    [0.66, 0.16, 'Buildr', 'swipe de cofondateurs, projets en cours', 'l'],
  ];
  const W = 640, H = 380, X0 = 120, Y0 = 18;
  const px = x => X0 + x * W, py = y => Y0 + (1 - y) * H;
  return `
<style>
.mk{position:relative;height:452px}
.mk > svg{position:absolute;left:0;top:0}
.dt2{position:absolute;display:flex;gap:9px;align-items:flex-start;width:200px}
.dt2 i{width:13px;height:13px;border-radius:50%;background:#7C7E84;flex:none;margin-top:4px;box-shadow:0 0 0 3px var(--granit)}
.dt2 b{display:block;font-size:15px}
.dt2 span{font-size:12.5px;color:var(--gris);line-height:1.25;display:block}
.rb{position:absolute;display:flex;gap:10px;align-items:center;background:var(--noir);color:#EEEBE3;border-radius:16px;padding:10px 14px 10px 10px;box-shadow:0 0 0 3px var(--pousse)}
.rb .bub{width:38px;height:38px}
.rb b{font-family:'Gloock';font-weight:400;font-size:21px;color:var(--or);display:block;line-height:1}
.rb span{font-size:12.5px;color:#D2CEC3}
.axl{position:absolute;font-size:13px;font-weight:700;color:var(--gris)}
</style>
<div class="mk">
  <svg width="784" height="452">
    <defs><marker id="am" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#6E7076"/></marker></defs>
    <rect x="${X0 + W / 2}" y="${Y0}" width="${W / 2}" height="${H / 2}" rx="14" fill="#3F8F3A" fill-opacity=".09"/>
    <g stroke="#6E7076" stroke-width="1.4" fill="none">
      <path d="M${X0} ${Y0 + H}H${X0 + W + 6}" marker-end="url(#am)"/><path d="M${X0} ${Y0 + H}V${Y0 - 6}" marker-end="url(#am)"/>
    </g>
    <g stroke="#B5B5AE" stroke-width="1" stroke-dasharray="4 5"><path d="M${X0 + W / 2} ${Y0}V${Y0 + H}"/><path d="M${X0} ${Y0 + H / 2}H${X0 + W}"/></g>
  </svg>
  <div class="axl" style="left:${X0}px;top:${Y0 + H + 12}px">Vendre, racheter</div>
  <div class="axl" style="left:${X0 + W - 160}px;top:${Y0 + H + 12}px;width:160px;text-align:right">Continuer ensemble</div>
  <div class="axl" style="left:0;top:${Y0 + 2}px;width:108px;text-align:right">Projets abandonnés</div>
  <div class="axl" style="left:0;top:${Y0 + H - 18}px;width:108px;text-align:right">Projets vivants</div>
  ${dots.map(([x, y, n, s]) => `<div class="dt2" style="left:${px(x) - 6}px;top:${py(y) - 10}px"><i></i><div><b>${n}</b><span>${s}</span></div></div>`).join('')}
  <div class="rb" style="left:${px(0.58)}px;top:${py(0.97)}px"><span class="bub b-green">${ico('sprout')}</span><div><b>RIP</b><span>swipe + match avec le créateur</span></div></div>
</div>
<p class="note" style="margin-top:4px">Positions approximatives, d'après les pages des produits consultées le 3 novembre 2026.</p>`;
};

// ---------- 8. Modèle économique ----------
P.argent = () => {
  const C = [
    ['gift', '0 €', 'Toujours gratuit', 'Enterrer un projet, recevoir des visites, 20 swipes par jour.', 'Phase 1', 'b-greenl'],
    ['crown', '7 €<small> / mois</small>', 'RIP+, pour les repreneurs', 'Swipes illimités, filtres par compétence, voir les fleurs, 3 priorités par semaine.', 'Phase 2', 'b-chrys'],
    ['percent', '8 %', 'Commission sur les cessions', 'Paiement sous séquestre chez un prestataire, prélevé seulement si la vente aboutit.', 'Phase 3', 'b-grey'],
    ['building-2', '99 à 490 €<small> / mois</small>', 'Cimetières privés', 'Écoles, incubateurs et entreprises, pour leurs projets dormants.', 'Phase 3', 'b-grey'],
  ];
  return `
<style>
.mo{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.mo .panel{padding:18px 16px;display:flex;flex-direction:column;gap:8px}
.mo .bub{width:42px;height:42px}
.mo .big{font-family:'Gloock';font-size:30px;line-height:1.05;margin-top:6px;white-space:nowrap}
.mo .big small{font-size:18px;color:var(--gris)}
.mo h4{font-size:15.5px;font-weight:700}
.mo p{font-size:13.5px;color:var(--gris);flex:1}
.mo .pill{align-self:flex-start}
</style>
<div class="mo">${C.map(([i, b, t, s, ph, bc], j) => `<div class="panel"><span class="bub ${bc}">${ico(i)}</span><div class="big">${b}</div><h4>${t}</h4><p>${s}</p><span class="pill ${j === 0 ? 'p-green' : 'p-soft'}">${ph}</span></div>`).join('')}</div>
<p class="note">Montants : hypothèses à tester avec les premiers utilisateurs. Les créateurs ne paient jamais pour enterrer : ce sont eux qui remplissent le cimetière.</p>`;
};

// ---------- 9. Risques et parades ----------
P.risques = () => {
  const R = [
    ['eye-off', "Vol d'idée", 'on a peur de tout montrer', 'Pitch public court ; détails et fichiers dans le coffre, ouvert seulement après le match ; tombe horodatée.'],
    ['search', 'Cimetière vide', 'pas de tombes, pas de repreneurs', "Ouvrir d'abord les dépôts ; lancer le swipe à partir de 300 tombes ; campagnes « Enterre ton projet »."],
    ['ghost', 'Ghosting', 'des matchs sans suite', 'Veillée limitée à 14 jours ; taux de réponse affiché sur chaque profil.'],
    ['bot', 'Fausses tombes', 'projets vides ou arnaques', 'Preuve obligatoire (lien, capture, dépôt de code) ; modération par IA puis humaine.'],
    ['scale', 'Litige de propriété', 'qui possède quoi après la reprise ?', "Testament choisi à l'avance ; pacte type par testament ; RIP n'est pas partie à l'accord."],
    ['database', 'Données des inscrits', 'les utilisateurs du projet ont des droits (RGPD)', "Aucun fichier clients transféré par l'app ; liste de contrôle RGPD dans le pacte."],
  ];
  return `
<style>
.rk{display:flex;flex-direction:column;gap:10px}
.rr{display:grid;grid-template-columns:270px 30px 1fr;align-items:center;background:var(--marbre);border:1px solid #D3D3CD;border-radius:14px;padding:12px 16px}
.rr .r1{display:flex;gap:12px;align-items:center}
.rr .bub{width:40px;height:40px}
.rr b{display:block;font-size:16px}
.rr .r1 span{font-size:13px;color:var(--gris)}
.rr .ar{color:#8B8D93}.rr .ar .ic{width:20px;height:20px}
.rr .r2{display:flex;gap:9px;align-items:flex-start;font-size:14.5px;line-height:1.3}
.rr .r2 .ic{width:18px;height:18px;color:var(--pousse);margin-top:1px}
</style>
<div class="rk">${R.map(([i, t, s, p]) => `<div class="rr"><div class="r1"><span class="bub b-grey">${ico(i)}</span><div><b>${t}</b><span>${s}</span></div></div><span class="ar">${ico('arrow-right')}</span><div class="r2">${ico('shield-check')}<span>${p}</span></div></div>`).join('')}</div>`;
};

// ---------- 10. Feuille de route ----------
P.route = () => {
  const ph = [
    ['Phase 0', 'Valider sans coder', '3 semaines', ["Page d'accueil et formulaire « Enterre ton projet »", '20 entretiens', 'Appel dans 5 communautés']],
    ['Phase 1', 'MVP', '8 semaines', ['Enterrer, swiper, choisir', 'Match et messagerie', 'Modération et signalement']],
    ['Phase 2', 'La reprise', '6 semaines', ['Coffre et pacte type', 'Renaissances, suivi à 90 jours', 'RIP+ en test']],
    ['Phase 3', 'Croissance', 'en continu', ['Apps iOS et Android', 'Cessions sous séquestre', 'Cimetières privés, Resurrection Jam']],
  ];
  const gates = ['150 tombes et 500 repreneurs inscrits', '30 % des matchs dépassent 10 messages', '10 pactes signés'];
  const chain = ['Tombes', 'Swipes', 'Ressusciter', 'Matchs', 'Veillées actives', 'Pactes signés', 'Renaissances à 90 j'];
  return `
<style>
.rm{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.ph{padding:16px 15px 16px;display:flex;flex-direction:column;gap:6px}
.ph .k{display:flex;justify-content:space-between;align-items:center;font-size:12.5px;font-weight:700;color:var(--gris)}
.ph h4{font-size:24px}
.ph ul{list-style:none;margin-top:6px;display:flex;flex-direction:column;gap:6px}
.ph li{font-size:13.5px;line-height:1.28;padding-left:14px;position:relative}
.ph li:before{content:'';position:absolute;left:0;top:7px;width:6px;height:6px;border-radius:50%;background:var(--or)}
.ph.on{background:var(--noir);color:#EEEBE3;border-color:var(--noir)}
.ph.on .k{color:var(--or2)} .ph.on h4{color:var(--or)}
.gt{position:relative;height:92px}
.gt .g{position:absolute;top:0;width:176px;text-align:center;transform:translateX(-50%)}
.gt .dm{width:20px;height:20px;background:var(--pousse);transform:rotate(45deg);margin:-12px auto 0;border-radius:3px;box-shadow:0 0 0 4px var(--granit)}
.gt .g b{display:block;font-size:12px;color:var(--pousse);margin-top:9px}
.gt .g span{display:block;font-size:13px;font-weight:600;line-height:1.25;margin-top:1px}
.ns{margin-top:10px;background:var(--marbre);border:1px solid #D3D3CD;border-radius:16px;padding:14px 16px}
.ns .t{font-size:13px;font-weight:700;color:var(--gris);margin-bottom:10px}
.cn{display:flex;align-items:center;gap:4px;flex-wrap:nowrap}
.cn span{font-size:12.5px;font-weight:600;border-radius:999px;padding:5px 9px;background:#E3E3DE;white-space:nowrap}
.cn span.star{background:var(--pousse);color:#fff}
.cn i{color:#8B8D93;font-style:normal;font-size:13px}
</style>
<div class="rm">${ph.map(([k, n, d, l], j) => `<div class="ph panel ${j === 1 ? 'on' : ''}"><div class="k"><span>${k}</span><span class="pill ${j === 1 ? 'p-stone' : 'p-soft'}" style="${j === 1 ? 'box-shadow:inset 0 0 0 1px #6b6d72' : ''}">${d}</span></div><h4 class="d">${n}</h4><ul>${l.map(x => `<li>${x}</li>`).join('')}</ul></div>`).join('')}</div>
<div class="gt">${gates.map((g, j) => `<div class="g" style="left:${196 * (j + 1) - 8}px"><div class="dm"></div><b>Passage ${j}  →  ${j + 1}</b><span>${g}</span></div>`).join('')}</div>
<div class="ns"><div class="t">Les indicateurs, du dépôt à la renaissance. Étoile polaire : les pactes signés par mois.</div>
<div class="cn">${chain.map((c, j) => `<span class="${c === 'Pactes signés' ? 'star' : ''}">${c}</span>${j < chain.length - 1 ? '<i>›</i>' : ''}`).join('')}</div></div>`;
};

// ---------- 11. Architecture ----------
P.archi = () => {
  const box = (x, y, w, h, i, t, s, cls = '') => `<div class="bx ${cls}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"><div class="tt">${ico(i)}<b>${t}</b></div><span>${s}</span></div>`;
  const lab = (x, y, t, a = 'middle') => `<text x="${x}" y="${y}" text-anchor="${a}" font-size="12.5" fill="#5C5E64" font-family="Schibsted Grotesk" font-weight="600">${t}</text>`;
  return `
<style>
.ar2{position:relative;height:474px}
.ar2 > svg{position:absolute;left:0;top:0}
.bx{position:absolute;background:var(--marbre);border:1px solid #D3D3CD;border-radius:14px;padding:12px 13px;display:flex;flex-direction:column;justify-content:center;gap:4px}
.bx .tt{display:flex;align-items:center;gap:8px}
.bx .tt .ic{width:19px;height:19px}
.bx b{font-size:15px}
.bx span{font-size:12.5px;color:var(--gris);line-height:1.25}
.bx.hub{background:var(--noir);border-color:var(--noir);color:#EEEBE3;align-items:center;text-align:center}
.bx.hub .tt{flex-direction:column;gap:8px}
.bx.hub .tt .ic{width:30px;height:30px;color:var(--or2)}
.bx.hub b{font-family:'Gloock';font-weight:400;font-size:26px;color:var(--or)}
.bx.hub span{color:#CFCBC0;font-size:13.5px}
.bx.ai{background:var(--chrysbg);border-color:#DCC0D5}
.bx.ai .ic{color:var(--chrys)}
</style>
<div class="ar2">
  <svg width="784" height="474">
    <defs><marker id="aa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#6E7076"/></marker></defs>
    <g fill="none" stroke="#6E7076" stroke-width="1.5">
      <path d="M162 130H282" marker-end="url(#aa)" marker-start="url(#aa)"/>
      <path d="M282 270H162" marker-end="url(#aa)"/>
      <path d="M490 84H626" marker-end="url(#aa)"/>
      <path d="M490 192H626" marker-end="url(#aa)"/>
      <path d="M490 300H626" marker-end="url(#aa)" marker-start="url(#aa)"/>
      <path d="M330 340V392" marker-end="url(#aa)"/>
      <path d="M450 340V392" marker-end="url(#aa)"/>
    </g>
    ${lab(222, 120, 'swipes, messages')}${lab(222, 260, 'image de la tombe')}${lab(558, 74, 'lit et écrit')}${lab(558, 182, 'fichiers')}${lab(558, 290, 'temps réel')}
    ${lab(322, 370, 'rédaction, modération', 'end')}${lab(458, 370, 'envoie', 'start')}
  </svg>
  ${box(0, 75, 162, 110, 'smartphone', 'App mobile web', 'installable, sans passer par les stores')}
  ${box(0, 215, 162, 110, 'share-2', 'Page de partage', 'la tombe en image pour les réseaux')}
  ${box(282, 60, 208, 280, 'cloud', 'API', 'Cloudflare Workers', 'hub')}
  ${box(626, 40, 158, 92, 'database', 'Neon Postgres', 'comptes, tombes, swipes, matchs')}
  ${box(626, 152, 158, 80, 'hard-drive', 'R2', 'photos et coffre')}
  ${box(626, 252, 158, 96, 'radio', 'Durable Objects', 'une veillée = un salon en temps réel')}
  ${box(196, 392, 196, 82, 'sparkles', 'Claude, le Médium', 'rédige la tombe, modère', 'ai')}
  ${box(412, 392, 196, 82, 'mail', 'E-mail', 'connexion par lien, alertes de match')}
</div>`;
};

// ---------- rendu ----------
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(P);
const require = createRequire('/Users/jimnytcha/job-search-thailand/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--allow-file-access-from-files'] });
const ctx = await browser.newContext({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 2 });
for (const n of names) {
  const body = P[n]();
  const html = path.join(OUT, `${n}.html`);
  fs.writeFileSync(html, page(body, body.includes('<script>')));
  const pg = await ctx.newPage();
  await pg.goto('file://' + html, { waitUntil: 'networkidle' });
  await pg.evaluate(() => document.fonts.ready);
  await pg.waitForFunction(() => !document.body.dataset.wait || document.body.dataset.ready === '1');
  const png = path.join(OUT, `${n}.png`);
  await pg.locator('#p').screenshot({ path: png });
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '86', png, '--out', path.join(OUT, `reboot-${n}.jpg`)], { stdio: 'ignore' });
  await pg.close();
  console.log('ok', n);
}
await browser.close();
