(() => {
  const STORAGE_CUSTOM = "ke_custom_words";
  const STORAGE_SELECTED = "ke_selected_banks";
  const STORAGE_STARS = "ke_stars";
  const STORAGE_SFX = "ke_sfx_on";

  const KEY_LAYOUT = [
    [
      { id: "`", label: "`" },
      { id: "1", label: "1" },
      { id: "2", label: "2" },
      { id: "3", label: "3" },
      { id: "4", label: "4" },
      { id: "5", label: "5" },
      { id: "6", label: "6" },
      { id: "7", label: "7" },
      { id: "8", label: "8" },
      { id: "9", label: "9" },
      { id: "0", label: "0" },
      { id: "-", label: "-" },
      { id: "=", label: "=" },
      { id: "Backspace", label: "⌫", wide: true },
    ],
    [
      { id: "Tab", label: "Tab", wide: true },
      { id: "q", label: "Q" },
      { id: "w", label: "W" },
      { id: "e", label: "E" },
      { id: "r", label: "R" },
      { id: "t", label: "T" },
      { id: "y", label: "Y" },
      { id: "u", label: "U" },
      { id: "i", label: "I" },
      { id: "o", label: "O" },
      { id: "p", label: "P" },
      { id: "[", label: "[" },
      { id: "]", label: "]" },
      { id: "\\", label: "\\" },
    ],
    [
      { id: "CapsLock", label: "Caps", wide: true },
      { id: "a", label: "A" },
      { id: "s", label: "S" },
      { id: "d", label: "D" },
      { id: "f", label: "F" },
      { id: "g", label: "G" },
      { id: "h", label: "H" },
      { id: "j", label: "J" },
      { id: "k", label: "K" },
      { id: "l", label: "L" },
      { id: ";", label: ";" },
      { id: "'", label: "'" },
      { id: "Enter", label: "⏎", wide: true },
    ],
    [
      { id: "Shift", label: "Shift", wide: true },
      { id: "z", label: "Z" },
      { id: "x", label: "X" },
      { id: "c", label: "C" },
      { id: "v", label: "V" },
      { id: "b", label: "B" },
      { id: "n", label: "N" },
      { id: "m", label: "M" },
      { id: ",", label: "," },
      { id: ".", label: "." },
      { id: "/", label: "/" },
      { id: "ShiftRight", label: "Shift", wide: true },
    ],
    [{ id: " ", label: "空格 Space", space: true }],
  ];

  const SETS = {
    letters: "abcdefghijklmnopqrstuvwxyz".split(""),
    home: "asdfjkl;".split(""),
    numbers: "1234567890".split(""),
    all: "abcdefghijklmnopqrstuvwxyz1234567890".split(""),
  };

  const KEY_NAMES = {
    " ": "空格",
    Backspace: "退格",
    Enter: "回车",
    Tab: "Tab",
    Shift: "Shift",
    ShiftRight: "Shift",
    CapsLock: "CapsLock",
  };

  function storageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* 隐私模式或文件页可能禁止本地存储 */
    }
  }

  function storageRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* 同上 */
    }
  }

  function readStars() {
    const n = Number(storageGet(STORAGE_STARS) || 0);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.floor(n);
  }

  const state = {
    screen: "home",
    stars: readStars(),
    kb: { set: "letters", target: "a", score: 0, combo: 0, miss: 0 },
    sp: {
      queue: [],
      index: 0,
      typed: 0,
      score: 0,
      streak: 0,
      word: null,
      done: false,
      advancing: false,
      timer: 0,
    },
    fg: {
      running: false,
      raf: 0,
      lastTs: 0,
      lives: 3,
      crossings: 0,
      score: 0,
      x: 4,
      row: 6,
      hopLock: 0,
      splashUntil: 0,
      difficulty: "easy",
      lanes: [],
      hintPad: null,
      hintToken: null,
    },
    custom: [],
    selected: [],
  };

  const FROG_COLS = 9;
  const FROG_DIFF = {
    easy: {
      speeds: [0.42, 0.55, 0.48, 0.62, 0.5],
      letters: "asdfjklgh".split(""),
    },
    normal: {
      speeds: [0.7, 0.88, 0.76, 0.95, 0.8],
      letters: "qwertyuiopasdfghjklzxcvbnm".split(""),
    },
    hard: {
      speeds: [1.05, 1.25, 1.12, 1.35, 1.18],
      letters: "abcdefghijklmnopqrstuvwxyz".split(""),
    },
  };

  const $ = (id) => document.getElementById(id);

  function allBanks() {
    const defaults = window.DEFAULT_WORD_BANKS || [];
    return [
      ...defaults,
      { id: "custom", name: "自定义", emoji: "⭐", words: state.custom },
    ];
  }

  function loadCustom() {
    try {
      const parsed = JSON.parse(storageGet(STORAGE_CUSTOM) || "[]");
      state.custom = Array.isArray(parsed)
        ? parsed.filter((w) => w && typeof w.en === "string" && w.en.trim())
        : [];
    } catch {
      state.custom = [];
    }
  }

  function loadSelected() {
    try {
      const saved = JSON.parse(storageGet(STORAGE_SELECTED) || "null");
      state.selected = Array.isArray(saved) ? saved : ["animals", "colors", "food"];
    } catch {
      state.selected = ["animals", "colors", "food"];
    }
  }

  function saveSelected() {
    storageSet(STORAGE_SELECTED, JSON.stringify(state.selected));
  }

  function selectedWords() {
    return allBanks()
      .filter((b) => state.selected.includes(b.id))
      .flatMap((b) => b.words.map((w) => ({ ...w, bank: b.name })));
  }

  function showScreen(name) {
    if (state.screen === "frogger" && name !== "frogger") stopFrogger();
    if (name !== "spelling" && window.speechSynthesis) window.speechSynthesis.cancel();
    state.screen = name;
    document.querySelectorAll(".screen").forEach((el) => {
      const on = el.id === name;
      el.classList.toggle("active", on);
      el.hidden = !on;
    });
  }

  function toast(text) {
    const el = $("toast");
    el.textContent = text;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 1800);
  }

  function updateStars() {
    $("totalStars").textContent = `⭐ ${state.stars}`;
    storageSet(STORAGE_STARS, String(state.stars));
  }

  function addStars(n) {
    state.stars += n;
    updateStars();
  }

  let audioCtx = null;
  let sfxOn = true;

  function audio() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function updateSfxButton() {
    const btn = $("sfxToggle");
    if (!btn) return;
    btn.textContent = sfxOn ? "🔊 音效" : "🔇 静音";
    btn.setAttribute("aria-pressed", sfxOn ? "true" : "false");
    btn.classList.toggle("primary", sfxOn);
  }

  function tone(freq, when, dur, type, volume) {
    const ctx = audio();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, when);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0001), when + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(when);
    osc.stop(when + dur + 0.02);
  }

  function playOk() {
    if (!sfxOn) return;
    const ctx = audio();
    if (!ctx) return;
    const t = ctx.currentTime;
    tone(523, t, 0.09, "sine", 0.12);
    tone(784, t + 0.05, 0.12, "sine", 0.09);
  }

  function playBad() {
    if (!sfxOn) return;
    const ctx = audio();
    if (!ctx) return;
    const t = ctx.currentTime;
    tone(220, t, 0.12, "triangle", 0.07);
    tone(165, t + 0.06, 0.14, "triangle", 0.05);
  }

  function playHop() {
    if (!sfxOn) return;
    const ctx = audio();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(760, t + 0.12);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  function playSplash() {
    if (!sfxOn) return;
    const ctx = audio();
    if (!ctx) return;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * 0.28);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(900, t);
    filter.frequency.exponentialRampToValueAtTime(160, t + 0.24);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(t);
    tone(170, t, 0.18, "sine", 0.08);
  }

  function playWin() {
    if (!sfxOn) return;
    const ctx = audio();
    if (!ctx) return;
    const t = ctx.currentTime;
    [523, 659, 784, 1046].forEach((freq, i) => tone(freq, t + i * 0.08, 0.18, "sine", 0.1));
  }

  function playLose() {
    if (!sfxOn) return;
    const ctx = audio();
    if (!ctx) return;
    const t = ctx.currentTime;
    [392, 330, 262].forEach((freq, i) => tone(freq, t + i * 0.11, 0.2, "triangle", 0.07));
  }

  function renderKeyboard(containerId, hintKey) {
    const board = $(containerId);
    board.innerHTML = KEY_LAYOUT.map(
      (row) =>
        `<div class="kb-row">${row
          .map((k) => {
            const classes = ["key"];
            if (k.wide) classes.push("wide");
            if (k.space) classes.push("space");
            if (normalizeKey(hintKey) === normalizeKey(k.id)) classes.push("hint");
            return `<div class="${classes.join(" ")}" data-key="${escapeAttr(
              k.id
            )}">${k.label}</div>`;
          })
          .join("")}</div>`
    ).join("");
  }

  function escapeAttr(s) {
    return String(s).replace(/"/g, "&quot;");
  }

  function normalizeKey(key) {
    if (!key) return "";
    if (key === "ShiftLeft" || key === "ShiftRight") return "Shift";
    return key.length === 1 ? key.toLowerCase() : key;
  }

  function eventKey(e) {
    const code = e.code || "";
    if (code === "Space") return " ";
    if (code === "ShiftLeft" || code === "ShiftRight") return "Shift";
    if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
    if (/^Digit[0-9]$/.test(code)) return code.slice(5);
    if (/^Numpad[0-9]$/.test(code)) return code.slice(6);
    const codeMap = {
      Semicolon: ";",
      Quote: "'",
      Comma: ",",
      Period: ".",
      Slash: "/",
      Backslash: "\\",
      BracketLeft: "[",
      BracketRight: "]",
      Minus: "-",
      Equal: "=",
      Backquote: "`",
      Backspace: "Backspace",
      Enter: "Enter",
      Tab: "Tab",
      ArrowLeft: "ArrowLeft",
      ArrowRight: "ArrowRight",
      ArrowUp: "ArrowUp",
      ArrowDown: "ArrowDown",
    };
    if (codeMap[code]) return codeMap[code];
    if (e.key === " ") return " ";
    if (e.key && e.key.length === 1 && e.key !== "Process") return e.key.toLowerCase();
    return "";
  }

  function flashKey(containerId, key, cls) {
    if (!key) return;
    const board = document.getElementById(containerId);
    if (!board) return;
    const el = [...board.querySelectorAll("[data-key]")].find(
      (node) => node.getAttribute("data-key") === key
    );
    if (!el) return;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 180);
  }

  function pickKbTarget() {
    const pool = SETS[state.kb.set];
    let next = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1) {
      while (next === state.kb.target) {
        next = pool[Math.floor(Math.random() * pool.length)];
      }
    }
    state.kb.target = next;
    const pretty = KEY_NAMES[next] || next.toUpperCase();
    $("kbTarget").textContent = pretty;
    $("kbHint").textContent = next === " " ? "请按下空格键" : `请按下 ${pretty} 键`;
    renderKeyboard("kbBoard", next);
  }

  function startKeyboard() {
    state.kb.score = 0;
    state.kb.combo = 0;
    state.kb.miss = 0;
    updateKbStats();
    $("kbFeedback").className = "feedback";
    $("kbFeedback").textContent = "";
    pickKbTarget();
    showScreen("keyboard");
  }

  function updateKbStats() {
    $("kbScore").textContent = `得分 ${state.kb.score}`;
    $("kbCombo").textContent = `连击 ${state.kb.combo}`;
    $("kbMiss").textContent = `失误 ${state.kb.miss}`;
  }

  function onKeyboardKey(key) {
    if (state.screen !== "keyboard") return;
    const want = normalizeKey(state.kb.target);
    const got = normalizeKey(key);
    if (got === want) {
      state.kb.score += 1 + Math.floor(state.kb.combo / 5);
      state.kb.combo += 1;
      if (state.kb.combo > 0 && state.kb.combo % 5 === 0) {
        addStars(1);
        celebrate("连击奖励 ⭐");
      }
      updateKbStats();
      pickKbTarget();
      $("kbFeedback").className = "feedback ok";
      $("kbFeedback").textContent = randomPraise();
      flashKey("kbBoard", got, "pressed");
      playOk();
    } else if (got.length === 1) {
      state.kb.combo = 0;
      state.kb.miss += 1;
      $("kbFeedback").className = "feedback bad";
      $("kbFeedback").textContent = "再找找黄色的键～";
      flashKey("kbBoard", got, "wrong");
      updateKbStats();
      playBad();
    }
  }

  function randomPraise() {
    return ["太棒了！", "真厉害！", "耶！", "敲对啦！", "继续加油！"][
      Math.floor(Math.random() * 5)
    ];
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function clearSpellTimer() {
    if (state.sp.timer) window.clearTimeout(state.sp.timer);
    state.sp.timer = 0;
    state.sp.advancing = false;
  }

  function startSpelling() {
    clearSpellTimer();
    const words = selectedWords().filter((w) => w && /^[a-zA-Z]+$/.test(w.en || ""));
    if (!words.length) {
      toast("请先在词库里勾选一些单词");
      showScreen("banks");
      renderBanks();
      return;
    }
    state.sp.queue = shuffle(words).slice(0, Math.min(12, words.length));
    state.sp.index = 0;
    state.sp.score = 0;
    state.sp.streak = 0;
    state.sp.done = false;
    loadSpellWord();
    showScreen("spelling");
  }

  function loadSpellWord() {
    const word = state.sp.queue[state.sp.index];
    if (!word) {
      state.sp.word = null;
      $("spFeedback").className = "feedback ok";
      $("spFeedback").textContent = "本组单词都拼完啦，点「换一组」再来";
      $("spRemain").textContent = "剩余 0";
      if (!state.sp.done) {
        state.sp.done = true;
        addStars(3);
        celebrate("本组完成！");
      }
      return;
    }
    state.sp.word = word;
    state.sp.typed = 0;
    $("spMeaning").textContent = `${word.zh || ""} · ${word.bank || ""}`;
    $("spFeedback").className = "feedback";
    $("spFeedback").textContent = "按键盘上的字母开始拼写";
    renderSlots();
    renderKeyboard("spBoard", word.en[0]);
    $("spScore").textContent = `完成 ${state.sp.score}`;
    $("spStreak").textContent = `连对 ${state.sp.streak}`;
    $("spRemain").textContent = `剩余 ${state.sp.queue.length - state.sp.index}`;
    speak(word.en);
  }

  function renderSlots() {
    const word = state.sp.word.en.toLowerCase();
    $("spSlots").innerHTML = word
      .split("")
      .map((ch, i) => {
        const cls = ["letter-slot"];
        if (i < state.sp.typed) cls.push("done");
        if (i === state.sp.typed) cls.push("current");
        const show = i < state.sp.typed ? ch.toUpperCase() : "";
        return `<div class="${cls.join(" ")}">${show}</div>`;
      })
      .join("");
  }

  function speak(text) {
    if (!text || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(String(text));
    u.lang = "en-US";
    u.rate = 0.85;
    window.setTimeout(() => {
      synth.resume();
      synth.speak(u);
    }, 80);
  }

  function onSpellKey(key) {
    if (state.screen !== "spelling" || !state.sp.word || state.sp.done || state.sp.advancing) return;
    const word = state.sp.word.en.toLowerCase();
    if (state.sp.typed >= word.length) return;
    const want = word[state.sp.typed];
    const got = normalizeKey(key);
    if (got.length !== 1) return;
    if (got === want) {
      state.sp.typed += 1;
      flashKey("spBoard", got, "pressed");
      renderSlots();
      if (state.sp.typed >= word.length) {
        state.sp.score += 1;
        state.sp.streak += 1;
        state.sp.advancing = true;
        addStars(1);
        $("spScore").textContent = `完成 ${state.sp.score}`;
        $("spStreak").textContent = `连对 ${state.sp.streak}`;
        $("spFeedback").className = "feedback ok";
        $("spFeedback").textContent = `拼对了！${word.toUpperCase()}`;
        celebrate(word);
        state.sp.timer = window.setTimeout(() => {
          state.sp.timer = 0;
          state.sp.advancing = false;
          state.sp.index += 1;
          loadSpellWord();
        }, 700);
      } else {
        renderKeyboard("spBoard", word[state.sp.typed]);
        $("spFeedback").className = "feedback ok";
        $("spFeedback").textContent = "对了，下一个字母！";
        playOk();
      }
    } else {
      state.sp.streak = 0;
      flashKey("spBoard", got, "wrong");
      renderKeyboard("spBoard", want);
      $("spFeedback").className = "feedback bad";
      $("spFeedback").textContent = `下一个是 ${want.toUpperCase()}，看黄色的键`;
      $("spStreak").textContent = `连对 ${state.sp.streak}`;
      playBad();
    }
  }

  function randomFrogLetter() {
    const pool = FROG_DIFF[state.fg.difficulty].letters;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function buildFrogLanes() {
    const speeds = FROG_DIFF[state.fg.difficulty].speeds;
    const water = (dir, speed, kind) => {
      const pads = [];
      let x = -1;
      while (x < FROG_COLS + 3) {
        const w = kind === "log" ? 1.8 + Math.random() * 0.5 : 1.15;
        pads.push({ x, w, letter: randomFrogLetter() });
        x += w + 1.1 + Math.random() * 1.2;
      }
      return { safe: false, dir, speed, kind, pads };
    };
    state.fg.lanes = [
      { safe: true, dir: 0, speed: 0, kind: "finish", pads: [] },
      water(1, speeds[0], "log"),
      water(-1, speeds[1], "lily"),
      water(1, speeds[2], "log"),
      water(-1, speeds[3], "lily"),
      water(1, speeds[4], "log"),
      { safe: true, dir: 0, speed: 0, kind: "start", pads: [] },
    ];
  }

  function frogOnPad(row, x) {
    const lane = state.fg.lanes[row];
    if (!lane) return false;
    if (lane.safe) return x >= -0.2 && x <= FROG_COLS - 0.4;
    return lane.pads.some((p) => x + 0.4 >= p.x && x + 0.3 <= p.x + p.w);
  }

  function closestPad(row, x) {
    const lane = state.fg.lanes[row];
    if (!lane || lane.safe) return null;
    let best = null;
    let bestDist = 99;
    lane.pads.forEach((p) => {
      const cx = p.x + p.w / 2;
      const dist = Math.abs(cx - (x + 0.45));
      if (dist < bestDist) {
        bestDist = dist;
        best = { pad: p, dist, row, cx };
      }
    });
    return best && best.dist < 1.7 ? best : null;
  }

  function considerHint() {
    if (state.fg.row <= 0) {
      state.fg.hintPad = null;
      return null;
    }
    const next = closestPad(state.fg.row - 1, state.fg.x);
    const prev = state.fg.hintPad;
    const lane = state.fg.lanes[state.fg.row - 1];
    if (prev && lane && !lane.safe && lane.pads.includes(prev)) {
      const cx = prev.x + prev.w / 2;
      const dist = Math.abs(cx - (state.fg.x + 0.45));
      if (dist < 1.7 && (!next || dist <= next.dist + 0.3)) {
        return { pad: prev, dist, row: state.fg.row - 1, cx };
      }
    }
    state.fg.hintPad = next ? next.pad : null;
    return next;
  }

  function updateFrogStats() {
    $("fgCross").textContent = `过河 ${state.fg.crossings}`;
    $("fgScore").textContent = `得分 ${state.fg.score}`;
    $("fgLives").textContent = `生命 ${"🐸".repeat(Math.max(0, state.fg.lives)) || "💤"}`;
  }

  function updateFrogHint(hint, force) {
    let token = "";
    let target = "← →";
    let message = "先用方向键对准荷叶";
    let key = null;
    if (state.fg.row === 1) {
      token = "shore";
      target = "↑";
      message = "按 ↑ 跳上对岸";
    } else if (hint) {
      token = hint.pad.letter;
      target = token.toUpperCase();
      message = "按下这个字母，跳上前面的荷叶";
      key = token;
    }
    if (!force && token === state.fg.hintToken) return;
    state.fg.hintToken = token;
    $("fgTarget").textContent = target;
    $("fgHint").textContent = message;
    renderKeyboard("fgBoard", key);
  }

  function updateFrogHud() {
    updateFrogStats();
    updateFrogHint(considerHint(), true);
  }

  function padMarkup(lane, p, hint) {
    const left = (p.x / FROG_COLS) * 100;
    const width = (p.w / FROG_COLS) * 100;
    const on = hint && hint.pad === p;
    return `<div class="pad ${lane.kind}${on ? " hint" : ""}" style="left:${left}%;width:${width}%">${p.letter.toUpperCase()}</div>`;
  }

  function drawFrog(hint) {
    const world = $("frogWorld");
    if (!world) return;
    const shown = hint === undefined ? considerHint() : hint;
    state.fg.lanes.forEach((lane, i) => {
      if (lane.safe) return;
      const row = world.querySelector(`[data-row="${i}"]`);
      if (!row) return;
      let pads = row.children;
      if (pads.length !== lane.pads.length) {
        row.innerHTML = lane.pads.map((p) => padMarkup(lane, p, shown)).join("");
        pads = row.children;
      }
      lane.pads.forEach((p, idx) => {
        const el = pads[idx];
        if (!el) return;
        el.style.left = `${(p.x / FROG_COLS) * 100}%`;
        const label = p.letter.toUpperCase();
        if (el.textContent !== label) el.textContent = label;
        const on = !!(shown && shown.pad === p);
        if (el.classList.contains("hint") !== on) el.classList.toggle("hint", on);
      });
    });
    const sprite = $("frogSprite");
    if (!sprite) return;
    sprite.style.left = `${(state.fg.x / FROG_COLS) * 100}%`;
    sprite.style.top = `${state.fg.row * 70}px`;
  }

  function buildFrogDom() {
    const hint = considerHint();
    const world = $("frogWorld");
    world.innerHTML =
      state.fg.lanes
        .map((lane, i) => {
          const cls = lane.safe ? (i === 0 ? "finish" : "start") : "water";
          let inner = "";
          if (i === 0) {
            inner = `<div class="pad lily" style="left:8%;width:18%">🏡</div>
                     <div class="pad lily" style="left:41%;width:18%">🌸</div>
                     <div class="pad lily" style="left:74%;width:18%">🏡</div>`;
          } else if (!lane.safe) {
            inner = lane.pads.map((p) => padMarkup(lane, p, hint)).join("");
          }
          return `<div class="frog-row ${cls}" data-row="${i}">${inner}</div>`;
        })
        .join("") +
      `<div class="frog-sprite" id="frogSprite">🐸</div>
       <div class="frog-splash" id="frogSplash" hidden>扑通！落水啦</div>`;
  }

  function showFrogOverlay(show, emoji, title, text, btn) {
    const el = $("frogOverlay");
    el.hidden = !show;
    if (!show) return;
    $("frogOverlayEmoji").textContent = emoji;
    $("frogOverlayTitle").textContent = title;
    $("frogOverlayText").textContent = text;
    $("frogOverlayBtn").textContent = btn || "再玩一次";
  }

  function resetFrogPosition() {
    state.fg.x = 4;
    state.fg.row = 6;
    state.fg.hopLock = 0;
    state.fg.hintPad = null;
    state.fg.hintToken = null;
  }

  function startFrogger() {
    stopFrogger();
    state.fg.lives = 3;
    state.fg.crossings = 0;
    state.fg.score = 0;
    state.fg.splashUntil = 0;
    state.fg.hintPad = null;
    state.fg.hintToken = null;
    buildFrogLanes();
    resetFrogPosition();
    buildFrogDom();
    $("fgFeedback").className = "feedback";
    $("fgFeedback").textContent = "用 ← → 对准，再按黄色字母往前跳，按 ↑ 上岸";
    showFrogOverlay(false);
    $("frogSplash").hidden = true;
    updateFrogHud();
    drawFrog();
    showScreen("frogger");
    state.fg.running = true;
    state.fg.lastTs = 0;
    state.fg.raf = requestAnimationFrame(tickFrog);
  }

  function stopFrogger() {
    state.fg.running = false;
    if (state.fg.raf) cancelAnimationFrame(state.fg.raf);
    state.fg.raf = 0;
  }

  function frogSplash() {
    if (state.fg.splashUntil > performance.now()) return;
    state.fg.lives -= 1;
    state.fg.splashUntil = performance.now() + 700;
    $("frogSplash").hidden = false;
    $("fgFeedback").className = "feedback bad";
    $("fgFeedback").textContent = "扑通！对准荷叶再跳";
    updateFrogHud();
    playSplash();
  }

  function finishSplash() {
    $("frogSplash").hidden = true;
    state.fg.splashUntil = 0;
    if (state.fg.lives <= 0) {
      stopFrogger();
      playLose();
      showFrogOverlay(
        true,
        "💦",
        "小青蛙需要休息一下",
        `这次过河 ${state.fg.crossings} 次，得分 ${state.fg.score}`,
        "再试一次"
      );
      return;
    }
    resetFrogPosition();
    drawFrog();
    updateFrogHud();
  }

  function frogWin() {
    state.fg.crossings += 1;
    state.fg.score += 10;
    addStars(1);
    celebrate("过河成功！");
    $("fgFeedback").className = "feedback ok";
    $("fgFeedback").textContent = "到达对岸啦！再来一次～";
    if (state.fg.crossings >= 5) {
      addStars(3);
      stopFrogger();
      updateFrogStats();
      showFrogOverlay(
        true,
        "🏆",
        "过河小冠军！",
        `连续过河 ${state.fg.crossings} 次，得分 ${state.fg.score}`,
        "再来一轮"
      );
      return;
    }
    resetFrogPosition();
    updateFrogHud();
  }

  function tickFrog(ts) {
    if (!state.fg.running) return;
    const dt = state.fg.lastTs ? Math.min(0.05, (ts - state.fg.lastTs) / 1000) : 0;
    state.fg.lastTs = ts;
    if (state.fg.splashUntil && ts >= state.fg.splashUntil) {
      finishSplash();
      if (!state.fg.running) return;
    }
    const frozen = state.fg.splashUntil > ts || !$("frogOverlay").hidden;
    if (!frozen) {
      state.fg.lanes.forEach((lane) => {
        if (lane.safe) return;
        lane.pads.forEach((p) => {
          p.x += lane.dir * lane.speed * dt;
          if (lane.dir > 0 && p.x > FROG_COLS + 1.5) {
            p.x = -p.w - 0.8;
            p.letter = randomFrogLetter();
          }
          if (lane.dir < 0 && p.x < -p.w - 1.5) {
            p.x = FROG_COLS + 0.8;
            p.letter = randomFrogLetter();
          }
        });
      });
      const lane = state.fg.lanes[state.fg.row];
      if (lane && !lane.safe) {
        state.fg.x += lane.dir * lane.speed * dt;
      }
      const hopping = performance.now() < state.fg.hopLock;
      if (!hopping) {
        if (state.fg.x < -0.6 || state.fg.x > FROG_COLS - 0.2) frogSplash();
        else if (!frogOnPad(state.fg.row, state.fg.x)) frogSplash();
      }
    }
    const hint = considerHint();
    drawFrog(hint);
    updateFrogHint(hint, false);
    if (!state.fg.running) return;
    state.fg.raf = requestAnimationFrame(tickFrog);
  }

  function hopFrogTo(row, x) {
    const sprite = $("frogSprite");
    if (sprite) {
      sprite.classList.add("hop");
      window.setTimeout(() => sprite.classList.remove("hop"), 160);
    }
    state.fg.row = row;
    state.fg.x = x;
    state.fg.hopLock = performance.now() + 180;
    state.fg.hintPad = null;
    state.fg.hintToken = null;
    state.fg.score += 1;
    $("fgFeedback").className = "feedback ok";
    $("fgFeedback").textContent = randomPraise();
    playHop();
    if (row === 0) frogWin();
    else updateFrogHud();
    drawFrog();
  }

  function onFrogKey(key, e) {
    if (state.screen !== "frogger" || !state.fg.running) return;
    const overlay = $("frogOverlay");
    if (overlay && !overlay.hidden) return;
    if (state.fg.splashUntil > performance.now()) return;
    if (performance.now() < state.fg.hopLock) return;

    if (key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowUp" || key === " ") {
      if (e) e.preventDefault();
    }

    const lane = state.fg.lanes[state.fg.row];
    if (!lane) return;

    if (key === "ArrowLeft") {
      const next = state.fg.x - 0.55;
      if (frogOnPad(state.fg.row, next) || lane.safe) {
        state.fg.x = Math.max(-0.1, next);
      }
      return;
    }
    if (key === "ArrowRight") {
      const next = state.fg.x + 0.55;
      if (frogOnPad(state.fg.row, next) || lane.safe) {
        state.fg.x = Math.min(FROG_COLS - 0.7, next);
      }
      return;
    }
    if (key === "ArrowUp" || key === " ") {
      if (state.fg.row === 1) {
        hopFrogTo(0, Math.min(FROG_COLS - 1, Math.max(0, state.fg.x)));
      }
      return;
    }

    const letter = normalizeKey(key);
    if (letter.length !== 1 || !/[a-z]/.test(letter)) return;

    const ahead = considerHint();
    if (ahead && ahead.pad.letter === letter) {
      hopFrogTo(ahead.row, ahead.cx - 0.45);
      flashKey("fgBoard", letter, "pressed");
      return;
    }

    const side = closestPad(state.fg.row, state.fg.x);
    if (!lane.safe && side && side.pad.letter === letter && side.dist > 0.35) {
      hopFrogTo(state.fg.row, side.cx - 0.45);
      flashKey("fgBoard", letter, "pressed");
      return;
    }

    flashKey("fgBoard", letter, "wrong");
    $("fgFeedback").className = "feedback bad";
    $("fgFeedback").textContent = state.fg.row === 1 ? "按 ↑ 跳上对岸" : "看黄色荷叶上的字母再跳～";
    playBad();
  }

  function celebrate(label) {
    const box = $("confetti");
    if (box) {
      for (let i = 0; i < 18; i++) {
        const bit = document.createElement("div");
        bit.textContent = ["⭐", "🎉", "✨", "🌈"][i % 4];
        bit.style.position = "absolute";
        bit.style.left = `${Math.random() * 100}%`;
        bit.style.top = "-20px";
        bit.style.fontSize = `${16 + Math.random() * 18}px`;
        bit.style.transition = "transform 1.1s ease-out, opacity 1.1s";
        box.appendChild(bit);
        requestAnimationFrame(() => {
          bit.style.transform = `translateY(${70 + Math.random() * 40}vh) rotate(${
            Math.random() * 180
          }deg)`;
          bit.style.opacity = "0";
        });
        setTimeout(() => bit.remove(), 1200);
      }
    }
    if (label) toast(label);
    playWin();
  }

  function renderHomeBanks() {
    const banks = allBanks().filter((b) => state.selected.includes(b.id));
    $("homeBanks").innerHTML = banks
      .map((b) => `<span class="chip">${b.emoji} ${b.name} (${b.words.length})</span>`)
      .join("");
    $("homeWordCount").textContent = `已选 ${selectedWords().length} 个单词`;
  }

  function renderBanks() {
    $("bankGrid").innerHTML = allBanks()
      .map((b) => {
        const checked = state.selected.includes(b.id) ? "checked" : "";
        return `<div class="bank-card">
          <label>
            <input type="checkbox" data-bank="${b.id}" ${checked} />
            ${b.emoji} ${b.name}
          </label>
          <p class="help">${b.words.length} 个单词</p>
        </div>`;
      })
      .join("");
    $("customInfo").textContent = `自定义词库目前有 ${state.custom.length} 个单词。`;
  }

  function parseWords(text) {
    const trimmed = text.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      const data = JSON.parse(trimmed);
      const list = Array.isArray(data) ? data : data.words || [];
      return list
        .map((item) =>
          typeof item === "string"
            ? { en: item, zh: "" }
            : { en: item.en || item.word || "", zh: item.zh || item.meaning || "" }
        )
        .filter((w) => w.en);
    }
    return trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/[,，\t]/).map((s) => s.trim());
        return { en: parts[0], zh: parts[1] || "" };
      })
      .filter((w) => w.en);
  }

  function importWords(text) {
    let words;
    try {
      words = parseWords(text);
    } catch {
      toast("导入失败，请检查格式");
      return;
    }
    const cleaned = words
      .map((w) => ({
        en: String(w.en).replace(/[^a-zA-Z]/g, ""),
        zh: String(w.zh || "").slice(0, 20),
      }))
      .filter((w) => w.en);
    if (!cleaned.length) {
      toast("没有识别到有效单词");
      return;
    }
    const seen = new Set(state.custom.map((w) => w.en.toLowerCase()));
    let added = 0;
    cleaned.forEach((w) => {
      const key = w.en.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        state.custom.push({ en: key, zh: w.zh });
        added += 1;
      }
    });
    storageSet(STORAGE_CUSTOM, JSON.stringify(state.custom));
    if (added && !state.selected.includes("custom")) state.selected.push("custom");
    saveSelected();
    renderBanks();
    renderHomeBanks();
    toast(added ? `导入成功，新增 ${added} 个` : "这些单词已经在词库里了");
  }

  function bind() {
    $("sfxToggle").addEventListener("click", () => {
      sfxOn = !sfxOn;
      storageSet(STORAGE_SFX, sfxOn ? "1" : "0");
      updateSfxButton();
      if (sfxOn) playOk();
    });
    window.addEventListener("pointerdown", () => {
      if (sfxOn) audio();
    });
    $("goKeyboard").addEventListener("click", startKeyboard);
    $("goSpelling").addEventListener("click", startSpelling);
    $("goFrogger").addEventListener("click", startFrogger);
    $("fgRestart").addEventListener("click", startFrogger);
    $("frogOverlayBtn").addEventListener("click", startFrogger);
    document.querySelectorAll("[data-fg-diff]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("[data-fg-diff]").forEach((b) => b.classList.remove("primary"));
        btn.classList.add("primary");
        state.fg.difficulty = btn.getAttribute("data-fg-diff");
        startFrogger();
      });
    });
    $("goBanks").addEventListener("click", () => {
      renderBanks();
      showScreen("banks");
    });
    document.querySelectorAll("[data-back]").forEach((btn) => {
      btn.addEventListener("click", () => {
        renderHomeBanks();
        showScreen("home");
      });
    });
    document.querySelectorAll("[data-kb-set]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("[data-kb-set]").forEach((b) => b.classList.remove("primary"));
        btn.classList.add("primary");
        state.kb.set = btn.getAttribute("data-kb-set");
        $("kbFeedback").className = "feedback";
        $("kbFeedback").textContent = "";
        pickKbTarget();
      });
    });
    $("speakWord").addEventListener("click", () => {
      if (state.sp.word) speak(state.sp.word.en);
    });
    $("skipWord").addEventListener("click", () => {
      if (state.sp.done) return;
      clearSpellTimer();
      state.sp.streak = 0;
      state.sp.index += 1;
      loadSpellWord();
    });
    $("nextRound").addEventListener("click", startSpelling);
    $("importBtn").addEventListener("click", () => importWords($("importText").value));
    $("importFile").addEventListener("change", async (e) => {
      const input = e.target;
      const file = input.files && input.files[0];
      input.value = "";
      if (!file) return;
      try {
        const text = await file.text();
        $("importText").value = text;
        importWords(text);
      } catch {
        toast("读取文件失败");
      }
    });
    $("clearCustom").addEventListener("click", () => {
      state.custom = [];
      storageRemove(STORAGE_CUSTOM);
      renderBanks();
      renderHomeBanks();
      toast("自定义词库已清空");
    });
    $("bankGrid").addEventListener("change", (e) => {
      const input = e.target;
      if (!input.matches("input[data-bank]")) return;
      const id = input.getAttribute("data-bank");
      if (input.checked) {
        if (!state.selected.includes(id)) state.selected.push(id);
      } else {
        state.selected = state.selected.filter((x) => x !== id);
      }
      saveSelected();
      renderHomeBanks();
    });
    window.addEventListener("keydown", (e) => {
      const t = e.target;
      if (t && typeof t.matches === "function" && t.matches("textarea, input, select")) return;
      const playing =
        state.screen === "keyboard" || state.screen === "spelling" || state.screen === "frogger";
      if (!playing) return;
      const allowRepeat =
        state.screen === "frogger" && (e.code === "ArrowLeft" || e.code === "ArrowRight");
      if (e.repeat && !allowRepeat) return;
      const code = e.code || "";
      if (
        /^(Key|Digit|Numpad)/.test(code) ||
        [
          "Space",
          "Tab",
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "Semicolon",
          "Quote",
          "Comma",
          "Period",
          "Slash",
          "Backslash",
          "BracketLeft",
          "BracketRight",
          "Minus",
          "Equal",
          "Backquote",
          "Backspace",
        ].includes(code)
      ) {
        e.preventDefault();
      }
      const key = eventKey(e);
      if (!key) return;
      if (state.screen === "keyboard") onKeyboardKey(key);
      if (state.screen === "spelling") onSpellKey(key);
      if (state.screen === "frogger") onFrogKey(key, e);
    });
    document.querySelectorAll(".keyboard").forEach((board) => {
      board.addEventListener("click", (e) => {
        const keyEl = e.target.closest("[data-key]");
        if (!keyEl) return;
        const key = keyEl.getAttribute("data-key");
        if (state.screen === "keyboard") onKeyboardKey(key);
        if (state.screen === "spelling") onSpellKey(key);
        if (state.screen === "frogger") onFrogKey(key, null);
      });
    });
    document.querySelectorAll(".target-letter").forEach((el) => {
      el.addEventListener("click", () => {
        if (state.screen === "keyboard") onKeyboardKey(state.kb.target);
        if (state.screen === "spelling" && state.sp.word) {
          const ch = state.sp.word.en.toLowerCase()[state.sp.typed];
          if (ch) onSpellKey(ch);
        }
        if (state.screen === "frogger") {
          if (state.fg.row === 1) onFrogKey("ArrowUp", null);
          else {
            const hint = considerHint();
            if (hint) onFrogKey(hint.pad.letter, null);
          }
        }
      });
    });
  }

  loadCustom();
  loadSelected();
  sfxOn = storageGet(STORAGE_SFX) !== "0";
  updateSfxButton();
  updateStars();
  renderHomeBanks();
  bind();
})();
