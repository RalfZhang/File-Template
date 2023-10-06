'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require('fs');
const path = require('path');
const vscode = require("vscode");

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

function getFileName() {
    const editor = vscode.window.activeTextEditor;

    if (editor && editor.document) {
        const filePath = editor.document.fileName;
        return path.basename(filePath);
    } else {
        return null;
    }

}

function getTmpl(languageId, fileName) {
    return new Promise((resolve, reject) => {
        fs.readFile(path.resolve(__dirname, `../../asset/templates/${languageId}.tmpl`), 'utf8', (err, data) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    reject(new Error('Template file of the language does not exist'));
                    return;
                }
                reject(err);
                return;
            }
            
            const date = format(new Date(), 'yyyy-MM-dd hh:mm:ss');
            const authorName = '<input_your_name_here>';
            const authorEmail = 'input_your_email_here';
            const link = 'input_your_website_or_link_here';
            // Uncomment the line bellow if you want add name of file to the template
            // const filename = getFileName();
            const fileContent = data.replace('${date}', date)
                .replace('${1:Your Name}', authorName)
                .replace('${2:you@example.org}', authorEmail)
                .replace('${3:link}', link)
                // Uncomment the line bellow if you want add name of file to the template
                // .replace('${Filename}', filename);
            resolve(fileContent);
        });
    });
}

exports.getTmpl = getTmpl;