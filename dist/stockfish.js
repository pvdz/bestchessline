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
  var e, n, t, r, a;
  function i() {
    function e(e) {
      var i, M, k, T, q;
      ((e = e || {}),
        ((i = i || (void 0 !== e ? e : {})).ready = new Promise(function (
          e,
          t,
        ) {
          ((M = e), (k = t));
        })),
        "undefined" == typeof XMLHttpRequest &&
          (global.XMLHttpRequest = function () {
            var n,
              r = {
                open: function (e, t) {
                  n = t;
                },
                send: function () {
                  require("fs").readFile(n, function (e, t) {
                    ((r.readyState = 4),
                      e
                        ? (console.error(e), (r.status = 404), r.onerror(e))
                        : ((r.status = 200),
                          (r.response = t),
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
          if (void 0 !== g)
            for (var t of g.za) t.postMessage({ cmd: "custom", userData: e });
        }),
        (i.queue =
          ((q = []),
          {
            get: async function () {
              return 0 < q.length
                ? q.shift()
                : await new Promise(function (e) {
                    return (T = e);
                  });
            },
            put: function (e) {
              T ? (T(e), (T = null)) : q.push(e);
            },
          })),
        (i.onCustomMessage = function (e) {
          U ? W.push(e) : i.queue.put(e);
        }));
      var U,
        t,
        W = [],
        n =
          ((i.pauseQueue = function () {
            U = !0;
          }),
          (i.unpauseQueue = function () {
            var e = W;
            ((U = !(W = [])),
              e.forEach(function (e) {
                i.queue.put(e);
              }));
          }),
          (i.postMessage = i.postCustomMessage),
          []),
        N =
          ((i.addMessageListener = function (e) {
            n.push(e);
          }),
          (i.removeMessageListener = function (e) {
            0 <= (e = n.indexOf(e)) && n.splice(e, 1);
          }),
          (i.print = i.printErr =
            function (e) {
              if (0 === n.length) return console.log(e);
              for (var t of n) t(e);
            }),
          (i.terminate = function () {
            void 0 !== g && g.Sa();
          }),
          {});
      for (t in i) i.hasOwnProperty(t) && (N[t] = i[t]);
      var H = [],
        V = "./this.program";
      function Y(e, t) {
        if (0 !== e) throw t;
      }
      var r,
        G,
        z = "object" == typeof window,
        o = "function" == typeof importScripts,
        s =
          "object" == typeof process &&
          "object" == typeof process.versions &&
          "string" == typeof process.versions.node,
        l = i.ENVIRONMENT_IS_PTHREAD || !1,
        a = "";
      function Q(e) {
        return i.locateFile ? i.locateFile(e, a) : a + e;
      }
      if (s) {
        var a = o ? require("path").dirname(a) + "/" : __dirname + "/",
          K = function (e, t) {
            return (
              (r = r || require("fs")),
              (e = (G = G || require("path")).normalize(e)),
              r.readFileSync(e, t ? null : "utf8")
            );
          },
          X = function (e) {
            return (
              re((e = (e = K(e, !0)).buffer ? e : new Uint8Array(e)).buffer),
              e
            );
          };
        (1 < process.argv.length && (V = process.argv[1].replace(/\\/g, "/")),
          (H = process.argv.slice(2)),
          process.on("uncaughtException", function (e) {
            if (!(e instanceof S)) throw e;
          }),
          process.on("unhandledRejection", y),
          (Y = function (e, t) {
            if (he()) throw ((process.exitCode = e), t);
            process.exit(e);
          }),
          (i.inspect = function () {
            return "[Emscripten Module object]";
          }));
        try {
          f = require("worker_threads");
        } catch (e) {
          throw (
            console.error(
              'The "worker_threads" module is not supported in this node.js build - perhaps a newer version is needed?',
            ),
            e
          );
        }
        global.Worker = f.Worker;
      } else
        (z || o) &&
          (o
            ? (a = self.location.href)
            : "undefined" != typeof document &&
              document.currentScript &&
              (a = document.currentScript.src),
          (a =
            0 !== (a = Kt ? Kt : a).indexOf("blob:")
              ? a.substr(0, a.lastIndexOf("/") + 1)
              : ""),
          s
            ? ((K = function (e, t) {
                return (
                  (r = r || require("fs")),
                  (e = (G = G || require("path")).normalize(e)),
                  r.readFileSync(e, t ? null : "utf8")
                );
              }),
              (X = function (e) {
                return (
                  re(
                    (e = (e = K(e, !0)).buffer ? e : new Uint8Array(e)).buffer,
                  ),
                  e
                );
              }))
            : ((K = function (e) {
                var t = new XMLHttpRequest();
                return (t.open("GET", e, !1), t.send(null), t.responseText);
              }),
              o &&
                (X = function (e) {
                  var t = new XMLHttpRequest();
                  return (
                    t.open("GET", e, !1),
                    (t.responseType = "arraybuffer"),
                    t.send(null),
                    new Uint8Array(t.response)
                  );
                })));
      s &&
        "undefined" == typeof performance &&
        (global.performance = require("perf_hooks").performance);
      var J,
        Z,
        $ = i.print || console.log.bind(console),
        d = i.printErr || console.warn.bind(console);
      for (t in N) N.hasOwnProperty(t) && (i[t] = N[t]);
      ((N = null),
        i.arguments && (H = i.arguments),
        i.thisProgram && (V = i.thisProgram),
        i.quit && (Y = i.quit),
        i.wasmBinary && (Z = i.wasmBinary));
      var ee = i.noExitRuntime || !0;
      "object" != typeof WebAssembly && y("no native wasm support detected");
      var u,
        te,
        ne,
        c = !1;
      function re(e, t) {
        e || y("Assertion failed: " + t);
      }
      function ae(e) {
        var t = new TextDecoder(e);
        this.decode = function (e) {
          return (
            e.buffer instanceof SharedArrayBuffer && (e = new Uint8Array(e)),
            t.decode.call(t, e)
          );
        };
      }
      var h,
        I,
        D,
        _,
        C,
        oe,
        ie = "undefined" != typeof TextDecoder ? new ae("utf8") : void 0;
      function se(e, t, n) {
        var r = t + n;
        for (n = t; e[n] && !(r <= n); ) ++n;
        if (16 < n - t && e.subarray && ie) return ie.decode(e.subarray(t, n));
        for (r = ""; t < n; ) {
          var a,
            o,
            i = e[t++];
          128 & i
            ? ((a = 63 & e[t++]),
              192 == (224 & i)
                ? (r += String.fromCharCode(((31 & i) << 6) | a))
                : ((o = 63 & e[t++]),
                  (i =
                    224 == (240 & i)
                      ? ((15 & i) << 12) | (a << 6) | o
                      : ((7 & i) << 18) |
                        (a << 12) |
                        (o << 6) |
                        (63 & e[t++])) < 65536
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
      function O(e) {
        return e ? se(I, e, void 0) : "";
      }
      function F(e, t, n, r) {
        if (0 < r) {
          r = n + r - 1;
          for (var a = 0; a < e.length; ++a) {
            var o = e.charCodeAt(a);
            if (
              (o =
                55296 <= o && o <= 57343
                  ? (65536 + ((1023 & o) << 10)) | (1023 & e.charCodeAt(++a))
                  : o) <= 127
            ) {
              if (r <= n) break;
              t[n++] = o;
            } else {
              if (o <= 2047) {
                if (r <= n + 1) break;
                t[n++] = 192 | (o >> 6);
              } else {
                if (o <= 65535) {
                  if (r <= n + 2) break;
                  t[n++] = 224 | (o >> 12);
                } else {
                  if (r <= n + 3) break;
                  ((t[n++] = 240 | (o >> 18)),
                    (t[n++] = 128 | ((o >> 12) & 63)));
                }
                t[n++] = 128 | ((o >> 6) & 63);
              }
              t[n++] = 128 | (63 & o);
            }
          }
          t[n] = 0;
        }
      }
      function ue(e) {
        for (var t = 0, n = 0; n < e.length; ++n) {
          var r = e.charCodeAt(n);
          (r =
            55296 <= r && r <= 57343
              ? (65536 + ((1023 & r) << 10)) | (1023 & e.charCodeAt(++n))
              : r) <= 127
            ? ++t
            : (t = r <= 2047 ? t + 2 : r <= 65535 ? t + 3 : t + 4);
        }
        return t;
      }
      function ce(e) {
        var t = ue(e) + 1,
          n = Ut(t);
        return (F(e, h, n, t), n);
      }
      ("undefined" != typeof TextDecoder && new ae("utf-16le"),
        l && (fe = i.buffer));
      var f = i.INITIAL_MEMORY || 536870912;
      if (l) ((u = i.wasmMemory), (fe = i.buffer));
      else if (i.wasmMemory) u = i.wasmMemory;
      else if (
        !(
          (u = new WebAssembly.Memory({
            initial: f / 65536,
            maximum: f / 65536,
            shared: !0,
          })).buffer instanceof SharedArrayBuffer
        )
      )
        throw (
          d(
            "requested a shared WebAssembly.Memory but the returned buffer is not a SharedArrayBuffer, indicating that while the browser has SharedArrayBuffer it does not have WebAssembly threads support - you may need to set a flag",
          ),
          s &&
            console.log(
              "(on node you may need: --experimental-wasm-threads --experimental-wasm-bulk-memory and also use a recent version)",
            ),
          Error("bad memory")
        );
      (fe = u ? u.buffer : fe).byteLength;
      var fe = (f = fe),
        le =
          ((i.HEAP8 = h = new Int8Array(f)),
          (i.HEAP16 = new Int16Array(f)),
          (i.HEAP32 = _ = new Int32Array(f)),
          (i.HEAPU8 = I = new Uint8Array(f)),
          (i.HEAPU16 = D = new Uint16Array(f)),
          (i.HEAPU32 = C = new Uint32Array(f)),
          (i.HEAPF32 = new Float32Array(f)),
          (i.HEAPF64 = oe = new Float64Array(f)),
          []),
        de = [],
        pe = [],
        me = [],
        R = 0;
      function he() {
        return ee || 0 < R;
      }
      var p,
        m = 0,
        _e = null,
        ye = null;
      function ge() {
        (m++, i.monitorRunDependencies && i.monitorRunDependencies(m));
      }
      function we() {
        var e;
        (m--,
          i.monitorRunDependencies && i.monitorRunDependencies(m),
          0 == m &&
            (null !== _e && (clearInterval(_e), (_e = null)), ye) &&
            ((e = ye), (ye = null), e()));
      }
      function y(e) {
        throw (
          i.onAbort && i.onAbort(e),
          re(!l),
          d(e),
          (c = !0),
          (ne = 1),
          (e = new WebAssembly.RuntimeError(
            "abort(" + e + "). Build with -s ASSERTIONS=1 for more info.",
          )),
          k(e),
          e
        );
      }
      function ve() {
        return p.startsWith("data:application/octet-stream;base64,");
      }
      function be() {
        var e = p;
        try {
          if (e == p && Z) return new Uint8Array(Z);
          if (X) return X(e);
          throw "both async and sync fetching of the wasm failed";
        } catch (e) {
          y(e);
        }
      }
      ((i.preloadedImages = {}),
        (i.preloadedAudios = {}),
        (p = "stockfish-nnue-16.wasm"),
        ve() || (p = Q(p)));
      var Ae = {
        30597: function () {
          throw "Canceled!";
        },
      };
      function Ee(e) {
        for (; 0 < e.length; ) {
          var t,
            n = e.shift();
          "function" == typeof n
            ? n(i)
            : "number" == typeof (t = n.Wa)
              ? void 0 === n.Ea
                ? Vt.call(null, t)
                : B.apply(null, [t, n.Ea])
              : t(void 0 === n.Ea ? null : n.Ea);
        }
      }
      function xe(e, t) {
        if (e <= 0 || e > h.length || 1 & e || t < 0) return -28;
        if (0 == t) return 0;
        2147483647 <= t && (t = 1 / 0);
        var n = Atomics.load(_, x >> 2),
          r = 0;
        if (
          n == e &&
          Atomics.compareExchange(_, x >> 2, n, 0) == n &&
          ((r = 1), --t <= 0)
        )
          return 1;
        if (0 <= (e = Atomics.notify(_, e >> 2, t))) return e + r;
        throw "Atomics.notify returned an unexpected value " + e;
      }
      function Se(e) {
        if (l)
          throw "Internal Error! cleanupThread() can only ever be called from main application thread!";
        if (!e) throw "Internal Error! Null pthread_ptr in cleanupThread!";
        var t = g.xa[e];
        t && ((_[(e + 12) >> 2] = 0), g.La(t.worker));
      }
      i._emscripten_futex_wake = xe;
      var g = {
        Aa: [],
        za: [],
        Ua: [],
        Eb: function () {},
        hb: function () {
          for (var e = P(228), t = 0; t < 57; ++t) C[e / 4 + t] = 0;
          ((_[(e + 12) >> 2] = e), (_[(t = e + 152) >> 2] = t));
          for (var n = P(512), t = 0; t < 128; ++t) C[n / 4 + t] = 0;
          (Atomics.store(C, (e + 100) >> 2, n),
            Atomics.store(C, (e + 40) >> 2, e),
            Rt(e, !o, 1),
            Mt(e));
        },
        ib: function () {
          ((g.receiveObjectTransfer = g.lb),
            (g.threadInit = g.qb),
            (g.threadCancel = g.pb),
            (g.threadExit = g.ab),
            (g.setExitStatus = g.nb));
        },
        xa: {},
        Ta: [],
        Za: function () {
          for (; 0 < g.Ta.length; ) g.Ta.pop()();
          Pt();
        },
        $a: function (e, t) {
          (Atomics.store(C, (e + 56) >> 2, 1),
            Atomics.store(C, (e + 60) >> 2, 0),
            g.Za(),
            Atomics.store(C, (e + 4) >> 2, t),
            Atomics.store(C, (e + 0) >> 2, 1),
            xe(e + 0, 2147483647),
            Rt(0, 0, 0));
        },
        nb: function (e) {
          ne = e;
        },
        ab: function (e) {
          var t = E();
          t && (g.$a(t, e), l) && postMessage({ cmd: "exit" });
        },
        pb: function () {
          (g.$a(E(), -1), postMessage({ cmd: "cancelDone" }));
        },
        Sa: function () {
          for (var e in g.xa) {
            var t = g.xa[e];
            t && t.worker && g.La(t.worker);
          }
          for (g.xa = {}, e = 0; e < g.Aa.length; ++e) {
            var n = g.Aa[e];
            n.terminate();
          }
          for (g.Aa = [], e = 0; e < g.za.length; ++e)
            ((t = (n = g.za[e]).wa), g.Qa(t), n.terminate());
          g.za = [];
        },
        Qa: function (e) {
          var t;
          e &&
            (e.ya &&
              ((t = _[(e.ya + 100) >> 2]),
              (_[(e.ya + 100) >> 2] = 0),
              A(t),
              A(e.ya)),
            (e.ya = 0),
            e.Pa && e.Ba && A(e.Ba),
            (e.Ba = 0),
            e.worker) &&
            (e.worker.wa = null);
        },
        La: function (e) {
          g.mb(function () {
            (delete g.xa[e.wa.ya],
              g.Aa.push(e),
              g.za.splice(g.za.indexOf(e), 1),
              g.Qa(e.wa),
              (e.wa = void 0));
          });
        },
        mb: function (e) {
          _[Yt >> 2] = 0;
          try {
            e();
          } finally {
            _[Yt >> 2] = 1;
          }
        },
        lb: function () {},
        qb: function () {
          for (var e in g.Ua) g.Ua[e]();
        },
        jb: function (a, o) {
          ((a.onmessage = function (e) {
            var t = e.data,
              n = t.cmd;
            if (
              (a.wa && (g.cb = a.wa.ya),
              t.targetThread && t.targetThread != E())
            ) {
              var r = g.xa[t.Jb];
              r
                ? r.worker.postMessage(e.data, t.transferList)
                : d(
                    'Internal error! Worker sent a message "' +
                      n +
                      '" to target pthread ' +
                      t.targetThread +
                      ", but that thread no longer exists!",
                  );
            } else if ("processQueuedMainThreadWork" === n) It();
            else if ("spawnThread" === n) Me(e.data);
            else if ("cleanupThread" === n) Se(t.thread);
            else if ("killThread" === n) {
              if (((e = t.thread), l))
                throw "Internal Error! killThread() can only ever be called from main application thread!";
              if (!e) throw "Internal Error! Null pthread_ptr in killThread!";
              ((_[(e + 12) >> 2] = 0),
                (t = g.xa[e]),
                delete g.xa[e],
                t.worker.terminate(),
                g.Qa(t),
                g.za.splice(g.za.indexOf(t.worker), 1),
                (t.worker.wa = void 0));
            } else if ("cancelThread" === n) {
              if (((e = t.thread), l))
                throw "Internal Error! cancelThread() can only ever be called from main application thread!";
              if (!e) throw "Internal Error! Null pthread_ptr in cancelThread!";
              g.xa[e].worker.postMessage({ cmd: "cancel" });
            } else if ("loaded" === n)
              ((a.loaded = !0), o && o(a), a.Fa && (a.Fa(), delete a.Fa));
            else if ("print" === n) $("Thread " + t.threadId + ": " + t.text);
            else if ("printErr" === n)
              d("Thread " + t.threadId + ": " + t.text);
            else if ("alert" === n)
              alert("Thread " + t.threadId + ": " + t.text);
            else if ("exit" === n)
              a.wa && Atomics.load(C, (a.wa.ya + 64) >> 2) && g.La(a);
            else if ("exitProcess" === n)
              try {
                zt(t.returnCode);
              } catch (e) {
                if (e instanceof S) return;
                throw e;
              }
            else
              "cancelDone" === n
                ? g.La(a)
                : "objectTransfer" !== n &&
                  ("setimmediate" === e.data.target
                    ? a.postMessage(e.data)
                    : d("worker sent an unknown command " + n));
            g.cb = void 0;
          }),
            (a.onerror = function (e) {
              d(
                "pthread sent an error! " +
                  e.filename +
                  ":" +
                  e.lineno +
                  ": " +
                  e.message,
              );
            }),
            s &&
              (a.on("message", function (e) {
                a.onmessage({ data: e });
              }),
              a.on("error", function (e) {
                a.onerror(e);
              }),
              a.on("exit", function () {})),
            a.postMessage({
              cmd: "load",
              urlOrBlob: i.mainScriptUrlOrBlob || Kt,
              wasmMemory: u,
              wasmModule: te,
            }));
        },
        bb: function () {
          var e = Q("stockfish.worker.js");
          g.Aa.push(new Worker(e));
        },
        fb: function () {
          return (0 == g.Aa.length && (g.bb(), g.jb(g.Aa[0])), g.Aa.pop());
        },
        xb: function (e) {
          for (e = performance.now() + e; performance.now() < e; );
        },
      };
      function Me(e) {
        if (l)
          throw "Internal Error! spawnThread() can only ever be called from main application thread!";
        var t = g.fb();
        if (!t) return 6;
        if (void 0 !== t.wa) throw "Internal error!";
        if (!e.Ka) throw "Internal error, no pthread ptr!";
        g.za.push(t);
        for (var n = P(512), r = 0; r < 128; ++r) _[(n + 4 * r) >> 2] = 0;
        var a = e.Ba + e.Ca,
          o =
            (r = g.xa[e.Ka] =
              { worker: t, Ba: e.Ba, Ca: e.Ca, Pa: e.Pa, ya: e.Ka }).ya >> 2,
          i =
            (Atomics.store(C, 16 + o, e.detached),
            Atomics.store(C, 25 + o, n),
            Atomics.store(C, 10 + o, r.ya),
            Atomics.store(C, 20 + o, e.Ca),
            Atomics.store(C, 19 + o, a),
            Atomics.store(C, 26 + o, e.Ca),
            Atomics.store(C, 28 + o, a),
            Atomics.store(C, 29 + o, e.detached),
            (n = jt() + 40),
            Atomics.store(C, 43 + o, n),
            (t.wa = r),
            {
              cmd: "run",
              start_routine: e.ob,
              arg: e.Ea,
              threadInfoStruct: e.Ka,
              stackBase: e.Ba,
              stackSize: e.Ca,
            });
        return (
          (t.Fa = function () {
            ((i.time = performance.now()), t.postMessage(i, e.vb));
          }),
          t.loaded && (t.Fa(), delete t.Fa),
          0
        );
      }
      function ke(e, t, n) {
        if (e <= 0 || e > h.length || 1 & e) return -28;
        if (z) {
          if (Atomics.load(_, e >> 2) != t) return -6;
          for (n = performance.now() + n, Atomics.exchange(_, x >> 2, e); ; ) {
            if (n < performance.now())
              return (Atomics.exchange(_, x >> 2, 0), -73);
            if (0 == Atomics.exchange(_, x >> 2, 0)) break;
            if ((It(), Atomics.load(_, e >> 2) != t)) return -6;
            Atomics.exchange(_, x >> 2, e);
          }
          return 0;
        }
        if ("timed-out" === (e = Atomics.wait(_, e >> 2, t, n))) return -73;
        if ("not-equal" === e) return -6;
        if ("ok" === e) return 0;
        throw "Atomics.wait returned an unexpected value " + e;
      }
      function Te() {
        s ||
          o ||
          (J = J || {})[
            "Blocking on the main thread is very dangerous, see https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread"
          ] ||
          ((J[
            "Blocking on the main thread is very dangerous, see https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread"
          ] = 1),
          d(
            "Blocking on the main thread is very dangerous, see https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread",
          ));
      }
      ((i.establishStackSpace = function (e, t) {
        (Wt(e, t), qt(e));
      }),
        (i.invokeEntryPoint = function (e, t) {
          return Ht.apply(null, [e, t]);
        }));
      var Ie = s
          ? function () {
              var e = process.hrtime();
              return 1e3 * e[0] + e[1] / 1e6;
            }
          : l
            ? function () {
                return performance.now() - i.__performance_now_clock_drift;
              }
            : function () {
                return performance.now();
              },
        De = [null, [], []],
        Ce = {};
      function Oe(e, t, n) {
        return l ? w(2, 1, e, t, n) : 0;
      }
      function Fe(e, t, n) {
        return l ? w(3, 1, e, t, n) : 0;
      }
      function Re(e, t, n) {
        if (l) return w(4, 1, e, t, n);
      }
      function je() {
        if (l) return w(5, 1);
        y();
      }
      var Le = [];
      function Pe(e) {
        if (l) return w(6, 1, e);
        ((ee = !1), (R = 0), zt(e));
      }
      function w(e, t) {
        for (
          var n = arguments.length - 2,
            r = Bt(),
            a = Ut(8 * n),
            o = a >> 3,
            i = 0;
          i < n;
          i++
        )
          oe[o + i] = arguments[2 + i];
        return ((n = Dt(e, n, a, t)), qt(r), n);
      }
      var Be = [],
        qe = [
          0,
          "undefined" != typeof document ? document : 0,
          "undefined" != typeof window ? window : 0,
        ];
      function Ue(e) {
        return (
          (e = 2 < e ? O(e) : e),
          qe[e] ||
            ("undefined" != typeof document
              ? document.querySelector(e)
              : void 0)
        );
      }
      function We(e, t, n) {
        var r,
          a,
          o,
          i,
          s = Ue(e);
        return s
          ? (s.Ja && ((_[s.Ja >> 2] = t), (_[(s.Ja + 4) >> 2] = n)),
            !s.Ya && s.zb
              ? s.Ja
                ? ((s = _[(s.Ja + 8) >> 2]),
                  (e = e ? O(e) : ""),
                  (r = Bt()),
                  (a = Ut(12)),
                  (o = 0),
                  e && ((o = ue(e) + 1), (i = P(o)), F(e, I, i, o), (o = i)),
                  (_[a >> 2] = o),
                  (_[(a + 4) >> 2] = t),
                  (_[(a + 8) >> 2] = n),
                  Ct(0, s, 657457152, 0, o, a),
                  qt(r),
                  1)
                : -4
              : ((e = !1),
                (s = s.Ya ? s.Ya : s).Ia &&
                  s.Ia.Ha &&
                  (e =
                    0 === (e = s.Ia.Ha.getParameter(2978))[0] &&
                    0 === e[1] &&
                    e[2] === s.width &&
                    e[3] === s.height),
                (s.width = t),
                (s.height = n),
                e && s.Ia.Ha.viewport(0, 0, t, n),
                0))
          : -4;
      }
      function Ne(e, t, n) {
        return l ? w(7, 1, e, t, n) : We(e, t, n);
      }
      function j(e, t) {
        if (!c)
          if (t) e();
          else {
            try {
              e();
            } catch (e) {
              if (e instanceof S) return;
              if ("unwind" !== e)
                throw (
                  e &&
                    "object" == typeof e &&
                    e.stack &&
                    d("exception thrown: " + [e, e.stack]),
                  e
                );
            }
            if (l && !he())
              try {
                (l ? Ft : zt)(ne);
              } catch (e) {
                if (!(e instanceof S)) throw e;
              }
          }
      }
      var He,
        Ve = [];
      function L(e, t) {
        ((C[e >> 2] = t), (C[(e + 4) >> 2] = (t / 4294967296) | 0));
      }
      function Ye(r, n, a, o, t) {
        function i(e) {
          var t = 0,
            n = 0;
          (e &&
            ((n = v.response ? v.response.byteLength : 0),
            (t = P(n)),
            I.set(new Uint8Array(v.response), t)),
            (C[(r + 12) >> 2] = t),
            L(r + 16, n));
        }
        if ((p = C[(r + 8) >> 2])) {
          var e = O(p),
            s = (s = O((_ = r + 112))) || "GET",
            u = C[(_ + 52) >> 2],
            c = C[(_ + 56) >> 2],
            f = !!C[(_ + 60) >> 2],
            l = C[(_ + 68) >> 2],
            d = C[(_ + 72) >> 2],
            p = C[(_ + 76) >> 2],
            m = C[(_ + 80) >> 2],
            h = C[(_ + 84) >> 2],
            _ = C[(_ + 88) >> 2],
            y = !!(1 & u),
            g = !!(2 & u),
            u = !!(64 & u),
            l = l ? O(l) : void 0,
            d = d ? O(d) : void 0,
            w = m ? O(m) : void 0,
            v = new XMLHttpRequest();
          if (
            ((v.withCredentials = f),
            v.open(s, e, !u, l, d),
            u || (v.timeout = c),
            (v.wb = e),
            (v.responseType = "arraybuffer"),
            m && v.overrideMimeType(w),
            p)
          )
            for (; (s = C[p >> 2]) && (e = C[(p + 4) >> 2]); )
              ((p += 8), (s = O(s)), (e = O(e)), v.setRequestHeader(s, e));
          (Ve.push(v),
            (C[(r + 0) >> 2] = Ve.length),
            (p = h && _ ? I.slice(h, h + _) : null),
            (v.onload = function (e) {
              i(y && !g);
              var t = v.response ? v.response.byteLength : 0;
              (L(r + 24, 0),
                t && L(r + 32, t),
                (D[(r + 40) >> 1] = v.readyState),
                (D[(r + 42) >> 1] = v.status),
                v.statusText && F(v.statusText, I, r + 44, 64),
                200 <= v.status && v.status < 300
                  ? n && n(r, v, e)
                  : a && a(r, v, e));
            }),
            (v.onerror = function (e) {
              i(y);
              var t = v.status;
              (L(r + 24, 0),
                L(r + 32, v.response ? v.response.byteLength : 0),
                (D[(r + 40) >> 1] = v.readyState),
                (D[(r + 42) >> 1] = t),
                a && a(r, v, e));
            }),
            (v.ontimeout = function (e) {
              a && a(r, v, e);
            }),
            (v.onprogress = function (e) {
              var t = y && g && v.response ? v.response.byteLength : 0,
                n = 0;
              (y && g && ((n = P(t)), I.set(new Uint8Array(v.response), n)),
                (C[(r + 12) >> 2] = n),
                L(r + 16, t),
                L(r + 24, e.loaded - t),
                L(r + 32, e.total),
                (D[(r + 40) >> 1] = v.readyState),
                3 <= v.readyState &&
                  0 === v.status &&
                  0 < e.loaded &&
                  (v.status = 200),
                (D[(r + 42) >> 1] = v.status),
                v.statusText && F(v.statusText, I, r + 44, 64),
                o && o(r, v, e),
                n && A(n));
            }),
            (v.onreadystatechange = function (e) {
              ((D[(r + 40) >> 1] = v.readyState),
                2 <= v.readyState && (D[(r + 42) >> 1] = v.status),
                t && t(r, v, e));
            }));
          try {
            v.send(p);
          } catch (e) {
            a && a(r, v, e);
          }
        } else a(r, 0, "no url specified!");
      }
      function Ge(t, e, n, r) {
        var a = He;
        if (a) {
          var o = O(C[(t + 112 + 64) >> 2] || C[(t + 8) >> 2]);
          try {
            var i = a
              .transaction(["FILES"], "readwrite")
              .objectStore("FILES")
              .put(e, o);
            ((i.onsuccess = function () {
              ((D[(t + 40) >> 1] = 4),
                (D[(t + 42) >> 1] = 200),
                F("OK", I, t + 44, 64),
                n(t, 0, o));
            }),
              (i.onerror = function (e) {
                ((D[(t + 40) >> 1] = 4),
                  (D[(t + 42) >> 1] = 413),
                  F("Payload Too Large", I, t + 44, 64),
                  r(t, 0, e));
              }));
          } catch (e) {
            r(t, 0, e);
          }
        } else r(t, 0, "IndexedDB not available!");
      }
      function ze(n, e) {
        n.Xa ||
          ((n.Xa = n.getContext),
          (n.getContext = function (e, t) {
            return ("webgl" == e) ==
              (t = n.Xa(e, t)) instanceof WebGLRenderingContext
              ? t
              : null;
          }));
        var t,
          r,
          a,
          o = n.getContext("webgl", e);
        {
          if (o) {
            if (
              ((o = o),
              (e = e),
              (r = P(8)),
              (_[(r + 4) >> 2] = E()),
              (a = { Db: r, attributes: e, version: e.kb, Ha: o }),
              o.canvas && (o.canvas.Ia = a),
              (void 0 === e.Va || e.Va) && !(o = (o = a) || Qe).gb)
            ) {
              o.gb = !0;
              var i = (t = o.Ha),
                s = i.getExtension("ANGLE_instanced_arrays"),
                u =
                  (s &&
                    ((i.vertexAttribDivisor = function (e, t) {
                      s.vertexAttribDivisorANGLE(e, t);
                    }),
                    (i.drawArraysInstanced = function (e, t, n, r) {
                      s.drawArraysInstancedANGLE(e, t, n, r);
                    }),
                    (i.drawElementsInstanced = function (e, t, n, r, a) {
                      s.drawElementsInstancedANGLE(e, t, n, r, a);
                    })),
                  t),
                c = u.getExtension("OES_vertex_array_object"),
                f =
                  (c &&
                    ((u.createVertexArray = function () {
                      return c.createVertexArrayOES();
                    }),
                    (u.deleteVertexArray = function (e) {
                      c.deleteVertexArrayOES(e);
                    }),
                    (u.bindVertexArray = function (e) {
                      c.bindVertexArrayOES(e);
                    }),
                    (u.isVertexArray = function (e) {
                      return c.isVertexArrayOES(e);
                    })),
                  t),
                l = f.getExtension("WEBGL_draw_buffers");
              (l &&
                (f.drawBuffers = function (e, t) {
                  l.drawBuffersWEBGL(e, t);
                }),
                (t.Ab = t.getExtension("EXT_disjoint_timer_query")),
                (t.Gb = t.getExtension("WEBGL_multi_draw")),
                (t.getSupportedExtensions() || []).forEach(function (e) {
                  e.includes("lose_context") ||
                    e.includes("debug") ||
                    t.getExtension(e);
                }));
            }
            return r;
          }
          return 0;
        }
      }
      var Qe,
        Ke,
        Xe = ["default", "low-power", "high-performance"],
        Je = {};
      function Ze() {
        if (!Ke) {
          var e,
            t = {
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
              _: V || "./this.program",
            };
          for (e in Je) void 0 === Je[e] ? delete t[e] : (t[e] = Je[e]);
          var n = [];
          for (e in t) n.push(e + "=" + t[e]);
          Ke = n;
        }
        return Ke;
      }
      function $e(r, a) {
        var o;
        return l
          ? w(8, 1, r, a)
          : ((o = 0),
            Ze().forEach(function (e, t) {
              var n = a + o;
              for (t = _[(r + 4 * t) >> 2] = n, n = 0; n < e.length; ++n)
                h[t++ >> 0] = e.charCodeAt(n);
              ((h[t >> 0] = 0), (o += e.length + 1));
            }),
            0);
      }
      function et(e, t) {
        var n, r;
        return l
          ? w(9, 1, e, t)
          : ((n = Ze()),
            (_[e >> 2] = n.length),
            (r = 0),
            n.forEach(function (e) {
              r += e.length + 1;
            }),
            (_[t >> 2] = r),
            0);
      }
      function tt(e) {
        return l ? w(10, 1, e) : 0;
      }
      function nt(e, t, n, r) {
        return l
          ? w(11, 1, e, t, n, r)
          : ((e = Ce.Cb(e)), (t = Ce.Bb(e, t, n)), (_[r >> 2] = t), 0);
      }
      function rt(e, t, n, r, a) {
        if (l) return w(12, 1, e, t, n, r, a);
      }
      function at(e, t, n, r) {
        if (l) return w(13, 1, e, t, n, r);
        for (var a = 0, o = 0; o < n; o++) {
          for (
            var i = _[(t + 8 * o) >> 2], s = _[(t + (8 * o + 4)) >> 2], u = 0;
            u < s;
            u++
          ) {
            var c = I[i + u],
              f = De[e];
            0 === c || 10 === c
              ? ((1 === e ? $ : d)(se(f, 0)), (f.length = 0))
              : f.push(c);
          }
          a += s;
        }
        return ((_[r >> 2] = a), 0);
      }
      function ot(e) {
        return 0 == e % 4 && (0 != e % 100 || 0 == e % 400);
      }
      function it(e, t) {
        for (var n = 0, r = 0; r <= t; n += e[r++]);
        return n;
      }
      var st = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
        ut = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      function ct(e, t) {
        for (e = new Date(e.getTime()); 0 < t; ) {
          var n = e.getMonth(),
            r = (ot(e.getFullYear()) ? st : ut)[n];
          if (!(t > r - e.getDate())) {
            e.setDate(e.getDate() + t);
            break;
          }
          ((t -= r - e.getDate() + 1),
            e.setDate(1),
            n < 11
              ? e.setMonth(n + 1)
              : (e.setMonth(0), e.setFullYear(e.getFullYear() + 1)));
        }
        return e;
      }
      function ft(e, t, n, r) {
        function a(e, t, n) {
          for (
            e = "number" == typeof e ? e.toString() : e || "";
            e.length < t;

          )
            e = n[0] + e;
          return e;
        }
        function o(e, t) {
          return a(e, t, "0");
        }
        function i(e, t) {
          function n(e) {
            return e < 0 ? -1 : 0 < e ? 1 : 0;
          }
          var r;
          return (r =
            0 === (r = n(e.getFullYear() - t.getFullYear())) &&
            0 === (r = n(e.getMonth() - t.getMonth()))
              ? n(e.getDate() - t.getDate())
              : r);
        }
        function s(e) {
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
        function u(e) {
          e = ct(new Date(e.V + 1900, 0, 1), e.Oa);
          var t = new Date(e.getFullYear() + 1, 0, 4),
            n = s(new Date(e.getFullYear(), 0, 4)),
            t = s(t);
          return i(n, e) <= 0
            ? i(t, e) <= 0
              ? e.getFullYear() + 1
              : e.getFullYear()
            : e.getFullYear() - 1;
        }
        var c,
          f = _[(r + 40) >> 2];
        for (c in ((r = {
          tb: _[r >> 2],
          sb: _[(r + 4) >> 2],
          Ma: _[(r + 8) >> 2],
          Ga: _[(r + 12) >> 2],
          Da: _[(r + 16) >> 2],
          V: _[(r + 20) >> 2],
          Na: _[(r + 24) >> 2],
          Oa: _[(r + 28) >> 2],
          Kb: _[(r + 32) >> 2],
          rb: _[(r + 36) >> 2],
          ub: f ? O(f) : "",
        }),
        (n = O(n)),
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
          n = n.replace(new RegExp(c, "g"), f[c]);
        var l,
          d,
          p = "Sunday Monday Tuesday Wednesday Thursday Friday Saturday".split(
            " ",
          ),
          m =
            "January February March April May June July August September October November December".split(
              " ",
            );
        for (c in (f = {
          "%a": function (e) {
            return p[e.Na].substring(0, 3);
          },
          "%A": function (e) {
            return p[e.Na];
          },
          "%b": function (e) {
            return m[e.Da].substring(0, 3);
          },
          "%B": function (e) {
            return m[e.Da];
          },
          "%C": function (e) {
            return o(((e.V + 1900) / 100) | 0, 2);
          },
          "%d": function (e) {
            return o(e.Ga, 2);
          },
          "%e": function (e) {
            return a(e.Ga, 2, " ");
          },
          "%g": function (e) {
            return u(e).toString().substring(2);
          },
          "%G": u,
          "%H": function (e) {
            return o(e.Ma, 2);
          },
          "%I": function (e) {
            return (0 == (e = e.Ma) ? (e = 12) : 12 < e && (e -= 12), o(e, 2));
          },
          "%j": function (e) {
            return o(e.Ga + it(ot(e.V + 1900) ? st : ut, e.Da - 1), 3);
          },
          "%m": function (e) {
            return o(e.Da + 1, 2);
          },
          "%M": function (e) {
            return o(e.sb, 2);
          },
          "%n": function () {
            return "\n";
          },
          "%p": function (e) {
            return 0 <= e.Ma && e.Ma < 12 ? "AM" : "PM";
          },
          "%S": function (e) {
            return o(e.tb, 2);
          },
          "%t": function () {
            return "\t";
          },
          "%u": function (e) {
            return e.Na || 7;
          },
          "%U": function (e) {
            var t = new Date(e.V + 1900, 0, 1),
              n = 0 === t.getDay() ? t : ct(t, 7 - t.getDay());
            return i(n, (e = new Date(e.V + 1900, e.Da, e.Ga))) < 0
              ? o(
                  Math.ceil(
                    (31 -
                      n.getDate() +
                      (it(ot(e.getFullYear()) ? st : ut, e.getMonth() - 1) -
                        31) +
                      e.getDate()) /
                      7,
                  ),
                  2,
                )
              : 0 === i(n, t)
                ? "01"
                : "00";
          },
          "%V": function (e) {
            var t = new Date(e.V + 1901, 0, 4),
              n = s(new Date(e.V + 1900, 0, 4)),
              t = s(t),
              r = ct(new Date(e.V + 1900, 0, 1), e.Oa);
            return i(r, n) < 0
              ? "53"
              : i(t, r) <= 0
                ? "01"
                : o(
                    Math.ceil(
                      (n.getFullYear() < e.V + 1900
                        ? e.Oa + 32 - n.getDate()
                        : e.Oa + 1 - n.getDate()) / 7,
                    ),
                    2,
                  );
          },
          "%w": function (e) {
            return e.Na;
          },
          "%W": function (e) {
            var t = new Date(e.V, 0, 1),
              n =
                1 === t.getDay()
                  ? t
                  : ct(t, 0 === t.getDay() ? 1 : 7 - t.getDay() + 1);
            return i(n, (e = new Date(e.V + 1900, e.Da, e.Ga))) < 0
              ? o(
                  Math.ceil(
                    (31 -
                      n.getDate() +
                      (it(ot(e.getFullYear()) ? st : ut, e.getMonth() - 1) -
                        31) +
                      e.getDate()) /
                      7,
                  ),
                  2,
                )
              : 0 === i(n, t)
                ? "01"
                : "00";
          },
          "%y": function (e) {
            return (e.V + 1900).toString().substring(2);
          },
          "%Y": function (e) {
            return e.V + 1900;
          },
          "%z": function (e) {
            var t = 0 <= (e = e.rb);
            return (
              (e = Math.abs(e) / 60),
              (t ? "+" : "-") +
                String("0000" + ((e / 60) * 100 + (e % 60))).slice(-4)
            );
          },
          "%Z": function (e) {
            return e.ub;
          },
          "%%": function () {
            return "%";
          },
        }))
          n.includes(c) && (n = n.replace(new RegExp(c, "g"), f[c](r)));
        return (
          (l = n),
          (d = Array(ue(l) + 1)),
          F(l, d, 0, d.length),
          (c = d).length > t ? 0 : (h.set(c, e), c.length - 1)
        );
      }
      function lt(e) {
        try {
          e();
        } catch (e) {
          y(e);
        }
      }
      var v = 0,
        b = null,
        dt = 0,
        pt = [],
        mt = {},
        ht = {},
        _t = 0,
        yt = null,
        gt = [],
        wt = [];
      function vt(n) {
        var e,
          r = {};
        for (e in n)
          !(function (e) {
            var t = n[e];
            r[e] =
              "function" == typeof t
                ? function () {
                    pt.push(e);
                    try {
                      return t.apply(null, arguments);
                    } catch (e) {
                      if (-1 === e.message.indexOf("unreachable")) throw e;
                    } finally {
                      c ||
                        (re(pt.pop() === e),
                        b &&
                          1 === v &&
                          0 === pt.length &&
                          ((R += 1),
                          (v = 0),
                          lt(i._asyncify_stop_unwind),
                          "undefined" != typeof Fibers && Fibers.Lb(),
                          yt) &&
                          (yt(), (yt = null)));
                    }
                  }
                : t;
          })(e);
        return r;
      }
      function bt(e) {
        var r, a, t, n;
        if (!c)
          return (
            0 === v
              ? ((a = r = !1),
                e(function (e) {
                  var t, n;
                  !c &&
                    ((dt = e || 0), (r = !0), a) &&
                    ((v = 2),
                    lt(function () {
                      i._asyncify_start_rewind(b);
                    }),
                    "undefined" != typeof Browser &&
                      Browser.Ra.Wa &&
                      Browser.Ra.resume(),
                    (n = i.asm[ht[_[(b + 8) >> 2]]]),
                    --R,
                    (t = n()),
                    b ||
                      ((e = gt),
                      (gt = []),
                      e.forEach(function (e) {
                        e(t);
                      })));
                }),
                (a = !0),
                r ||
                  ((v = 1),
                  (e = P(4108)),
                  (t = e + 12),
                  (_[e >> 2] = t),
                  (_[(e + 4) >> 2] = t + 4096),
                  (t = pt[0]),
                  void 0 === (n = mt[t]) &&
                    ((n = _t++), (mt[t] = n), (ht[n] = t)),
                  (_[(e + 8) >> 2] = n),
                  (b = e),
                  lt(function () {
                    i._asyncify_start_unwind(b);
                  }),
                  "undefined" != typeof Browser &&
                    Browser.Ra.Wa &&
                    Browser.Ra.pause()))
              : 2 === v
                ? ((v = 0),
                  lt(i._asyncify_stop_rewind),
                  A(b),
                  (b = null),
                  wt.forEach(function (e) {
                    j(e);
                  }))
                : y("invalid state: " + v),
            dt
          );
      }
      l ||
        ((function (t, n) {
          try {
            var e = indexedDB.open("emscripten_filesystem", 1);
          } catch (e) {
            return n(e);
          }
          ((e.onupgradeneeded = function (e) {
            ((e = e.target.result).objectStoreNames.contains("FILES") &&
              e.deleteObjectStore("FILES"),
              e.createObjectStore("FILES"));
          }),
            (e.onsuccess = function (e) {
              t(e.target.result);
            }),
            (e.onerror = function (e) {
              n(e);
            }));
        })(
          function (e) {
            ((He = e), we());
          },
          function () {
            ((He = !1), we());
          },
        ),
        "undefined" != typeof ENVIRONMENT_IS_FETCH_WORKER &&
          ENVIRONMENT_IS_FETCH_WORKER) ||
        ge();
      var At,
        Et = [
          null,
          function (e, t) {
            if (l) return w(1, 1, e, t);
          },
          Oe,
          Fe,
          Re,
          je,
          Pe,
          Ne,
          $e,
          et,
          tt,
          nt,
          rt,
          at,
        ],
        xt = {
          c: function (e, t, n, r) {
            y(
              "Assertion failed: " +
                O(e) +
                ", at: " +
                [
                  t ? O(t) : "unknown filename",
                  n,
                  r ? O(r) : "unknown function",
                ],
            );
          },
          E: function (e, t) {
            St(e, t);
          },
          n: function (e, t) {
            g.Ta.push(function () {
              B.apply(null, [e, t]);
            });
          },
          L: function (e, t, n, r) {
            if ("undefined" == typeof SharedArrayBuffer)
              return (
                d(
                  "Current environment does not support SharedArrayBuffer, pthreads are not available!",
                ),
                6
              );
            if (!e)
              return (
                d("pthread_create called with a null thread pointer!"),
                28
              );
            var a = [];
            if (l && 0 === a.length) return Tt(687865856, e, t, n, r);
            var o,
              i = 0,
              s = 0;
            (t && -1 != t
              ? ((o = _[t >> 2]),
                (o += 81920),
                (i = _[(t + 8) >> 2]),
                (s = 0 !== _[(t + 12) >> 2]))
              : (o = 2097152),
              (t = 0 == i) ? (i = Nt(16, o)) : re(0 < (i -= o)));
            for (var u = P(228), c = 0; c < 57; ++c) C[(u >> 2) + c] = 0;
            return (
              (_[e >> 2] = u),
              (_[(u + 12) >> 2] = u),
              (_[(e = u + 152) >> 2] = e),
              (n = {
                Ba: i,
                Ca: o,
                Pa: t,
                detached: s,
                ob: n,
                Ka: u,
                Ea: r,
                vb: a,
              }),
              l ? ((n.yb = "spawnThread"), postMessage(n, a), 0) : Me(n)
            );
          },
          J: function (e) {
            throw (l ? g.ab(e) : (g.Za(), zt(e)), "unwind");
          },
          K: function (e, t) {
            var n = e,
              r = t;
            if (!n)
              return (
                d("pthread_join attempted on a null thread pointer!"),
                71
              );
            if (l && E() == n)
              return (
                d("PThread " + n + " is attempting to join to itself!"),
                16
              );
            if (!l && kt() == n)
              return (
                d("Main thread " + n + " is attempting to join to itself!"),
                16
              );
            if (_[(n + 12) >> 2] !== n)
              return (
                d(
                  "pthread_join attempted on thread " +
                    n +
                    ", which does not point to a valid thread, or does not exist anymore!",
                ),
                71
              );
            if (Atomics.load(C, (n + 64) >> 2))
              return (
                d(
                  "Attempted to join thread " +
                    n +
                    ", which was already detached!",
                ),
                28
              );
            for (Te(); ; ) {
              var a = Atomics.load(C, n >> 2);
              if (1 == a)
                return (
                  (a = Atomics.load(C, (n + 4) >> 2)),
                  r && (_[r >> 2] = a),
                  Atomics.store(C, (n + 64) >> 2, 1),
                  l ? postMessage({ cmd: "cleanupThread", thread: n }) : Se(n),
                  0
                );
              (Ot(), l || It(), ke(n, a, l ? 100 : 1));
            }
          },
          h: Oe,
          u: Fe,
          v: Re,
          P: function (e) {
            delete Ve[e - 1];
          },
          O: function (e, t) {
            if (e == t) postMessage({ cmd: "processQueuedMainThreadWork" });
            else if (l)
              postMessage({ targetThread: e, cmd: "processThreadQueue" });
            else {
              if (!(e = (e = g.xa[e]) && e.worker)) return;
              e.postMessage({ cmd: "processThreadQueue" });
            }
            return 1;
          },
          b: je,
          C: function (e, t) {
            if (0 === e) e = Date.now();
            else {
              if (1 !== e && 4 !== e) return ((_[Lt() >> 2] = 28), -1);
              e = Ie();
            }
            return (
              (_[t >> 2] = (e / 1e3) | 0),
              (_[(t + 4) >> 2] = ((e % 1e3) * 1e6) | 0),
              0
            );
          },
          Q: function (e, t, n) {
            var r;
            for (Le.length = 0, n >>= 2; (r = I[t++]); )
              ((r = r < 105) && 1 & n && n++,
                Le.push(r ? oe[n++ >> 1] : _[n]),
                ++n);
            return Ae[e].apply(null, Le);
          },
          D: Te,
          l: function () {},
          o: Pe,
          d: ke,
          e: xe,
          f: Ie,
          r: function (e, t, n) {
            I.copyWithin(e, t, t + n);
          },
          G: function (e, t, n) {
            ((Be.length = t), (n >>= 3));
            for (var r = 0; r < t; r++) Be[r] = oe[n + r];
            return (e < 0 ? Ae[-e - 1] : Et[e]).apply(null, Be);
          },
          t: function () {
            y("OOM");
          },
          H: function (e, t, n) {
            return (Ue(e) ? We : Ne)(e, t, n);
          },
          k: function () {},
          F: function () {},
          N: function (e, t, n) {
            return (
              (R += 1),
              setTimeout(function () {
                (--R,
                  j(function () {
                    B.apply(null, [e, n]);
                  }));
              }, t)
            );
          },
          p: function (n) {
            bt(function (e) {
              var t;
              ((t = e),
                (R += 1),
                setTimeout(function () {
                  (--R, j(t));
                }, n));
            });
          },
          m: function (e, n, t, r, a) {
            function o(e, t) {
              Ge(
                e,
                t.response,
                function (e) {
                  (--R,
                    j(function () {
                      d ? B.apply(null, [d, e]) : n && n(e);
                    }, v));
                },
                function (e) {
                  (--R,
                    j(function () {
                      d ? B.apply(null, [d, e]) : n && n(e);
                    }, v));
                },
              );
            }
            function i(e) {
              j(function () {
                h ? B.apply(null, [h, e]) : a && a(e);
              }, v);
            }
            function s(e) {
              (--R,
                j(function () {
                  p ? B.apply(null, [p, e]) : t && t(e);
                }, v));
            }
            function u(e) {
              j(function () {
                m ? B.apply(null, [m, e]) : r && r(e);
              }, v);
            }
            function c(e) {
              (--R,
                j(function () {
                  d ? B.apply(null, [d, e]) : n && n(e);
                }, v));
            }
            R += 1;
            var f = e + 112,
              l = O(f),
              d = C[(f + 36) >> 2],
              p = C[(f + 40) >> 2],
              m = C[(f + 44) >> 2],
              h = C[(f + 48) >> 2],
              _ = C[(f + 52) >> 2],
              y = !!(4 & _),
              g = !!(32 & _),
              w = !!(16 & _),
              v = !!(64 & _);
            if ("EM_IDB_STORE" === l)
              ((l = C[(f + 84) >> 2]),
                Ge(e, I.slice(l, l + C[(f + 88) >> 2]), c, s));
            else if ("EM_IDB_DELETE" === l) {
              var b = e;
              var A = c;
              var E = s;
              _ = He;
              if (_) {
                f = C[(b + 112 + 64) >> 2];
                f = O((f = f || C[(b + 8) >> 2]));
                try {
                  var x = _.transaction(["FILES"], "readwrite")
                    .objectStore("FILES")
                    .delete(f);
                  ((x.onsuccess = function (e) {
                    ((e = e.target.result),
                      (C[(b + 12) >> 2] = 0),
                      L(b + 16, 0),
                      L(b + 24, 0),
                      L(b + 32, 0),
                      (D[(b + 40) >> 1] = 4),
                      (D[(b + 42) >> 1] = 200),
                      F("OK", I, b + 44, 64),
                      A(b, 0, e));
                  }),
                    (x.onerror = function (e) {
                      ((D[(b + 40) >> 1] = 4),
                        (D[(b + 42) >> 1] = 404),
                        F("Not Found", I, b + 44, 64),
                        E(b, 0, e));
                    }));
                } catch (e) {
                  E(b, 0, e);
                }
              } else E(b, 0, "IndexedDB not available!");
            } else if (w) {
              if (g) return 0;
              Ye(e, y ? o : c, s, u, i);
            } else {
              var S = e;
              var M = c;
              var k = g
                ? s
                : y
                  ? function (e) {
                      Ye(e, o, s, u, i);
                    }
                  : function (e) {
                      Ye(e, c, s, u, i);
                    };
              l = He;
              if (l) {
                _ = C[(S + 112 + 64) >> 2];
                _ = O((_ = _ || C[(S + 8) >> 2]));
                try {
                  var T = l
                    .transaction(["FILES"], "readonly")
                    .objectStore("FILES")
                    .get(_);
                  ((T.onsuccess = function (e) {
                    var t, n;
                    e.target.result
                      ? ((t = (e = e.target.result).byteLength || e.length),
                        (n = P(t)),
                        I.set(new Uint8Array(e), n),
                        (C[(S + 12) >> 2] = n),
                        L(S + 16, t),
                        L(S + 24, 0),
                        L(S + 32, t),
                        (D[(S + 40) >> 1] = 4),
                        (D[(S + 42) >> 1] = 200),
                        F("OK", I, S + 44, 64),
                        M(S, 0, e))
                      : ((D[(S + 40) >> 1] = 4),
                        (D[(S + 42) >> 1] = 404),
                        F("Not Found", I, S + 44, 64),
                        k(S, 0, "no data"));
                  }),
                    (T.onerror = function (e) {
                      ((D[(S + 40) >> 1] = 4),
                        (D[(S + 42) >> 1] = 404),
                        F("Not Found", I, S + 44, 64),
                        k(S, 0, e));
                    }));
                } catch (e) {
                  k(S, 0, e);
                }
              } else k(S, 0, "IndexedDB not available!");
            }
            return e;
          },
          s: function () {
            return (
              (t = async () => {
                var e = await i.queue.get(),
                  t = ue(e) + 1,
                  n = P(t);
                return (F(e, I, n, t), n);
              }),
              bt(function (e) {
                t().then(e);
              })
            );
            var t;
          },
          I: function (e, t) {
            return (
              (t = {
                alpha: !!_[(t >>= 2)],
                depth: !!_[t + 1],
                stencil: !!_[t + 2],
                antialias: !!_[t + 3],
                premultipliedAlpha: !!_[t + 4],
                preserveDrawingBuffer: !!_[t + 5],
                powerPreference: Xe[_[t + 6]],
                failIfMajorPerformanceCaveat: !!_[t + 7],
                kb: _[t + 8],
                Fb: _[t + 9],
                Va: _[t + 10],
                eb: _[t + 11],
                Hb: _[t + 12],
                Ib: _[t + 13],
              }),
              !(e = Ue(e)) || t.eb ? 0 : ze(e, t)
            );
          },
          z: $e,
          A: et,
          g: function (e) {
            zt(e);
          },
          i: tt,
          x: nt,
          q: rt,
          w: at,
          M: function () {
            g.hb();
          },
          a: u || i.wasmMemory,
          B: function () {
            i.pauseQueue();
          },
          y: ft,
          j: function () {
            i.unpauseQueue();
          },
        },
        St =
          (!(function () {
            function t(e, t) {
              ((e = vt((e = e.exports))),
                (i.asm = e),
                de.unshift(i.asm.R),
                g.Ua.push(i.asm.U),
                (te = t),
                l || we());
            }
            function n(e) {
              t(e.instance, e.module);
            }
            function r(e) {
              return (
                Z || (!z && !o) || "function" != typeof fetch
                  ? Promise.resolve().then(be)
                  : fetch(p, { credentials: "same-origin" })
                      .then(function (e) {
                        if (e.ok) return e.arrayBuffer();
                        throw "failed to load wasm binary file at '" + p + "'";
                      })
                      .catch(be)
              )
                .then(function (e) {
                  return WebAssembly.instantiate(e, a);
                })
                .then(e, function (e) {
                  (d("failed to asynchronously prepare wasm: " + e), y(e));
                });
            }
            var a = { a: xt };
            if ((l || ge(), i.instantiateWasm))
              try {
                var e = i.instantiateWasm(a, t);
                return vt(e);
              } catch (e) {
                return d(
                  "Module.instantiateWasm callback failed with error: " + e,
                );
              }
            (Z ||
            "function" != typeof WebAssembly.instantiateStreaming ||
            ve() ||
            "function" != typeof fetch
              ? r(n)
              : fetch(p, { credentials: "same-origin" }).then(function (e) {
                  return WebAssembly.instantiateStreaming(e, a).then(
                    n,
                    function (e) {
                      return (
                        d("wasm streaming compile failed: " + e),
                        d("falling back to ArrayBuffer instantiation"),
                        r(n)
                      );
                    },
                  );
                })
            ).catch(k);
          })(),
          (i.___wasm_call_ctors = function () {
            return (i.___wasm_call_ctors = i.asm.R).apply(null, arguments);
          }),
          (i._main = function () {
            return (St = i._main = i.asm.S).apply(null, arguments);
          })),
        A = (i._free = function () {
          return (A = i._free = i.asm.T).apply(null, arguments);
        }),
        P =
          ((i._emscripten_tls_init = function () {
            return (i._emscripten_tls_init = i.asm.U).apply(null, arguments);
          }),
          (i._malloc = function () {
            return (P = i._malloc = i.asm.W).apply(null, arguments);
          })),
        Mt =
          ((i._emscripten_current_thread_process_queued_calls = function () {
            return (i._emscripten_current_thread_process_queued_calls =
              i.asm.X).apply(null, arguments);
          }),
          (i._emscripten_register_main_browser_thread_id = function () {
            return (Mt = i._emscripten_register_main_browser_thread_id =
              i.asm.Y).apply(null, arguments);
          })),
        kt = (i._emscripten_main_browser_thread_id = function () {
          return (kt = i._emscripten_main_browser_thread_id = i.asm.Z).apply(
            null,
            arguments,
          );
        }),
        Tt = (i._emscripten_sync_run_in_main_thread_4 = function () {
          return (Tt = i._emscripten_sync_run_in_main_thread_4 = i.asm._).apply(
            null,
            arguments,
          );
        }),
        It = (i._emscripten_main_thread_process_queued_calls = function () {
          return (It = i._emscripten_main_thread_process_queued_calls =
            i.asm.$).apply(null, arguments);
        }),
        Dt = (i._emscripten_run_in_main_runtime_thread_js = function () {
          return (Dt = i._emscripten_run_in_main_runtime_thread_js =
            i.asm.aa).apply(null, arguments);
        }),
        Ct = (i.__emscripten_call_on_thread = function () {
          return (Ct = i.__emscripten_call_on_thread = i.asm.ba).apply(
            null,
            arguments,
          );
        }),
        Ot =
          ((i._emscripten_proxy_main = function () {
            return (i._emscripten_proxy_main = i.asm.ca).apply(null, arguments);
          }),
          (i._pthread_testcancel = function () {
            return (Ot = i._pthread_testcancel = i.asm.da).apply(
              null,
              arguments,
            );
          })),
        E = (i._pthread_self = function () {
          return (E = i._pthread_self = i.asm.ea).apply(null, arguments);
        }),
        Ft = (i._pthread_exit = function () {
          return (Ft = i._pthread_exit = i.asm.fa).apply(null, arguments);
        }),
        Rt = (i.__emscripten_thread_init = function () {
          return (Rt = i.__emscripten_thread_init = i.asm.ga).apply(
            null,
            arguments,
          );
        }),
        jt = (i._emscripten_get_global_libc = function () {
          return (jt = i._emscripten_get_global_libc = i.asm.ha).apply(
            null,
            arguments,
          );
        }),
        Lt = (i.___errno_location = function () {
          return (Lt = i.___errno_location = i.asm.ia).apply(null, arguments);
        }),
        Pt = (i.___pthread_tsd_run_dtors = function () {
          return (Pt = i.___pthread_tsd_run_dtors = i.asm.ja).apply(
            null,
            arguments,
          );
        }),
        Bt = (i.stackSave = function () {
          return (Bt = i.stackSave = i.asm.ka).apply(null, arguments);
        }),
        qt = (i.stackRestore = function () {
          return (qt = i.stackRestore = i.asm.la).apply(null, arguments);
        }),
        Ut = (i.stackAlloc = function () {
          return (Ut = i.stackAlloc = i.asm.ma).apply(null, arguments);
        }),
        Wt = (i._emscripten_stack_set_limits = function () {
          return (Wt = i._emscripten_stack_set_limits = i.asm.na).apply(
            null,
            arguments,
          );
        }),
        Nt = (i._memalign = function () {
          return (Nt = i._memalign = i.asm.oa).apply(null, arguments);
        }),
        B = (i.dynCall_vi = function () {
          return (B = i.dynCall_vi = i.asm.pa).apply(null, arguments);
        }),
        Ht = (i.dynCall_ii = function () {
          return (Ht = i.dynCall_ii = i.asm.qa).apply(null, arguments);
        }),
        Vt = (i.dynCall_v = function () {
          return (Vt = i.dynCall_v = i.asm.ra).apply(null, arguments);
        }),
        Yt =
          ((i._asyncify_start_unwind = function () {
            return (i._asyncify_start_unwind = i.asm.sa).apply(null, arguments);
          }),
          (i._asyncify_stop_unwind = function () {
            return (i._asyncify_stop_unwind = i.asm.ta).apply(null, arguments);
          }),
          (i._asyncify_start_rewind = function () {
            return (i._asyncify_start_rewind = i.asm.ua).apply(null, arguments);
          }),
          (i._asyncify_stop_rewind = function () {
            return (i._asyncify_stop_rewind = i.asm.va).apply(null, arguments);
          }),
          (i.__emscripten_allow_main_runtime_queued_calls = 29752)),
        x = (i.__emscripten_main_thread_futex = 1246696);
      function S(e) {
        ((this.name = "ExitStatus"),
          (this.message = "Program terminated with exit(" + e + ")"),
          (this.status = e));
      }
      function Gt(o) {
        function e() {
          if (!At && ((At = !0), (i.calledRun = !0), !c)) {
            if (
              (l || Ee(de),
              l || Ee(pe),
              M(i),
              i.onRuntimeInitialized && i.onRuntimeInitialized(),
              Qt)
            ) {
              var e = o,
                t = i._emscripten_proxy_main,
                n = (e = e || []).length + 1,
                r = Ut(4 * (n + 1));
              _[r >> 2] = ce(V);
              for (var a = 1; a < n; a++) _[(r >> 2) + a] = ce(e[a - 1]);
              ((_[(r >> 2) + n] = 0), t(n, r));
            }
            if (!l) {
              if (i.postRun)
                for (
                  "function" == typeof i.postRun && (i.postRun = [i.postRun]);
                  i.postRun.length;

                )
                  ((e = i.postRun.shift()), me.unshift(e));
              Ee(me);
            }
          }
        }
        if (((o = o || H), !(0 < m)))
          if (l) (M(i), l || Ee(de), postMessage({ cmd: "loaded" }));
          else {
            if (!l) {
              if (i.preRun)
                for (
                  "function" == typeof i.preRun && (i.preRun = [i.preRun]);
                  i.preRun.length;

                )
                  ((t = void 0), (t = i.preRun.shift()), le.unshift(t));
              Ee(le);
            }
            0 < m ||
              (i.setStatus
                ? (i.setStatus("Running..."),
                  setTimeout(function () {
                    (setTimeout(function () {
                      i.setStatus("");
                    }, 1),
                      e());
                  }, 1))
                : e());
          }
        var t;
      }
      function zt(e) {
        if (((ne = e), l))
          throw (postMessage({ cmd: "exitProcess", returnCode: e }), new S(e));
        (he() || g.Sa(),
          (ne = e),
          he() || (g.Sa(), i.onExit && i.onExit(e), (c = !0)),
          Y(e, new S(e)));
      }
      if (
        ((i.keepRuntimeAlive = he),
        (i.PThread = g),
        (i.PThread = g),
        (i.wasmMemory = u),
        (i.ExitStatus = S),
        (ye = function e() {
          (At || Gt(), At || (ye = e));
        }),
        (i.run = Gt),
        i.preInit)
      )
        for (
          "function" == typeof i.preInit && (i.preInit = [i.preInit]);
          0 < i.preInit.length;

        )
          i.preInit.pop()();
      var Qt = !0;
      return (
        i.noInitialRun && (Qt = !1),
        l && ((ee = !1), g.ib()),
        Gt(),
        e.ready
      );
    }
    var Kt;
    ((Kt =
      "undefined" != typeof document && document.currentScript
        ? document.currentScript.src
        : void 0),
      "undefined" != typeof __filename && (Kt = Kt || __filename));
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
  ("undefined" != typeof self &&
    "worker" === self.location.hash.split(",")[1]) ||
  ("undefined" != typeof global &&
    "[object process]" === Object.prototype.toString.call(global.process) &&
    !require("worker_threads").isMainThread)
    ? (function () {
        "use strict";
        var e,
          t,
          n,
          a = {};
        "object" == typeof process &&
          "object" == typeof process.versions &&
          "string" == typeof process.versions.node &&
          ((e = require("worker_threads")),
          (t = e.parentPort).on("message", function (e) {
            onmessage({ data: e });
          }),
          (n = require("fs")),
          Object.assign(global, {
            self: global,
            require: require,
            Module: a,
            location: { href: __filename },
            Worker: e.Worker,
            importScripts: function (e) {
              (0, eval)(n.readFileSync(e, "utf8"));
            },
            postMessage: function (e) {
              t.postMessage(e);
            },
            performance: global.performance || {
              now: function () {
                return Date.now();
              },
            },
          }));
        var o = function () {
          var e = Array.prototype.slice.call(arguments).join(" ");
          console.error(e);
        };
        ((self.alert = function () {
          var e = Array.prototype.slice.call(arguments).join(" ");
          postMessage({ cmd: "alert", text: e, threadId: a._pthread_self() });
        }),
          (a.instantiateWasm = function (e, t) {
            e = new WebAssembly.Instance(a.wasmModule, e);
            return (t(e), (a.wasmModule = null), e.exports);
          }),
          (self.onmessage = function (e) {
            try {
              if ("load" === e.data.cmd)
                ((a.wasmModule = e.data.wasmModule),
                  (a.wasmMemory = e.data.wasmMemory),
                  (a.buffer = a.wasmMemory.buffer),
                  (a.ENVIRONMENT_IS_PTHREAD = !0),
                  i()(a).then(function (e) {
                    a = e;
                  }));
              else if ("objectTransfer" === e.data.cmd)
                a.PThread.receiveObjectTransfer(e.data);
              else if ("run" === e.data.cmd) {
                ((a.__performance_now_clock_drift =
                  performance.now() - e.data.time),
                  a.__emscripten_thread_init(e.data.threadInfoStruct, 0, 0));
                var t = e.data.stackBase,
                  n = e.data.stackBase + e.data.stackSize;
                (a.establishStackSpace(n, t),
                  a.PThread.receiveObjectTransfer(e.data),
                  a.PThread.threadInit());
                try {
                  var r = a.invokeEntryPoint(e.data.start_routine, e.data.arg);
                  a.keepRuntimeAlive()
                    ? a.PThread.setExitStatus(r)
                    : a.PThread.threadExit(r);
                } catch (e) {
                  if ("Canceled!" === e) a.PThread.threadCancel();
                  else if ("unwind" != e) {
                    if (!(e instanceof a.ExitStatus))
                      throw (a.PThread.threadExit(-2), e);
                    a.keepRuntimeAlive() || a.PThread.threadExit(e.status);
                  }
                }
              } else
                "cancel" === e.data.cmd
                  ? a._pthread_self() && a.PThread.threadCancel()
                  : "setimmediate" !== e.data.target &&
                    ("processThreadQueue" === e.data.cmd
                      ? a._pthread_self() &&
                        a._emscripten_current_thread_process_queued_calls()
                      : (o("worker.js received unknown command " + e.data.cmd),
                        o(e.data)));
            } catch (e) {
              throw (
                o("worker.js onmessage() captured an uncaught exception: " + e),
                e && e.stack && o(e.stack),
                e
              );
            }
          }));
        const r = self.onmessage;
        onmessage = self.onmessage = (e) => {
          "custom" === e.data.cmd
            ? "function" == typeof a.onCustomMessage &&
              a.onCustomMessage(e.data.userData)
            : r(e);
        };
      })()
    : ("undefined" != typeof onmessage &&
          ("undefined" == typeof window || void 0 === window.document)) ||
        ("undefined" != typeof global &&
          "[object process]" === Object.prototype.toString.call(global.process))
      ? ((r =
          "undefined" != typeof global &&
          "[object process]" ===
            Object.prototype.toString.call(global.process)),
        (a = []),
        r
          ? require.main === module
            ? ((t = require("path").join(__dirname, "stockfish-nnue-16.wasm")),
              (e = {
                locateFile: function (e) {
                  return -1 < e.indexOf(".wasm") ? t : __filename;
                },
              }),
              i()(e).then(function (t) {
                ((n = t).addMessageListener(function (e) {
                  console.log(e);
                }),
                  a.length &&
                    a.forEach(function (e) {
                      t.postMessage(e, !0);
                    }),
                  (a = null));
              }),
              require("readline")
                .createInterface({
                  input: process.stdin,
                  output: process.stdout,
                  completer: function (t) {
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
                    function n(e) {
                      return 0 === e.indexOf(t);
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
                    ].filter(n);
                    return [
                      (r = r.length
                        ? r
                        : (t = t.replace(/^.*\s/, ""))
                          ? e.filter(n)
                          : e),
                      t,
                    ];
                  },
                  historySize: 100,
                })
                .on("line", function (e) {
                  e &&
                    (("quit" !== e && "exit" !== e) || process.exit(),
                    n ? n.postMessage(e, !0) : a.push(e));
                })
                .on("close", function () {
                  process.exit();
                })
                .setPrompt(""))
            : (module.exports = i)
          : ((r = self.location.hash.substr(1).split(",")),
            (t = decodeURIComponent(r[0] || "stockfish-nnue-16.wasm")),
            (e = {
              locateFile: function (e) {
                return -1 < e.indexOf(".wasm")
                  ? t
                  : self.location.origin +
                      self.location.pathname +
                      "#" +
                      t +
                      ",worker";
              },
            }),
            i()(e)
              .then(function (t) {
                ((n = t).addMessageListener(function (e) {
                  postMessage(e);
                }),
                  a.length &&
                    a.forEach(function (e) {
                      t.postMessage(e, !0);
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
                n ? n.postMessage(e.data, !0) : a.push(e.data);
              })))
      : "object" == typeof document && document.currentScript
        ? (document.currentScript._exports = i())
        : i();
})();
