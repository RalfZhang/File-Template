'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as tmplStr from './tmplStr';
import * as templateStorage from './templateStorage';
import * as path from 'path';

// This method is called when your extension is activated; that happens the very first time
// one of its commands is executed.

interface CmdInterface {
    cmd: string;
    languageId: string;
}

const STORAGE_NOTICE_SHOWN_KEY = 'filetemplate.storageNoticeShown';

// `globalStorageUri`/`globalStoragePath` were added to the VS Code API after the typings this
// project currently builds against were written; read them dynamically so this keeps compiling
// either way, and fail clearly in the (very unlikely, very old VS Code) case where neither
// exists.
function getGlobalStorageDir(context: vscode.ExtensionContext): string {
    const ctx: any = context;
    const dir = (ctx.globalStorageUri && ctx.globalStorageUri.fsPath) || ctx.globalStoragePath;
    if (!dir) {
        throw new Error('This version of VS Code does not expose a global storage path.');
    }
    return dir;
}

export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "filetemplate" is now active!');

    // Templates used to be read straight out of this extension's own (per-version) install
    // folder. That folder gets replaced on every update, so any template a user edited or
    // added there was silently lost on the next update. The templates that matter now live in
    // a per-user folder that isn't tied to the extension's version; `asset/templates` is kept
    // only as read-only factory defaults, used to seed that folder and as a fallback.
    const bundledTemplatesDir = path.join(context.extensionPath, 'asset', 'templates');
    let searchDirs = [bundledTemplatesDir];
    let userTemplatesDir: string;

    try {
        userTemplatesDir = templateStorage.getUserTemplatesDir(getGlobalStorageDir(context));
        const { migrated } = templateStorage.migrateAndSeed({
            extensionPath: context.extensionPath,
            userTemplatesDir
        });
        searchDirs = [userTemplatesDir, bundledTemplatesDir];

        if (!context.globalState.get(STORAGE_NOTICE_SHOWN_KEY)) {
            context.globalState.update(STORAGE_NOTICE_SHOWN_KEY, true);
            const openFolder = 'Open Templates Folder';
            const message = migrated.length > 0
                ? `File Template moved your customized templates to a folder that survives future updates: ${userTemplatesDir}`
                : `File Template now keeps the templates you edit or add in a folder that survives future updates: ${userTemplatesDir}`;
            vscode.window.showInformationMessage(message, openFolder).then(choice => {
                if (choice === openFolder) {
                    vscode.commands.executeCommand('extension.tmplOpenFolder');
                }
            });
        }
    } catch (err) {
        console.error('filetemplate: could not set up the user templates folder, falling back to the bundled defaults only.', err);
    }

    let tmplOpenFolder = vscode.commands.registerCommand('extension.tmplOpenFolder', () => {
        if (!userTemplatesDir) {
            vscode.window.showInformationMessage("The templates folder isn't available in this session.");
            return;
        }
        vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(userTemplatesDir));
    });
    context.subscriptions.push(tmplOpenFolder);

    function setTmpl(languageId: string) {
        const editor = vscode.window.activeTextEditor;
        tmplStr.getTmpl(languageId, searchDirs).then((data: string) => {
            editor.insertSnippet(new vscode.SnippetString(data), editor.selection.start);
        }).catch(err => {
            vscode.window.showInformationMessage(err.message);
        })
    }

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
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
        { cmd: 'tmpljavascriptreact', languageId: 'javascriptreact' },
        { cmd: 'tmpltypescript', languageId: 'typescript' },
        { cmd: 'tmpltypescriptreact', languageId: 'typescriptreact' },
        { cmd: 'tmplhtml', languageId: 'html' },
        { cmd: 'tmplcss', languageId: 'css' },
        { cmd: 'tmplphp', languageId: 'php' },
        { cmd: 'tmplpython', languageId: 'python' },
        { cmd: 'tmplruby', languageId: 'ruby' },
        { cmd: 'tmplxml', languageId: 'xml' },
        { cmd: 'tmplvue', languageId: 'vue' },
    ].forEach((e: CmdInterface) => {
        let TmplCmd = vscode.commands.registerCommand('extension.' + e.cmd, () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showInformationMessage("Please open a file...");
                return;
            }
            setTmpl(e.languageId)
        });
        context.subscriptions.push(TmplCmd);
    })
}

// This method is called when your extension is deactivated.
export function deactivate() {
}
