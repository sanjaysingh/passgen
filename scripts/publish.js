const fs = require("fs");
const path = require("path");

const PLACEHOLDER = "__COMMIT_SHA__";
const SITE_FILES = [
  "index.html",
  "styles.css",
  "app.js",
  "password.js",
  "CNAME",
  ".nojekyll",
];

function publish(root, sha, outDir) {
  if (!/^[0-9a-f]{40}$/i.test(sha)) {
    throw new Error("commit SHA must be 40 hex characters");
  }
  fs.mkdirSync(outDir, { recursive: true });
  for (const name of SITE_FILES) {
    const source = path.join(root, name);
    const destination = path.join(outDir, name);
    if (name === "index.html") {
      const html = fs.readFileSync(source, "utf8");
      const stamps = html.split(PLACEHOLDER).length - 1;
      if (stamps !== 3) {
        throw new Error("index.html must stamp the stylesheet and both scripts");
      }
      fs.writeFileSync(destination, html.replaceAll(PLACEHOLDER, sha));
      continue;
    }
    fs.copyFileSync(source, destination);
  }
}

if (require.main === module) {
  const sha = process.argv[2];
  const outDir = process.argv[3] || path.join(__dirname, "..", "_site");
  publish(path.join(__dirname, ".."), sha, outDir);
}

module.exports = { publish, PLACEHOLDER };
