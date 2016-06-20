define([
    "jquery",
    "base/js/utils"
], function(
    $,
    utils
) {
"use strict";
var undefined;

/* IPython url_join_encode and url_path_join is used in the cell server with URLs with hostnames, so we make it handle those correctly
    this is a temporary kludge.  A much better fix would be to introduce a kernel_base_url parameter in the kernel
    initialization, which would default to the empty string, and would be prepended to every kernel request.  Also, the
    ws_host attribute would derive from the kernel_base_url parameter.

    Right now, the IPython websocket connection urls are messed up (they prepend a phony ws_host), but that's okay because the regexp
    pulls out the kernel id and everything is fine.

    We make sure not to apply our handling multiple time (possible when
    the embedding script is included many times).
*/
var url_parts = new RegExp("^((([^:/?#]+):)?(//([^/?#]*))?)?(.*)");

function strip_hostname(f) {
    if (f._strip_hostname_applied) {
        return f;
    }
    function wrapped() {
        // override IPython function to account for leading protocol and hostname
        // assume that the first argument has the part to strip off, if any
        var hostname = '';
        if (arguments.length > 0) {
            var parts = arguments[0].match(url_parts);
            hostname = parts[1]; // everything up to the url path
            arguments[0] = parts[6]; // url path
        }
        return hostname + f.apply(null, arguments);
    }
    wrapped._strip_hostname_applied = true;
    return wrapped;
}

utils.url_join_encode = strip_hostname(utils.url_join_encode);
utils.url_path_join = strip_hostname(utils.url_path_join);

var root;
/* Read the Sage Cell server's  root url from one of the following locations:
        1. the variable sagecell.root
        2. a tag of the form <link property="sagecell-root" href="...">
        3. the root of the URL of the executing script */
var el;
if (sagecell.root) {
    root = sagecell.root;
} else if ((el = $("link[property=sagecell-root]")).length > 0) {
    root = el.last().attr("href");
} else {
    /* get the first part of the last script element's src that loaded something called 'embedded_sagecell.js'
        also, strip off the static/ part of the url if the src looked like 'static/embedded_sagecell.js'
        modified from MathJax source
        We could use the jquery reverse plugin at  http://www.mail-archive.com/discuss@jquery.com/msg04272.html
        and the jquery .each() to get this as well, but this approach avoids creating a reversed list, etc. */
    var scripts = (document.documentElement || document).getElementsByTagName("script");
    var namePattern = /^.*?(?=(?:static\/)?embedded_sagecell.js)/;
    for (var i = scripts.length-1; i >= 0; i--) {
        var m = (scripts[i].src||"").match(namePattern);
        if (m) {
            root = m[0];
            break;
        }
    }
    if (root === "" || root === "/") {
        root = window.location.protocol + "//" + window.location.host + "/";
    }
}
if (root.slice(-1) !== "/") {
    root += "/";
}

return {
    always_new: utils.always_new,
    createElement: function (type, attrs, children) {
        var node = document.createElement(type);
        for (var k in attrs) {
            if (attrs.hasOwnProperty(k)) {
                node.setAttribute(k, attrs[k]);
            }
        }
        if (children) {
            for (var i = 0; i < children.length; i++) {
                if (typeof children[i] == 'string') {
                    node.appendChild(document.createTextNode(children[i]));
                } else {
                    node.appendChild(children[i]);
                }
            }
        }
        return node;
    },
    fixConsole: utils.fixConsole,
    /* var p = proxy(['list', 'of', 'methods'])
     will save any method calls in the list.  At some later time, you can invoke
     each method on an object by doing p._run_callbacks(my_obj) */
    proxy: function(methods) {
        var proxy = {_callbacks: []};
        $.each(methods, function(i,method) {
            proxy[method] = function() {
                proxy._callbacks.push([method, arguments]);
                console.log('stored proxy for '+method);
            }
        })
            proxy._run_callbacks = function(obj) {
                $.each(proxy._callbacks, function(i,cb) {
                    obj[cb[0]].apply(obj, cb[1]);
                })
                    }
        return proxy;
    },
    simpletimer: function () {
        var t = (new Date()).getTime();
        //var a = 0;
        console.debug('starting timer from '+t);
        return function(reset) {
            reset = reset || false;
            var old_t = t;
            var new_t = (new Date()).getTime();
            if (reset) {
                t = new_t;
            }
            //a+=1;
            //console.debug('time since '+t+': '+(new_t-old_t));
            return new_t-old_t;
        }
    },
    //     throttle is from:
    //     Underscore.js 1.4.3
    //     http://underscorejs.org
    //     (c) 2009-2012 Jeremy Ashkenas, DocumentCloud Inc.
    //     Underscore may be freely distributed under the MIT license.
    // Returns a function, that, when invoked, will only be triggered at most once
    // during a given window of time.
    throttle: function(func, wait) {
        var context, args, timeout, result;
        var previous = 0;
        var later = function() {
        previous = new Date;
        timeout = null;
        result = func.apply(context, args);
        };
        return function() {
        var now = new Date;
        var remaining = wait - (now - previous);
        context = this;
        args = arguments;
        if (remaining <= 0) {
            clearTimeout(timeout);
            timeout = null;
            previous = now;
            result = func.apply(context, args);
        } else if (!timeout) {
            timeout = setTimeout(later, remaining);
        }
        return result;
        };
    },
    URLs: {
        cell: root + "sagecell.html",
        completion: root + "complete",
        help: root + "help.html",
        kernel: root + "kernel",
        permalink: root + "permalink",
        root: root,
        sage_logo: root + "static/sagelogo.png",
        sockjs: root + "sockjs",
        spinner: root + "static/spinner.gif",
        terms: root + "tos.html"
    },
    uuid: utils.uuid
};
});