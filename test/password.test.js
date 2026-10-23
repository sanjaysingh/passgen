const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadPasswordGen() {
  const context = { crypto: globalThis.crypto };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "password.js"), "utf8"), context);
  return context.PasswordGen;
}

const PasswordGen = loadPasswordGen();

test("symbol set stays at the published 25 characters", () => {
  assert.equal(PasswordGen.SETS.symbols.length, 25);
});

test("every include knob starts on", () => {
  assert.equal(PasswordGen.DEFAULTS.lower, true);
  assert.equal(PasswordGen.DEFAULTS.upper, true);
  assert.equal(PasswordGen.DEFAULTS.digits, true);
  assert.equal(PasswordGen.DEFAULTS.symbols, true);
  assert.equal(PasswordGen.DEFAULTS.skipLookalikes, true);
});

test("generated passwords match the requested length and character sets", () => {
  const settings = {
    length: 20,
    lower: true,
    upper: true,
    digits: true,
    symbols: true,
    skipLookalikes: false,
  };
  for (let i = 0; i < 40; i += 1) {
    const result = PasswordGen.generatePassword(settings);
    assert.equal(result.password.length, 20);
    assert.equal(result.poolSize, 87);
    assert.match(result.password, /[a-z]/);
    assert.match(result.password, /[A-Z]/);
    assert.match(result.password, /\d/);
    assert.match(result.password, /[^A-Za-z0-9]/);
  }
});

test("skip lookalikes removes ambiguous characters", () => {
  const result = PasswordGen.generatePassword({
    length: 32,
    lower: true,
    upper: true,
    digits: true,
    symbols: false,
    skipLookalikes: true,
  });
  assert.equal(result.password.length, 32);
  assert.doesNotMatch(result.password, /[0Oo1lI]/);
});

test("digits with lookalikes skipped stay in 2-9", () => {
  const result = PasswordGen.generatePassword({
    length: 12,
    lower: false,
    upper: false,
    digits: true,
    symbols: false,
    skipLookalikes: true,
  });
  assert.match(result.password, /^[2-9]{12}$/);
});

test("an empty character mix cannot be generated", () => {
  assert.equal(
    PasswordGen.generatePassword({
      length: 16,
      lower: false,
      upper: false,
      digits: false,
      symbols: false,
      skipLookalikes: false,
    }),
    null,
  );
});

test("settings are clamped to the supported length", () => {
  const settings = PasswordGen.normalizeSettings({ length: 3, lower: true });
  assert.equal(settings.length, 8);
  assert.equal(PasswordGen.normalizeSettings({ length: 200 }).length, 64);
});

test("strength bands follow the entropy thresholds", () => {
  const strong = PasswordGen.strengthOf("a".repeat(16), 87);
  assert.equal(strong.label, "Excellent");
  assert.equal(strong.bits, 103);
  assert.equal(PasswordGen.strengthOf("", 87).label, "Empty");
  assert.equal(PasswordGen.strengthOf("a".repeat(11), 62).label, "Strong");
});
