'use strict';

import * as fs from 'fs';
import * as path from 'path';

let format = function (x: Date, y: string) {
    var z = {
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

// `searchDirs` is checked in order; the first directory that has a `${languageId}.tmpl` file
// wins. Callers pass the per-user templates folder first and the extension's bundled
// `asset/templates` defaults last, so a user's own copy always takes priority.
export function getTmpl(languageId: string, searchDirs: string[]) {
    return new Promise<string>((resolve, reject) => {
        const tryNext = (dirs: string[]) => {
            if (dirs.length === 0) {
                reject(new Error('Template file of the language does not exist'));
                return;
            }
            const filePath = path.resolve(dirs[0], `${languageId}.tmpl`);
            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        tryNext(dirs.slice(1));
                        return;
                    }
                    reject(err);
                    return;
                }
                const date: string = format(new Date(), 'yyyy-MM-dd hh:mm:ss');
                const str: string = data.replace('${date}', date);
                resolve(str);
            })
        };
        tryNext(searchDirs);
    })
}
