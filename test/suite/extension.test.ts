import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import type { FileTemplateApi } from '../../src/extension';

// These run against a real VS Code, which is the only way to tell whether closing a tab reaches
// the code that reclaims an unchanged template. The unit tests cover the decision of *what* to
// reclaim; what is worth checking here is only the wiring, since the first attempt at it used
// `workspace.onDidCloseTextDocument` — which compiles, type-checks, and never fires for a closed
// tab.
suite('reclaiming templates left unchanged', () => {

    let userTemplatesDir: string;
    let bundledTemplatesDir: string;

    suiteSetup(async () => {
        const extension = vscode.extensions.getExtension<FileTemplateApi>('RalfZhang.filetemplate');
        assert.ok(extension, 'extension not found');
        const api = await extension.activate();
        assert.ok(api.userTemplatesDir, 'no user templates folder in this session');
        userTemplatesDir = api.userTemplatesDir;
        bundledTemplatesDir = path.join(extension.extensionPath, 'asset', 'templates');
    });

    teardown(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        fs.rmSync(path.join(userTemplatesDir, 'css.tmpl'), { force: true });
    });

    // What `Edit or Add a Template` does once a language has been picked. The command itself
    // cannot be driven from here: it opens a QuickPick and waits for a human.
    async function openOwnCopyOf(languageId: string): Promise<string> {
        const fsPath = path.join(userTemplatesDir, languageId + '.tmpl');
        fs.rmSync(fsPath, { force: true });
        fs.copyFileSync(path.join(bundledTemplatesDir, languageId + '.tmpl'), fsPath);
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(fsPath));
        await vscode.window.showTextDocument(doc);
        assert.ok(fs.existsSync(fsPath), 'the copy should exist while it is open');
        return fsPath;
    }

    async function waitUntil(predicate: () => boolean, what: string): Promise<void> {
        const deadline = Date.now() + 5000;
        while (!predicate()) {
            if (Date.now() > deadline) {
                assert.fail(`timed out waiting until ${what}`);
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }

    test('closing it unchanged does not leave an override behind', async () => {
        const fsPath = await openOwnCopyOf('css');

        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

        await waitUntil(() => !fs.existsSync(fsPath), 'the unchanged copy is reclaimed');
    });

    test('closing it after a change keeps it', async () => {
        const fsPath = await openOwnCopyOf('css');
        fs.writeFileSync(fsPath, '/* mine */\n$0', 'utf8');

        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

        // Nothing to wait for, so give the reclaim a chance to run and misbehave.
        await new Promise(resolve => setTimeout(resolve, 500));
        assert.ok(fs.existsSync(fsPath), 'a changed template must survive');
        assert.strictEqual(fs.readFileSync(fsPath, 'utf8'), '/* mine */\n$0');
    });

    test('the template it inserts follows from that', async () => {
        const bundled = fs.readFileSync(path.join(bundledTemplatesDir, 'css.tmpl'), 'utf8');
        const fsPath = await openOwnCopyOf('css');
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        await waitUntil(() => !fs.existsSync(fsPath), 'the unchanged copy is reclaimed');

        const doc = await vscode.workspace.openTextDocument({ language: 'css', content: '' });
        const editor = await vscode.window.showTextDocument(doc);
        await vscode.commands.executeCommand('extension.tmpl');

        await waitUntil(() => editor.document.getText().length > 0, 'the template is inserted');
        // The bundled default, not a stale copy of it: `${date}` is filled in, the rest matches.
        assert.ok(editor.document.getText().startsWith(bundled.split('${')[0]));
    });
});
