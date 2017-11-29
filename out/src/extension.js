'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const tmplStr = require("./tmplStr");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "filetemplate" is now active!');
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let tmplAuto = vscode.commands.registerCommand('extension.tmpl', () => {
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage("Please open a file...");
            return;
        }
        let str = '';
        tmplStr.getTmpl(editor.document.languageId, data => {
            // str = data;
            editor.insertSnippet(new vscode.SnippetString(data), editor.selection.start);
        });
        // vscode.window.showInformationMessage('Don\'t support the file type...');
        // editor.insertSnippet(new vscode.SnippetString(str), editor.selection.start);
    });
    context.subscriptions.push(tmplAuto);
    [
        { cmd: 'tmpljavascript', tmplFunName: 'javascriptTmpl' },
        { cmd: 'tmplhtml', tmplFunName: 'htmlTmpl' },
        { cmd: 'tmplcss', tmplFunName: 'cssTmpl' },
        { cmd: 'tmplphp', tmplFunName: 'phpTmpl' },
        { cmd: 'tmplpython', tmplFunName: 'pythonTmpl' },
        { cmd: 'tmplruby', tmplFunName: 'rubyTmpl' },
        { cmd: 'tmplxml', tmplFunName: 'xmlTmpl' },
        { cmd: 'tmplvue', tmplFunName: 'vueTmpl' },
    ].forEach(e => {
        let TmplCmd = vscode.commands.registerCommand('extension.' + e.cmd, () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showInformationMessage("Please open a file...");
                return;
            }
            tmplStr.getTmpl(editor.document.languageId, data => {
                editor.insertSnippet(new vscode.SnippetString(data), editor.selection.start);
            });
        });
        context.subscriptions.push(TmplCmd);
    });
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map