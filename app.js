(function () {
  "use strict";

  var api = globalThis.PasswordGen;
  var LIMITS = api.LIMITS;

  var passwordEl = document.getElementById("password");
  var copyBtn = document.getElementById("copy");
  var generateBtn = document.getElementById("generate");
  var lengthInput = document.getElementById("length");
  var lengthOutput = document.getElementById("length-value");
  var lengthDec = document.getElementById("length-dec");
  var lengthInc = document.getElementById("length-inc");
  var lookalikes = document.getElementById("lookalikes");
  var notice = document.getElementById("notice");
  var status = document.getElementById("status");
  var meter = document.getElementById("meter");
  var strengthLabel = document.getElementById("strength-label");
  var strengthDetail = document.getElementById("strength-detail");
  var editedFlag = document.getElementById("edited-flag");
  var setInputs = {
    lower: document.getElementById("lower"),
    upper: document.getElementById("upper"),
    digits: document.getElementById("digits"),
    symbols: document.getElementById("symbols"),
  };

  var state = {
    lastGenerated: "",
    poolSize: null,
    edited: false,
  };
  var lengthTimer = 0;
  var copyTimer = 0;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function readSettings() {
    return api.normalizeSettings({
      length: lengthInput.value,
      lower: setInputs.lower.checked,
      upper: setInputs.upper.checked,
      digits: setInputs.digits.checked,
      symbols: setInputs.symbols.checked,
      skipLookalikes: lookalikes.checked,
    });
  }

  function paintSlider() {
    var min = Number(lengthInput.min);
    var max = Number(lengthInput.max);
    var value = Number(lengthInput.value);
    var pct = ((value - min) / (max - min)) * 100;
    lengthInput.style.setProperty("--pct", pct + "%");
  }

  function updateLengthUI(length) {
    var next = api.normalizeSettings({ length: length }).length;
    lengthInput.value = String(next);
    lengthOutput.textContent = String(next);
    lengthDec.disabled = next <= LIMITS.min;
    lengthInc.disabled = next >= LIMITS.max;
    paintSlider();
  }

  function applySettings(settings) {
    var next = api.normalizeSettings(settings);
    updateLengthUI(next.length);
    setInputs.lower.checked = next.lower;
    setInputs.upper.checked = next.upper;
    setInputs.digits.checked = next.digits;
    setInputs.symbols.checked = next.symbols;
    lookalikes.checked = next.skipLookalikes;
  }

  function showNotice(message) {
    notice.hidden = false;
    notice.textContent = message;
  }

  function hideNotice() {
    notice.hidden = true;
    notice.textContent = "";
  }

  function fitPassword() {
    var field = passwordEl.parentNode;
    passwordEl.style.height = "auto";
    passwordEl.style.paddingTop = "0px";
    passwordEl.style.paddingBottom = "0px";
    var content = passwordEl.scrollHeight;
    var styles = getComputedStyle(field);
    var inner = field.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom);
    var max = parseFloat(getComputedStyle(passwordEl).maxHeight);
    if (Number.isFinite(max) && content > max) {
      passwordEl.style.height = max + "px";
      return;
    }
    if (content < inner) {
      var pad = (inner - content) / 2;
      passwordEl.style.height = inner + "px";
      passwordEl.style.paddingTop = pad + "px";
      passwordEl.style.paddingBottom = pad + "px";
      return;
    }
    passwordEl.style.height = content + "px";
  }

  function sizePassword(length) {
    var size = "1.35rem";
    if (length > 42) size = "1.02rem";
    else if (length > 28) size = "1.12rem";
    else if (length > 18) size = "1.22rem";
    passwordEl.style.fontSize = size;
  }

  function renderStrength() {
    var value = passwordEl.value;
    var info = api.strengthOf(value, state.edited ? null : state.poolSize);
    strengthLabel.textContent = info.label;
    strengthLabel.dataset.level = info.level;
    meter.dataset.level = info.level;
    meter.setAttribute("aria-valuenow", String(Math.min(info.bits, 128)));
    meter.setAttribute(
      "aria-valuetext",
      info.length === 0 ? "Empty" : info.label + ", " + info.length + (info.length === 1 ? " character" : " characters")
    );
    if (info.length === 0) {
      strengthDetail.textContent = "";
    } else {
      var unit = info.length === 1 ? "char" : "chars";
      strengthDetail.textContent = " · " + info.length + " " + unit;
    }
    editedFlag.hidden = !state.edited || info.length === 0;
    copyBtn.disabled = info.length === 0;
  }

  function flash() {
    var field = passwordEl.parentNode;
    field.classList.remove("is-fresh");
    if (reduceMotion) return;
    // Restart the animation when generation happens twice in a row.
    void field.offsetWidth;
    field.classList.add("is-fresh");
  }

  function regenerate() {
    window.clearTimeout(lengthTimer);
    var settings = readSettings();
    var result;
    try {
      result = api.generatePassword(settings);
    } catch (error) {
      showNotice("This browser does not support secure random generation.");
      generateBtn.disabled = true;
      return;
    }
    if (!result) {
      showNotice("Choose at least one character set.");
      generateBtn.disabled = true;
      renderStrength();
      return;
    }
    hideNotice();
    generateBtn.disabled = false;
    state.lastGenerated = result.password;
    state.poolSize = result.poolSize;
    state.edited = false;
    sizePassword(Array.from(result.password).length);
    passwordEl.value = result.password;
    fitPassword();
    renderStrength();
    flash();
  }

  function scheduleRegenerate() {
    window.clearTimeout(lengthTimer);
    lengthTimer = window.setTimeout(regenerate, 120);
  }

  function setLength(next, delay) {
    updateLengthUI(next);
    if (delay) scheduleRegenerate();
    else {
      window.clearTimeout(lengthTimer);
      regenerate();
    }
  }

  function fallbackCopy(text) {
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "0";
    area.style.left = "0";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.focus();
    area.select();
    var ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (error) {
      ok = false;
    }
    document.body.removeChild(area);
    return ok;
  }

  function markCopied(ok) {
    window.clearTimeout(copyTimer);
    if (ok) {
      copyBtn.classList.add("is-copied");
      copyBtn.setAttribute("aria-label", "Copied");
      status.textContent = "Password copied";
      copyTimer = window.setTimeout(function () {
        copyBtn.classList.remove("is-copied");
        copyBtn.setAttribute("aria-label", "Copy password");
        status.textContent = "";
      }, 1600);
      return;
    }
    passwordEl.focus();
    passwordEl.select();
    status.textContent = "Password selected. Copy it from the field.";
  }

  function copyPassword() {
    var text = passwordEl.value;
    if (!text) return;
    // Run the legacy copy during the click. The clipboard promise resolves
    // later, after the browser has dropped the user-gesture.
    var legacyOk = fallbackCopy(text);
    if (!navigator.clipboard || !navigator.clipboard.writeText || !window.isSecureContext) {
      markCopied(legacyOk);
      return;
    }
    navigator.clipboard.writeText(text).then(
      function () {
        markCopied(true);
      },
      function () {
        markCopied(legacyOk);
      }
    );
  }

  function onPasswordInput() {
    var cleaned = passwordEl.value.replace(/[\r\n]/g, "");
    if (cleaned !== passwordEl.value) passwordEl.value = cleaned;
    state.edited = cleaned !== state.lastGenerated;
    sizePassword(Array.from(cleaned).length);
    fitPassword();
    renderStrength();
  }

  lengthInput.addEventListener("input", function () {
    setLength(lengthInput.value, true);
  });

  lengthDec.addEventListener("click", function () {
    setLength(Number(lengthInput.value) - 1, false);
  });

  lengthInc.addEventListener("click", function () {
    setLength(Number(lengthInput.value) + 1, false);
  });

  Object.keys(setInputs).forEach(function (name) {
    setInputs[name].addEventListener("change", regenerate);
  });
  lookalikes.addEventListener("change", regenerate);

  generateBtn.addEventListener("click", regenerate);
  copyBtn.addEventListener("click", copyPassword);

  passwordEl.addEventListener("input", onPasswordInput);
  passwordEl.addEventListener("keydown", function (event) {
    if (event.key === "Enter") event.preventDefault();
  });

  applySettings(api.DEFAULTS);
  regenerate();
})();
