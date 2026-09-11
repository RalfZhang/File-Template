'use strict';
import * as vscode from 'vscode';
import * as tmplStr from './tmplStr';
import * as templateStorage from './templateStorage';
import * as path from 'path';

interface CmdInterface {
    cmd: string;
    languageId: string;
}

// The value is the key 3.0.x used for its own first-run notice, kept on purpose: someone
// upgrading from 3.0.x has already been told where their templates live.
const FIRST_RUN_NOTICE_KEY = 'filetemplate.storageNoticeShown';
const SEEDED_DEFAULTS_SWEPT_KEY = 'filetemplate.prunedSeededDefaults';
const LEGACY_IMPORT_DONE_KEY = 'filetemplate.legacyImportDone';
const FOLDER_README_WRITTEN_KEY = 'filetemplate.folderReadmeWritten';

const NO_FOLDER_MESSAGE = "The templates folder isn't available in this session.";

// Returned from `activate` so the integration tests can find the folder under test. Nothing
// else consumes it.
export interface FileTemplateApi {
    userTemplatesDir: string | undefined;
}

export async function activate(context: vscode.ExtensionContext): Promise<FileTemplateApi> {

    // The user's folder holds overrides only and is searched first; the bundled defaults cover
    // everything else. See `templateStorage.ts` for why.
    const bundledTemplatesDir = path.join(context.extensionPath, 'asset', 'templates');
    let searchDirs = [bundledTemplatesDir];
    let userTemplatesDir: string | undefined;

    try {
        userTemplatesDir = templateStorage.getUserTemplatesDir(context.globalStorageUri.fsPath);
        searchDirs = [userTemplatesDir, bundledTemplatesDir];
    } catch (err) {
        console.error('filetemplate: could not set up the user templates folder, falling back to the bundled defaults only.', err);
    }

    let tmplOpenFolder = vscode.commands.registerCommand('extension.tmplOpenFolder', () => {
        if (!userTemplatesDir) {
            vscode.window.showInformationMessage(NO_FOLDER_MESSAGE);
            return;
        }
        vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(userTemplatesDir));
    });
    context.subscriptions.push(tmplOpenFolder);

    let tmplEdit = vscode.commands.registerCommand('extension.tmplEdit', async () => {
        if (!userTemplatesDir) {
            vscode.window.showInformationMessage(NO_FOLDER_MESSAGE);
            return;
        }
        const languageId = await pickLanguageId(userTemplatesDir, bundledTemplatesDir);
        if (!languageId) {
            return;
        }
        try {
            const result = templateStorage.ensureUserTemplate({
                userTemplatesDir,
                bundledTemplatesDir,
                languageId
            });
            const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(result.fsPath));
            await vscode.window.showTextDocument(doc);
            // What makes a language an override is *changing* the file, not opening it — see
            // `reclaimUnchangedTemplates`. Say so, or someone who only wanted a look at the
            // built-in template will assume they are now stuck maintaining it.
            if (result.outcome === 'copied-default') {
                vscode.window.showInformationMessage(
                    `A copy of the built-in "${languageId}" template. Change it and it overrides the built-in one; leave it exactly as it is and it is dropped again, so you keep getting improvements to the built-in one.`);
            } else if (result.outcome === 'created-empty') {
                vscode.window.showInformationMessage(
                    `New empty template for "${languageId}". It is used as soon as you save something in it.`);
            }
        } catch (err: any) {
            vscode.window.showErrorMessage(`File Template: could not open the template file. ${err && err.message ? err.message : err}`);
        }
    });
    context.subscriptions.push(tmplEdit);

    // The editor is passed in rather than re-read from `vscode.window.activeTextEditor`: the
    // caller has already checked that one is open, and by the time the template file has been
    // read the active editor may have changed (or closed).
    function setTmpl(editor: vscode.TextEditor, languageId: string) {
        tmplStr.getTmpl(languageId, searchDirs).then((data: string) => {
            editor.insertSnippet(new vscode.SnippetString(data), editor.selection.start);
        }).catch(err => {
            vscode.window.showInformationMessage(err.message);
        })
    }

    let tmplAuto = vscode.commands.registerCommand('extension.tmpl', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage("Please open a file...");
            return;
        }
        setTmpl(editor, editor.document.languageId);
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
            setTmpl(editor, e.languageId)
        });
        context.subscriptions.push(TmplCmd);
    })

    if (userTemplatesDir) {
        context.subscriptions.push(reclaimUnchangedTemplates(userTemplatesDir, bundledTemplatesDir));
        try {
            await setUpUserTemplatesFolder(context, userTemplatesDir, bundledTemplatesDir);
        } catch (err) {
            console.error('filetemplate: could not prepare the user templates folder.', err);
        }
    }

    return { userTemplatesDir };
}

