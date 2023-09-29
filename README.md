# File Template


A visual studio code extension for creating file from templates automatically.   
一个自动生成文件模板的 VScode 扩展。

![Example](https://raw.githubusercontent.com/RalfZhang/File-Template/master/doc/example.gif)


## How to use  

1. Open a new file by VScode.  
2. `Ctrl + Shift + P`.  
3. Input `Tmpl: Create Template` and press `Enter`. 

## How to setup your infomation

If you don't want to input your name, email and some further information many time each when you create a new file, located the template folder at 
`~/.vscode/extensions/RalfZhang.filetemplate-2.0.0/our/src/tmplStr.js` and edit your personal info.

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
Go to `~/.vscode/extensions/RalfZhang.filetemplate-2.0.0/asset/templates/` and there are some `.tmpl` files. You can edit it as you wish with [ TextMate snippet syntax](https://manual.macromates.com/en/snippets).

2. Add template  
Except the default language types, you can add other language template.  
Here are the steps:  
    > 1 Open `~/.vscode/extensions/RalfZhang.filetemplate-2.0.0/asset/templates/`  
    > 2 Add `${languageIdentifier}.tmpl` file, such as `cpp.tmpl` if you want to add C++ template. You can find language identifier [here](https://code.visualstudio.com/docs/languages/identifiers).  
    > 3 Open a new C++ file, and try `Tmpl: Create Template` command.  

# Link  

- [GitHub](https://github.com/RalfZhang/File-Template)  
- [VS Code Market](https://marketplace.visualstudio.com/items?itemName=RalfZhang.filetemplate)

# License  

MIT