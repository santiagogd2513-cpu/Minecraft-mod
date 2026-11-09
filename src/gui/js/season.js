// Temas e íconos de temporada (Arnis no oficial para Android).
//
// Calendario: Navidad del 1 de diciembre al 6 de enero (salvo el 7 de diciembre, Día de las
// Velitas), San Valentín del 1 al 14 de febrero, Amor y Amistad todo septiembre y Halloween todo
// octubre. Dos interruptores, encendidos de fábrica; tocar el nombre de cada fila abre su menú:
// «Automático» sigue la fecha, y también se puede dejar fijo un tema o un ícono todo el año.
(function () {
  "use strict";

  var SEASONS = [
    { emoji: "🎄", name: "Navidad", dates: "Del 1 de diciembre al 6 de enero", c: ["#E63946", "#2DC653"] },
    { emoji: "🕯️", name: "Día de las Velitas", dates: "7 de diciembre", c: ["#FFC23D", "#FF7B00"] },
    { emoji: "💘", name: "San Valentín", dates: "Del 1 al 14 de febrero", c: ["#FF4D8D", "#C9184A"] },
    { emoji: "🤝", name: "Amor y Amistad", dates: "Todo septiembre", c: ["#FFC857", "#FF6B8A"] },
    { emoji: "🎃", name: "Halloween", dates: "Todo octubre", c: ["#FF7A00", "#7B2CBF"] },
  ];
  // Qué temporadas ya tienen su ícono dibujado (los temas llegan en las próximas versiones).
  var ICON_READY = [false, false, false, false, false];

  function get(k, d) {
    try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; }
  }
  function set(k, v) {
    try { localStorage.setItem(k, String(v)); } catch (e) { }
  }

  var S = {
    themesOn: function () { return get("temporada-temas", "1") === "1"; },
    theme: function () { var t = get("temporada-tema", "auto"); return t === "auto" ? "auto" : (+t >= 0 && +t < 5 ? +t : "auto"); },
    iconsOn: function () { return get("temporada-iconos", "1") === "1"; },
    icon: function () { var i = get("temporada-icono", "auto"); return i === "auto" || i === "original" ? i : (+i >= 0 && +i < 5 ? +i : "auto"); },
  };

  function byDate(d) {
    var m = d.getMonth(), day = d.getDate();
    if (m === 11 && day === 7) return 1;
    if (m === 11 || (m === 0 && day <= 6)) return 0;
    if (m === 1 && day <= 14) return 2;
    if (m === 8) return 3;
    if (m === 9) return 4;
    return -1;
  }
  function today() { return byDate(new Date()); }
  function current() {
    if (!S.themesOn()) return -1;
    var t = S.theme();
    return t === "auto" ? today() : t;
  }
  function next() {
    var d = new Date(), now = byDate(d);
    for (var i = 1; i <= 370; i++) {
      d.setDate(d.getDate() + 1);
      var s = byDate(d);
      if (s !== -1 && s !== now) return { days: i, season: s };
    }
    return { days: 0, season: 0 };
  }

  // La temporada activa queda en <html data-season="…"> para que el CSS la use.
  function applyTheme() {
    var c = current();
    var names = ["navidad", "velitas", "valentin", "amistad", "halloween"];
    if (c >= 0) document.documentElement.setAttribute("data-season", names[c]);
    else document.documentElement.removeAttribute("data-season");
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function render() {
    var banner = document.getElementById("season-banner");
    if (!banner) return;
    applyTheme();
    var c = current();
    banner.innerHTML = "";
    banner.classList.toggle("is-active", c >= 0);
    var emoji, small, title, sub;
    if (c >= 0) {
      var s = SEASONS[c];
      banner.style.background = "linear-gradient(90deg," + shade(s.c[0]) + "," + shade(s.c[1]) + ")";
      emoji = s.emoji; small = "Tema activo"; title = s.name;
      sub = S.theme() === "auto" ? s.dates : "Elegido para todo el año";
    } else {
      var n = next();
      banner.style.background = "";
      emoji = S.themesOn() ? "📅" : "💤";
      small = S.themesOn() ? "Ahora no hay temporada" : "Temas apagados";
      title = "Próxima: " + SEASONS[n.season].emoji + " " + SEASONS[n.season].name;
      sub = n.days === 1 ? "Empieza mañana" : "⏳ " + n.days + " días para que empiece";
    }
    banner.appendChild(el("div", "season-banner-emoji", emoji));
    var t = el("div", "season-banner-text");
    t.appendChild(el("div", "season-banner-small", small));
    t.appendChild(el("div", "season-banner-title", title));
    t.appendChild(el("div", "season-banner-sub", sub));
    banner.appendChild(t);

    var tt = document.getElementById("season-theme-toggle");
    var it = document.getElementById("season-icon-toggle");
    tt.checked = S.themesOn();
    it.checked = S.iconsOn();
    var th = S.theme();
    document.getElementById("season-theme-desc").textContent = !S.themesOn() ? "Apagados: siempre el diseño de siempre"
      : th === "auto" ? "Automático (según la fecha)" + (today() >= 0 ? " · " + SEASONS[today()].emoji + " " + SEASONS[today()].name : "")
        : SEASONS[th].emoji + " " + SEASONS[th].name + " · todo el año";
    var ic = S.icon();
    document.getElementById("season-icon-desc").textContent = !S.iconsOn() ? "Apagados: siempre el ícono original"
      : ic === "auto" ? "Automático · combina con la temporada"
        : ic === "original" ? "El original" : SEASONS[ic].emoji + " " + SEASONS[ic].name;
  }

  function shade(hex) {
    var n = parseInt(hex.slice(1), 16);
    var r = ((n >> 16) & 255) * 0.6, g = ((n >> 8) & 255) * 0.6, b = (n & 255) * 0.6;
    return "rgb(" + Math.round(r) + "," + Math.round(g) + "," + Math.round(b) + ")";
  }

  // ---------------------------------------------------------------- menús

  function sheet(title, sub) {
    var back = el("div", "season-sheet-back");
    var box = el("div", "season-sheet");
    box.appendChild(el("div", "season-sheet-handle"));
    box.appendChild(el("div", "season-sheet-title", title));
    if (sub) box.appendChild(el("div", "season-sheet-sub", sub));
    var list = el("div", "season-sheet-list");
    box.appendChild(list);
    back.appendChild(box);
    function close() {
      back.classList.remove("open");
      setTimeout(function () { back.remove(); }, 200);
    }
    back.addEventListener("click", function (e) { if (e.target === back) close(); });
    document.body.appendChild(back);
    requestAnimationFrame(function () { back.classList.add("open"); });
    return { list: list, close: close };
  }

  function option(list, badge, c1, c2, title, sub, selected, tag, pick) {
    var r = el("button", "season-opt" + (selected ? " selected" : "") + (tag ? " disabled" : ""));
    r.type = "button";
    if (selected) r.style.borderColor = c1;
    var b = el("span", "season-opt-badge", badge);
    b.style.background = "linear-gradient(135deg," + c1 + "," + c2 + ")";
    r.appendChild(b);
    var t = el("span", "season-opt-text");
    t.appendChild(el("span", "season-opt-title", title));
    if (sub) t.appendChild(el("span", "season-opt-sub", sub));
    r.appendChild(t);
    if (tag) r.appendChild(el("span", "season-opt-tag", tag));
    else if (selected) {
      var ok = el("span", "season-opt-check", "✓");
      ok.style.color = c1;
      r.appendChild(ok);
    }
    if (!tag) r.addEventListener("click", pick);
    list.appendChild(r);
  }

  function chooseTheme() {
    var sh = sheet("Elegir tema", "En «Automático» cambia solo según la fecha");
    var sel = S.themesOn() ? S.theme() : -1, now = today();
    function pick(t) {
      return function () {
        set("temporada-tema", t);
        set("temporada-temas", "1");
        sh.close();
        render();
      };
    }
    option(sh.list, "📅", "#7b6cff", "#3fb8ff", "Automático (según la fecha)",
      now < 0 ? "Ahora no hay temporada" : "Ahora: " + SEASONS[now].emoji + " " + SEASONS[now].name, sel === "auto", null, pick("auto"));
    SEASONS.forEach(function (s, i) {
      option(sh.list, s.emoji, s.c[0], s.c[1], s.name, s.dates + " · o todo el año", sel === i, null, pick(i));
    });
  }

  function chooseIcon() {
    var sh = sheet("Elegir ícono", "El ícono de la app en la pantalla de inicio");
    var sel = S.iconsOn() ? S.icon() : "original";
    function pick(i) {
      return function () {
        set("temporada-icono", i);
        if (i !== "original") set("temporada-iconos", "1");
        sh.close();
        render();
      };
    }
    option(sh.list, "✨", "#7b6cff", "#3fb8ff", "Automático", "Combina con la temporada", sel === "auto", null, pick("auto"));
    option(sh.list, "⭐", "#2a3550", "#3a4560", "El original", "El de siempre", sel === "original", null, pick("original"));
    SEASONS.forEach(function (s, i) {
      option(sh.list, s.emoji, s.c[0], s.c[1], s.name, null, sel === i, ICON_READY[i] ? null : "Próximamente", pick(i));
    });
  }

  function init() {
    applyTheme();
    if (!document.getElementById("season-banner")) return;
    document.getElementById("season-theme-toggle").addEventListener("change", function (e) {
      set("temporada-temas", e.target.checked ? "1" : "0");
      render();
    });
    document.getElementById("season-icon-toggle").addEventListener("change", function (e) {
      set("temporada-iconos", e.target.checked ? "1" : "0");
      render();
    });
    document.querySelectorAll(".season-open").forEach(function (o) {
      o.addEventListener("click", function () {
        if (o.dataset.menu === "theme") chooseTheme(); else chooseIcon();
      });
    });
    render();
  }

  window.arnisSeason = { current: current, byDate: byDate };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
