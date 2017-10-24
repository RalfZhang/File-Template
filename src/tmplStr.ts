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
 * \${1:Description}
 * @authors \${2:Your Name} (\${3:you@example.org})
 * @date    ${d}
 * @version \${4:1.0.0}
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
<meta name='viewport' content='width=device-width,initial-scale=1\${2:,minimum-scale=1,maximum-scale=1,user-scalable=no}'/>
\${3:<meta name="description" content="$4">
<meta name="keywords" content="$5">
}<link href="$6" rel="stylesheet">
</head>
<body>
    $0
</body>
</html>`;
}

export function cssTmpl() {
    const d = format(new Date(), 'yyyy-MM-dd hh:mm:ss');
    return `@charset "UTF-8";
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
 * \${1:Description}
 * @authors \${2:Your Name} (\${3:you@example.org})
 * @date    ${d}
 * @version \${4:1.0.0}
 */

class \${5:ClassName} \${6:extends \${7:AnotherClass}} {
    $8
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
# @Author  : \${1:Your Name} (\${2:you@example.org})
# @Link    : \${3:link}
# @Version : \${4:1.0.0}

\${5:import os}
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

export function vueTmpl() {
    const d = format(new Date(), 'yyyy-MM-dd hh:mm:ss');
    return `<!--
\${1:Description}
@authors \${2:Your Name} (\${3:you@example.org})
@date    ${d}
@version \${4:1.0.0}
-->
<template>
  <div>
    \${5:Hello, World!}
  </div>
</template>

<script>
  export default {\$0}
</script>

<style lang="\${6:css}">
  $7
</style>
`
}

export function testTmpl() {
    return `
$.ajax({
    type: \${method},
    url: \${url},
    data: \${data},
    dataType: \${dataType},
    success: function (response) {
        $0
    }
});`
}