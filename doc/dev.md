# Start
`npm install -g yo generator-code`
`yo code`
`npm install`
Press `F5` to run.


# Test
`npm run test:unit` — the storage and template-lookup tests, no VS Code needed.
`npm test` — the above plus the tests that need a real VS Code (`test/suite/extension.test.ts`).

`npm test` from a terminal *inside* VS Code fails with `bad option: --no-sandbox`: that terminal
has `ELECTRON_RUN_AS_NODE=1`, which makes the downloaded VS Code start as plain Node. Run
`env -u ELECTRON_RUN_AS_NODE npm test`, or use an external terminal.

# Templates
After changing anything in `asset/templates`, run `npm run hashes` and commit the result — the
extension uses those fingerprints to tell a template you customized apart from an untouched copy
of a default. Entries are never removed.

# Publish
`npm install -g @vscode/vsce`

`npx @vscode/vsce publish --pre-release`
or `npx @vscode/vsce publish`

# Tips
- Change the `publisher` field in `package.json` before you start developing, or uninstall the published extension first.



https://code.visualstudio.com/api/get-started/your-first-extension
