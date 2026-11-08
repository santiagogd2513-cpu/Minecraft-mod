// Android adjustments for the Arnis GUI.
//
// Loaded (not deferred) before main.js so it can prepare localStorage before main.js
// reads it. Android is detected from the WebView user agent, which is synchronous.
//
// On Android the map fills the screen and the controls live in a bottom sheet:
// swipe the sheet down to see the whole map, swipe it up (or tap the handle) to get the
// options and the generate button back. Sheet contents:
//
//   ┌──────────────────────────┐
//   │           map            │
//   ├──────────────────────────┤
//   │ [ ☕ Java | 🧱 Bedrock ]   │
//   │ quick settings (chips)    │
//   │ area details (km², size)  │
//   │ progress                  │
//   │ [ Generar mundo ]         │
//   └──────────────────────────┘
//
// The existing controls (start button, settings, progress) are moved, not copied, so
// main.js keeps working with them. The quick-setting chips drive the real settings
// inputs, so generation reads exactly what the chips show.
(function () {
  if (!/Android/i.test(navigator.userAgent)) return;

  document.documentElement.classList.add("arnis-android");

  try {
    // This is an unofficial personal build: never send telemetry to the upstream
    // project and don't ask about it on first run.
    localStorage.setItem("telemetry-consent", "false");
    // Java Edition by default; Bedrock is one tap away in the panel.
    const fmt = localStorage.getItem("arnis-world-format");
    if (fmt !== "java" && fmt !== "bedrock") localStorage.setItem("arnis-world-format", "java");
  } catch (e) {
    console.warn("localStorage unavailable:", e);
  }

  // ---------- Quick settings ----------

  // kind "check": a checkbox in the settings page. kind "mode": the generation-mode
  // select (on = objects + terrain, off = objects only). kind "always": shown for
  // information, the generator always builds it.
  const QUICK = [
    { key: "terrain", icon: "🏔️", label: "Terreno", kind: "mode" },
    // Relieve: cada toque cambia la altura de cerros y montañas (×1 real, ×1,5, ×2, ×3).
    { key: "height-multiplier-slider", icon: "⛰️", label: "Relieve", kind: "height" },
    { key: "roofs", icon: "🏠", label: "Techos", kind: "always" },
    { key: "interior-toggle", icon: "🛋️", label: "Interiores", kind: "check" },
    { key: "overture-toggle", icon: "🏢", label: "Más edificios", kind: "check" },
    { key: "use-3d-toggle", icon: "🗽", label: "Modelos 3D", kind: "check" },
    { key: "fillground-toggle", icon: "⛏️", label: "Subsuelo", kind: "check" },
    { key: "caves-toggle", icon: "🕳️", label: "Cuevas", kind: "check" },
  ];
  const DEFAULTS_KEY = "arnis-android-defaults-v1";

  function modeSelect() {
    return document.getElementById("generation-mode-select");
  }

  const HEIGHTS = [1, 1.5, 2, 3];

  function heightValue() {
    const el = document.getElementById("height-multiplier-slider");
    const v = el ? parseFloat(el.value) : 1;
    return isFinite(v) ? v : 1;
  }

  function heightLabel() {
    const v = heightValue();
    return "Relieve ×" + (Math.round(v * 100) / 100).toString().replace(".", ",");
  }

  function cycleHeight() {
    const el = document.getElementById("height-multiplier-slider");
    if (!el || el.disabled) return;
    const v = heightValue();
    let i = HEIGHTS.findIndex(function (h) { return Math.abs(h - v) < 0.01; });
    i = i < 0 ? 0 : (i + 1) % HEIGHTS.length;
    el.value = String(HEIGHTS[i]);
    fire(el);
  }

  function isOn(item) {
    if (item.kind === "always") return true;
    if (item.kind === "height") return heightValue() > 1.01;
    if (item.kind === "mode") {
      const s = modeSelect();
      return !s || s.value === "geo-terrain" || s.value === "terrain-only";
    }
    const el = document.getElementById(item.key);
    return !!(el && el.checked);
  }

  function fire(el) {
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function setOn(item, on) {
    if (item.kind === "always" || item.kind === "height") return;
    if (item.kind === "mode") {
      const s = modeSelect();
      if (!s) return;
      s.value = on ? "geo-terrain" : "geo-only";
      fire(s);
      // Keep the cards on the settings page in step with the select.
      document.querySelectorAll('#generation-mode-cards .segment').forEach(function (b) {
        const active = b.dataset.value === s.value;
        b.classList.toggle("active", active);
        b.setAttribute("aria-pressed", active ? "true" : "false");
      });
      return;
    }
    const el = document.getElementById(item.key);
    if (el && el.checked !== on && !el.disabled) {
      el.checked = on;
      fire(el);
    }
  }

  function applyDefaultsOnce() {
    try {
      if (localStorage.getItem(DEFAULTS_KEY)) return;
      QUICK.forEach(function (item) { setOn(item, true); });
      localStorage.setItem(DEFAULTS_KEY, "1");
    } catch (e) { /* ignore */ }
  }

  function buildChips(container) {
    QUICK.forEach(function (item) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "quick-chip";
      chip.dataset.key = item.key;
      chip.innerHTML = '<span class="quick-chip-icon"></span><span class="quick-chip-label"></span>';
      chip.querySelector(".quick-chip-icon").textContent = item.icon;
      chip.querySelector(".quick-chip-label").textContent = item.label;
      if (item.kind === "always") {
        chip.classList.add("always");
        chip.title = "Siempre incluidos";
      } else {
        chip.addEventListener("click", function () {
          if (item.kind === "height") cycleHeight();
          else setOn(item, !isOn(item));
          refreshChips();
        });
      }
      container.appendChild(chip);
    });
    refreshChips();
  }

  function refreshChips() {
    document.querySelectorAll(".quick-chip").forEach(function (chip) {
      const item = QUICK.find(function (q) { return q.key === chip.dataset.key; });
      if (!item) return;
      const on = isOn(item);
      chip.classList.toggle("on", on);
      chip.setAttribute("aria-pressed", on ? "true" : "false");
      if (item.kind === "height") {
        chip.querySelector(".quick-chip-label").textContent = heightLabel();
        chip.title = "Toca para cambiar la altura de los cerros y montañas (×1 es la altura real)";
      }
      const el = item.kind === "check" || item.kind === "height" ? document.getElementById(item.key) : null;
      chip.classList.toggle("disabled", !!(el && el.disabled));
    });
  }

  // ---------- Area details ----------

  function readBBox() {
    const frame = document.querySelector(".map-container");
    try {
      const hash = frame && frame.contentWindow && frame.contentWindow.location.hash;
      if (!hash) return null;
      const n = hash.replace("#", "").split(",").map(Number);
      if (n.length !== 4 || n.some(function (v) { return !isFinite(v); })) return null;
      if (n[0] === 0 && n[1] === 0 && n[2] === 0 && n[3] === 0) return null;
      return { south: n[0], west: n[1], north: n[2], east: n[3] };
    } catch (e) {
      return null;
    }
  }

  const fmt = function (v, digits) {
    return v.toLocaleString("es-CO", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
  };

  function lengthText(m) {
    return m >= 1000 ? fmt(m / 1000, 2) + " km" : fmt(Math.round(m), 0) + " m";
  }

  // Máximo que aguanta el celular: más que esto se queda sin memoria.
  const MAX_KM2 = 400;
  let lastKm2 = 0;

  /** Bloquea "Generar mundo" si el área pasa del máximo. */
  function updateStartLock(km2) {
    const btn = document.getElementById("start-button");
    if (!btn) return;
    const tooBig = km2 > MAX_KM2;
    btn.classList.toggle("area-locked", tooBig);
    btn.setAttribute("aria-disabled", tooBig ? "true" : "false");
  }

  // Por si otro código vuelve a habilitar el botón: se frena el toque antes de que llegue.
  document.addEventListener("click", function (e) {
    const btn = e.target && e.target.closest ? e.target.closest("#start-button") : null;
    if (btn && lastKm2 > MAX_KM2 && readBBox()) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);

  let lastDetails = "";
  function refreshDetails() {
    const box = document.getElementById("android-area-details");
    if (!box) return;
    const b = readBBox();
    let html;
    if (!b) {
      html = '<span class="area-empty">📐 Selecciona un área en el mapa (o usa ➤ Mi ubicación)</span>';
    } else {
      const R = 6371000, rad = Math.PI / 180;
      const h = Math.abs(R * (b.north - b.south) * rad);
      const w = Math.abs(R * (b.east - b.west) * rad * Math.cos(((b.north + b.south) / 2) * rad));
      const km2 = (w * h) / 1e6;
      const km2Text = km2 < 0.01 ? "< 0,01" : fmt(km2, km2 < 10 ? 2 : 1);
      html =
        '<span class="area-main">📐 <b>' + km2Text + " km²</b></span>" +
        '<span class="area-sub">' + lengthText(w) + " × " + lengthText(h) +
        " · ≈ " + fmt(Math.round(w), 0) + " × " + fmt(Math.round(h), 0) + " bloques</span>";
      lastKm2 = km2;
      if (km2 > MAX_KM2) {
        html += '<span class="area-error">⛔ El máximo es ' + MAX_KM2 + ' km². Te pasaste por ' +
          fmt(km2 - MAX_KM2, km2 - MAX_KM2 < 10 ? 2 : 0) + ' km²: haz el área más pequeña.</span>';
      } else if (km2 > 100) {
        html += '<span class="area-warn">⚠️ Área grande: puede tardar bastante (máximo ' + MAX_KM2 + ' km²).</span>';
      }
    }
    if (html !== lastDetails) {
      box.innerHTML = html;
      lastDetails = html;
    }
    updateStartLock(b ? lastKm2 : 0);
    if (!generating) {
      setPeek(b ? "📐 " + box.querySelector(".area-main b").textContent + " seleccionados · desliza para generar"
                : "Desliza hacia arriba para ver las opciones");
    }
  }

  // ---------- Bottom sheet ----------

  let generating = false;

  function setPeek(text) {
    const el = document.getElementById("sheet-peek-text");
    if (el && el.textContent !== text) el.textContent = text;
  }

  function sheetEl() {
    return document.querySelector(".controls-box");
  }

  // Height of the part that stays visible when the sheet is down (handle + summary).
  function peekHeight() {
    const head = document.getElementById("sheet-head");
    return head ? head.offsetHeight + 8 : 56;
  }

  function maxOffset(sheet) {
    return Math.max(0, sheet.offsetHeight - peekHeight());
  }

  function setCollapsed(collapsed) {
    const sheet = sheetEl();
    if (!sheet) return;
    sheet.classList.toggle("sheet-collapsed", collapsed);
    sheet.style.transform = collapsed ? "translateY(" + maxOffset(sheet) + "px)" : "translateY(0px)";
    const handle = document.getElementById("sheet-head");
    if (handle) handle.setAttribute("aria-expanded", collapsed ? "false" : "true");
  }

  function setupSheet(sheet) {
    let startY = 0, startOffset = 0, lastY = 0, lastT = 0, velocity = 0;
    let tracking = false, dragging = false, justDragged = false, pointerId = null;
    let capturedEarly = false;

    sheet.addEventListener("pointerdown", function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      tracking = true;
      dragging = false;
      pointerId = e.pointerId;
      startY = lastY = e.clientY;
      lastT = performance.now();
      velocity = 0;
      startOffset = sheet.classList.contains("sheet-collapsed") ? maxOffset(sheet) : 0;
      // When the sheet is down only its small top bar is visible, and the finger soon
      // leaves it for the map frame, which would swallow the rest of the gesture.
      // Capture right away; the only control there is the handle, handled below.
      capturedEarly = startOffset > 0;
      if (capturedEarly) {
        try { sheet.setPointerCapture(e.pointerId); } catch (err) { capturedEarly = false; }
      }
    });

    sheet.addEventListener("pointermove", function (e) {
      if (!tracking || e.pointerId !== pointerId) return;
      const dy = e.clientY - startY;
      if (!dragging) {
        if (Math.abs(dy) < 10) return;
        dragging = true;
        sheet.classList.add("sheet-dragging");
        try { sheet.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      }
      const now = performance.now();
      velocity = (e.clientY - lastY) / Math.max(1, now - lastT);
      lastY = e.clientY;
      lastT = now;
      const off = Math.min(maxOffset(sheet), Math.max(0, startOffset + dy));
      sheet.style.transform = "translateY(" + off + "px)";
      e.preventDefault();
    });

    function end(e) {
      if (!tracking || (e && e.pointerId !== pointerId)) return;
      tracking = false;
      if (!dragging) {
        if (capturedEarly) {
          // A tap on the collapsed bar opens the sheet.
          justDragged = true;
          setCollapsed(false);
        }
        return;
      }
      dragging = false;
      justDragged = true;
      sheet.classList.remove("sheet-dragging");
      const m = maxOffset(sheet);
      const current = Math.min(m, Math.max(0, startOffset + (lastY - startY)));
      // A quick flick wins; otherwise go to whichever side is closer.
      let collapse = current > m / 2;
      if (velocity > 0.5) collapse = true;
      if (velocity < -0.5) collapse = false;
      setCollapsed(collapse);
    }
    sheet.addEventListener("pointerup", end);
    sheet.addEventListener("pointercancel", end);

    // A drag must not also press the button it started on.
    sheet.addEventListener("click", function (e) {
      if (justDragged) {
        justDragged = false;
        e.stopPropagation();
        e.preventDefault();
      }
    }, true);

    const head = document.getElementById("sheet-head");
    if (head) {
      head.addEventListener("click", function () {
        setCollapsed(!sheet.classList.contains("sheet-collapsed"));
      });
    }

    // Keep the collapsed position right when the screen size changes.
    window.addEventListener("resize", function () {
      setCollapsed(sheet.classList.contains("sheet-collapsed"));
    });
    setCollapsed(false);
  }

  // ---------- "World ready" notice (over the map, so the panel never grows) ----------

  function showSavedNotice(path) {
    let box = document.getElementById("android-saved");
    if (!box) {
      box = document.createElement("div");
      box.id = "android-saved";
      box.className = "android-saved";
      const mapBox = document.querySelector(".map-box");
      (mapBox || document.body).appendChild(box);
    }
    box.innerHTML = "";
    const close = document.createElement("button");
    close.type = "button";
    close.className = "android-saved-close";
    close.setAttribute("aria-label", "Cerrar");
    close.textContent = "✕";
    close.addEventListener("click", function () { box.style.display = "none"; });
    const title = document.createElement("strong");
    title.textContent = "✅ ¡Mundo listo!";
    const where = document.createElement("span");
    where.textContent = "Guardado en: " + path;
    const hint = document.createElement("span");
    hint.className = "android-saved-hint";
    hint.textContent = /\.mcworld$/i.test(path)
      ? "Abre el archivo .mcworld desde Descargas/Arnis con tu explorador de archivos y elige Minecraft: el mundo se importa solo."
      : "Copia el .zip a la carpeta saves de Minecraft Java en tu PC (o en tu lanzador de Java para Android) y descomprímelo.";
    box.append(close, title, where, hint);
    box.style.display = "flex";
  }

  // ---------- Layout ----------

  function buildLayout() {
    const controls = document.querySelector(".controls-box");
    if (!controls || document.getElementById("android-panel")) return;

    const panel = document.createElement("div");
    panel.id = "android-panel";

    // 1. Java Edition
    // 1. Edition: the original Java / Bedrock buttons, moved here, so main.js keeps
    // handling the choice (and enabling/disabling edition-specific settings).
    const formatRow = document.createElement("div");
    formatRow.className = "android-format";
    [
      ["format-java", "☕", "Java", "PC · 1.21.4+"],
      ["format-bedrock", "🧱", "Bedrock", "Celular · consola · Windows"],
    ].forEach(function (def) {
      const btn = document.getElementById(def[0]);
      if (!btn) return;
      btn.innerHTML =
        '<span class="fmt-icon">' + def[1] + '</span>' +
        '<span class="fmt-text"><b>' + def[2] + '</b><small>' + def[3] + '</small></span>';
      btn.style.display = "";
      btn.addEventListener("click", function () {
        // Some settings only apply to one edition; let main.js update them first.
        setTimeout(refreshChips, 50);
      });
      formatRow.appendChild(btn);
    });

    // 2. Quick settings, with the full settings page as the last tile
    const chips = document.createElement("div");
    chips.className = "quick-chips";
    buildChips(chips);
    const gear = document.querySelector(".settings-button");
    if (gear) {
      gear.classList.add("quick-chip", "android-more");
      const label = document.createElement("span");
      label.className = "quick-chip-label";
      label.textContent = "Más ajustes";
      gear.appendChild(label);
      chips.appendChild(gear);
    }

    // 3. Area details
    const details = document.createElement("div");
    details.id = "android-area-details";
    details.className = "android-area";
    const info = document.getElementById("bbox-selection-info");

    // 4. Progress + 5. Generate button (moved from the original layout)
    const progress = document.querySelector(".progress-section");
    const start = document.querySelector(".start-button-wrap");
    const startLabel = document.querySelector('#start-button [data-localize="start_generation"]');
    if (startLabel) {
      startLabel.removeAttribute("data-localize");
      startLabel.textContent = "⛏️ Generar mundo";
    }

    // Handle at the top of the sheet: drag or tap it. The summary line shows while
    // the sheet is down.
    const head = document.createElement("div");
    head.id = "sheet-head";
    head.className = "sheet-head";
    head.setAttribute("role", "button");
    head.setAttribute("aria-label", "Mostrar u ocultar las opciones");
    head.innerHTML = '<span class="sheet-handle"></span><span id="sheet-peek-text" class="sheet-peek"></span>';

    panel.append(head, formatRow, chips, details);
    if (info) panel.appendChild(info);
    if (progress) panel.appendChild(progress);
    if (start) panel.appendChild(start);

    // The original contents (format buttons, mini preview…) stay in the DOM for main.js,
    // just hidden.
    const original = controls.querySelector(".controls-content");
    if (original) original.classList.add("android-hidden");
    controls.appendChild(panel);

    refreshDetails();
    setupSheet(controls);
  }

  // ---------- Aviso de versión nueva ----------

  const RELEASES = "https://api.github.com/repos/santiagogd2513-cpu/Minecraft-mod/releases?per_page=40";

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, String(v)); } catch (e) { return null; } }

  function checkUpdate() {
    const cur = window.ARNIS_ANDROID_BUILD || 0;
    if (!cur) return;
    const now = Date.now();
    if (now < (+store("upd-later") || 0) || now - (+store("upd-last") || 0) < 3600e3) return;
    fetch(RELEASES, { headers: { Accept: "application/vnd.github+json" } })
      .then(function (r) { return r.json(); })
      .then(function (list) {
        store("upd-last", Date.now());
        let best = null;
        (list || []).forEach(function (r) {
          const m = /^android-(\d+)$/.exec(r.tag_name || "");
          if (!m || r.draft || r.prerelease) return;
          const n = +m[1];
          const a = (r.assets || []).find(function (x) { return x.name === "Arnis-Android.apk"; });
          if (a && (!best || n > best.n)) best = { n: n, url: a.browser_download_url, size: a.size };
        });
        if (best && best.n > cur && String(best.n) !== store("upd-skip")) showUpdate(best, cur);
      })
      .catch(function () { /* sin internet: la próxima vez */ });
  }

  function showUpdate(rel, cur) {
    const back = document.createElement("div");
    back.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:18px";
    const box = document.createElement("div");
    box.style.cssText = "background:#141a26;color:#e6edf7;border:1px solid #2a3550;border-radius:18px;padding:20px;max-width:420px;width:100%;font:15px/1.45 system-ui,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.5)";
    const mb = rel.size ? (rel.size / 1048576).toFixed(0) + " MB" : "";
    box.innerHTML = '<div style="font-size:19px;font-weight:700;margin-bottom:8px">¡Hay una versión nueva!</div>'
      + '<div style="color:#aab4c8">Arnis no oficial #' + rel.n + ' ya está disponible (tienes la #' + cur + ').<br><br>'
      + 'Al tocar <b>Actualizar</b> se descarga con tu navegador' + (mb ? ' (' + mb + ')' : '') + '; cuando termine, ábrelo para instalarlo encima. No se borran tus mundos.<br><br>'
      + '«Ahora no» no vuelve a avisar de esta versión; «Más tarde» te recuerda mañana.</div>'
      + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;flex-wrap:wrap"></div>';
    const row = box.lastChild;
    function btn(text, primary, fn) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = text;
      b.style.cssText = "border:0;border-radius:12px;padding:10px 14px;font:600 14px system-ui,sans-serif;cursor:pointer;"
        + (primary ? "background:linear-gradient(135deg,#6fd36f,#2fb5a3);color:#06140d" : "background:#222b3d;color:#e6edf7");
      b.addEventListener("click", function () { back.remove(); fn(); });
      row.appendChild(b);
    }
    btn("Ahora no", false, function () { store("upd-skip", rel.n); });
    btn("Más tarde", false, function () { store("upd-later", Date.now() + 24 * 3600e3); });
    btn("Actualizar", true, function () {
      try {
        if (window.__TAURI__ && window.__TAURI__.shell && window.__TAURI__.shell.open) window.__TAURI__.shell.open(rel.url);
        else window.open(rel.url, "_blank");
      } catch (e) { window.open(rel.url, "_blank"); }
    });
    back.appendChild(box);
    document.body.appendChild(back);
  }

  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(checkUpdate, 2500);
    buildLayout();

    // main.js restores saved settings during its own start-up; apply the "all on"
    // defaults after that, once, then keep the chips in step with the settings page.
    setTimeout(function () {
      applyDefaultsOnce();
      refreshChips();
    }, 1200);
    document.addEventListener("change", refreshChips, true);
    setInterval(refreshDetails, 600);

    const tauri = window.__TAURI__;
    if (tauri && tauri.event && tauri.event.listen) {
      tauri.event.listen("show-in-folder", function (event) {
        generating = false;
        showSavedNotice(String(event.payload || ""));
      });
      // Hide the notice again when a new generation starts reporting progress.
      tauri.event.listen("progress-update", function (event) {
        const p = event.payload && event.payload.progress;
        if (typeof p === "number" && p >= 0) {
          generating = p < 100;
          setPeek(p < 100 ? "⛏️ Generando mundo… " + Math.round(p) + "%" : "✅ Mundo generado");
        }
        const box = document.getElementById("android-saved");
        if (box && typeof p === "number" && p >= 0 && p < 5) box.style.display = "none";
      });
    }
  });
})();
