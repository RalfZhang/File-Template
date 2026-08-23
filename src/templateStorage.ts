'use strict';
// Templates a user edited or added must not live inside this extension's own (per-version)
// install directory: VS Code installs every update into a brand-new
// `<publisher>.<name>-<version>` folder and eventually removes the old one, which silently
// wipes out anything the user changed there. This module keeps the *effective* templates in a
// version-independent folder instead (see `extension.ts`), and does a best-effort import of
// files left behind by a previously installed version of this same extension.

import * as fs from 'fs';
import * as path from 'path';

const TMPL_EXT = '.tmpl';

function isTmplFile(name: string): boolean {
    return name.slice(-TMPL_EXT.length).toLowerCase() === TMPL_EXT;
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

function isFile(fsPath: string): boolean {
    try {
        return fs.statSync(fsPath).isFile();
    } catch (err) {
        return false;
    }
}

export function getUserTemplatesDir(globalStorageDir: string): string {
    const dir = path.join(globalStorageDir, 'templates');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

// Copies every `*.tmpl` file in `srcDir` into `destDir`, skipping any name `destDir` already
// has — an existing file there always wins, so this can never clobber something the user
// edited. Returns the filenames actually copied.
export function copyMissingTmplFiles(srcDir: string, destDir: string): string[] {
    const copied: string[] = [];
    for (const name of safeReaddir(srcDir)) {
        if (!isTmplFile(name)) {
            continue;
        }
        // `getTmpl` always looks up `${languageId}.tmpl` in all-lowercase (VS Code language
        // ids are always lowercase), so the copy lands under a lowercased name too. Without
        // this, a file named, say, `CPP.TMPL` would copy over fine but would never actually
        // be found afterwards on a case-sensitive filesystem (Linux) — macOS/Windows would hide
        // the bug because their default filesystems already treat `cpp.tmpl`/`CPP.TMPL` as the
        // same path.
        const destName = name.toLowerCase();
        const destPath = path.join(destDir, destName);
        if (fs.existsSync(destPath)) {
            continue;
        }
        const srcPath = path.join(srcDir, name);
        if (!isFile(srcPath)) {
            continue;
        }
        try {
            fs.copyFileSync(srcPath, destPath);
            copied.push(destName);
        } catch (err) {
            // Best effort: skip files we can't read/write and keep going.
        }
    }
    return copied;
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
        const diff = (bv[i] || 0) - (av[i] || 0);
        if (diff !== 0) {
            return diff;
        }
    }
    return 0;
}

// This whole legacy-migration codepath (this function, `LEGACY_MIGRATION_CUTOFF`, and the
// `if` guarding it in `migrateAndSeed`) exists solely to carry forward templates customized
// under version 2.0.4 or earlier, which had no per-user storage at all — see CHANGELOG.md. Once
// nobody is still upgrading from one of those versions, there's nothing left to migrate: delete
// all three (and this comment) after the cutoff date has safely passed.
const LEGACY_MIGRATION_CUTOFF = new Date('2027-10-01T00:00:00Z');

// Finds every templates folder left behind by other installed copies of this same extension
// (e.g. `~/.vscode/extensions/ralfzhang.filetemplate-2.0.4`), newest version first.
//
// Best effort only: VS Code removes old-version folders on its own schedule, so by the time a
// new version first activates, an old version's folder may already be gone. There is no API to
// detect or prevent that ahead of time.
export function findLegacyTemplateDirs(extensionPath: string): string[] {
    const extensionsRoot = path.dirname(extensionPath);
    const currentDirName = path.basename(extensionPath);

    let pkg: { publisher?: string; name?: string };
    try {
        pkg = require(path.join(extensionPath, 'package.json'));
    } catch (err) {
        return [];
    }
    if (!pkg.publisher || !pkg.name) {
        return [];
    }
    const prefix = (pkg.publisher + '.' + pkg.name + '-').toLowerCase();
    const currentDirNameLower = currentDirName.toLowerCase();

    const candidateNames = safeReaddir(extensionsRoot)
        .filter(name => name.toLowerCase() !== currentDirNameLower && name.toLowerCase().indexOf(prefix) === 0)
        .filter(name => isDirectory(path.join(extensionsRoot, name)))
        .sort((a, b) => compareVersionsDescending(a.slice(prefix.length), b.slice(prefix.length)));

    const dirs: string[] = [];
    for (const name of candidateNames) {
        const base = path.join(extensionsRoot, name);
        dirs.push(path.join(base, 'asset', 'templates')); // layout used since 2.0.3
        dirs.push(base); // older layout: `.tmpl` files sat directly under the extension root
    }
    return dirs;
}

export interface MigrateAndSeedResult {
    migrated: string[];
    seeded: string[];
}

// Best-effort one-time import from an older installed version (see `findLegacyTemplateDirs`),
// then fills in anything still missing — a brand-new default template this version ships, or
// every default on a from-scratch install — from the read-only defaults bundled in
// `asset/templates`. Never overwrites a file already present in `userTemplatesDir`.
export function migrateAndSeed(options: { extensionPath: string; userTemplatesDir: string }): MigrateAndSeedResult {
    const migrated: string[] = [];
    // See `LEGACY_MIGRATION_CUTOFF` above: stop scanning for old-version folders once this has
    // had years to run on every upgrade path, rather than doing it on every activation forever.
    if (new Date() < LEGACY_MIGRATION_CUTOFF) {
        for (const legacyDir of findLegacyTemplateDirs(options.extensionPath)) {
            for (const name of copyMissingTmplFiles(legacyDir, options.userTemplatesDir)) {
                if (migrated.indexOf(name) === -1) {
                    migrated.push(name);
                }
            }
        }
    }

    const bundledTemplatesDir = path.join(options.extensionPath, 'asset', 'templates');
    const seeded = copyMissingTmplFiles(bundledTemplatesDir, options.userTemplatesDir);

    return { migrated, seeded };
}