// A template opened via `Edit or Add a Template` and closed without a single change overrides
// nothing (rule 2 in `templateStorage.ts`). Closing its tab is the moment to drop it: it is the
// first point where the file on disk is the whole story, since nothing is left unsaved in an
// editor, and nothing on screen is disturbed. That is also why the content is read from disk
// rather than from a document — closing after "Don't Save" leaves the file as it was on disk,
// and that is what decides whether it is an override.
//
// The trigger is `tabGroups.onDidChangeTabs` rather than `workspace.onDidCloseTextDocument`:
// the latter fires when VS Code disposes the document model, which it does on its own schedule
// long after — or never for — a closed tab, so the file would sit there for the rest of the
// session.
//
// Only ever the file whose tab closed; the folder-wide sweep is `setUpUserTemplatesFolder`'s
// job, and it skips whatever is open for the same reason.
function reclaimUnchangedTemplates(userTemplatesDir: string, bundledTemplatesDir: string): vscode.Disposable {
    return vscode.window.tabGroups.onDidChangeTabs(e => {
        for (const tab of e.closed) {
            const uri = textTabUri(tab);
            if (!uri || uri.scheme !== 'file' || !isInDir(uri.fsPath, userTemplatesDir)) {
                continue;
            }
            // A split view can hold the same file in another group; only the last tab counts.
            if (isOpenInSomeTab(uri)) {
                continue;
            }
            templateStorage.discardIfNoOpOverride(userTemplatesDir, bundledTemplatesDir, path.basename(uri.fsPath));
        }
    });
}

function textTabUri(tab: vscode.Tab): vscode.Uri | undefined {
    return tab.input instanceof vscode.TabInputText ? tab.input.uri : undefined;
}

function isOpenInSomeTab(uri: vscode.Uri): boolean {
    return vscode.window.tabGroups.all.some(group => group.tabs.some(tab => {
        const other = textTabUri(tab);
        return other !== undefined && other.toString() === uri.toString();
    }));
}

