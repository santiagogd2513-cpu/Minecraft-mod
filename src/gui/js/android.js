// Android adjustments for the Arnis GUI.
//
// Loaded (not deferred) before main.js so it can prepare localStorage before main.js
// reads it. Android is detected from the WebView user agent, which is synchronous.
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

  function showSavedNotice(path) {
    let box = document.getElementById("android-saved");
    if (!box) {
      box = document.createElement("div");
      box.id = "android-saved";
      box.className = "android-saved";
      const progress = document.querySelector(".progress-section");
      (progress || document.body).appendChild(box);
    }
    box.innerHTML = "";
    const title = document.createElement("strong");
    title.textContent = "✅ ¡Mundo listo!";
    const where = document.createElement("span");
    where.textContent = "Guardado en: " + path;
    const hint = document.createElement("span");
    hint.className = "android-saved-hint";
    hint.textContent =
      "Copia el .zip a la carpeta saves de Minecraft Java en tu PC (o en tu lanzador de Java para Android) y descomprímelo.";
    box.append(title, where, hint);
    box.style.display = "flex";
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (typeof window.setWorldFormat === "function") {
      window.setWorldFormat("java");
    }
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
