# File Template

![Version](https://badgen.net/vs-marketplace/v/RalfZhang.filetemplate)
![Installs](https://badgen.net/vs-marketplace/d/RalfZhang.filetemplate)
[![License: MIT](https://img.shields.io/github/license/RalfZhang/File-Template)](https://github.com/RalfZhang/File-Template/blob/master/LICENSE)

A Visual Studio Code extension for creating files from templates automatically.

![Example](https://raw.githubusercontent.com/RalfZhang/File-Template/master/doc/example.gif)


## How to use

1. Open a new file in VS Code.
2. Press `Ctrl + Shift + P` (or `Cmd + Shift + P` on macOS) to open the Command Palette.
3. Type `File Template: Insert Template` and press `Enter`.

## Default Types

- JavaScript/TypeScript and JSX/TSX
- HTML
- CSS
- PHP
- Python
- Ruby
- XML
- Vue

## Your own templates

The templates you customize live in a personal folder, separate from the ones the extension
ships. That folder holds **only** what you change: for every language you have not touched, the
built-in template is used, so improvements to the built-in ones reach you when the extension
updates.

1. **Edit a template**
Run `File Template: Edit or Add a Template` from the Command Palette and pick a language. A copy
of the built-in template opens for editing; change it and your copy is the one that gets
inserted from then on. Leave it exactly as it is and it is dropped again, so you keep getting
improvements to the built-in one. Delete the file at any time to go back to the built-in
template.

2. **Add a language**
The same command lets you pick `Other language...` and type any [VS Code language
identifier](https://code.visualstudio.com/docs/languages/identifiers) — `cpp`, `go`,
`shellscript`, and so on. Open a file of that language and run `File Template: Insert Template`.

3. **Open the folder**
`File Template: Open Templates Folder` reveals it in your file manager. You can add or remove
`<languageId>.tmpl` files there directly. The folder lives outside the extension's install
directory, so nothing in it is lost when the extension updates.

Templates use [TextMate snippet syntax](https://manual.macromates.com/en/snippets), plus
`${date}`, which is replaced with the current date and time.

> **Upgrading from 3.0.x?** Those versions filled your folder with a copy of every built-in
> template, which meant later improvements to them never reached you. On the first run of this
> version, copies you never edited are removed (the identical built-in template is used
> instead); every template you customized is kept.
>
> **Upgrading from 2.0.x?** Those versions had you edit templates inside
> `~/.vscode/extensions/ralfzhang.filetemplate-<version>/`. The first run after upgrading copies
> your customized templates out of there automatically, on a best-effort basis — VS Code may
> already have deleted the old version's folder. If it does not find them and that folder still
> exists, copy your `.tmpl` files into the folder opened by `File Template: Open Templates
> Folder`.

## Links

- [GitHub](https://github.com/RalfZhang/File-Template)
- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=RalfZhang.filetemplate)

## License

MIT
