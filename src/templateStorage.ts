'use strict';
// Where the templates a user edits or adds live, and how they relate to the defaults this
// extension ships.
//
// Two rules drive everything in here:
//
// 1. User templates must not live inside this extension's own install directory. VS Code
//    installs every update into a brand-new `<publisher>.<name>-<version>` folder and
//    eventually removes the old one, which silently wipes out anything the user changed there.
//    They live in a version-independent folder instead (see `extension.ts`).
// 2. The user's folder holds *overrides only* — never a copy of a default the user did not ask
//    for. `asset/templates` stays the source of truth for anything the user has not overridden,
//    so improvements to the defaults reach existing users on update; a copy that overrides
//    nothing would shadow those improvements forever. `pruneNoOpOverrides` enforces this
//    continuously, so such a copy cannot accumulate no matter how it got there.
//
// Nothing here imports `vscode`, so all of it is testable without one.

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { SHIPPED_DEFAULT_HASHES } from './defaultTemplateHashes';

const TMPL_EXT = '.tmpl';

function isTmplFile(name: string): boolean {
    return name.length > TMPL_EXT.length && name.toLowerCase().endsWith(TMPL_EXT);
}

function safeReaddir(dir: string): string[] {
    try {
        return fs.readdirSync(dir);
    } catch (err) {
        return [];
    }
}

function isDirectory(fsPath: string): boolean {
    try {
        return fs.statSync(fsPath).isDirectory();
    } catch (err) {
        return false;
    }
}

function safeReadFile(fsPath: string): string | undefined {
    try {
        const stat = fs.statSync(fsPath);
        if (!stat.isFile()) {
            return undefined;
        }
        return fs.readFileSync(fsPath, 'utf8');
    } catch (err) {
        return undefined;
    }
}

