'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const tmplStr = require("./tmplStr");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function setTmpl(languageId) {
    const editor = vscode.window.activeTextEditor;
    tmplStr.getTmpl(languageId).then((data) => {
        editor.insertSnippet(new vscode.SnippetString(data), editor.selection.start);
    }).catch(err => {
        vscode.window.showInformationMessage(err.message);
    });
}
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
        setTmpl(editor.document.languageId);
    });
    context.subscriptions.push(tmplAuto);
    [
        { cmd: 'tmpljavascript', languageId: 'javascript' },
        { cmd: 'tmplhtml', languageId: 'html' },
        { cmd: 'tmplcss', languageId: 'css' },
        { cmd: 'tmplphp', languageId: 'php' },
        { cmd: 'tmplpython', languageId: 'python' },
        { cmd: 'tmplruby', languageId: 'ruby' },
        { cmd: 'tmplxml', languageId: 'xml' },
        { cmd: 'tmplvue', languageId: 'vue' },
    ].forEach(e => {
        let TmplCmd = vscode.commands.registerCommand('extension.' + e.cmd, () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showInformationMessage("Please open a file...");
                return;
            }
            setTmpl(e.languageId);
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