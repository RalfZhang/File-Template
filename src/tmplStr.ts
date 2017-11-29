'use strict';

const fs = require('fs');
const path = require('path');

let format = function (x, y) {
    var z = {
        M: x.getMonth() + 1,
        d: x.getDate(),
        h: x.getHours(),
        m: x.getMinutes(),
        s: x.getSeconds()
    };
    y = y.replace(/(M+|d+|h+|m+|s+)/g, function (v) {
        return ((v.length > 1 ? "0" : "") + eval('z.' + v.slice(-1))).slice(-2)
    });

    return y.replace(/(y+)/g, function (v) {
        return x.getFullYear().toString().slice(-v.length)
    });
}

export function getTmpl(languageId: string, cb) {
    
    fs.readFile(path.resolve(__dirname, `./templates/${languageId}.tmpl`), 'utf8', (err, data)=>{
        if(err){
            if(err.code === 'ENOENT') {
                console.error('file does not exist');
                return;
            }
            throw err;
        }
        const date: string = format(new Date(), 'yyyy-MM-dd hh:mm:ss');
        data = data.replace('${date}', date);
        cb(data);
    })
}
