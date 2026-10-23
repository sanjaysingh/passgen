# Password Generator

A private password generator that runs entirely in the browser. Nothing is uploaded, and the password is never stored.

**Use it at [https://passgen.sanjaysingh.net](https://passgen.sanjaysingh.net).**

## What you can do

- Set a length from 8 to 64.
- Include lowercase, uppercase, numerals, special characters, and skipping lookalikes (`0`, `O`, `o`, `1`, `l`, `I`). All of these start on.
- Generate a new password, copy it, or edit any character by hand.
- See a strength label. The estimate stays on this device.

Generation uses Web Crypto (`crypto.getRandomValues`) with rejection sampling, so the result does not depend on `Math.random`. At least one character from each enabled set is included when the length allows it. Your settings are saved in `localStorage`. The password is not.

## Run it locally

Open `index.html` in a browser, or serve this folder with any static file server. There is no build step and no runtime dependency.

## Tests

```sh
node --test
```

`test/password.test.js` checks generation, character sets, and strength. `test/site.test.js` publishes a copy of the site, stamps the asset URLs, and requests the page and its files over HTTP. Pull requests run both through GitHub Actions.

## Publishing

Pushes to `main` deploy the site to GitHub Pages. The workflow rewrites `styles.css`, `password.js`, and `app.js` in the published HTML so each URL includes that commit’s SHA. Browsers then fetch the new files without a manual cache bump. The copy in git keeps the `__COMMIT_SHA__` placeholder.

The live site is [https://passgen.sanjaysingh.net](https://passgen.sanjaysingh.net).

## License

[MIT](LICENSE)
