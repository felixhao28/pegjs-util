/*
**  pegjs-util -- Utility Class for PEG.js
**  Copyright (c) 2014 Ralf S. Engelschall <rse@engelschall.com>
**
**  Permission is hereby granted, free of charge, to any person obtaining
**  a copy of this software and associated documentation files (the
**  "Software"), to deal in the Software without restriction, including
**  without limitation the rights to use, copy, modify, merge, publish,
**  distribute, sublicense, and/or sell copies of the Software, and to
**  permit persons to whom the Software is furnished to do so, subject to
**  the following conditions:
**
**  The above copyright notice and this permission notice shall be included
**  in all copies or substantial portions of the Software.
**
**  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
**  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
**  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
**  IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
**  CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
**  TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
**  SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/*  Universal Module Definition (UMD) for Library  */
(function (root, name, factory) {
    /* global define: false */
    /* global module: false */
    var export_type = root[name.replace(/[^a-zA-Z0-9_]/g, "_") + "_export"];
    if (   (   typeof define === "function"
            && typeof define.amd !== "undefined"
            && typeof export_type === "undefined")
        || (   typeof export_type !== "undefined"
            && export_type === "AMD"             ))
        /*  AMD environment  */
        define(name, function () {
            return factory(root);
        });
    else if (
           (   typeof module === "object"
            && typeof module.exports === "object"
            && typeof export_type === "undefined")
        || (   typeof export_type !== "undefined"
            && export_type === "CommonJS"        ))
        /*  CommonJS environment  */
        module.exports = factory(root);
    else {
        /*  Browser environment  */
        var api = factory(root);
        api.symbol = (function () {
            var symbol_name = null;
            var symbol_value;
            return function (symbol) {
                if (symbol_name !== null) {
                    root[symbol_name] = symbol_value;
                    symbol_name = null;
                }
                if (arguments.length === 1) {
                    symbol_name = symbol;
                    symbol_value = root[symbol_name];
                    root[symbol_name] = api;
                }
                return api;
            };
        })();
        api.symbol(name);
    }
}(/* global global: false */
  (typeof global !== "undefined" ? global :
  /* global window: false */
  (typeof window !== "undefined" ? window : this)), "PEGUtil", function (/* root */) {

    var PEGUtil = {};

    /*  Abstract Syntax Tree (AST)  */
    PEGUtil.AST = function () {
        if (!(this instanceof PEGUtil.AST)) {
            var self = new PEGUtil.AST("");
            return self.init.apply(self, arguments);
        }
        return this.init.apply(this, arguments);
    };
    PEGUtil.AST.prototype = {
        /*  constructor helper: AST node initialization  */
        init: function (T) {
            if (typeof T === "undefined")
                throw new Error("init: invalid argument");
            this.T = T;
            this.A = {};
            this.C = [];
            this.P = { L: 0, C: 0, O: 0 };
            return this;
        },

        /*  check the type of an AST node  */
        isA: function (T) {
            return this.T === T;
        },

        /*  set the parsing position   */
        pos: function (L, C, O) {
            this.P.L = L || 0;
            this.P.C = C || 0;
            this.P.O = O || 0;
            return this;
        },

        /*  set AST node attributes  */
        set: function () {
            var self = this;
            if (arguments.length === 1 && typeof arguments[0] === "object")
                Object.keys(arguments[0]).forEach(function (key) { self.A[key] = arguments[0][key]; });
            else if (arguments.length === 2)
                this.A[arguments[0]] = arguments[1];
            else
                throw new Error("set: invalid arguments");
            return this;
        },

        /*  get AST node attributes  */
        get: function (key) {
            if (typeof key !== "string")
                throw new Error("get: invalid argument");
            return this.A[key];
        },

        /*  get child AST nodes  */
        childs: function () {
            return this.C;
        },

        /*  add child AST node(s)  */
        add: function () {
            if (arguments.length === 0)
                throw new Error("add: invalid argument");
            var _add = function (C, node) {
                if (!((typeof node   === "object") &&
                      (typeof node.T === "string") &&
                      (typeof node.P === "object") &&
                      (typeof node.A === "object") &&
                      (typeof node.C === "object" && node.C instanceof Array)))
                    throw new Error("add: invalid AST node: " + JSON.stringify(node));
                C.push(node);
            };
            var self = this;
            Array.prototype.slice.call(arguments, 0).forEach(function (arg) {
                if (typeof arg === "object" && arg instanceof Array)
                    arg.forEach(function (child) { _add(self.C, child); });
                else if (arg !== null)
                    _add(self.C, arg);
            });
            return this;
        },

        /*  delete child AST node(s)  */
        del: function () {
            if (arguments.length === 0)
                throw new Error("del: invalid argument");
            var self = this;
            Array.prototype.slice.call(arguments, 0).forEach(function (arg) {
                var found = false;
                for (var j = 0; j < self.C.length; j++) {
                    if (self.C[j] === arg) {
                        self.C.splice(j, 1);
                        found = true;
                        break;
                    }
                }
                if (!found)
                    throw new Error("del: child not found");
            });
            return this;
        },

        /*  walk the AST recursively  */
        walk: function (cb, after) {
            if (typeof after === "undefined")
                after = false;
            var _walk = function (node, depth) {
                if (!after)
                    cb.call(null, node, depth);
                node.C.forEach(function (child) { _walk(child, depth + 1); });
                if (after)
                    cb.call(null, node, depth);
            };
            _walk(this, 0);
        },

        /*  dump the AST recursively  */
        dump: function () {
            var out = "";
            this.walk(function (node, depth) {
                for (var i = 0; i < depth; i++)
                    out += "    ";
                out += node.T + " ";
                var keys = Object.keys(node.A);
                if (keys.length > 0) {
                    out += "(";
                    var first = true;
                    keys.forEach(function (key) {
                        if (!first)
                            out += ", ";
                        else
                            first = false;
                        out += key + ": ";
                        var value = node.A[key];
                        switch (typeof value) {
                            case "string":
                                out += "\"" + value.replace(/\n/, "\\n").replace(/"/, "\\\"") + "\"";
                                break;
                            case "object":
                                if (value instanceof RegExp)
                                    out += "/" +
                                        value.toString()
                                        .replace(/^\//, "")
                                        .replace(/\/$/, "")
                                        .replace(/\//g, "\\/") +
                                    "/";
                                else
                                    out += value.toString();
                                break;
                            default:
                                out += value.toString();
                                break;
                        }
                    });
                    out += ") ";
                }
                out += "[" + node.P.L + "/" + node.P.C + "]\n";
            });
            return out;
        }
    };

    /*  helper function for generating a function to unroll the parse stack  */
    PEGUtil.makeUnroll = function (line, column, offset, SyntaxError) {
        return function (first, list, take) {
            if (   typeof list !== "object"
                || !(list instanceof Array))
                throw new SyntaxError("invalid list argument for unrolling",
                    (typeof list), "Array", offset(), line(), column());
            if (typeof take !== "undefined") {
                if (typeof take === "number")
                    take = [ take ];
                var result = [];
                if (first !== null)
                    result.push(first);
                for (var i = 0; i < list.length; i++) {
                    for (var j = 0; j < take.length; j++)
                        result.push(list[i][take[j]]);
                }
                return result;
            }
            else {
                if (first !== null)
                    list.unshift(first);
                return list;
            }
        };
    };

    /*  helper function for generarting a function to generate an AST node  */
    PEGUtil.makeAST = function (line, column, offset) {
        return function (T, A, C) {
            return new PEGUtil.AST(T, A, C).pos(line(), column(), offset());
        };
    };

    /*  utility function: create a source excerpt  */
    var excerpt = function (txt, o) {
        var l = txt.length;
        var b = o - 20; if (b < 0) b = 0;
        var e = o + 20; if (e > l) e = l;
        var extract = function (txt, pos, len) {
            return txt.substr(pos, len).replace(/\r/g, "\\r").replace(/\n/g, "\\n");
        };
        return {
            prolog: extract(txt, b, o - b),
            token:  extract(txt, o, 1),
            epilog: extract(txt, o + 1, e - (o + 1))
        };
    };

    /*  utility function: return a value or (if undefined) a fallback value  */
    var definedOrElse = function (value, fallback) {
        return (typeof value !== "undefined" ? value : fallback);
    };

    /*  provide top-level parsing functionality  */
    PEGUtil.parse = function (parser, txt, rule) {
        if (typeof parser !== "object")
            throw new Error("invalid parser object (not an object)");
        if (typeof parser.parse !== "function")
            throw new Error("invalid parser object (no \"parse\" function)");
        if (typeof txt !== "string")
            throw new Error("invalid input text (not a string)");
        var result = { ast: null, error: null };
        try {
            var options = { util: PEGUtil };
            if (typeof rule === "string")
                options.startRule = rule;
            result.ast = parser.parse(txt, options);
            result.error = null;
        }
        catch (e) {
            result.ast = null;
            result.error = {
                line:     definedOrElse(e.line, 0),
                column:   definedOrElse(e.column, 0),
                message:  e.message,
                found:    definedOrElse(e.found, ""),
                expected: definedOrElse(e.expected, ""),
                location: excerpt(txt, definedOrElse(e.offset, 0))
            };
        }
        return result;
    };

    /*  export the API  */
    return PEGUtil;
}));