export function getUserTemplatesDir(globalStorageDir: string): string {
    const dir = path.join(globalStorageDir, 'templates');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

// `getTmpl` looks up `${languageId}.tmpl` in all-lowercase, so every file this module writes gets
// a lowercased name. Without that, a file named `CPP.TMPL` would never be found on a
// case-sensitive filesystem (Linux); macOS/Windows would hide the bug because their default
// filesystems treat the two spellings as the same path.
export function templateFileName(languageId: string): string {
    return languageId.toLowerCase() + TMPL_EXT;
}

// Content fingerprint used to recognize an untouched copy of a default. Line endings are
// normalized first so a copy whose CRLFs were rewritten in transit still matches. Must stay in
// step with `scripts/update-default-hashes.js`.
export function fingerprint(content: string): string {
    return crypto.createHash('sha256').update(content.replace(/\r/g, ''), 'utf8').digest('hex');
}

// True when `content` is one of the defaults this extension has ever shipped under `fileName`,
// ignoring line endings — i.e. the user has a copy of a default rather than a template of their
// own.
export function isShippedDefaultContent(fileName: string, content: string): boolean {
    const hashes = SHIPPED_DEFAULT_HASHES[fileName.toLowerCase()];
    return hashes !== undefined && hashes.includes(fingerprint(content));
}

// The language ids a templates folder covers, e.g. `['css', 'html', ...]`.
export function listLanguageIds(templatesDir: string): string[] {
    return safeReaddir(templatesDir)
        .filter(isTmplFile)
        .map(name => name.slice(0, -TMPL_EXT.length).toLowerCase())
        .sort();
}

// True when a file in the user's folder overrides nothing, so deleting it cannot change what
// gets inserted.
function isNoOpOverride(fileName: string, content: string, bundledTemplatesDir: string): boolean {
    // An empty file inserts nothing, and `getTmpl` skips it anyway.
    if (content.trim() === '') {
        return true;
    }
    // A copy of a default only overrides something if that default is still bundled; for a
    // language nothing ships a template for, the user's file is the only source there is.
    return safeReadFile(path.join(bundledTemplatesDir, fileName.toLowerCase())) !== undefined
        && isShippedDefaultContent(fileName, content);
}

// Removes `fileName` from the user's folder if it overrides nothing (rule 2 above): an empty
// file, or a copy of a default this extension has shipped at some point. A file that differs by
// even one character is the user's own template and is always kept. Returns true when the file
// was removed.
export function discardIfNoOpOverride(userTemplatesDir: string, bundledTemplatesDir: string, fileName: string): boolean {
    if (!isTmplFile(fileName)) {
        return false;
    }
    const userPath = path.join(userTemplatesDir, fileName);
    const content = safeReadFile(userPath);
    if (content === undefined || !isNoOpOverride(fileName, content, bundledTemplatesDir)) {
        return false;
    }
    try {
        fs.unlinkSync(userPath);
        return true;
    } catch (err) {
        // Best effort: leaving the file in place only means this user keeps the old default.
        return false;
    }
}

// The same check across the whole folder. Returns the names removed.
//
// `isOpenForEditing` must report the files the user has open right now. What is on disk does not
// say whether one of those overrides anything — the edits that make it an override may still be
// unsaved in the editor — so they are skipped and looked at again once their tab closes (see
// `reclaimUnchangedTemplates` in `extension.ts`).
export function pruneNoOpOverrides(
    userTemplatesDir: string,
    bundledTemplatesDir: string,
    isOpenForEditing: (fsPath: string) => boolean = () => false
): string[] {
    return safeReaddir(userTemplatesDir)
        .filter(name => !isOpenForEditing(path.join(userTemplatesDir, name)))
        .filter(name => discardIfNoOpOverride(userTemplatesDir, bundledTemplatesDir, name))
        .map(name => name.toLowerCase());
}

// Turns the trailing "x.y.z" of a `<prefix>x.y.z` extension folder name into a comparable key;
// unparsable segments sort last.
function versionKey(version: string): number[] {
    return version.split(/[.-]/).map(part => {
        const n = parseInt(part, 10);
        return isNaN(n) ? -1 : n;
    });
}

function compareVersionsDescending(a: string, b: string): number {
    const av = versionKey(a);
    const bv = versionKey(b);
    const len = Math.max(av.length, bv.length);
    for (let i = 0; i < len; i++) {
        const diff = (bv[i] ?? 0) - (av[i] ?? 0);
        if (diff !== 0) {
            return diff;
        }
    }
    return 0;
}

// Finds every templates folder left behind by other installed copies of this same extension
// (e.g. `~/.vscode/extensions/ralfzhang.filetemplate-2.0.4/asset/templates`), newest version
// first. Every version is scanned, not just the ones that predate the user folder: a newer
// version's folder holds nothing but its own pristine defaults, which the caller drops on sight.
//
// Best effort only: VS Code removes old-version folders on its own schedule, so by the time a
// new version first activates, an old version's folder may already be gone. There is no API to
// detect or prevent that ahead of time.
export function findLegacyTemplateDirs(extensionPath: string): string[] {
    const extensionsRoot = path.dirname(extensionPath);
    const currentDirName = path.basename(extensionPath);

    let pkg: { publisher?: string; name?: string };
    try {
        pkg = JSON.parse(safeReadFile(path.join(extensionPath, 'package.json')) ?? '');
    } catch (err) {
        return [];
    }
    if (!pkg.publisher || !pkg.name) {
        return [];
    }
    const prefix = (pkg.publisher + '.' + pkg.name + '-').toLowerCase();
    const currentDirNameLower = currentDirName.toLowerCase();

    const candidateNames = safeReaddir(extensionsRoot)
        .filter(name => name.toLowerCase() !== currentDirNameLower && name.toLowerCase().startsWith(prefix))
        .filter(name => isDirectory(path.join(extensionsRoot, name)))
        .sort((a, b) => compareVersionsDescending(a.slice(prefix.length), b.slice(prefix.length)));

    const dirs: string[] = [];
    for (const name of candidateNames) {
        const base = path.join(extensionsRoot, name);
        dirs.push(path.join(base, 'asset', 'templates')); // layout used from 2.0.4 on
        dirs.push(path.join(base, 'out', 'src', 'templates')); // 2.0.0 - 2.0.3
    }
    return dirs;
}

// Best-effort one-time import of templates the user customized in an install folder, which is
// where versions up to 2.0.4 kept them. Only their *own* work is copied: a file that still
// matches a shipped default is left behind under rule 2, which is also what makes it harmless to
// scan the install folders of versions that did have a user folder. Files already present in
// `userTemplatesDir` always win. Returns the names imported.
export function importCustomizedLegacyTemplates(options: { extensionPath: string; userTemplatesDir: string }): string[] {
    const imported: string[] = [];
    for (const legacyDir of findLegacyTemplateDirs(options.extensionPath)) {
        for (const name of safeReaddir(legacyDir)) {
            if (!isTmplFile(name)) {
                continue;
            }
            const destName = name.toLowerCase();
            const destPath = path.join(options.userTemplatesDir, destName);
            if (fs.existsSync(destPath)) {
                continue;
            }
            const content = safeReadFile(path.join(legacyDir, name));
            if (content === undefined || isShippedDefaultContent(destName, content)) {
                continue;
            }
            try {
                fs.writeFileSync(destPath, content, 'utf8');
                imported.push(destName);
            } catch (err) {
                // Best effort: skip files we can't write and keep going.
            }
        }
    }
    return imported;
}

export interface EnsureUserTemplateResult {
    fsPath: string;
    // 'existing': the user already had a template for this language;
    // 'copied-default': the bundled default was copied in as a starting point;
    // 'created-empty': no default exists for this language, so a blank file was created.
    outcome: 'existing' | 'copied-default' | 'created-empty';
}

// Resolves the file the user should edit to override `languageId`, creating it on first use
// (copy-on-write from the bundled default when there is one). Creating it does not yet make the
// language an override — only changing it does, see `pruneNoOpOverrides`.
export function ensureUserTemplate(options: {
    userTemplatesDir: string;
    bundledTemplatesDir: string;
    languageId: string;
}): EnsureUserTemplateResult {
    const fileName = templateFileName(options.languageId);
    const fsPath = path.join(options.userTemplatesDir, fileName);
    if (safeReadFile(fsPath) !== undefined) {
        return { fsPath, outcome: 'existing' };
    }
    const bundled = safeReadFile(path.join(options.bundledTemplatesDir, fileName));
    fs.writeFileSync(fsPath, bundled === undefined ? '' : bundled, 'utf8');
    return { fsPath, outcome: bundled === undefined ? 'created-empty' : 'copied-default' };
}

const README_NAME = 'README.md';

const README_BODY = `# File Template — your templates

Every \`*.tmpl\` file in this folder **overrides** the template File Template ships for that
language. Anything not in here comes from the extension's own defaults, which means you keep
getting improvements to them as the extension updates.

- **Edit a template**: run \`File Template: Edit or Add a Template\` from the Command Palette.
  Picking a language that has a built-in default opens a copy of it here. Change it and it
  becomes your override; leave it exactly as it is and it is dropped again, so you keep getting
  improvements to the built-in one.
- **Add a language**: drop a \`<languageId>.tmpl\` file in here, e.g. \`cpp.tmpl\`. Language ids
  are listed at https://code.visualstudio.com/docs/languages/identifiers
- **Go back to the built-in template**: delete the file. Nothing else to do.

Templates use TextMate snippet syntax (https://manual.macromates.com/en/snippets), plus
\`\${date}\`, which is replaced with the current date and time.
`;

// Explains the override-only rule in the folder itself, since a folder that stays empty until you
// customize something is otherwise a confusing thing to be dropped into. Only ever created, never
// rewritten: whatever is there is the user's. Returns true when the README is in place, which is
// the caller's cue that it never has to try again.
export function writeUserFolderReadme(userTemplatesDir: string): boolean {
    const readmePath = path.join(userTemplatesDir, README_NAME);
    if (safeReadFile(readmePath) !== undefined) {
        return true;
    }
    try {
        fs.writeFileSync(readmePath, README_BODY, 'utf8');
        return true;
    } catch (err) {
        return false;
    }
}
