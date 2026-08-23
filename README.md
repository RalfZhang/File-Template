# File Template


A Visual Studio Code extension for creating files from templates automatically.
一个自动生成文件模板的 VS Code 扩展。

![Example](https://raw.githubusercontent.com/RalfZhang/File-Template/master/doc/example.gif)


## How to use

1. Open a new file in VS Code.
2. Press `Ctrl + Shift + P`.
3. Type `Tmpl: Create Template` and press `Enter`.

## Default Types

- JavaScript/TypeScript and JSX/TSX
- HTML
- CSS
- PHP
- Python
- Ruby
- XML
- Vue

## More

1. Edit a template
Run `Tmpl: Open Templates Folder` from the Command Palette (`Ctrl+Shift+P`) to open your personal templates folder. It lives outside this extension's install directory, so its contents are not affected when the extension updates. The folder starts out with a copy of every default `.tmpl` file, which you can edit using [TextMate snippet syntax](https://manual.macromates.com/en/snippets).

    > Upgrading from an older version in which you edited files under `~/.vscode/extensions/ralfzhang.filetemplate-<version>/asset/templates/`? The first activation after upgrading tries to copy those files into the new folder automatically. If it can't find them (VS Code may have already removed the old version's files before the update ran), open that old folder yourself if it still exists and copy your `.tmpl` files into the folder opened by `Tmpl: Open Templates Folder`.

2. Add a template
In addition to the default language types, you can add templates for other languages.
Here are the steps:
    > 1 Run `Tmpl: Open Templates Folder` from the Command Palette to open your personal templates folder.
    > 2 Add a `${languageIdentifier}.tmpl` file — for example, `cpp.tmpl` if you want to add a C++ template. You can find the language identifiers [here](https://code.visualstudio.com/docs/languages/identifiers).
    > 3 Open a new C++ file and run the `Tmpl: Create Template` command.

## Links

- [GitHub](https://github.com/RalfZhang/File-Template)
- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=RalfZhang.filetemplate)

## License

MIT
