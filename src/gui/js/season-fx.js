// Efectos de temporada para páginas web (Nocturna y Arnis): lo mismo que SeasonFx.java.
// season: "navidad", "velitas", "valentin" o "amistad".
//   SeasonFx.sky(season)          nieve que cae o chispitas que suben, por toda la pantalla
//   SeasonFx.card(el, season, r)  borde de nieve con lucecitas, o guirnalda de faroles, arriba de el
//                                 (noPad: no correr el contenido hacia abajo)
var SeasonFx = (function () {
  var D = window.devicePixelRatio || 1;

  function heart(x, cx, cy, s) {
    x.beginPath();
    x.moveTo(cx, cy + s * 0.75);
    x.bezierCurveTo(cx - s * 1.9, cy - s * 0.4, cx - s * 0.9, cy - s * 1.7, cx, cy - s * 0.65);
    x.bezierCurveTo(cx + s * 0.9, cy - s * 1.7, cx + s * 1.9, cy - s * 0.4, cx, cy + s * 0.75);
    x.closePath();
  }
  function star(x, cx, cy, s) {
    x.beginPath();
    for (var k = 0; k < 10; k++) {
      var rr = k % 2 ? s * 0.45 : s, a = -Math.PI / 2 + k * Math.PI / 5;
      if (k) x.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); else x.moveTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a));
    }
    x.closePath();
  }

  function sky(season) {
    var c = document.createElement("canvas");
    c.className = "season-sky";
    c.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2147482000";
    document.body.appendChild(c);
    var x = c.getContext("2d"), P = [], W = 0, H = 0, last = 0;
    var warm = ["#FFD27A", "#FFA63D", "#FF7A1A", "#FFE9A8"];
    var pink = ["#FF4D8D", "#FF7AA8", "#E63946", "#FFB3CC", "#C9184A"];
    var party = ["#FF4D6D", "#FFC23D", "#3DDC84", "#3FB8FF", "#B06BFF", "#FF7AC8", "#FF8A3D"];
    function spawn(p, anywhere) {
      p.x = Math.random() * W;
      p.ph = Math.random() * 6.28;
      if (season === "navidad") {
        p.r = (1.2 + Math.random() * 2.4) * D;
        p.v = (16 + Math.random() * 34) * D * (p.r / (2.4 * D));
        p.y = anywhere ? Math.random() * H : -p.r * 2;
        p.a = (90 + Math.random() * 120) / 255;
      } else if (season === "valentin") {
        p.r = (3.5 + Math.random() * 4) * D;
        p.v = (16 + Math.random() * 22) * D;
        p.y = anywhere ? Math.random() * H : H + p.r * 2;
        p.c = pink[(Math.random() * pink.length) | 0];
      } else if (season === "amistad") {
        p.k = Math.random() < 0.6 ? 0 : Math.random() < 0.6 ? 1 : 2;
        p.r = (p.k === 0 ? 2.5 + Math.random() * 2.5 : 4 + Math.random() * 4) * D;
        p.v = (22 + Math.random() * 36) * D;
        p.y = anywhere ? Math.random() * H : -p.r * 3;
        p.c = party[(Math.random() * party.length) | 0];
      } else {
        p.r = (1 + Math.random() * 1.8) * D;
        p.v = (14 + Math.random() * 26) * D;
        p.y = anywhere ? H - Math.random() * H * 0.6 : H + p.r * 2;
        p.c = warm[(Math.random() * warm.length) | 0];
      }
    }
    function size() {
      W = c.width = innerWidth * D;
      H = c.height = innerHeight * D;
      P = [];
      var n = season === "navidad" ? 46 : season === "valentin" ? 22 : season === "amistad" ? 40 : 30;
      for (var i = 0; i < n; i++) { var p = {}; spawn(p, true); P.push(p); }
    }
    size();
    addEventListener("resize", size);
    (function f(now) {
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0, t = now / 1000;
      last = now;
      x.clearRect(0, 0, W, H);
      if (season === "velitas") {
        var g = x.createLinearGradient(0, H, 0, H - 170 * D);
        g.addColorStop(0, "rgba(255,154,46,.25)");
        g.addColorStop(1, "rgba(255,154,46,0)");
        x.fillStyle = g;
        x.fillRect(0, H - 170 * D, W, 170 * D);
      }
      for (var i = 0; i < P.length; i++) {
        var p = P[i];
        if (season === "navidad") {
          p.y += p.v * dt;
          var sx = p.x + Math.sin(t * 0.9 + p.ph) * 10 * D;
          if (p.y > H + p.r * 2) spawn(p, false);
          x.globalAlpha = p.a;
          x.fillStyle = "#fff";
          x.beginPath(); x.arc(sx, p.y, p.r, 0, 7); x.fill();
          if (p.r > 2.6 * D) { x.globalAlpha = 0.06; x.beginPath(); x.arc(sx, p.y, p.r * 2, 0, 7); x.fill(); }
        } else if (season === "valentin") {
          p.y -= p.v * dt;
          if (p.y < -p.r * 2) spawn(p, false);
          var hx = p.x + Math.sin(t * 1.1 + p.ph) * 14 * D;
          var fade = Math.min(1, Math.max(0, p.y / (H * 0.35)));
          x.save();
          x.translate(hx, p.y); x.rotate(Math.sin(t * 1.3 + p.ph) * 0.25);
          x.globalAlpha = Math.min(0.9, (110 + p.r / D * 8) / 255) * fade;
          x.fillStyle = p.c; heart(x, 0, 0, p.r); x.fill();
          x.restore();
        } else if (season === "amistad") {
          p.y += p.v * dt;
          if (p.y > H + p.r * 3) spawn(p, false);
          var cx2 = p.x + Math.sin(t * 1.4 + p.ph) * 12 * D;
          x.save();
          x.translate(cx2, p.y); x.rotate(((t * 90 + p.ph * 57) % 360) * Math.PI / 180);
          x.globalAlpha = 0.82; x.fillStyle = p.c;
          if (p.k === 0) { x.scale(Math.cos(t * 4 + p.ph), 1); x.fillRect(-p.r, -p.r * 0.45, p.r * 2, p.r * 0.9); }
          else if (p.k === 1) { heart(x, 0, 0, p.r); x.fill(); }
          else { star(x, 0, 0, p.r); x.fill(); }
          x.restore();
        } else {
          p.y -= p.v * dt;
          var ex = p.x + Math.sin(t * 1.6 + p.ph) * 6 * D;
          var life = (H - p.y) / (H * 0.62);
          if (life >= 1 || p.y < 0) { spawn(p, false); continue; }
          var fl = 0.65 + 0.35 * Math.sin(t * 9 + p.ph * 3);
          x.fillStyle = p.c;
          x.globalAlpha = Math.max(0, 0.9 * (1 - life) * fl);
          x.beginPath(); x.arc(ex, p.y, p.r, 0, 7); x.fill();
          x.globalAlpha = Math.max(0, 0.18 * (1 - life) * fl);
          x.beginPath(); x.arc(ex, p.y, p.r * 3, 0, 7); x.fill();
        }
      }
      x.globalAlpha = 1;
      requestAnimationFrame(f);
    })(0);
  }

  function card(el, season, radius, noPad) {
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    if (!noPad) el.style.paddingTop = (parseFloat(getComputedStyle(el).paddingTop) + 20) + "px";
    var c = document.createElement("canvas");
    c.style.cssText = "position:absolute;left:0;top:0;width:100%;height:30px;pointer-events:none;z-index:3;border-radius:"
      + radius + "px " + radius + "px 0 0";
    el.appendChild(c);
    var x = c.getContext("2d"), w = 0, drips = [];
    function size() {
      w = el.clientWidth;
      c.width = w * D;
      c.height = 30 * D;
      var n = Math.max(3, (w / 34) | 0);
      drips = [];
      for (var i = 0; i < n; i++) drips.push([(i + 0.2 + Math.random() * 0.6) * w / n, 2 + Math.random() * 6]);
    }
    size();
    addEventListener("resize", size);
    function sag(px, span, y0, depth) { var u = (px % span) / span; return y0 + depth * 4 * u * (1 - u); }
    function roundClip() {
      x.beginPath();
      x.moveTo(0, 30); x.lineTo(0, radius); x.arcTo(0, 0, radius, 0, radius);
      x.lineTo(w - radius, 0); x.arcTo(w, 0, w, radius, radius); x.lineTo(w, 30); x.closePath();
      x.clip();
    }
    (function f(now) {
      var t = now / 1000;
      x.setTransform(D, 0, 0, D, 0, 0);
      x.clearRect(0, 0, w, 30);
      x.save();
      roundClip();
      if (season === "navidad") christmas(t);
      else if (season === "valentin") hearts(t);
      else if (season === "amistad") bunting(t);
      else velitas(t);
      x.restore();
      requestAnimationFrame(f);
    })(0);

    function christmas(t) {
      var cap = 7, span = Math.max(60, w / Math.max(1, Math.round(w / 80))), y0 = cap + 2, depth = 7;
      x.strokeStyle = "#1E3B22"; x.lineWidth = 1.3;
      x.beginPath(); x.moveTo(0, y0);
      for (var px = 0; px <= w; px += 3) x.lineTo(px, sag(px, span, y0, depth));
      x.stroke();
      var cols = [[255, 59, 78], [53, 224, 122], [255, 210, 63], [76, 180, 255], [255, 122, 217]], i = 0;
      for (var bx = 10; bx < w - 4; bx += 21, i++) {
        var by = sag(bx, span, y0, depth), col = cols[i % cols.length];
        var on = 0.35 + 0.65 * Math.max(0, Math.sin(t * 2.4 + i * 1.7));
        var g = x.createRadialGradient(bx, by + 6, 0, bx, by + 6, 9);
        g.addColorStop(0, "rgba(" + col + "," + (0.47 * on) + ")");
        g.addColorStop(1, "rgba(" + col + ",0)");
        x.fillStyle = g; x.beginPath(); x.arc(bx, by + 6, 9, 0, 7); x.fill();
        x.fillStyle = "#24402A"; x.fillRect(bx - 1.6, by - 0.5, 3.2, 3);
        var k = 0.45 + 0.55 * on;
        x.fillStyle = "rgb(" + Math.round(58 + (col[0] - 58) * k) + "," + Math.round(58 + (col[1] - 58) * k) + "," + Math.round(58 + (col[2] - 58) * k) + ")";
        x.beginPath(); x.ellipse(bx, by + 5.75, 2.4, 3.75, 0, 0, 7); x.fill();
        x.fillStyle = "rgba(255,255,255,.6)"; x.beginPath(); x.arc(bx - 0.8, by + 4.2, 0.8, 0, 7); x.fill();
      }
      var sg = x.createLinearGradient(0, 0, 0, cap + 2);
      sg.addColorStop(0, "#fff"); sg.addColorStop(1, "#D9E8FF");
      x.fillStyle = sg;
      x.beginPath(); x.moveTo(0, 0); x.lineTo(0, cap);
      for (var sx = 0; sx <= w; sx += 4) x.lineTo(sx, cap + Math.sin(sx / 13) * 1.6);
      x.lineTo(w, 0); x.closePath(); x.fill();
      drips.forEach(function (d) {
        x.beginPath();
        if (x.roundRect) x.roundRect(d[0] - 3.2, cap - 3, 6.4, d[1] + 3, 3.2); else x.rect(d[0] - 3.2, cap - 3, 6.4, d[1] + 3);
        x.fill();
      });
      drips.forEach(function (d, k) {
        x.fillStyle = "rgba(255,255,255," + (0.4 + 0.4 * Math.sin(t * 3 + k)) + ")";
        x.beginPath(); x.arc(d[0] + 6, 2.5, 0.9, 0, 7); x.fill();
      });
    }

    function hearts(t) {
      var span = Math.max(60, w / Math.max(1, Math.round(w / 90))), y0 = 2, depth = 6;
      x.strokeStyle = "#B0406A"; x.lineWidth = 1.3;
      x.beginPath(); x.moveTo(0, y0);
      for (var px = 0; px <= w; px += 3) x.lineTo(px, sag(px, span, y0, depth));
      x.stroke();
      var cols = [[255, 45, 85], [255, 122, 168], [230, 57, 70], [255, 179, 204]], i = 0;
      for (var hx = 14; hx < w - 8; hx += 30, i++) {
        var hy = sag(hx, span, y0, depth), col = cols[i % cols.length];
        var ph = (t * 1.2 + i * 0.17) % 1;
        var beat = ph < 0.12 ? Math.sin(ph / 0.12 * Math.PI) : (ph > 0.2 && ph < 0.32 ? 0.7 * Math.sin((ph - 0.2) / 0.12 * Math.PI) : 0);
        var s = 5.2 + 1.2 * beat;
        x.fillStyle = "#8A3A5A"; x.fillRect(hx - 0.5, hy, 1, 4);
        var g = x.createRadialGradient(hx, hy + 10, 0, hx, hy + 10, 12);
        g.addColorStop(0, "rgba(" + col + "," + ((60 + 70 * beat) / 255) + ")"); g.addColorStop(1, "rgba(" + col + ",0)");
        x.fillStyle = g; x.beginPath(); x.arc(hx, hy + 10, 12, 0, 7); x.fill();
        x.fillStyle = "rgb(" + col + ")"; heart(x, hx, hy + 10, s); x.fill();
        x.fillStyle = "rgba(255,255,255,.55)"; x.beginPath(); x.arc(hx - s * 0.55, hy + 10 - s * 0.55, s * 0.22, 0, 7); x.fill();
      }
    }

    function bunting(t) {
      var span = Math.max(60, w / Math.max(1, Math.round(w / 100))), y0 = 2, depth = 7, fw = 7;
      x.strokeStyle = "#E8D7B0"; x.lineWidth = 1.3;
      x.beginPath(); x.moveTo(0, y0);
      for (var px = 0; px <= w; px += 3) x.lineTo(px, sag(px, span, y0, depth));
      x.stroke();
      var cols = ["#FF4D6D", "#FFC23D", "#3DDC84", "#3FB8FF", "#B06BFF", "#FF7AC8"], i = 0;
      for (var bx = 9; bx < w - fw; bx += 19, i++) {
        var ya = sag(bx - fw, span, y0, depth), yb = sag(bx + fw, span, y0, depth);
        var sway = Math.sin(t * 2.2 + i * 0.8) * 3, len = 14 + Math.sin(t * 1.7 + i) * 1.2;
        x.fillStyle = cols[i % cols.length];
        x.beginPath(); x.moveTo(bx - fw, ya); x.lineTo(bx + fw, yb); x.lineTo(bx + sway, (ya + yb) / 2 + len); x.closePath(); x.fill();
        x.fillStyle = "rgba(255,255,255,.8)";
        if (i % 3 === 1) { heart(x, bx + sway * 0.3, (ya + yb) / 2 + len * 0.36, 2.2); x.fill(); }
        else { x.beginPath(); x.arc(bx + sway * 0.3, (ya + yb) / 2 + len * 0.36, 1.4, 0, 7); x.fill(); }
      }
    }

    function velitas(t) {
      var span = Math.max(60, w / Math.max(1, Math.round(w / 90))), y0 = 2, depth = 6;
      x.strokeStyle = "#8A6A3A"; x.lineWidth = 1.3;
      x.beginPath(); x.moveTo(0, y0);
      for (var px = 0; px <= w; px += 3) x.lineTo(px, sag(px, span, y0, depth));
      x.stroke();
      var cols = ["#FF4D4D", "#FFB020", "#3DDC84", "#B06BFF", "#FF7AC8", "#3FB8FF"], i = 0;
      for (var lx = 16; lx < w - 8; lx += 34, i++) {
        var ly = sag(lx, span, y0, depth);
        var swing = Math.sin(t * 1.3 + i * 0.9) * 7 * Math.PI / 180;
        var fl = 0.75 + 0.25 * Math.sin(t * 11 + i * 2.3) * Math.sin(t * 7.3 + i);
        x.save();
        x.translate(lx, ly); x.rotate(swing);
        var g = x.createRadialGradient(0, 9, 0, 0, 9, 14);
        g.addColorStop(0, "rgba(255,210,122," + (0.43 * fl) + ")"); g.addColorStop(1, "rgba(255,210,122,0)");
        x.fillStyle = g; x.beginPath(); x.arc(0, 9, 14, 0, 7); x.fill();
        x.fillStyle = "#6B4A22"; x.fillRect(-0.5, 0, 1, 2);
        x.fillStyle = "#3A2614"; x.fillRect(-3.5, 2, 7, 1.6);
        var lg = x.createRadialGradient(0, 9, 0, 0, 9, 7);
        lg.addColorStop(0, "#FFF0C0"); lg.addColorStop(1, cols[i % cols.length]);
        x.globalAlpha = 0.8 + 0.2 * fl;
        x.fillStyle = lg;
        x.beginPath();
        if (x.roundRect) x.roundRect(-5.5, 3.4, 11, 11.6, 4.5); else x.rect(-5.5, 3.4, 11, 11.6);
        x.fill();
        x.globalAlpha = 1;
        x.fillStyle = "rgba(0,0,0,.2)";
        for (var k = -1; k <= 1; k++) x.fillRect(k * 2.6 - 0.3, 4, 0.6, 10.5);
        x.fillStyle = "#3A2614"; x.fillRect(-3, 14.6, 6, 1.4);
        x.restore();
      }
    }
  }

  return { sky: sky, card: card };
})();
