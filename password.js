(function (root) {
  "use strict";

  var LIMITS = { min: 8, max: 64 };
  var DEFAULTS = {
    length: 16,
    lower: true,
    upper: true,
    digits: true,
    symbols: true,
    skipLookalikes: true,
  };

  var SETS = {
    lower: "abcdefghijklmnopqrstuvwxyz",
    upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    digits: "0123456789",
    symbols: "!@#$%^&*()-_=+[]{};:,.<>?",
  };

  var AMBIGUOUS = /[0Oo1lI]/g;
  var SET_NAMES = ["lower", "upper", "digits", "symbols"];

  function alphabet(name, skipLookalikes) {
    var raw = SETS[name];
    return skipLookalikes ? raw.replace(AMBIGUOUS, "") : raw;
  }

  // Rejection sampling avoids the modulo bias of `random % limit`.
  function randomBelow(limit) {
    if (!root.crypto || typeof root.crypto.getRandomValues !== "function") {
      throw new Error("Web Crypto is unavailable");
    }
    var max = 0x100000000;
    var cutoff = max - (max % limit);
    var buffer = new Uint32Array(1);
    var value = 0;
    do {
      root.crypto.getRandomValues(buffer);
      value = buffer[0];
    } while (value >= cutoff);
    return value % limit;
  }

  function pick(pool) {
    return pool.charAt(randomBelow(pool.length));
  }

  function shuffle(items) {
    var copy = items.slice();
    for (var i = copy.length - 1; i > 0; i -= 1) {
      var j = randomBelow(i + 1);
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function normalizeSettings(input) {
    var source = input || {};
    var length = Number(source.length);
    if (!Number.isFinite(length)) length = DEFAULTS.length;
    length = Math.round(length);
    if (length < LIMITS.min) length = LIMITS.min;
    if (length > LIMITS.max) length = LIMITS.max;
    return {
      length: length,
      lower: Boolean(source.lower),
      upper: Boolean(source.upper),
      digits: Boolean(source.digits),
      symbols: Boolean(source.symbols),
      skipLookalikes: Boolean(source.skipLookalikes),
    };
  }

  function generatePassword(settings) {
    var options = normalizeSettings(settings);
    var pools = [];
    for (var i = 0; i < SET_NAMES.length; i += 1) {
      var name = SET_NAMES[i];
      if (!options[name]) continue;
      var pool = alphabet(name, options.skipLookalikes);
      if (pool.length > 0) pools.push(pool);
    }
    if (pools.length === 0) return null;

    var combined = pools.join("");
    var chars = [];
    var guaranteed = Math.min(pools.length, options.length);
    for (var g = 0; g < guaranteed; g += 1) {
      chars.push(pick(pools[g]));
    }
    while (chars.length < options.length) {
      chars.push(pick(combined));
    }

    var unique = {};
    for (var c = 0; c < combined.length; c += 1) unique[combined.charAt(c)] = true;

    return {
      password: shuffle(chars).join(""),
      poolSize: Object.keys(unique).length,
    };
  }

  function inferredPoolSize(password) {
    var size = 0;
    if (/[a-z]/.test(password)) size += 26;
    if (/[A-Z]/.test(password)) size += 26;
    if (/\d/.test(password)) size += 10;
    var extras = {};
    var extraCount = 0;
    var chars = Array.from(password);
    for (var i = 0; i < chars.length; i += 1) {
      var char = chars[i];
      if (/[^A-Za-z0-9]/.test(char) && !extras[char]) {
        extras[char] = true;
        extraCount += 1;
      }
    }
    if (extraCount > 0) size += Math.max(32, extraCount);
    return size;
  }

  function strengthOf(password, poolSize) {
    var value = password || "";
    var length = Array.from(value).length;
    if (length === 0) {
      return { length: 0, bits: 0, label: "Empty", level: "empty" };
    }
    var size = poolSize == null ? inferredPoolSize(value) : poolSize;
    var bits = size > 1 ? Math.round(length * Math.log(size) / Math.LN2) : 0;
    var label = "Weak";
    var level = "weak";
    if (bits >= 80) {
      label = "Excellent";
      level = "excellent";
    } else if (bits >= 60) {
      label = "Strong";
      level = "strong";
    } else if (bits >= 40) {
      label = "Fair";
      level = "fair";
    }
    return { length: length, bits: bits, label: label, level: level };
  }

  root.PasswordGen = {
    LIMITS: LIMITS,
    DEFAULTS: DEFAULTS,
    SETS: SETS,
    normalizeSettings: normalizeSettings,
    generatePassword: generatePassword,
    strengthOf: strengthOf,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
