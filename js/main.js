/* Bashar Kabbarah - interactions */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;

  /* ---------- scroll reveals ---------- */
  var ioEls = document.querySelectorAll("[data-io]");
  if (reduced || !("IntersectionObserver" in window)) {
    ioEls.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    ioEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------- email obfuscation: address is never in the DOM as text;
     the mailto href is assembled only when the user interacts ---------- */
  document.querySelectorAll(".email-obf").forEach(function (a) {
    function arm() {
      a.setAttribute("href", "mailto:" + a.getAttribute("data-u") + "@" + a.getAttribute("data-d"));
    }
    a.addEventListener("pointerenter", arm);
    a.addEventListener("focus", arm);
    a.addEventListener("touchstart", arm, { passive: true });
  });

  /* ============================================================
     02 - electronic nose traces
     ============================================================ */
  (function nose() {
    var canvas = document.getElementById("nose-canvas");
    var readout = document.getElementById("nose-read");
    var btn = document.getElementById("nose-btn");
    if (!canvas || !btn) return;

    var ctx = canvas.getContext("2d");
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0;
    var CH = 8;
    var substances = ["PAPRIKA", "ROSEMARY", "CUMIN", "CINNAMON", "NUTMEG"];
    var subIdx = 0;
    var sniff = -1e9; // time of last exposure
    var gains = [], delays = [];
    var histories = [];
    var MAXPTS = 160;

    function resize() {
      W = canvas.clientWidth;
      H = 180;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function newGains() {
      gains = []; delays = [];
      for (var i = 0; i < CH; i++) {
        gains.push(0.35 + Math.random() * 0.65);
        delays.push(Math.random() * 350); // sensors respond at staggered times
      }
    }
    newGains();
    for (var i = 0; i < CH; i++) histories.push([]);

    function response(dt) {
      if (dt < 0) return 0;
      // sharp rise, slow recovery
      return (1 - Math.exp(-dt / 180)) * Math.exp(-dt / 2400);
    }

    var running = false;
    var last = 0;

    function frame(now) {
      if (!running) return;
      if (now - last < 33) { requestAnimationFrame(frame); return; }
      last = now;
      if (W !== canvas.clientWidth) resize();

      var dt = now - sniff;
      for (var c = 0; c < CH; c++) {
        // pixel offset from lane center: small drift at baseline, big swing on exposure
        var base = 2.5 * Math.sin(now * 0.0004 + c * 1.7) + (Math.random() - 0.5) * 1.2;
        var spike = response(dt - delays[c]) * gains[c] * H * 0.42;
        var h = histories[c];
        h.push(base - spike);
        if (h.length > MAXPTS) h.shift();
      }

      ctx.clearRect(0, 0, W, H);
      var lane = H / CH;
      var active = dt > 0 && dt < 3600;
      for (var c2 = 0; c2 < CH; c2++) {
        var h2 = histories[c2];
        var center = c2 * lane + lane * 0.72;
        ctx.beginPath();
        for (var p = 0; p < h2.length; p++) {
          var x = (p / (MAXPTS - 1)) * W;
          var y = Math.max(2, center + h2[p]);
          if (p === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = active
          ? "rgba(43, 73, 199, " + (0.4 + gains[c2] * 0.6) + ")"
          : "rgba(111, 107, 100, 0.45)";
        ctx.lineWidth = active ? 1.4 : 1;
        ctx.stroke();
      }

      // readout state machine
      if (dt > 0 && dt < 900) {
        readout.textContent = "SAMPLING…";
        readout.classList.add("is-active");
      } else if (dt >= 900 && dt < 4600) {
        var conf = (0.88 + gains[0] * 0.09).toFixed(2);
        readout.textContent = substances[subIdx] + " · " + conf;
      } else if (dt >= 4600) {
        readout.textContent = "BASELINE";
        readout.classList.remove("is-active");
      }

      requestAnimationFrame(frame);
    }

    function start() {
      if (running) return;
      running = true;
      resize();
      requestAnimationFrame(frame);
    }
    function stop() { running = false; }

    if ("IntersectionObserver" in window && !reduced) {
      new IntersectionObserver(function (entries) {
        entries[0].isIntersecting ? start() : stop();
      }).observe(canvas);
    } else {
      // static: draw one frame's worth of flat lines
      resize();
      var lane = H / CH;
      for (var c3 = 0; c3 < CH; c3++) {
        ctx.beginPath();
        ctx.moveTo(0, c3 * lane + lane * 0.5);
        ctx.lineTo(canvas.clientWidth, c3 * lane + lane * 0.5);
        ctx.strokeStyle = "rgba(111,107,100,0.45)";
        ctx.stroke();
      }
    }

    btn.addEventListener("click", function () {
      subIdx = (subIdx + Math.floor(1 + Math.random() * (substances.length - 1))) % substances.length;
      newGains();
      sniff = performance.now();
      if (!running && !reduced) start();
    });
  })();

  /* ============================================================
     03 - streaming compile demo
     ============================================================ */
  (function compileDemo() {
    var srcEl = document.getElementById("compile-src");
    var outEl = document.getElementById("compile-out");
    var timerEl = document.getElementById("compile-timer");
    var btn = document.getElementById("compile-btn");
    if (!srcEl || !outEl) return;

    var SRC =
      "\\section{Results}\n" +
      "Touch predicts finger motion\n" +
      "\\textbf{533 ms} ahead of video\n" +
      "(AUC 0.60--0.69).";

    // output blocks: [tag, text or bar-width]
    var BLOCKS = [
      ["h4", "3. Results"],
      ["p", "Touch predicts finger motion 533 ms ahead of video (AUC 0.60-0.69)."],
      ["bar", "82%"],
      ["bar", "58%"],
      ["p", "Rendered in real time, streamed while you type."]
    ];

    function buildOut() {
      outEl.innerHTML = "";
      return BLOCKS.map(function (b) {
        var el = document.createElement(b[0] === "bar" ? "div" : b[0]);
        if (b[0] === "bar") {
          el.className = "bar";
          el.style.width = b[1];
        } else {
          el.textContent = b[1];
        }
        outEl.appendChild(el);
        return el;
      });
    }

    var playing = false;
    function play() {
      if (playing) return;
      playing = true;
      var outs = buildOut();
      srcEl.innerHTML = "";
      timerEl.textContent = "";
      var caret = document.createElement("span");
      caret.className = "caret";
      srcEl.appendChild(caret);

      var i = 0;
      var revealed = 0;

      function typeStep() {
        if (i >= SRC.length) {
          // reveal any remaining blocks
          while (revealed < outs.length) outs[revealed++].classList.add("in");
          timerEl.textContent = "<2s PER UPDATE · ~20× FASTER";
          playing = false;
          return;
        }
        var chunk = SRC.slice(i, i + 1 + Math.floor(Math.random() * 2));
        i += chunk.length;
        caret.before(document.createTextNode(chunk));

        // stream output blocks proportionally to typing progress
        var target = Math.floor((i / SRC.length) * outs.length);
        while (revealed < target) {
          revealed++;
          outs[revealed - 1].classList.add("in");
          timerEl.textContent = "+" + (24 + Math.floor(Math.random() * 30)) + "ms";
        }
        setTimeout(typeStep, reduced ? 0 : 28 + Math.random() * 40);
      }
      typeStep();
    }

    if (reduced) {
      srcEl.textContent = SRC;
      buildOut().forEach(function (el) { el.classList.add("in"); });
      timerEl.textContent = "<2s · ~20× FASTER";
    } else if ("IntersectionObserver" in window) {
      var seen = false;
      new IntersectionObserver(function (entries, obs) {
        if (entries[0].isIntersecting && !seen) {
          seen = true;
          setTimeout(play, 350);
          obs.disconnect();
        }
      }, { threshold: 0.4 }).observe(outEl);
    }

    if (btn) btn.addEventListener("click", play);
  })();

  /* ============================================================
     04 - defect inspection scan
     ============================================================ */
  (function inspect() {
    var svg = document.getElementById("inspect-svg");
    var readout = document.getElementById("inspect-read");
    if (!svg) return;

    var NS = "http://www.w3.org/2000/svg";
    var W = 420, H = 240;

    function el(tag, attrs, parent) {
      var e = document.createElementNS(NS, tag);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      (parent || svg).appendChild(e);
      return e;
    }

    // board artwork: pads + traces (deterministic pseudo-random)
    var s = 42;
    function rand() { s = (s * 16807) % 2147483647; return s / 2147483647; }

    for (var i = 0; i < 14; i++) {
      var y = 20 + rand() * (H - 40);
      el("path", {
        d: "M 0 " + y.toFixed(0) +
           " H " + (60 + rand() * 120).toFixed(0) +
           " l 20 " + ((rand() - 0.5) * 60).toFixed(0) +
           " H " + W,
        stroke: "#DDDAD2", fill: "none", "stroke-width": 2
      });
    }
    for (var j = 0; j < 26; j++) {
      el("circle", {
        cx: (15 + rand() * (W - 30)).toFixed(0),
        cy: (15 + rand() * (H - 30)).toFixed(0),
        r: 4, fill: "#E8E6E0", stroke: "#CFCCC4", "stroke-width": 1
      });
    }
    // IC footprints
    [[60, 50], [250, 140], [330, 40]].forEach(function (p) {
      el("rect", { x: p[0], y: p[1], width: 52, height: 34, rx: 2, fill: "#EFEDE8", stroke: "#CFCCC4" });
    });

    // defects: x, y, w, h, label
    var defects = [
      { x: 132, y: 78, w: 26, h: 18, label: "SCRATCH ·97" },
      { x: 262, y: 152, w: 22, h: 16, label: "VOID ·92" },
      { x: 348, y: 190, w: 24, h: 14, label: "BRIDGE ·95" }
    ];
    defects.forEach(function (d) {
      // faint defect mark
      el("path", {
        d: "M " + (d.x + 4) + " " + (d.y + d.h - 4) +
           " l " + (d.w - 8) + " " + (8 - d.h),
        stroke: "#C4BFB5", "stroke-width": 2, fill: "none"
      });
      d.g = el("g", { opacity: 0, style: "transition: opacity 0.25s ease" });
      el("rect", {
        x: d.x, y: d.y, width: d.w, height: d.h,
        fill: "none", stroke: "#D64545", "stroke-width": 1.5
      }, d.g);
      var t = el("text", {
        x: d.x, y: d.y - 5, fill: "#D64545",
        "font-family": "JetBrains Mono, monospace", "font-size": 8,
        "letter-spacing": "0.5"
      }, d.g);
      t.textContent = d.label;
    });

    var scan = el("line", {
      x1: 0, y1: 0, x2: 0, y2: H,
      stroke: "#2B49C7", "stroke-width": 1, opacity: 0
    });

    var found = 0;
    function setScan(x) {
      scan.setAttribute("x1", x);
      scan.setAttribute("x2", x);
      scan.setAttribute("opacity", 0.7);
      found = 0;
      defects.forEach(function (d) {
        var hit = x >= d.x - 2;
        d.g.setAttribute("opacity", hit ? 1 : 0);
        if (hit) found++;
      });
      readout.textContent = found ? "DEFECTS: " + found + "/3" : "SCANNING";
    }
    function reset() {
      scan.setAttribute("opacity", 0);
      defects.forEach(function (d) { d.g.setAttribute("opacity", 0); });
      readout.textContent = "IDLE";
    }

    if (finePointer) {
      svg.addEventListener("mousemove", function (e) {
        var r = svg.getBoundingClientRect();
        setScan(((e.clientX - r.left) / r.width) * W);
      });
      svg.addEventListener("mouseleave", reset);
    }

    // auto-scan for touch devices (and as an attract loop before first hover)
    if (!finePointer && !reduced) {
      var x = 0;
      setInterval(function () {
        x = (x + 4) % (W + 60);
        setScan(Math.min(x, W));
        if (x > W + 40) reset();
      }, 50);
    }
    if (reduced) {
      setScan(W); // show all detections statically
    }
  })();
})();