// Windows paths differ only by case all the time; on the other platforms two spellings really
// are two files.
function normalizePath(fsPath: string): string {
    const resolved = path.resolve(fsPath);
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

// Whether `fsPath` sits directly in `dir`.
function isInDir(fsPath: string, dir: string): boolean {
    return normalizePath(path.dirname(fsPath)) === normalizePath(dir);
}

// The files open in a tab right now, for `pruneNoOpOverrides` to leave alone.
function openTextTabPaths(): Set<string> {
    const paths = new Set<string>();
    for (const group of vscode.window.tabGroups.all) {
        for (const tab of group.tabs) {
            const uri = textTabUri(tab);
            if (uri && uri.scheme === 'file') {
                paths.add(normalizePath(uri.fsPath));
            }
        }
    }
    return paths;
}

const OPEN_FOLDER = 'Open Templates Folder';

// Everything that has to happen to the user's folder before the first command runs: drop the
// overrides that override nothing, import anything customized under a version that had no user
// folder at all, and explain the folder to whoever opens it.
async function setUpUserTemplatesFolder(
    context: vscode.ExtensionContext,
    userTemplatesDir: string,
    bundledTemplatesDir: string
) {
    // Runs on every activation, not once: this is the invariant "the folder holds overrides
    // only", not a migration. Activation can happen with editors already open — a window reload
    // or an extension-host restart re-runs it — so anything open is skipped and handled by
    // `reclaimUnchangedTemplates` when its tab closes instead.
    //
    // Only the *first* sweep is worth a message, and it is flagged even when it removed nothing,
    // so routine cleanup later on cannot resurrect a notice about an upgrade this user never made.
    const firstSweep = !context.globalState.get(SEEDED_DEFAULTS_SWEPT_KEY);
    const openPaths = openTextTabPaths();
    const pruned = templateStorage.pruneNoOpOverrides(
        userTemplatesDir,
        bundledTemplatesDir,
        fsPath => openPaths.has(normalizePath(fsPath))
    );
    await context.globalState.update(SEEDED_DEFAULTS_SWEPT_KEY, true);

    // One-time: versions up to 2.0.4 had no user folder at all and were customized by editing
    // the install folder in place. Doing this once rather than on every activation means a
    // template the user later deletes on purpose stays deleted — which is also why the key is
    // awaited rather than left to settle on its own. This whole path can be deleted once 2.0.x
    // upgrades are ancient history.
    let imported: string[] = [];
    if (!context.globalState.get(LEGACY_IMPORT_DONE_KEY)) {
        imported = templateStorage.importCustomizedLegacyTemplates({
            extensionPath: context.extensionPath,
            userTemplatesDir
        });
        await context.globalState.update(LEGACY_IMPORT_DONE_KEY, true);
    }

    // Only record the README as written once it actually is; otherwise one failed write (a full
    // disk, a locked folder) would suppress it forever.
    if (!context.globalState.get(FOLDER_README_WRITTEN_KEY)
        && templateStorage.writeUserFolderReadme(userTemplatesDir)) {
        await context.globalState.update(FOLDER_README_WRITTEN_KEY, true);
    }

    // At most one notice, and never the generic one on top of a specific one.
    const firstRun = !context.globalState.get(FIRST_RUN_NOTICE_KEY);
    await context.globalState.update(FIRST_RUN_NOTICE_KEY, true);

    if (imported.length > 0) {
        vscode.window.showInformationMessage(
            `File Template imported ${imported.length} template(s) you had customized in an older version: ${imported.join(', ')}. They live in ${userTemplatesDir} now, which survives future updates.`,
            OPEN_FOLDER
        ).then(revealFolderIfChosen);
        return;
    }

    if (firstSweep && pruned.length > 0) {
        vscode.window.showInformationMessage(
            'File Template now only stores the templates you actually customize, so improvements to the built-in ones reach you on update. Your customized templates were kept; unchanged copies of the built-in ones were removed.',
            OPEN_FOLDER
        ).then(revealFolderIfChosen);
        return;
    }

    if (firstRun) {
        const editTemplate = 'Edit a Template';
        vscode.window.showInformationMessage(
            'File Template is ready. Run "File Template: Insert Template" in any file, or customize a template — your version overrides the built-in one and is kept across updates.',
            editTemplate
        ).then(choice => {
            if (choice === editTemplate) {
                vscode.commands.executeCommand('extension.tmplEdit');
            }
        });
    }
}

function revealFolderIfChosen(choice: string | undefined) {
    if (choice === OPEN_FOLDER) {
        vscode.commands.executeCommand('extension.tmplOpenFolder');
    }
}

// Lists the languages worth offering: the one being edited right now, the templates the user
// has already written, every language with a built-in default, and an escape hatch for anything
// else.
async function pickLanguageId(userTemplatesDir: string, bundledTemplatesDir: string): Promise<string | undefined> {
    const OTHER = 'Other language...';
    const userLanguageIds = templateStorage.listLanguageIds(userTemplatesDir);
    const bundledLanguageIds = templateStorage.listLanguageIds(bundledTemplatesDir);
    const activeLanguageId = vscode.window.activeTextEditor
        ? vscode.window.activeTextEditor.document.languageId.toLowerCase()
        : undefined;

    const ordered: string[] = [];
    for (const id of [activeLanguageId, ...userLanguageIds, ...bundledLanguageIds]) {
        if (id && !ordered.includes(id)) {
            ordered.push(id);
        }
    }

    const items: vscode.QuickPickItem[] = ordered.map(id => ({
        label: id,
        description: userLanguageIds.includes(id)
            ? 'your template'
            : (bundledLanguageIds.includes(id)
                ? 'built-in default — opens your own editable copy'
                : 'new template'),
        detail: id === activeLanguageId ? 'language of the current file' : undefined
    }));
    items.push({ label: OTHER, description: 'type a VS Code language identifier' });

    const picked = await vscode.window.showQuickPick(items, {
        placeHolder: 'Which language do you want a template for?',
        matchOnDescription: true
    });
    if (!picked) {
        return undefined;
    }
    if (picked.label !== OTHER) {
        return picked.label;
    }

    const typed = await vscode.window.showInputBox({
        prompt: 'VS Code language identifier, e.g. "cpp", "go", "shellscript"',
        // An empty box is not yet wrong, it is just empty; flagging it would greet the user with
        // an error the moment the prompt opens.
        validateInput: value => value.trim() === '' || /^[\w.+#-]+$/.test(value.trim())
            ? undefined
            : 'Enter a single language identifier.'
    });
    return typed ? typed.trim().toLowerCase() : undefined;
}

export function deactivate() {
}
