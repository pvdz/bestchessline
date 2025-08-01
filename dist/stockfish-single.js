/*!
 * Stockfish.js 16 (c) 2023, Chess.com, LLC
 * https://github.com/nmrugg/stockfish.js
 * License: GPLv3
 *
 * Based on stockfish.wasm (c)
 * Niklas Fiekas <niklas.fiekas@backscattering.de>
 * Hiroshi Ogawa <hi.ogawa.zz@gmail.com>
 * https://github.com/niklasf/stockfish.wasm
 * https://github.com/hi-ogawa/Stockfish
 *
 * Based on Stockfish (c) T. Romstad, M. Costalba, J. Kiiski, G. Linscott and other contributors.
 * https://github.com/official-stockfish/Stockfish
 */ !(function () {
  var t, n, r, e, o, a;
  function i() {
    function e(e) {
      var i, D, I, n, t;
      ((e = e || {}),
        ((i = i || (void 0 !== e ? e : {})).ready = new Promise(function (
          e,
          n,
        ) {
          ((D = e), (I = n));
        })),
        "undefined" == typeof XMLHttpRequest &&
          (global.XMLHttpRequest = function () {
            var t,
              r = {
                open: function (e, n) {
                  t = n;
                },
                send: function () {
                  require("fs").readFile(t, function (e, n) {
                    ((r.readyState = 4),
                      e
                        ? (console.error(e), (r.status = 404), r.onerror(e))
                        : ((r.status = 200),
                          (r.response = n),
                          r.onreadystatechange(),
                          r.onload()));
                  });
                },
              };
            return r;
          }),
        "undefined" != typeof global &&
          "[object process]" ===
            Object.prototype.toString.call(global.process) &&
          "undefined" != typeof fetch &&
          (fetch = null),
        (i.postCustomMessage = function (e) {
          if ("undefined" != typeof PThread)
            for (var n of PThread.ba)
              n.postMessage({ cmd: "custom", userData: e });
        }),
        (i.queue =
          ((t = []),
          {
            get: async function () {
              return 0 < t.length
                ? t.shift()
                : await new Promise(function (e) {
                    return (n = e);
                  });
            },
            put: function (e) {
              n ? (n(e), (n = null)) : t.push(e);
            },
          })),
        (i.onCustomMessage = function (e) {
          A ? H.push(e) : i.queue.put(e);
        }));
      var A,
        r,
        H = [],
        o =
          ((i.pauseQueue = function () {
            A = !0;
          }),
          (i.unpauseQueue = function () {
            var e = H;
            ((A = !(H = [])),
              e.forEach(function (e) {
                i.queue.put(e);
              }));
          }),
          (i.postMessage = i.postCustomMessage),
          []),
        a =
          ((i.addMessageListener = function (e) {
            o.push(e);
          }),
          (i.removeMessageListener = function (e) {
            0 <= (e = o.indexOf(e)) && o.splice(e, 1);
          }),
          (i.print = i.printErr =
            function (e) {
              if (0 === o.length) return console.log(e);
              for (var n of o) n(e);
            }),
          (i.terminate = function () {
            "undefined" != typeof PThread && PThread.da();
          }),
          (i.__IS_SINGLE_THREADED__ = !0),
          (i._origOnCustomMessage = i.onCustomMessage),
          (i.onCustomMessage = function (e) {
            return (
              "stop" === e || "quit" === e
                ? i._stop()
                : "ponderhit" === e && i._ponderhit(),
              i._origOnCustomMessage(e)
            );
          }),
          {});
      for (r in i) i.hasOwnProperty(r) && (a[r] = i[r]);
      var N = [],
        u = "./this.program";
      function s(e, n) {
        if (0 !== e) throw n;
      }
      var Y,
        c,
        q,
        W,
        f,
        B = "object" == typeof window,
        l = "function" == typeof importScripts,
        G =
          "object" == typeof process &&
          "object" == typeof process.versions &&
          "string" == typeof process.versions.node,
        p = "",
        X =
          (G
            ? ((p = l ? require("path").dirname(p) + "/" : __dirname + "/"),
              (Y = function (e, n) {
                return (
                  (q = q || require("fs")),
                  (e = (W = W || require("path")).normalize(e)),
                  q.readFileSync(e, n ? null : "utf8")
                );
              }),
              (c = function (e) {
                return (
                  (e = (e = Y(e, !0)).buffer ? e : new Uint8Array(e)).buffer ||
                    w("Assertion failed: undefined"),
                  e
                );
              }),
              1 < process.argv.length &&
                (u = process.argv[1].replace(/\\/g, "/")),
              (N = process.argv.slice(2)),
              process.on("uncaughtException", function (e) {
                if (!(e instanceof He)) throw e;
              }),
              process.on("unhandledRejection", w),
              (s = function (e, n) {
                if (V || 0 < re) throw ((process.exitCode = e), n);
                process.exit(e);
              }),
              (i.inspect = function () {
                return "[Emscripten Module object]";
              }))
            : (B || l) &&
              (l
                ? (p = self.location.href)
                : "undefined" != typeof document &&
                  document.currentScript &&
                  (p = document.currentScript.src),
              (p =
                0 !== (p = We ? We : p).indexOf("blob:")
                  ? p.substr(0, p.lastIndexOf("/") + 1)
                  : ""),
              (Y = function (e) {
                var n = new XMLHttpRequest();
                return (n.open("GET", e, !1), n.send(null), n.responseText);
              }),
              l) &&
              (c = function (e) {
                var n = new XMLHttpRequest();
                return (
                  n.open("GET", e, !1),
                  (n.responseType = "arraybuffer"),
                  n.send(null),
                  new Uint8Array(n.response)
                );
              }),
          i.print || console.log.bind(console)),
        d = i.printErr || console.warn.bind(console);
      for (r in a) a.hasOwnProperty(r) && (i[r] = a[r]);
      ((a = null),
        i.arguments && (N = i.arguments),
        i.thisProgram && (u = i.thisProgram),
        i.quit && (s = i.quit),
        i.wasmBinary && (f = i.wasmBinary));
      var V = i.noExitRuntime || !0,
        m =
          ("object" != typeof WebAssembly &&
            w("no native wasm support detected"),
          !1),
        z =
          "undefined" != typeof TextDecoder ? new TextDecoder("utf8") : void 0;
      function K(e, n, t) {
        var r = n + t;
        for (t = n; e[t] && !(r <= t); ) ++t;
        if (16 < t - n && e.subarray && z) return z.decode(e.subarray(n, t));
        for (r = ""; n < t; ) {
          var o,
            a,
            i = e[n++];
          128 & i
            ? ((o = 63 & e[n++]),
              192 == (224 & i)
                ? (r += String.fromCharCode(((31 & i) << 6) | o))
                : ((a = 63 & e[n++]),
                  (i =
                    224 == (240 & i)
                      ? ((15 & i) << 12) | (o << 6) | a
                      : ((7 & i) << 18) |
                        (o << 12) |
                        (a << 6) |
                        (63 & e[n++])) < 65536
                    ? (r += String.fromCharCode(i))
                    : ((i -= 65536),
                      (r += String.fromCharCode(
                        55296 | (i >> 10),
                        56320 | (1023 & i),
                      )))))
            : (r += String.fromCharCode(i));
        }
        return r;
      }
      function C(e) {
        return e ? K(R, e, void 0) : "";
      }
      function O(e, n, t, r) {
        if (0 < r) {
          r = t + r - 1;
          for (var o = 0; o < e.length; ++o) {
            var a = e.charCodeAt(o);
            if (
              (a =
                55296 <= a && a <= 57343
                  ? (65536 + ((1023 & a) << 10)) | (1023 & e.charCodeAt(++o))
                  : a) <= 127
            ) {
              if (r <= t) break;
              n[t++] = a;
            } else {
              if (a <= 2047) {
                if (r <= t + 1) break;
                n[t++] = 192 | (a >> 6);
              } else {
                if (a <= 65535) {
                  if (r <= t + 2) break;
                  n[t++] = 224 | (a >> 12);
                } else {
                  if (r <= t + 3) break;
                  ((n[t++] = 240 | (a >> 18)),
                    (n[t++] = 128 | ((a >> 12) & 63)));
                }
                n[t++] = 128 | ((a >> 6) & 63);
              }
              n[t++] = 128 | (63 & a);
            }
          }
          n[t] = 0;
        }
      }
      function J(e) {
        for (var n = 0, t = 0; t < e.length; ++t) {
          var r = e.charCodeAt(t);
          (r =
            55296 <= r && r <= 57343
              ? (65536 + ((1023 & r) << 10)) | (1023 & e.charCodeAt(++t))
              : r) <= 127
            ? ++n
            : (n = r <= 2047 ? n + 2 : r <= 65535 ? n + 3 : n + 4);
        }
        return n;
      }
      function Q(e) {
        var n = J(e) + 1,
          t = je(n);
        return (O(e, y, t, n), t);
      }
      var y,
        R,
        x,
        g,
        T,
        $,
        h,
        Z = [],
        ee = [],
        ne = [],
        te = [],
        re = 0,
        v = 0,
        oe = null,
        _ = null;
      function ae() {
        (v++, i.monitorRunDependencies && i.monitorRunDependencies(v));
      }
      function ie() {
        var e;
        (v--,
          i.monitorRunDependencies && i.monitorRunDependencies(v),
          0 == v &&
            (null !== oe && (clearInterval(oe), (oe = null)), _) &&
            ((e = _), (_ = null), e()));
      }
      function w(e) {
        throw (
          i.onAbort && i.onAbort(e),
          d(e),
          (m = !0),
          (e = new WebAssembly.RuntimeError(
            "abort(" + e + "). Build with -s ASSERTIONS=1 for more info.",
          )),
          I(e),
          e
        );
      }
      function ue() {
        return h.startsWith("data:application/octet-stream;base64,");
      }
      function se() {
        var e = h;
        try {
          if (e == h && f) return new Uint8Array(f);
          if (c) return c(e);
          throw "both async and sync fetching of the wasm failed";
        } catch (e) {
          w(e);
        }
      }
      function b(e) {
        for (; 0 < e.length; ) {
          var n,
            t = e.shift();
          "function" == typeof t
            ? t(i)
            : "number" == typeof (n = t.U)
              ? void 0 === t.S
                ? ke.call(null, n)
                : k.apply(null, [n, t.S])
              : n(void 0 === t.S ? null : t.S);
        }
      }
      ((i.preloadedImages = {}),
        (i.preloadedAudios = {}),
        (h = "stockfish-nnue-16-single.wasm"),
        ue() || (($ = h), (h = i.locateFile ? i.locateFile($, p) : p + $)));
      var L,
        ce = [null, [], []],
        fe = {},
        le = G
          ? function () {
              var e = process.hrtime();
              return 1e3 * e[0] + e[1] / 1e6;
            }
          : function () {
              return performance.now();
            },
        pe = [];
      function U(e, n) {
        ((T[e >> 2] = n), (T[(e + 4) >> 2] = (n / 4294967296) | 0));
      }
      function de(r, t, o, a, n) {
        function i(e) {
          var n = 0,
            t = 0;
          (e &&
            ((t = w.response ? w.response.byteLength : 0),
            (n = j(t)),
            R.set(new Uint8Array(w.response), n)),
            (T[(r + 12) >> 2] = n),
            U(r + 16, t));
        }
        if ((d = T[(r + 8) >> 2])) {
          var e = C(d),
            u = (u = C((g = r + 112))) || "GET",
            s = T[(g + 52) >> 2],
            c = T[(g + 56) >> 2],
            f = !!T[(g + 60) >> 2],
            l = T[(g + 68) >> 2],
            p = T[(g + 72) >> 2],
            d = T[(g + 76) >> 2],
            m = T[(g + 80) >> 2],
            y = T[(g + 84) >> 2],
            g = T[(g + 88) >> 2],
            h = !!(1 & s),
            v = !!(2 & s),
            s = !!(64 & s),
            l = l ? C(l) : void 0,
            p = p ? C(p) : void 0,
            _ = m ? C(m) : void 0,
            w = new XMLHttpRequest();
          if (
            ((w.withCredentials = f),
            w.open(u, e, !s, l, p),
            s || (w.timeout = c),
            (w.Z = e),
            (w.responseType = "arraybuffer"),
            m && w.overrideMimeType(_),
            d)
          )
            for (; (u = T[d >> 2]) && (e = T[(d + 4) >> 2]); )
              ((d += 8), (u = C(u)), (e = C(e)), w.setRequestHeader(u, e));
          (pe.push(w),
            (T[(r + 0) >> 2] = pe.length),
            (d = y && g ? R.slice(y, y + g) : null),
            (w.onload = function (e) {
              i(h && !v);
              var n = w.response ? w.response.byteLength : 0;
              (U(r + 24, 0),
                n && U(r + 32, n),
                (x[(r + 40) >> 1] = w.readyState),
                (x[(r + 42) >> 1] = w.status),
                w.statusText && O(w.statusText, R, r + 44, 64),
                200 <= w.status && w.status < 300
                  ? t && t(r, w, e)
                  : o && o(r, w, e));
            }),
            (w.onerror = function (e) {
              i(h);
              var n = w.status;
              (U(r + 24, 0),
                U(r + 32, w.response ? w.response.byteLength : 0),
                (x[(r + 40) >> 1] = w.readyState),
                (x[(r + 42) >> 1] = n),
                o && o(r, w, e));
            }),
            (w.ontimeout = function (e) {
              o && o(r, w, e);
            }),
            (w.onprogress = function (e) {
              var n = h && v && w.response ? w.response.byteLength : 0,
                t = 0;
              (h && v && ((t = j(n)), R.set(new Uint8Array(w.response), t)),
                (T[(r + 12) >> 2] = t),
                U(r + 16, n),
                U(r + 24, e.loaded - n),
                U(r + 32, e.total),
                (x[(r + 40) >> 1] = w.readyState),
                3 <= w.readyState &&
                  0 === w.status &&
                  0 < e.loaded &&
                  (w.status = 200),
                (x[(r + 42) >> 1] = w.status),
                w.statusText && O(w.statusText, R, r + 44, 64),
                a && a(r, w, e),
                t && Ue(t));
            }),
            (w.onreadystatechange = function (e) {
              ((x[(r + 40) >> 1] = w.readyState),
                2 <= w.readyState && (x[(r + 42) >> 1] = w.status),
                n && n(r, w, e));
            }));
          try {
            w.send(d);
          } catch (e) {
            o && o(r, w, e);
          }
        } else o(r, 0, "no url specified!");
      }
      function P(e, n) {
        if (!m)
          if (n) e();
          else
            try {
              e();
            } catch (e) {
              if (!(e instanceof He) && "unwind" !== e)
                throw (
                  e &&
                    "object" == typeof e &&
                    e.stack &&
                    d("exception thrown: " + [e, e.stack]),
                  e
                );
            }
      }
      function me(n, e, t, r) {
        var o = L;
        if (o) {
          var a = C(T[(n + 112 + 64) >> 2] || T[(n + 8) >> 2]);
          try {
            var i = o
              .transaction(["FILES"], "readwrite")
              .objectStore("FILES")
              .put(e, a);
            ((i.onsuccess = function () {
              ((x[(n + 40) >> 1] = 4),
                (x[(n + 42) >> 1] = 200),
                O("OK", R, n + 44, 64),
                t(n, 0, a));
            }),
              (i.onerror = function (e) {
                ((x[(n + 40) >> 1] = 4),
                  (x[(n + 42) >> 1] = 413),
                  O("Payload Too Large", R, n + 44, 64),
                  r(n, 0, e));
              }));
          } catch (e) {
            r(n, 0, e);
          }
        } else r(n, 0, "IndexedDB not available!");
      }
      var ye,
        ge = {};
      function he() {
        if (!ye) {
          var e,
            n = {
              USER: "web_user",
              LOGNAME: "web_user",
              PATH: "/",
              PWD: "/",
              HOME: "/home/web_user",
              LANG:
                (
                  ("object" == typeof navigator &&
                    navigator.languages &&
                    navigator.languages[0]) ||
                  "C"
                ).replace("-", "_") + ".UTF-8",
              _: u || "./this.program",
            };
          for (e in ge) void 0 === ge[e] ? delete n[e] : (n[e] = ge[e]);
          var t = [];
          for (e in n) t.push(e + "=" + n[e]);
          ye = t;
        }
        return ye;
      }
      function S(e) {
        return 0 == e % 4 && (0 != e % 100 || 0 == e % 400);
      }
      function ve(e, n) {
        for (var t = 0, r = 0; r <= n; t += e[r++]);
        return t;
      }
      var E = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
        _e = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      function we(e, n) {
        for (e = new Date(e.getTime()); 0 < n; ) {
          var t = e.getMonth(),
            r = (S(e.getFullYear()) ? E : _e)[t];
          if (!(n > r - e.getDate())) {
            e.setDate(e.getDate() + n);
            break;
          }
          ((n -= r - e.getDate() + 1),
            e.setDate(1),
            t < 11
              ? e.setMonth(t + 1)
              : (e.setMonth(0), e.setFullYear(e.getFullYear() + 1)));
        }
        return e;
      }
      function be(e, n, t, r) {
        function o(e, n, t) {
          for (
            e = "number" == typeof e ? e.toString() : e || "";
            e.length < n;

          )
            e = t[0] + e;
          return e;
        }
        function a(e, n) {
          return o(e, n, "0");
        }
        function i(e, n) {
          function t(e) {
            return e < 0 ? -1 : 0 < e ? 1 : 0;
          }
          var r;
          return (r =
            0 === (r = t(e.getFullYear() - n.getFullYear())) &&
            0 === (r = t(e.getMonth() - n.getMonth()))
              ? t(e.getDate() - n.getDate())
              : r);
        }
        function u(e) {
          switch (e.getDay()) {
            case 0:
              return new Date(e.getFullYear() - 1, 11, 29);
            case 1:
              return e;
            case 2:
              return new Date(e.getFullYear(), 0, 3);
            case 3:
              return new Date(e.getFullYear(), 0, 2);
            case 4:
              return new Date(e.getFullYear(), 0, 1);
            case 5:
              return new Date(e.getFullYear() - 1, 11, 31);
            case 6:
              return new Date(e.getFullYear() - 1, 11, 30);
          }
        }
        function s(e) {
          e = we(new Date(e.F + 1900, 0, 1), e.R);
          var n = new Date(e.getFullYear() + 1, 0, 4),
            t = u(new Date(e.getFullYear(), 0, 4)),
            n = u(n);
          return i(t, e) <= 0
            ? i(n, e) <= 0
              ? e.getFullYear() + 1
              : e.getFullYear()
            : e.getFullYear() - 1;
        }
        var c,
          f = g[(r + 40) >> 2];
        for (c in ((r = {
          X: g[r >> 2],
          W: g[(r + 4) >> 2],
          O: g[(r + 8) >> 2],
          N: g[(r + 12) >> 2],
          M: g[(r + 16) >> 2],
          F: g[(r + 20) >> 2],
          P: g[(r + 24) >> 2],
          R: g[(r + 28) >> 2],
          ea: g[(r + 32) >> 2],
          V: g[(r + 36) >> 2],
          Y: f ? C(f) : "",
        }),
        (t = C(t)),
        (f = {
          "%c": "%a %b %d %H:%M:%S %Y",
          "%D": "%m/%d/%y",
          "%F": "%Y-%m-%d",
          "%h": "%b",
          "%r": "%I:%M:%S %p",
          "%R": "%H:%M",
          "%T": "%H:%M:%S",
          "%x": "%m/%d/%y",
          "%X": "%H:%M:%S",
          "%Ec": "%c",
          "%EC": "%C",
          "%Ex": "%m/%d/%y",
          "%EX": "%H:%M:%S",
          "%Ey": "%y",
          "%EY": "%Y",
          "%Od": "%d",
          "%Oe": "%e",
          "%OH": "%H",
          "%OI": "%I",
          "%Om": "%m",
          "%OM": "%M",
          "%OS": "%S",
          "%Ou": "%u",
          "%OU": "%U",
          "%OV": "%V",
          "%Ow": "%w",
          "%OW": "%W",
          "%Oy": "%y",
        })))
          t = t.replace(new RegExp(c, "g"), f[c]);
        var l,
          p,
          d = "Sunday Monday Tuesday Wednesday Thursday Friday Saturday".split(
            " ",
          ),
          m =
            "January February March April May June July August September October November December".split(
              " ",
            );
        for (c in (f = {
          "%a": function (e) {
            return d[e.P].substring(0, 3);
          },
          "%A": function (e) {
            return d[e.P];
          },
          "%b": function (e) {
            return m[e.M].substring(0, 3);
          },
          "%B": function (e) {
            return m[e.M];
          },
          "%C": function (e) {
            return a(((e.F + 1900) / 100) | 0, 2);
          },
          "%d": function (e) {
            return a(e.N, 2);
          },
          "%e": function (e) {
            return o(e.N, 2, " ");
          },
          "%g": function (e) {
            return s(e).toString().substring(2);
          },
          "%G": s,
          "%H": function (e) {
            return a(e.O, 2);
          },
          "%I": function (e) {
            return (0 == (e = e.O) ? (e = 12) : 12 < e && (e -= 12), a(e, 2));
          },
          "%j": function (e) {
            return a(e.N + ve(S(e.F + 1900) ? E : _e, e.M - 1), 3);
          },
          "%m": function (e) {
            return a(e.M + 1, 2);
          },
          "%M": function (e) {
            return a(e.W, 2);
          },
          "%n": function () {
            return "\n";
          },
          "%p": function (e) {
            return 0 <= e.O && e.O < 12 ? "AM" : "PM";
          },
          "%S": function (e) {
            return a(e.X, 2);
          },
          "%t": function () {
            return "\t";
          },
          "%u": function (e) {
            return e.P || 7;
          },
          "%U": function (e) {
            var n = new Date(e.F + 1900, 0, 1),
              t = 0 === n.getDay() ? n : we(n, 7 - n.getDay());
            return i(t, (e = new Date(e.F + 1900, e.M, e.N))) < 0
              ? a(
                  Math.ceil(
                    (31 -
                      t.getDate() +
                      (ve(S(e.getFullYear()) ? E : _e, e.getMonth() - 1) - 31) +
                      e.getDate()) /
                      7,
                  ),
                  2,
                )
              : 0 === i(t, n)
                ? "01"
                : "00";
          },
          "%V": function (e) {
            var n = new Date(e.F + 1901, 0, 4),
              t = u(new Date(e.F + 1900, 0, 4)),
              n = u(n),
              r = we(new Date(e.F + 1900, 0, 1), e.R);
            return i(r, t) < 0
              ? "53"
              : i(n, r) <= 0
                ? "01"
                : a(
                    Math.ceil(
                      (t.getFullYear() < e.F + 1900
                        ? e.R + 32 - t.getDate()
                        : e.R + 1 - t.getDate()) / 7,
                    ),
                    2,
                  );
          },
          "%w": function (e) {
            return e.P;
          },
          "%W": function (e) {
            var n = new Date(e.F, 0, 1),
              t =
                1 === n.getDay()
                  ? n
                  : we(n, 0 === n.getDay() ? 1 : 7 - n.getDay() + 1);
            return i(t, (e = new Date(e.F + 1900, e.M, e.N))) < 0
              ? a(
                  Math.ceil(
                    (31 -
                      t.getDate() +
                      (ve(S(e.getFullYear()) ? E : _e, e.getMonth() - 1) - 31) +
                      e.getDate()) /
                      7,
                  ),
                  2,
                )
              : 0 === i(t, n)
                ? "01"
                : "00";
          },
          "%y": function (e) {
            return (e.F + 1900).toString().substring(2);
          },
          "%Y": function (e) {
            return e.F + 1900;
          },
          "%z": function (e) {
            var n = 0 <= (e = e.V);
            return (
              (e = Math.abs(e) / 60),
              (n ? "+" : "-") +
                String("0000" + ((e / 60) * 100 + (e % 60))).slice(-4)
            );
          },
          "%Z": function (e) {
            return e.Y;
          },
          "%%": function () {
            return "%";
          },
        }))
          t.includes(c) && (t = t.replace(new RegExp(c, "g"), f[c](r)));
        return (
          (l = t),
          (p = Array(J(l) + 1)),
          O(l, p, 0, p.length),
          (c = p).length > n ? 0 : (y.set(c, e), c.length - 1)
        );
      }
      function Se(e) {
        try {
          e();
        } catch (e) {
          w(e);
        }
      }
      var M = 0,
        F = null,
        Ee = 0,
        Me = [],
        Fe = {},
        De = {},
        Ie = 0,
        Ae = null,
        Ce = [],
        Oe = [];
      function Re(t) {
        var e,
          r = {};
        for (e in t)
          !(function (e) {
            var n = t[e];
            r[e] =
              "function" == typeof n
                ? function () {
                    Me.push(e);
                    try {
                      return n.apply(null, arguments);
                    } catch (e) {
                      if (-1 === e.message.indexOf("unreachable")) throw e;
                    } finally {
                      m ||
                        (Me.pop() !== e && w("Assertion failed: undefined"),
                        F &&
                          1 === M &&
                          0 === Me.length &&
                          ((M = 0),
                          Se(i._asyncify_stop_unwind),
                          "undefined" != typeof Fibers && Fibers.fa(),
                          Ae) &&
                          (Ae(), (Ae = null)));
                    }
                  }
                : n;
          })(e);
        return r;
      }
      function xe(e) {
        var t, r, n, o;
        if (!m)
          return (
            0 === M
              ? ((r = t = !1),
                e(function (e) {
                  var n;
                  !m &&
                    ((Ee = e || 0), (t = !0), r) &&
                    ((M = 2),
                    Se(function () {
                      i._asyncify_start_rewind(F);
                    }),
                    "undefined" != typeof Browser &&
                      Browser.T.U &&
                      Browser.T.resume(),
                    (n = (0, i.asm[De[g[(F + 8) >> 2]]])()),
                    F ||
                      ((e = Ce),
                      (Ce = []),
                      e.forEach(function (e) {
                        e(n);
                      })));
                }),
                (r = !0),
                t ||
                  ((M = 1),
                  (e = j(4108)),
                  (n = e + 12),
                  (g[e >> 2] = n),
                  (g[(e + 4) >> 2] = n + 4096),
                  (n = Me[0]),
                  void 0 === (o = Fe[n]) &&
                    ((o = Ie++), (Fe[n] = o), (De[o] = n)),
                  (g[(e + 8) >> 2] = o),
                  (F = e),
                  Se(function () {
                    i._asyncify_start_unwind(F);
                  }),
                  "undefined" != typeof Browser &&
                    Browser.T.U &&
                    Browser.T.pause()))
              : 2 === M
                ? ((M = 0),
                  Se(i._asyncify_stop_rewind),
                  Ue(F),
                  (F = null),
                  Oe.forEach(function (e) {
                    P(e);
                  }))
                : w("invalid state: " + M),
            Ee
          );
      }
      (!(function (n) {
        try {
          var e = indexedDB.open("emscripten_filesystem", 1);
        } catch (e) {
          return n();
        }
        ((e.onupgradeneeded = function (e) {
          ((e = e.target.result).objectStoreNames.contains("FILES") &&
            e.deleteObjectStore("FILES"),
            e.createObjectStore("FILES"));
        }),
          (e.onsuccess = function (e) {
            ((e = e.target.result), (L = e), ie());
          }),
          (e.onerror = function (e) {
            n();
          }));
      })(function () {
        ((L = !1), ie());
      }),
        ("undefined" != typeof ENVIRONMENT_IS_FETCH_WORKER &&
          ENVIRONMENT_IS_FETCH_WORKER) ||
          ae());
      var Te,
        Le = {
          f: function () {
            return 0;
          },
          p: function () {
            return 0;
          },
          q: function () {},
          i: function (e) {
            delete pe[e - 1];
          },
          a: function () {
            w();
          },
          h: function (e, n) {
            if (0 === e) e = Date.now();
            else {
              if (1 !== e && 4 !== e) return ((g[Pe() >> 2] = 28), -1);
              e = le();
            }
            return (
              (g[n >> 2] = (e / 1e3) | 0),
              (g[(n + 4) >> 2] = ((e % 1e3) * 1e6) | 0),
              0
            );
          },
          k: function () {
            return !l;
          },
          o: function (e, n, t) {
            R.copyWithin(e, n, n + t);
          },
          d: function () {
            w("OOM");
          },
          b: function (t) {
            xe(function (e) {
              var n;
              ((n = e),
                setTimeout(function () {
                  P(n);
                }, t));
            });
          },
          j: function (e, t, n, r, o) {
            function a(e, n) {
              me(
                e,
                n.response,
                function (e) {
                  P(function () {
                    p ? k.apply(null, [p, e]) : t && t(e);
                  }, w);
                },
                function (e) {
                  P(function () {
                    p ? k.apply(null, [p, e]) : t && t(e);
                  }, w);
                },
              );
            }
            function i(e) {
              P(function () {
                y ? k.apply(null, [y, e]) : o && o(e);
              }, w);
            }
            function u(e) {
              P(function () {
                d ? k.apply(null, [d, e]) : n && n(e);
              }, w);
            }
            function s(e) {
              P(function () {
                m ? k.apply(null, [m, e]) : r && r(e);
              }, w);
            }
            function c(e) {
              P(function () {
                p ? k.apply(null, [p, e]) : t && t(e);
              }, w);
            }
            var f = e + 112,
              l = C(f),
              p = T[(f + 36) >> 2],
              d = T[(f + 40) >> 2],
              m = T[(f + 44) >> 2],
              y = T[(f + 48) >> 2],
              g = T[(f + 52) >> 2],
              h = !!(4 & g),
              v = !!(32 & g),
              _ = !!(16 & g),
              w = !!(64 & g);
            if ("EM_IDB_STORE" === l)
              ((l = T[(f + 84) >> 2]),
                me(e, R.slice(l, l + T[(f + 88) >> 2]), c, u));
            else if ("EM_IDB_DELETE" === l) {
              var b = e;
              var S = c;
              var E = u;
              g = L;
              if (g) {
                f = T[(b + 112 + 64) >> 2];
                f = C((f = f || T[(b + 8) >> 2]));
                try {
                  var M = g
                    .transaction(["FILES"], "readwrite")
                    .objectStore("FILES")
                    .delete(f);
                  ((M.onsuccess = function (e) {
                    ((e = e.target.result),
                      (T[(b + 12) >> 2] = 0),
                      U(b + 16, 0),
                      U(b + 24, 0),
                      U(b + 32, 0),
                      (x[(b + 40) >> 1] = 4),
                      (x[(b + 42) >> 1] = 200),
                      O("OK", R, b + 44, 64),
                      S(b, 0, e));
                  }),
                    (M.onerror = function (e) {
                      ((x[(b + 40) >> 1] = 4),
                        (x[(b + 42) >> 1] = 404),
                        O("Not Found", R, b + 44, 64),
                        E(b, 0, e));
                    }));
                } catch (e) {
                  E(b, 0, e);
                }
              } else E(b, 0, "IndexedDB not available!");
            } else if (_) {
              if (v) return 0;
              de(e, h ? a : c, u, s, i);
            } else {
              var F = e;
              var D = c;
              var I = v
                ? u
                : h
                  ? function (e) {
                      de(e, a, u, s, i);
                    }
                  : function (e) {
                      de(e, c, u, s, i);
                    };
              l = L;
              if (l) {
                g = T[(F + 112 + 64) >> 2];
                g = C((g = g || T[(F + 8) >> 2]));
                try {
                  var A = l
                    .transaction(["FILES"], "readonly")
                    .objectStore("FILES")
                    .get(g);
                  ((A.onsuccess = function (e) {
                    var n, t;
                    e.target.result
                      ? ((n = (e = e.target.result).byteLength || e.length),
                        (t = j(n)),
                        R.set(new Uint8Array(e), t),
                        (T[(F + 12) >> 2] = t),
                        U(F + 16, n),
                        U(F + 24, 0),
                        U(F + 32, n),
                        (x[(F + 40) >> 1] = 4),
                        (x[(F + 42) >> 1] = 200),
                        O("OK", R, F + 44, 64),
                        D(F, 0, e))
                      : ((x[(F + 40) >> 1] = 4),
                        (x[(F + 42) >> 1] = 404),
                        O("Not Found", R, F + 44, 64),
                        I(F, 0, "no data"));
                  }),
                    (A.onerror = function (e) {
                      ((x[(F + 40) >> 1] = 4),
                        (x[(F + 42) >> 1] = 404),
                        O("Not Found", R, F + 44, 64),
                        I(F, 0, e));
                    }));
                } catch (e) {
                  I(F, 0, e);
                }
              } else I(F, 0, "IndexedDB not available!");
            }
            return e;
          },
          l: function () {
            return (
              (n = async () => {
                var e = await i.queue.get(),
                  n = J(e) + 1,
                  t = j(n);
                return (O(e, R, t, n), t);
              }),
              xe(function (e) {
                n().then(e);
              })
            );
            var n;
          },
          u: function (r, o) {
            var a = 0;
            return (
              he().forEach(function (e, n) {
                var t = o + a;
                for (n = g[(r + 4 * n) >> 2] = t, t = 0; t < e.length; ++t)
                  y[n++ >> 0] = e.charCodeAt(t);
                ((y[n >> 0] = 0), (a += e.length + 1));
              }),
              0
            );
          },
          v: function (e, n) {
            var t = he(),
              r = ((g[e >> 2] = t.length), 0);
            return (
              t.forEach(function (e) {
                r += e.length + 1;
              }),
              (g[n >> 2] = r),
              0
            );
          },
          c: function (e) {
            Ye(e);
          },
          g: function () {
            return 0;
          },
          s: function (e, n, t, r) {
            return ((e = fe.aa(e)), (n = fe.$(e, n, t)), (g[r >> 2] = n), 0);
          },
          n: function () {},
          r: function (e, n, t, r) {
            for (var o = 0, a = 0; a < t; a++) {
              for (
                var i = g[(n + 8 * a) >> 2],
                  u = g[(n + (8 * a + 4)) >> 2],
                  s = 0;
                s < u;
                s++
              ) {
                var c = R[i + s],
                  f = ce[e];
                0 === c || 10 === c
                  ? ((1 === e ? X : d)(K(f, 0)), (f.length = 0))
                  : f.push(c);
              }
              o += u;
            }
            return ((g[r >> 2] = o), 0);
          },
          m: function () {
            i.pauseQueue();
          },
          t: be,
          e: function () {
            i.unpauseQueue();
          },
        },
        Ue =
          (!(function () {
            function n(e) {
              ((e = Re((e = e.exports))),
                (i.asm = e),
                (e = i.asm.w.buffer),
                (i.HEAP8 = y = new Int8Array(e)),
                (i.HEAP16 = new Int16Array(e)),
                (i.HEAP32 = g = new Int32Array(e)),
                (i.HEAPU8 = R = new Uint8Array(e)),
                (i.HEAPU16 = x = new Uint16Array(e)),
                (i.HEAPU32 = T = new Uint32Array(e)),
                (i.HEAPF32 = new Float32Array(e)),
                (i.HEAPF64 = new Float64Array(e)),
                ee.unshift(i.asm.x),
                ie());
            }
            function t(e) {
              n(e.instance);
            }
            function r(e) {
              return (
                f || (!B && !l) || "function" != typeof fetch
                  ? Promise.resolve().then(se)
                  : fetch(h, { credentials: "same-origin" })
                      .then(function (e) {
                        if (e.ok) return e.arrayBuffer();
                        throw "failed to load wasm binary file at '" + h + "'";
                      })
                      .catch(se)
              )
                .then(function (e) {
                  return WebAssembly.instantiate(e, o);
                })
                .then(e, function (e) {
                  (d("failed to asynchronously prepare wasm: " + e), w(e));
                });
            }
            var o = { a: Le };
            if ((ae(), i.instantiateWasm))
              try {
                var e = i.instantiateWasm(o, n);
                return Re(e);
              } catch (e) {
                return d(
                  "Module.instantiateWasm callback failed with error: " + e,
                );
              }
            (f ||
            "function" != typeof WebAssembly.instantiateStreaming ||
            ue() ||
            "function" != typeof fetch
              ? r(t)
              : fetch(h, { credentials: "same-origin" }).then(function (e) {
                  return WebAssembly.instantiateStreaming(e, o).then(
                    t,
                    function (e) {
                      return (
                        d("wasm streaming compile failed: " + e),
                        d("falling back to ArrayBuffer instantiation"),
                        r(t)
                      );
                    },
                  );
                })
            ).catch(I);
          })(),
          (i.___wasm_call_ctors = function () {
            return (i.___wasm_call_ctors = i.asm.x).apply(null, arguments);
          }),
          (i._main = function () {
            return (i._main = i.asm.y).apply(null, arguments);
          }),
          (i._free = function () {
            return (Ue = i._free = i.asm.z).apply(null, arguments);
          })),
        j =
          ((i._stop = function () {
            return (i._stop = i.asm.A).apply(null, arguments);
          }),
          (i._ponderhit = function () {
            return (i._ponderhit = i.asm.B).apply(null, arguments);
          }),
          (i._malloc = function () {
            return (j = i._malloc = i.asm.C).apply(null, arguments);
          })),
        Pe = (i.___errno_location = function () {
          return (Pe = i.___errno_location = i.asm.D).apply(null, arguments);
        }),
        je = (i.stackAlloc = function () {
          return (je = i.stackAlloc = i.asm.E).apply(null, arguments);
        }),
        k = (i.dynCall_vi = function () {
          return (k = i.dynCall_vi = i.asm.G).apply(null, arguments);
        }),
        ke = (i.dynCall_v = function () {
          return (ke = i.dynCall_v = i.asm.H).apply(null, arguments);
        });
      function He(e) {
        ((this.name = "ExitStatus"),
          (this.message = "Program terminated with exit(" + e + ")"),
          (this.status = e));
      }
      function Ne(a) {
        function e() {
          if (!Te && ((Te = !0), (i.calledRun = !0), !m)) {
            if (
              (b(ee),
              b(ne),
              D(i),
              i.onRuntimeInitialized && i.onRuntimeInitialized(),
              qe)
            ) {
              var n = a,
                e = i._main,
                t = (n = n || []).length + 1,
                r = je(4 * (t + 1));
              g[r >> 2] = Q(u);
              for (var o = 1; o < t; o++) g[(r >> 2) + o] = Q(n[o - 1]);
              g[(r >> 2) + t] = 0;
              try {
                Ye(e(t, r));
              } catch (e) {
                e instanceof He ||
                  "unwind" == e ||
                  ((n = e) &&
                    "object" == typeof e &&
                    e.stack &&
                    (n = [e, e.stack]),
                  d("exception thrown: " + n),
                  s(1, e));
              }
            }
            if (i.postRun)
              for (
                "function" == typeof i.postRun && (i.postRun = [i.postRun]);
                i.postRun.length;

              )
                ((n = i.postRun.shift()), te.unshift(n));
            b(te);
          }
        }
        if (((a = a || N), !(0 < v))) {
          if (i.preRun)
            for (
              "function" == typeof i.preRun && (i.preRun = [i.preRun]);
              i.preRun.length;

            )
              ((n = void 0), (n = i.preRun.shift()), Z.unshift(n));
          (b(Z),
            0 < v ||
              (i.setStatus
                ? (i.setStatus("Running..."),
                  setTimeout(function () {
                    (setTimeout(function () {
                      i.setStatus("");
                    }, 1),
                      e());
                  }, 1))
                : e()));
        }
        var n;
      }
      function Ye(e) {
        (V || 0 < re || (i.onExit && i.onExit(e), (m = !0)), s(e, new He(e)));
      }
      if (
        ((i._asyncify_start_unwind = function () {
          return (i._asyncify_start_unwind = i.asm.I).apply(null, arguments);
        }),
        (i._asyncify_stop_unwind = function () {
          return (i._asyncify_stop_unwind = i.asm.J).apply(null, arguments);
        }),
        (i._asyncify_start_rewind = function () {
          return (i._asyncify_start_rewind = i.asm.K).apply(null, arguments);
        }),
        (i._asyncify_stop_rewind = function () {
          return (i._asyncify_stop_rewind = i.asm.L).apply(null, arguments);
        }),
        (_ = function e() {
          (Te || Ne(), Te || (_ = e));
        }),
        (i.run = Ne),
        i.preInit)
      )
        for (
          "function" == typeof i.preInit && (i.preInit = [i.preInit]);
          0 < i.preInit.length;

        )
          i.preInit.pop()();
      var qe = !0;
      return (
        i.noInitialRun && (qe = !1),
        Ne(),
        (i.onSpecialMessage = i.postCustomMessage),
        e.ready
      );
    }
    var We;
    ((We =
      "undefined" != typeof document && document.currentScript
        ? document.currentScript.src
        : void 0),
      "undefined" != typeof __filename && (We = We || __filename));
    return (
      "object" == typeof exports && "object" == typeof module
        ? (module.exports = e)
        : "function" == typeof define && define.amd
          ? define([], function () {
              return e;
            })
          : "object" == typeof exports && (exports.Stockfish = e),
      e
    );
  }
  (("undefined" != typeof self &&
    "worker" === self.location.hash.split(",")[1]) ||
    ("undefined" != typeof global &&
      "[object process]" === Object.prototype.toString.call(global.process) &&
      !require("worker_threads").isMainThread) ||
    (("undefined" != typeof onmessage &&
      ("undefined" == typeof window || void 0 === window.document)) ||
    ("undefined" != typeof global &&
      "[object process]" === Object.prototype.toString.call(global.process))
      ? ((o =
          "undefined" != typeof global &&
          "[object process]" ===
            Object.prototype.toString.call(global.process)),
        (a = []),
        o
          ? require.main === module
            ? ((r = require("path").join(
                __dirname,
                "stockfish-nnue-16-single.wasm",
              )),
              (e = {
                locateFile: function (e) {
                  return -1 < e.indexOf(".wasm") ? r : __filename;
                },
              }),
              i()(e).then(function (n) {
                ((t = n).addMessageListener(function (e) {
                  console.log(e);
                }),
                  a.length &&
                    a.forEach(function (e) {
                      n.postMessage(e, !0);
                    }),
                  (a = null));
              }),
              require("readline")
                .createInterface({
                  input: process.stdin,
                  output: process.stdout,
                  completer: function (n) {
                    var e = [
                      "binc ",
                      "btime ",
                      "confidence ",
                      "depth ",
                      "infinite ",
                      "mate ",
                      "maxdepth ",
                      "maxtime ",
                      "mindepth ",
                      "mintime ",
                      "moves ",
                      "movestogo ",
                      "movetime ",
                      "ponder ",
                      "searchmoves ",
                      "shallow ",
                      "winc ",
                      "wtime ",
                    ];
                    function t(e) {
                      return 0 === e.indexOf(n);
                    }
                    var r = [
                      "compiler",
                      "d",
                      "eval",
                      "exit",
                      "flip",
                      "go ",
                      "isready ",
                      "ponderhit ",
                      "position fen ",
                      "position startpos",
                      "position startpos moves",
                      "quit",
                      "setoption name Clear Hash value true",
                      "setoption name Contempt value ",
                      "setoption name Hash value ",
                      "setoption name Minimum Thinking Time value ",
                      "setoption name Move Overhead value ",
                      "setoption name MultiPV value ",
                      "setoption name Ponder value ",
                      "setoption name Skill Level value ",
                      "setoption name Slow Mover value ",
                      "setoption name Threads value ",
                      "setoption name UCI_Chess960 value false",
                      "setoption name UCI_Chess960 value true",
                      "setoption name UCI_AnalyseMode value true",
                      "setoption name UCI_AnalyseMode value false",
                      "setoption name UCI_LimitStrength value true",
                      "setoption name UCI_LimitStrength value false",
                      "setoption name UCI_Elo value ",
                      "setoption name UCI_ShowWDL value true",
                      "setoption name UCI_ShowWDL value false",
                      "setoption name Use NNUE value true",
                      "setoption name Use NNUE value false",
                      "setoption name nodestime value ",
                      "setoption name EvalFile value ",
                      "stop",
                      "uci",
                      "ucinewgame",
                    ].filter(t);
                    return [
                      (r = r.length
                        ? r
                        : (n = n.replace(/^.*\s/, ""))
                          ? e.filter(t)
                          : e),
                      n,
                    ];
                  },
                  historySize: 100,
                })
                .on("line", function (e) {
                  e &&
                    (("quit" !== e && "exit" !== e) || process.exit(),
                    t ? t.postMessage(e, !0) : a.push(e));
                })
                .on("close", function () {
                  process.exit();
                })
                .setPrompt(""))
            : (module.exports = i)
          : ((n = function (e) {
              t.__IS_NON_NESTED__ || t.__IS_SINGLE_THREADED__
                ? t.onCustomMessage(e)
                : t.postMessage(e, !0);
            }),
            (o = self.location.hash.substr(1).split(",")),
            (r = decodeURIComponent(o[0] || "stockfish-nnue-16-single.wasm")),
            (e = {
              locateFile: function (e) {
                return -1 < e.indexOf(".wasm")
                  ? r
                  : self.location.origin +
                      self.location.pathname +
                      "#" +
                      r +
                      ",worker";
              },
            }),
            i()(e)
              .then(function (e) {
                ((t = e).addMessageListener(function (e) {
                  postMessage(e);
                }),
                  a.length &&
                    a.forEach(function (e) {
                      n(e);
                    }),
                  (a = null));
              })
              .catch(function (e) {
                setTimeout(function () {
                  throw e;
                }, 1);
              }),
            (onmessage =
              onmessage ||
              function (e) {
                t ? n(e.data) : a.push(e.data);
              })))
      : "object" == typeof document && document.currentScript
        ? (document.currentScript._exports = i())
        : i()),
    (function (t, a) {
      "use strict";
      var r, i, u, o, s, c, n;
      function e(e) {
        "function" != typeof e && (e = new Function("" + e));
        for (var n = new Array(arguments.length - 1), t = 0; t < n.length; t++)
          n[t] = arguments[t + 1];
        return ((i[r] = { callback: e, args: n }), s(r), r++);
      }
      function f(e) {
        if (u) setTimeout(f, 0, e);
        else {
          var n = i[e];
          if (n) {
            u = !0;
            try {
              var t = n,
                r = t.callback,
                o = t.args;
              switch (o.length) {
                case 0:
                  r();
                  break;
                case 1:
                  r(o[0]);
                  break;
                case 2:
                  r(o[0], o[1]);
                  break;
                case 3:
                  r(o[0], o[1], o[2]);
                  break;
                default:
                  r.apply(a, o);
              }
            } finally {
              (delete i[e], (u = !1));
            }
          }
        }
      }
      function l() {
        function e(e) {
          e.source === t &&
            "string" == typeof e.data &&
            0 === e.data.indexOf(n) &&
            f(+e.data.slice(n.length));
        }
        var n = "setImmediate$" + Math.random() + "$";
        (t.addEventListener
          ? t.addEventListener("message", e, !1)
          : t.attachEvent("onmessage", e),
          (s = function (e) {
            t.postMessage(n + e, "*");
          }));
      }
      t.setImmediate ||
        ((r = 1),
        (u = !(i = {})),
        (o = t.document),
        "[object process]" === {}.toString.call(t.process)
          ? (s = function (e) {
              process.nextTick(function () {
                f(e);
              });
            })
          : !(function () {
                var e, n;
                if (t.postMessage && !t.importScripts)
                  return (
                    (e = !0),
                    (n = t.onmessage),
                    (t.onmessage = function () {
                      e = !1;
                    }),
                    t.postMessage("", "*"),
                    (t.onmessage = n),
                    e
                  );
              })()
            ? (s = t.MessageChannel
                ? (((n = new MessageChannel()).port1.onmessage = function (e) {
                    f(e.data);
                  }),
                  function (e) {
                    n.port2.postMessage(e);
                  })
                : o && "onreadystatechange" in o.createElement("script")
                  ? ((c = o.documentElement),
                    function (e) {
                      var n = o.createElement("script");
                      ((n.onreadystatechange = function () {
                        (f(e),
                          (n.onreadystatechange = null),
                          c.removeChild(n),
                          (n = null));
                      }),
                        c.appendChild(n));
                    })
                  : function (e) {
                      setTimeout(f, 0, e);
                    })
            : l());
    })(
      "undefined" == typeof self
        ? "undefined" == typeof global
          ? this
          : global
        : self,
    ));
})();
