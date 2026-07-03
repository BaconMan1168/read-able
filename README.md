# ReadAble

ReadAble is a Manifest V3 Chrome extension that adds accessible reading tools to web pages: OpenDyslexic font, high contrast, font scaling, spacing controls, scoped application modes, and reading aids.

## Development

Install dependencies:

```sh
npm install
```

Run checks:

```sh
npm run lint
npm run build
```

Load the extension locally:

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select the `dist` directory.

## Packaging

Create the Chrome Web Store zip:

```sh
npm run package
```

The package script builds `dist`, removes unused font sources/formats and local metadata, then writes `dist.zip`.

## Chrome Web Store Updates

When code, manifest, or packaged assets change, upload a new zip in the Chrome Web Store Developer Dashboard. The manifest version must be higher than the currently published version.

This extension currently uses the `activeTab`, `scripting`, and `storage` permissions. Adding new permissions later can change the user-facing permission prompt during updates.
