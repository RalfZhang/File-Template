import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import * as templateStorage from '../../src/templateStorage';
import * as tmplStr from '../../src/tmplStr';

const repoRoot = path.resolve(__dirname, '../../..');
const bundledTemplatesDir = path.join(repoRoot, 'asset', 'templates');

// The text `javascript.tmpl` shipped in 2.0.0 - 3.0.0, before `@authors` became `@author`. A
// user upgrading from one of those versions has exactly this in their templates folder unless
// they edited it, which is the case `pruneNoOpOverrides` has to recognize.
const JAVASCRIPT_DEFAULT_3_0_0 = `/**
 * \${1:Description}
 * @authors \${2:Your Name} (\${3:you@example.org})
 * @date    \${date}
 * @version \${4:1.0.0}
 */

$0`;

const tempDirs: string[] = [];

function makeTempDir(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'filetemplate-test-'));
    tempDirs.push(dir);
    return dir;
}

suiteTeardown(() => {
    for (const dir of tempDirs) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

function write(dir: string, name: string, content: string): string {
    const fsPath = path.join(dir, name);
    fs.writeFileSync(fsPath, content, 'utf8');
    return fsPath;
}

function read(dir: string, name: string): string {
    return fs.readFileSync(path.join(dir, name), 'utf8');
}

suite('templateStorage', () => {

    test('every bundled default is recognized as a shipped default', () => {
        const names = fs.readdirSync(bundledTemplatesDir).filter(n => n.endsWith('.tmpl'));
        assert.ok(names.length > 0, 'no bundled templates found');
        for (const name of names) {
            assert.ok(
                templateStorage.isShippedDefaultContent(name, read(bundledTemplatesDir, name)),
                `${name} is missing from src/defaultTemplateHashes.ts — run \`npm run hashes\``
            );
        }
    });

    test('a default shipped by an older version is still recognized', () => {
        assert.ok(templateStorage.isShippedDefaultContent('javascript.tmpl', JAVASCRIPT_DEFAULT_3_0_0));
    });

    test('rewritten line endings do not hide a shipped default', () => {
        const crlf = read(bundledTemplatesDir, 'javascript.tmpl').replace(/\n/g, '\r\n');
        assert.ok(templateStorage.isShippedDefaultContent('javascript.tmpl', crlf));
    });

    test('a customized template is not mistaken for a shipped default', () => {
        const customized = read(bundledTemplatesDir, 'javascript.tmpl').replace('Your Name', 'Ralf');
        assert.ok(!templateStorage.isShippedDefaultContent('javascript.tmpl', customized));
    });

    test('pruning drops the overrides that override nothing and keeps everything else', () => {
        const userDir = makeTempDir();
        // What 3.0.0 left behind: an untouched copy of its own default...
        write(userDir, 'javascript.tmpl', JAVASCRIPT_DEFAULT_3_0_0);
        // ...an untouched copy of the current default...
        write(userDir, 'css.tmpl', read(bundledTemplatesDir, 'css.tmpl'));
        // ...a file `Edit or Add a Template` created for a language nothing bundles, never
        // typed into (it inserts nothing either way, so it is litter)...
        write(userDir, 'go.tmpl', '');
        // ...a template the user actually edited...
        write(userDir, 'python.tmpl', '# mine\n$0');
        // ...a language the user added themselves, whose content happens to be a copy of a
        // shipped default (it must survive: nothing else provides `cpp`)...
        write(userDir, 'cpp.tmpl', read(bundledTemplatesDir, 'javascript.tmpl'));
        // ...and a file that isn't a template at all.
        write(userDir, 'README.md', 'notes');

        const pruned = templateStorage.pruneNoOpOverrides(userDir, bundledTemplatesDir).sort();

        assert.deepStrictEqual(pruned, ['css.tmpl', 'go.tmpl', 'javascript.tmpl']);
        assert.deepStrictEqual(
            fs.readdirSync(userDir).sort(),
            ['README.md', 'cpp.tmpl', 'python.tmpl'].sort()
        );
    });

    // Activation sweeps the folder, and activation can happen with editors already open (a
    // window reload, an extension-host restart). What is on disk does not say whether an open
    // template overrides anything — the edits that make it one may still be unsaved.
    test('pruning leaves the files that are open for editing alone', () => {
        const userDir = makeTempDir();
        write(userDir, 'css.tmpl', read(bundledTemplatesDir, 'css.tmpl'));
        write(userDir, 'javascript.tmpl', read(bundledTemplatesDir, 'javascript.tmpl'));
        const openPath = path.join(userDir, 'css.tmpl');

        const pruned = templateStorage.pruneNoOpOverrides(
            userDir,
            bundledTemplatesDir,
            fsPath => fsPath === openPath
        );

        assert.deepStrictEqual(pruned, ['javascript.tmpl']);
        assert.deepStrictEqual(fs.readdirSync(userDir), ['css.tmpl']);

        // ...and it is reclaimed by the next sweep once it is no longer open.
        assert.deepStrictEqual(
            templateStorage.pruneNoOpOverrides(userDir, bundledTemplatesDir),
            ['css.tmpl']
        );
    });

    test('pruning an already-pruned folder is a no-op', () => {
        const userDir = makeTempDir();
        write(userDir, 'python.tmpl', '# mine\n$0');
        templateStorage.pruneNoOpOverrides(userDir, bundledTemplatesDir);
        assert.deepStrictEqual(templateStorage.pruneNoOpOverrides(userDir, bundledTemplatesDir), []);
        assert.deepStrictEqual(fs.readdirSync(userDir), ['python.tmpl']);
    });

    // The reason pruning runs continuously rather than once: `Edit or Add a Template` drops a
    // copy of the built-in template into the folder before the user has decided anything, and
    // only a change to it means "override this language from now on".
    test('a copy opened for editing and left unchanged is reclaimed', () => {
        const userDir = makeTempDir();
        templateStorage.ensureUserTemplate({
            userTemplatesDir: userDir,
            bundledTemplatesDir,
            languageId: 'javascript'
        });

        assert.deepStrictEqual(
            templateStorage.pruneNoOpOverrides(userDir, bundledTemplatesDir),
            ['javascript.tmpl']
        );
        assert.deepStrictEqual(fs.readdirSync(userDir), []);
    });

    test('a copy opened for editing and changed is kept', () => {
        const userDir = makeTempDir();
        const result = templateStorage.ensureUserTemplate({
            userTemplatesDir: userDir,
            bundledTemplatesDir,
            languageId: 'javascript'
        });
        fs.writeFileSync(result.fsPath, read(bundledTemplatesDir, 'javascript.tmpl') + '\n// mine', 'utf8');

        assert.deepStrictEqual(templateStorage.pruneNoOpOverrides(userDir, bundledTemplatesDir), []);
        assert.deepStrictEqual(fs.readdirSync(userDir), ['javascript.tmpl']);
    });

    // The close-time reclaim goes through one file at a time on purpose: a sweep triggered by
    // some other tab closing would delete a template whose edits are still only in the editor.
    test('discarding one file leaves the rest of the folder alone', () => {
        const userDir = makeTempDir();
        write(userDir, 'css.tmpl', read(bundledTemplatesDir, 'css.tmpl'));
        write(userDir, 'javascript.tmpl', read(bundledTemplatesDir, 'javascript.tmpl'));

        assert.strictEqual(templateStorage.discardIfNoOpOverride(userDir, bundledTemplatesDir, 'css.tmpl'), true);
        assert.deepStrictEqual(fs.readdirSync(userDir), ['javascript.tmpl']);

        assert.strictEqual(templateStorage.discardIfNoOpOverride(userDir, bundledTemplatesDir, 'css.tmpl'), false);
        assert.strictEqual(templateStorage.discardIfNoOpOverride(userDir, bundledTemplatesDir, 'README.md'), false);
    });

    test('the legacy import takes the customized templates and leaves the defaults', () => {
        const extensionsRoot = makeTempDir();
        const currentDir = path.join(extensionsRoot, 'ralfzhang.filetemplate-3.1.0');
        const legacyDir = path.join(extensionsRoot, 'ralfzhang.filetemplate-2.0.4', 'asset', 'templates');
        fs.mkdirSync(currentDir, { recursive: true });
        fs.mkdirSync(legacyDir, { recursive: true });
        write(currentDir, 'package.json', JSON.stringify({ publisher: 'RalfZhang', name: 'filetemplate' }));

        write(legacyDir, 'javascript.tmpl', '// mine\n$0');            // edited by the user
        write(legacyDir, 'CPP.tmpl', '// c++\n$0');                    // added by the user
        write(legacyDir, 'css.tmpl', read(bundledTemplatesDir, 'css.tmpl')); // untouched default
        write(legacyDir, 'notes.txt', 'ignore me');

        const userDir = makeTempDir();
        write(userDir, 'javascript.tmpl', '// already mine, must win\n$0');

        const imported = templateStorage.importCustomizedLegacyTemplates({
            extensionPath: currentDir,
            userTemplatesDir: userDir
        }).sort();

        // `css.tmpl` is skipped: it is a shipped default, so the (updatable) bundled one covers
        // it. `CPP.tmpl` arrives lowercased so it can be found on a case-sensitive filesystem.
        assert.deepStrictEqual(imported, ['cpp.tmpl']);
        assert.strictEqual(read(userDir, 'javascript.tmpl'), '// already mine, must win\n$0');
        assert.strictEqual(read(userDir, 'cpp.tmpl'), '// c++\n$0');
    });

    test('the legacy import also finds the pre-2.0.4 layout', () => {
        const extensionsRoot = makeTempDir();
        const currentDir = path.join(extensionsRoot, 'ralfzhang.filetemplate-3.1.0');
        const legacyDir = path.join(extensionsRoot, 'ralfzhang.filetemplate-2.0.3', 'out', 'src', 'templates');
        fs.mkdirSync(currentDir, { recursive: true });
        fs.mkdirSync(legacyDir, { recursive: true });
        write(currentDir, 'package.json', JSON.stringify({ publisher: 'RalfZhang', name: 'filetemplate' }));
        write(legacyDir, 'ruby.tmpl', '# mine\n$0');

        const userDir = makeTempDir();
        const imported = templateStorage.importCustomizedLegacyTemplates({
            extensionPath: currentDir,
            userTemplatesDir: userDir
        });

        assert.deepStrictEqual(imported, ['ruby.tmpl']);
    });

    test('legacy folders are searched newest version first', () => {
        const extensionsRoot = makeTempDir();
        const currentDir = path.join(extensionsRoot, 'ralfzhang.filetemplate-3.1.0');
        fs.mkdirSync(currentDir, { recursive: true });
        write(currentDir, 'package.json', JSON.stringify({ publisher: 'RalfZhang', name: 'filetemplate' }));
        for (const version of ['2.0.0', '2.0.4', '1.1.3']) {
            fs.mkdirSync(path.join(extensionsRoot, 'ralfzhang.filetemplate-' + version, 'asset', 'templates'), { recursive: true });
        }
        fs.mkdirSync(path.join(extensionsRoot, 'someoneelse.other-1.0.0'), { recursive: true });

        const dirs = templateStorage.findLegacyTemplateDirs(currentDir);

        assert.deepStrictEqual(
            dirs.map(d => path.relative(extensionsRoot, d).split(path.sep)[0]),
            [
                'ralfzhang.filetemplate-2.0.4', 'ralfzhang.filetemplate-2.0.4',
                'ralfzhang.filetemplate-2.0.0', 'ralfzhang.filetemplate-2.0.0',
                'ralfzhang.filetemplate-1.1.3', 'ralfzhang.filetemplate-1.1.3'
            ]
        );
    });

    test('ensureUserTemplate copies a default on first use and reopens it afterwards', () => {
        const userDir = makeTempDir();

        const first = templateStorage.ensureUserTemplate({
            userTemplatesDir: userDir,
            bundledTemplatesDir,
            languageId: 'javascript'
        });
        assert.strictEqual(first.outcome, 'copied-default');
        assert.strictEqual(read(userDir, 'javascript.tmpl'), read(bundledTemplatesDir, 'javascript.tmpl'));

        fs.writeFileSync(first.fsPath, '// mine\n$0', 'utf8');
        const second = templateStorage.ensureUserTemplate({
            userTemplatesDir: userDir,
            bundledTemplatesDir,
            languageId: 'javascript'
        });
        assert.strictEqual(second.outcome, 'existing');
        assert.strictEqual(read(userDir, 'javascript.tmpl'), '// mine\n$0');
    });

    test('ensureUserTemplate creates an empty file for a language with no default', () => {
        const userDir = makeTempDir();
        const result = templateStorage.ensureUserTemplate({
            userTemplatesDir: userDir,
            bundledTemplatesDir,
            languageId: 'Cpp'
        });
        assert.strictEqual(result.outcome, 'created-empty');
        assert.strictEqual(path.basename(result.fsPath), 'cpp.tmpl');
        assert.strictEqual(read(userDir, 'cpp.tmpl'), '');
    });

    test('listLanguageIds reports the languages a folder covers', () => {
        const ids = templateStorage.listLanguageIds(bundledTemplatesDir);
        assert.ok(ids.indexOf('javascript') !== -1);
        assert.ok(ids.indexOf('typescriptreact') !== -1);
        assert.strictEqual(ids.indexOf('README'), -1);
    });

    test('the folder README is created once and never rewritten', () => {
        const userDir = makeTempDir();
        assert.strictEqual(templateStorage.writeUserFolderReadme(userDir), true);
        assert.ok(read(userDir, 'README.md').length > 0);

        write(userDir, 'README.md', 'annotated by me');
        assert.strictEqual(templateStorage.writeUserFolderReadme(userDir), true);
        assert.strictEqual(read(userDir, 'README.md'), 'annotated by me');
    });

    test('a README the user already had is not overwritten', () => {
        const userDir = makeTempDir();
        write(userDir, 'README.md', 'my own notes');
        assert.strictEqual(templateStorage.writeUserFolderReadme(userDir), true);
        assert.strictEqual(read(userDir, 'README.md'), 'my own notes');
    });

    // The caller only records "written" when this returns true, so a failed write has to say so
    // — otherwise one full disk would suppress the README forever.
    test('a README that cannot be written reports failure', () => {
        const missingDir = path.join(makeTempDir(), 'does-not-exist');
        assert.strictEqual(templateStorage.writeUserFolderReadme(missingDir), false);
    });
});

suite('getTmpl', () => {

    test('a user template wins over the bundled default', async () => {
        const userDir = makeTempDir();
        write(userDir, 'javascript.tmpl', '// mine\n$0');
        const data = await tmplStr.getTmpl('javascript', [userDir, bundledTemplatesDir]);
        assert.strictEqual(data, '// mine\n$0');
    });

    test('a language the user has not overridden comes from the bundled default', async () => {
        const userDir = makeTempDir();
        const data = await tmplStr.getTmpl('javascript', [userDir, bundledTemplatesDir]);
        assert.ok(data.indexOf('@author ') !== -1);
    });

    test('an empty user template falls through to the bundled default', async () => {
        const userDir = makeTempDir();
        write(userDir, 'javascript.tmpl', '\n  \n');
        const data = await tmplStr.getTmpl('javascript', [userDir, bundledTemplatesDir]);
        assert.ok(data.indexOf('${1:Description}') !== -1);
    });

    test('every ${date} is replaced', async () => {
        const userDir = makeTempDir();
        write(userDir, 'javascript.tmpl', 'created ${date}, updated ${date}');
        const data = await tmplStr.getTmpl('javascript', [userDir, bundledTemplatesDir]);
        assert.ok(/^created \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}, updated \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(data), data);
    });

    test('an unreadable entry falls through to the bundled default', async () => {
        const userDir = makeTempDir();
        fs.mkdirSync(path.join(userDir, 'javascript.tmpl'));
        const data = await tmplStr.getTmpl('javascript', [userDir, bundledTemplatesDir]);
        assert.ok(data.indexOf('${1:Description}') !== -1);
    });

    test('an unknown language is reported by name', async () => {
        const userDir = makeTempDir();
        await assert.rejects(
            () => tmplStr.getTmpl('nosuchlanguage', [userDir, bundledTemplatesDir]),
            /nosuchlanguage/
        );
    });
});
