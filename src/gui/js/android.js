// Android adjustments for the Arnis GUI.
//
// Loaded (not deferred) before main.js so it can prepare localStorage before main.js
// reads it. Android is detected from the WebView user agent, which is synchronous.
//
// On Android the screen is rebuilt as a fixed, non-scrolling layout:
//
//   ┌──────────────────────────┐
//   │           map            │
//   ├──────────────────────────┤
//   │ ☕ Mundo para Java Edition │
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
    // Java Edition only on this build.
    localStorage.setItem("arnis-world-format", "java");
  } catch (e) {
    console.warn("localStorage unavailable:", e);
  }

  // ---------- Quick settings ----------

  // kind "check": a checkbox in the settings page. kind "mode": the generation-mode
  // select (on = objects + terrain, off = objects only). kind "always": shown for
  // information, the generator always builds it.
  const QUICK = [
    { key: "terrain", icon: "🏔️", label: "Terreno", kind: "mode" },
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

  function isOn(item) {
    if (item.kind === "always") return true;
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
    if (item.kind === "always") return;
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
          setOn(item, !isOn(item));
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
      const el = item.kind === "check" ? document.getElementById(item.key) : null;
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
      if (km2 > 25) html += '<span class="area-warn">⚠️ Área grande: en el celular puede tardar mucho o quedarse sin memoria.</span>';
    }
    if (html !== lastDetails) {
      box.innerHTML = html;
      lastDetails = html;
    }
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
    hint.textContent =
      "Copia el .zip a la carpeta saves de Minecraft Java en tu PC (o en tu lanzador de Java para Android) y descomprímelo.";
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
    const javaRow = document.createElement("div");
    javaRow.className = "android-java";
    javaRow.innerHTML =
      '<span class="android-java-icon">☕</span>' +
      '<span class="android-java-text"><b>Mundo para Java Edition</b><small>Minecraft Java 1.21.4+</small></span>' +
      '<span class="android-java-check">✓</span>';

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

    panel.append(javaRow, chips, details);
    if (info) panel.appendChild(info);
    if (progress) panel.appendChild(progress);
    if (start) panel.appendChild(start);

    // The original contents (format buttons, mini preview…) stay in the DOM for main.js,
    // just hidden.
    const original = controls.querySelector(".controls-content");
    if (original) original.classList.add("android-hidden");
    controls.appendChild(panel);

    refreshDetails();
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (typeof window.setWorldFormat === "function") {
      window.setWorldFormat("java");
    }
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
        showSavedNotice(String(event.payload || ""));
      });
      // Hide the notice again when a new generation starts reporting progress.
      tauri.event.listen("progress-update", function (event) {
        const p = event.payload && event.payload.progress;
        const box = document.getElementById("android-saved");
        if (box && typeof p === "number" && p >= 0 && p < 5) box.style.display = "none";
      });
    }
  });
})();
