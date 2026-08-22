# File Template


A visual studio code extension for creating file from templates automatically.   
一个自动生成文件模板的 VScode 扩展。

![Example](https://raw.githubusercontent.com/RalfZhang/File-Template/master/doc/example.gif)


## How to use  

1. Open a new file by VScode.  
2. `Ctrl + Shift + P`.  
3. Input `Tmpl: Create Template` and press `Enter`. 

# Default Types  

- JavaScript
- HTML
- CSS
- PHP
- Python
- Ruby
- XML
- Vue

# More  

1. Edit template  
Run `Tmpl: Open Templates Folder` from the Command Palette (`Ctrl+Shift+P`) to open your personal templates folder. It lives outside this extension's install directory, so its contents are not affected when the extension updates. The folder starts out with a copy of every default `.tmpl` file for you to edit with [ TextMate snippet syntax](https://manual.macromates.com/en/snippets).

    > Upgrading from an older version where you edited files under `~/.vscode/extensions/ralfzhang.filetemplate-<version>/asset/templates/`? The first activation after upgrading tries to copy those files into the new folder automatically. If it can't find them (VS Code may have already removed the old version's files before the update ran), open that old folder yourself if it still exists and copy your `.tmpl` files into the folder opened by `Tmpl: Open Templates Folder`.

2. Add template  
Except the default language types, you can add other language template.  
Here are the steps:  
    > 1 Run `Tmpl: Open Templates Folder` from the Command Palette to open your personal templates folder.  
    > 2 Add `${languageIdentifier}.tmpl` file, such as `cpp.tmpl` if you want to add C++ template. You can find language identifier [here](https://code.visualstudio.com/docs/languages/identifiers).  
    > 3 Open a new C++ file, and try `Tmpl: Create Template` command.  

# Link  

- [GitHub](https://github.com/RalfZhang/File-Template)  
- [VS Code Market](https://marketplace.visualstudio.com/items?itemName=RalfZhang.filetemplate)

# License  

MIT