'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as tmplStr from './tmplStr';
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

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
        let str = '';
        switch (editor.document.languageId) {
            case 'javascript':
                str = tmplStr.javascriptTmpl();
                break;
            case 'html':
                str = tmplStr.htmlTmpl();
                break;
            case 'css':
                str = tmplStr.cssTmpl();
                break;
            case 'php':
                str = tmplStr.phpTmpl();
                break;
            case 'python':
                str = tmplStr.pythonTmpl();
                break;
            case 'ruby':
                str = tmplStr.rubyTmpl();
                break;
            case 'xml':
                str = tmplStr.xmlTmpl();
                break;
            default:
                vscode.window.showInformationMessage('暂不支持该类型文件');
                return;
        }
        editor.insertSnippet(new vscode.SnippetString(str), editor.selection.start);
    });

    context.subscriptions.push(tmplAuto);
}

// this method is called when your extension is deactivated
export function deactivate() {
}