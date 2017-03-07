'use strict';
let format = function date2str(x, y) {
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

export function javascriptTmpl() {
    const d = format(new Date(), 'yyyy-MM-dd hh:mm:ss');
    return `/**
 * \${Description}
 * @authors \${Your Name} (\${you@example.org})
 * @date    ${d}
 * @version \${1.0.0}
 */

$0`;
}

export function htmlTmpl() {
    const d = format(new Date(), 'yyyy-MM-dd hh:mm:ss');
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
<title>\${1:Examples}</title>
\${2:<meta name="description" content="$3">
<meta name="keywords" content="$4">
}<link href="$5" rel="stylesheet">
</head>
<body>
    $0
</body>
</html>`;
}

export function cssTmpl() {
    const d = format(new Date(), 'yyyy-MM-dd hh:mm:ss');
    return `\${1:@charset "\${2:UTF-8}";}
/**
 * \${3:Description}
 * @authors \${4:Your Name} (\${5:you@example.org})
 * @date    ${d}
 * @version \${6:1.0.0}
 */
$0
`;
}
export function phpTmpl() {
    const d = format(new Date(), 'yyyy-MM-dd hh:mm:ss');
    return `<?php
/**
 * \${Description}
 * @authors \${Your Name} (\${you@example.org})
 * @date    ${d}
 * @version \${1.0.0}
 */

class \${2:ClassName} \${3:extends \${4:AnotherClass}} {
    $5
    function __construct(){
        $0
    }
}`;
}

export function pythonTmpl() {
    const d = format(new Date(), 'yyyy-MM-dd hh:mm:ss');
    return `#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Date    : ${d}
# @Author  : \${Your Name} (\${you@example.org})
# @Link    : \${link}
# @Version : \${1.0.0}

\${1:import os}
$0`
}

export function rubyTmpl() {
    const d = format(new Date(), 'yyyy-MM-dd hh:mm:ss');
    return `\${1:#!/usr/bin/env ruby
}$0`
}

export function xmlTmpl() {
    const d = format(new Date(), 'yyyy-MM-dd hh:mm:ss');
    return `<?xml version="1.0" encoding="UTF-8" ?>
<\${1:root}>
	$0
</\${1:root}>`
}