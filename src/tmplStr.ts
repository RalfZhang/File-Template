'use strict';

import * as fs from 'fs';
import * as path from 'path';

let format = function (x: Date, y: string) {
    var z: { [token: string]: number } = {
        M: x.getMonth() + 1,
        d: x.getDate(),
        h: x.getHours(),
        m: x.getMinutes(),
        s: x.getSeconds()
    };
    y = y.replace(/(M+|d+|h+|m+|s+)/g, function (v) {
        return ((v.length > 1 ? "0" : "") + z[v.slice(-1)]).slice(-2)
    });

    return y.replace(/(y+)/g, function (v) {
        return x.getFullYear().toString().slice(-v.length)
    });
}

// `searchDirs` is checked in order; the first directory that has a non-empty `${languageId}.tmpl`
// file wins. Callers pass the user's own templates folder first and the extension's bundled
// `asset/templates` defaults last, so a template the user wrote always takes priority while
// everything they haven't overridden keeps coming from the (updatable) defaults.
export function getTmpl(languageId: string, searchDirs: string[]) {
    return new Promise<string>((resolve, reject) => {
        const tryNext = (dirs: string[]) => {
            if (dirs.length === 0) {
                reject(new Error(`No template file found for the "${languageId}" language.`));
                return;
            }
            const filePath = path.resolve(dirs[0], `${languageId.toLowerCase()}.tmpl`);
            fs.readFile(filePath, 'utf8', (err, data) => {
                // Any unreadable file is treated as absent, not just a missing one: a directory
                // named `css.tmpl` (EISDIR) or one the user can't read (EACCES) should fall
                // through to the next directory rather than break insertion outright.
                if (err) {
                    tryNext(dirs.slice(1));
                    return;
                }
                // An empty file is treated as absent rather than as "insert nothing": the `Edit
                // or Add a Template` command creates one for languages that have no default, so
                // a user who ran it and never typed anything would otherwise have silently
                // shadowed whatever comes next in `searchDirs`.
                if (data.trim() === '') {
                    tryNext(dirs.slice(1));
                    return;
                }
                const date: string = format(new Date(), 'yyyy-MM-dd hh:mm:ss');
                const str: string = data.split('${date}').join(date);
                resolve(str);
            })
        };
        tryNext(searchDirs);
    })
}
