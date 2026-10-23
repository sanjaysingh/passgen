const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { publish, PLACEHOLDER } = require("../scripts/publish");

const root = path.join(__dirname, "..");
const sha = "0123456789abcdef0123456789abcdef01234567";

function start(dir) {
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
  };
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    const file = path.normalize(path.join(dir, decodeURIComponent(url.pathname)));
    if (!file.startsWith(dir)) {
      response.writeHead(403);
      response.end();
      return;
    }
    const target = fs.existsSync(file) && fs.statSync(file).isDirectory()
      ? path.join(file, "index.html")
      : file;
    if (!fs.existsSync(target)) {
      response.writeHead(404);
      response.end();
      return;
    }
    response.writeHead(200, {
      "content-type": types[path.extname(target)] || "application/octet-stream",
    });
    fs.createReadStream(target).pipe(response);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, origin: `http://127.0.0.1:${port}` });
    });
  });
}

test("publishing stamps every asset URL with the commit SHA", async () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "passgen-"));
  publish(root, sha, outDir);
  const html = fs.readFileSync(path.join(outDir, "index.html"), "utf8");
  assert.equal(html.includes(PLACEHOLDER), false);
  assert.equal(html.includes(`styles.css?v=${sha}`), true);
  assert.equal(html.includes(`password.js?v=${sha}`), true);
  assert.equal(html.includes(`app.js?v=${sha}`), true);
  assert.equal(fs.readFileSync(path.join(outDir, "CNAME"), "utf8").trim(), "passgen.sanjaysingh.net");

  const site = await start(outDir);
  try {
    const page = await fetch(`${site.origin}/`);
    assert.equal(page.status, 200);
    const body = await page.text();
    assert.match(body, /<h1>Password Generator<\/h1>/);
    assert.match(body, /id="generate"/);
    assert.match(body, /id="copy"/);
    assert.match(body, /id="password"/);
    assert.match(body, /id="length"/);
    for (const id of ["lower", "upper", "digits", "symbols", "lookalikes"]) {
      assert.match(body, new RegExp(`id="${id}"[^>]*\\schecked`));
    }
    for (const asset of [`styles.css?v=${sha}`, `password.js?v=${sha}`, `app.js?v=${sha}`]) {
      const response = await fetch(`${site.origin}/${asset}`);
      assert.equal(response.status, 200, asset);
      assert.equal((await response.text()).length > 0, true);
    }
  } finally {
    await new Promise((resolve) => site.server.close(resolve));
  }
});

test("settings are not written to or read from storage", () => {
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.equal(app.includes("localStorage.setItem"), false);
  assert.equal(app.includes("localStorage.getItem"), false);
});

test("the source page keeps the placeholder for the deploy workflow", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.equal(html.split(PLACEHOLDER).length - 1, 3);
});

test("publish rejects anything that is not a full commit SHA", () => {
  assert.throws(() => publish(root, "dev", os.tmpdir()), /40 hex/);
});
