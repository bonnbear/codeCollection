import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path$f from "node:path";
import require$$0$1 from "child_process";
import require$$1 from "path";
import require$$0 from "fs";
import require$$0$2 from "constants";
import require$$0$3 from "stream";
import require$$4 from "util";
import require$$5 from "assert";
var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var crossSpawn = { exports: {} };
var windows;
var hasRequiredWindows;
function requireWindows() {
  if (hasRequiredWindows) return windows;
  hasRequiredWindows = 1;
  windows = isexe2;
  isexe2.sync = sync2;
  var fs2 = require$$0;
  function checkPathExt(path2, options) {
    var pathext = options.pathExt !== void 0 ? options.pathExt : process.env.PATHEXT;
    if (!pathext) {
      return true;
    }
    pathext = pathext.split(";");
    if (pathext.indexOf("") !== -1) {
      return true;
    }
    for (var i = 0; i < pathext.length; i++) {
      var p = pathext[i].toLowerCase();
      if (p && path2.substr(-p.length).toLowerCase() === p) {
        return true;
      }
    }
    return false;
  }
  function checkStat(stat2, path2, options) {
    if (!stat2.isSymbolicLink() && !stat2.isFile()) {
      return false;
    }
    return checkPathExt(path2, options);
  }
  function isexe2(path2, options, cb) {
    fs2.stat(path2, function(er, stat2) {
      cb(er, er ? false : checkStat(stat2, path2, options));
    });
  }
  function sync2(path2, options) {
    return checkStat(fs2.statSync(path2), path2, options);
  }
  return windows;
}
var mode;
var hasRequiredMode;
function requireMode() {
  if (hasRequiredMode) return mode;
  hasRequiredMode = 1;
  mode = isexe2;
  isexe2.sync = sync2;
  var fs2 = require$$0;
  function isexe2(path2, options, cb) {
    fs2.stat(path2, function(er, stat2) {
      cb(er, er ? false : checkStat(stat2, options));
    });
  }
  function sync2(path2, options) {
    return checkStat(fs2.statSync(path2), options);
  }
  function checkStat(stat2, options) {
    return stat2.isFile() && checkMode(stat2, options);
  }
  function checkMode(stat2, options) {
    var mod = stat2.mode;
    var uid = stat2.uid;
    var gid = stat2.gid;
    var myUid = options.uid !== void 0 ? options.uid : process.getuid && process.getuid();
    var myGid = options.gid !== void 0 ? options.gid : process.getgid && process.getgid();
    var u2 = parseInt("100", 8);
    var g = parseInt("010", 8);
    var o = parseInt("001", 8);
    var ug = u2 | g;
    var ret = mod & o || mod & g && gid === myGid || mod & u2 && uid === myUid || mod & ug && myUid === 0;
    return ret;
  }
  return mode;
}
var core;
if (process.platform === "win32" || commonjsGlobal.TESTING_WINDOWS) {
  core = requireWindows();
} else {
  core = requireMode();
}
var isexe_1 = isexe$1;
isexe$1.sync = sync;
function isexe$1(path2, options, cb) {
  if (typeof options === "function") {
    cb = options;
    options = {};
  }
  if (!cb) {
    if (typeof Promise !== "function") {
      throw new TypeError("callback not provided");
    }
    return new Promise(function(resolve, reject) {
      isexe$1(path2, options || {}, function(er, is) {
        if (er) {
          reject(er);
        } else {
          resolve(is);
        }
      });
    });
  }
  core(path2, options || {}, function(er, is) {
    if (er) {
      if (er.code === "EACCES" || options && options.ignoreErrors) {
        er = null;
        is = false;
      }
    }
    cb(er, is);
  });
}
function sync(path2, options) {
  try {
    return core.sync(path2, options || {});
  } catch (er) {
    if (options && options.ignoreErrors || er.code === "EACCES") {
      return false;
    } else {
      throw er;
    }
  }
}
const isWindows = process.platform === "win32" || process.env.OSTYPE === "cygwin" || process.env.OSTYPE === "msys";
const path$e = require$$1;
const COLON = isWindows ? ";" : ":";
const isexe = isexe_1;
const getNotFoundError = (cmd) => Object.assign(new Error(`not found: ${cmd}`), { code: "ENOENT" });
const getPathInfo = (cmd, opt) => {
  const colon = opt.colon || COLON;
  const pathEnv = cmd.match(/\//) || isWindows && cmd.match(/\\/) ? [""] : [
    // windows always checks the cwd first
    ...isWindows ? [process.cwd()] : [],
    ...(opt.path || process.env.PATH || /* istanbul ignore next: very unusual */
    "").split(colon)
  ];
  const pathExtExe = isWindows ? opt.pathExt || process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM" : "";
  const pathExt = isWindows ? pathExtExe.split(colon) : [""];
  if (isWindows) {
    if (cmd.indexOf(".") !== -1 && pathExt[0] !== "")
      pathExt.unshift("");
  }
  return {
    pathEnv,
    pathExt,
    pathExtExe
  };
};
const which$1 = (cmd, opt, cb) => {
  if (typeof opt === "function") {
    cb = opt;
    opt = {};
  }
  if (!opt)
    opt = {};
  const { pathEnv, pathExt, pathExtExe } = getPathInfo(cmd, opt);
  const found = [];
  const step = (i) => new Promise((resolve, reject) => {
    if (i === pathEnv.length)
      return opt.all && found.length ? resolve(found) : reject(getNotFoundError(cmd));
    const ppRaw = pathEnv[i];
    const pathPart = /^".*"$/.test(ppRaw) ? ppRaw.slice(1, -1) : ppRaw;
    const pCmd = path$e.join(pathPart, cmd);
    const p = !pathPart && /^\.[\\\/]/.test(cmd) ? cmd.slice(0, 2) + pCmd : pCmd;
    resolve(subStep(p, i, 0));
  });
  const subStep = (p, i, ii) => new Promise((resolve, reject) => {
    if (ii === pathExt.length)
      return resolve(step(i + 1));
    const ext = pathExt[ii];
    isexe(p + ext, { pathExt: pathExtExe }, (er, is) => {
      if (!er && is) {
        if (opt.all)
          found.push(p + ext);
        else
          return resolve(p + ext);
      }
      return resolve(subStep(p, i, ii + 1));
    });
  });
  return cb ? step(0).then((res) => cb(null, res), cb) : step(0);
};
const whichSync = (cmd, opt) => {
  opt = opt || {};
  const { pathEnv, pathExt, pathExtExe } = getPathInfo(cmd, opt);
  const found = [];
  for (let i = 0; i < pathEnv.length; i++) {
    const ppRaw = pathEnv[i];
    const pathPart = /^".*"$/.test(ppRaw) ? ppRaw.slice(1, -1) : ppRaw;
    const pCmd = path$e.join(pathPart, cmd);
    const p = !pathPart && /^\.[\\\/]/.test(cmd) ? cmd.slice(0, 2) + pCmd : pCmd;
    for (let j = 0; j < pathExt.length; j++) {
      const cur = p + pathExt[j];
      try {
        const is = isexe.sync(cur, { pathExt: pathExtExe });
        if (is) {
          if (opt.all)
            found.push(cur);
          else
            return cur;
        }
      } catch (ex) {
      }
    }
  }
  if (opt.all && found.length)
    return found;
  if (opt.nothrow)
    return null;
  throw getNotFoundError(cmd);
};
var which_1 = which$1;
which$1.sync = whichSync;
var pathKey$1 = { exports: {} };
const pathKey = (options = {}) => {
  const environment = options.env || process.env;
  const platform2 = options.platform || process.platform;
  if (platform2 !== "win32") {
    return "PATH";
  }
  return Object.keys(environment).reverse().find((key) => key.toUpperCase() === "PATH") || "Path";
};
pathKey$1.exports = pathKey;
pathKey$1.exports.default = pathKey;
var pathKeyExports = pathKey$1.exports;
const path$d = require$$1;
const which = which_1;
const getPathKey = pathKeyExports;
function resolveCommandAttempt(parsed, withoutPathExt) {
  const env = parsed.options.env || process.env;
  const cwd2 = process.cwd();
  const hasCustomCwd = parsed.options.cwd != null;
  const shouldSwitchCwd = hasCustomCwd && process.chdir !== void 0 && !process.chdir.disabled;
  if (shouldSwitchCwd) {
    try {
      process.chdir(parsed.options.cwd);
    } catch (err) {
    }
  }
  let resolved;
  try {
    resolved = which.sync(parsed.command, {
      path: env[getPathKey({ env })],
      pathExt: withoutPathExt ? path$d.delimiter : void 0
    });
  } catch (e) {
  } finally {
    if (shouldSwitchCwd) {
      process.chdir(cwd2);
    }
  }
  if (resolved) {
    resolved = path$d.resolve(hasCustomCwd ? parsed.options.cwd : "", resolved);
  }
  return resolved;
}
function resolveCommand$1(parsed) {
  return resolveCommandAttempt(parsed) || resolveCommandAttempt(parsed, true);
}
var resolveCommand_1 = resolveCommand$1;
var _escape = {};
const metaCharsRegExp = /([()\][%!^"`<>&|;, *?])/g;
function escapeCommand(arg) {
  arg = arg.replace(metaCharsRegExp, "^$1");
  return arg;
}
function escapeArgument(arg, doubleEscapeMetaChars) {
  arg = `${arg}`;
  arg = arg.replace(/(?=(\\+?)?)\1"/g, '$1$1\\"');
  arg = arg.replace(/(?=(\\+?)?)\1$/, "$1$1");
  arg = `"${arg}"`;
  arg = arg.replace(metaCharsRegExp, "^$1");
  if (doubleEscapeMetaChars) {
    arg = arg.replace(metaCharsRegExp, "^$1");
  }
  return arg;
}
_escape.command = escapeCommand;
_escape.argument = escapeArgument;
var shebangRegex$1 = /^#!(.*)/;
const shebangRegex = shebangRegex$1;
var shebangCommand$1 = (string = "") => {
  const match = string.match(shebangRegex);
  if (!match) {
    return null;
  }
  const [path2, argument] = match[0].replace(/#! ?/, "").split(" ");
  const binary = path2.split("/").pop();
  if (binary === "env") {
    return argument;
  }
  return argument ? `${binary} ${argument}` : binary;
};
const fs$j = require$$0;
const shebangCommand = shebangCommand$1;
function readShebang$1(command) {
  const size = 150;
  const buffer = Buffer.alloc(size);
  let fd;
  try {
    fd = fs$j.openSync(command, "r");
    fs$j.readSync(fd, buffer, 0, size, 0);
    fs$j.closeSync(fd);
  } catch (e) {
  }
  return shebangCommand(buffer.toString());
}
var readShebang_1 = readShebang$1;
const path$c = require$$1;
const resolveCommand = resolveCommand_1;
const escape = _escape;
const readShebang = readShebang_1;
const isWin$1 = process.platform === "win32";
const isExecutableRegExp = /\.(?:com|exe)$/i;
const isCmdShimRegExp = /node_modules[\\/].bin[\\/][^\\/]+\.cmd$/i;
function detectShebang(parsed) {
  parsed.file = resolveCommand(parsed);
  const shebang = parsed.file && readShebang(parsed.file);
  if (shebang) {
    parsed.args.unshift(parsed.file);
    parsed.command = shebang;
    return resolveCommand(parsed);
  }
  return parsed.file;
}
function parseNonShell(parsed) {
  if (!isWin$1) {
    return parsed;
  }
  const commandFile = detectShebang(parsed);
  const needsShell = !isExecutableRegExp.test(commandFile);
  if (parsed.options.forceShell || needsShell) {
    const needsDoubleEscapeMetaChars = isCmdShimRegExp.test(commandFile);
    parsed.command = path$c.normalize(parsed.command);
    parsed.command = escape.command(parsed.command);
    parsed.args = parsed.args.map((arg) => escape.argument(arg, needsDoubleEscapeMetaChars));
    const shellCommand = [parsed.command].concat(parsed.args).join(" ");
    parsed.args = ["/d", "/s", "/c", `"${shellCommand}"`];
    parsed.command = process.env.comspec || "cmd.exe";
    parsed.options.windowsVerbatimArguments = true;
  }
  return parsed;
}
function parse$1(command, args, options) {
  if (args && !Array.isArray(args)) {
    options = args;
    args = null;
  }
  args = args ? args.slice(0) : [];
  options = Object.assign({}, options);
  const parsed = {
    command,
    args,
    options,
    file: void 0,
    original: {
      command,
      args
    }
  };
  return options.shell ? parsed : parseNonShell(parsed);
}
var parse_1 = parse$1;
const isWin = process.platform === "win32";
function notFoundError(original, syscall) {
  return Object.assign(new Error(`${syscall} ${original.command} ENOENT`), {
    code: "ENOENT",
    errno: "ENOENT",
    syscall: `${syscall} ${original.command}`,
    path: original.command,
    spawnargs: original.args
  });
}
function hookChildProcess(cp2, parsed) {
  if (!isWin) {
    return;
  }
  const originalEmit = cp2.emit;
  cp2.emit = function(name, arg1) {
    if (name === "exit") {
      const err = verifyENOENT(arg1, parsed);
      if (err) {
        return originalEmit.call(cp2, "error", err);
      }
    }
    return originalEmit.apply(cp2, arguments);
  };
}
function verifyENOENT(status, parsed) {
  if (isWin && status === 1 && !parsed.file) {
    return notFoundError(parsed.original, "spawn");
  }
  return null;
}
function verifyENOENTSync(status, parsed) {
  if (isWin && status === 1 && !parsed.file) {
    return notFoundError(parsed.original, "spawnSync");
  }
  return null;
}
var enoent$1 = {
  hookChildProcess,
  verifyENOENT,
  verifyENOENTSync,
  notFoundError
};
const cp = require$$0$1;
const parse = parse_1;
const enoent = enoent$1;
function spawn(command, args, options) {
  const parsed = parse(command, args, options);
  const spawned = cp.spawn(parsed.command, parsed.args, parsed.options);
  enoent.hookChildProcess(spawned, parsed);
  return spawned;
}
function spawnSync(command, args, options) {
  const parsed = parse(command, args, options);
  const result = cp.spawnSync(parsed.command, parsed.args, parsed.options);
  result.error = result.error || enoent.verifyENOENTSync(result.status, parsed);
  return result;
}
crossSpawn.exports = spawn;
var spawn_1 = crossSpawn.exports.spawn = spawn;
crossSpawn.exports.sync = spawnSync;
crossSpawn.exports._parse = parse;
crossSpawn.exports._enoent = enoent;
var fs$i = {};
var universalify$1 = {};
universalify$1.fromCallback = function(fn) {
  return Object.defineProperty(function(...args) {
    if (typeof args[args.length - 1] === "function") fn.apply(this, args);
    else {
      return new Promise((resolve, reject) => {
        args.push((err, res) => err != null ? reject(err) : resolve(res));
        fn.apply(this, args);
      });
    }
  }, "name", { value: fn.name });
};
universalify$1.fromPromise = function(fn) {
  return Object.defineProperty(function(...args) {
    const cb = args[args.length - 1];
    if (typeof cb !== "function") return fn.apply(this, args);
    else {
      args.pop();
      fn.apply(this, args).then((r) => cb(null, r), cb);
    }
  }, "name", { value: fn.name });
};
var constants = require$$0$2;
var origCwd = process.cwd;
var cwd = null;
var platform = process.env.GRACEFUL_FS_PLATFORM || process.platform;
process.cwd = function() {
  if (!cwd)
    cwd = origCwd.call(process);
  return cwd;
};
try {
  process.cwd();
} catch (er) {
}
if (typeof process.chdir === "function") {
  var chdir = process.chdir;
  process.chdir = function(d) {
    cwd = null;
    chdir.call(process, d);
  };
  if (Object.setPrototypeOf) Object.setPrototypeOf(process.chdir, chdir);
}
var polyfills$1 = patch$1;
function patch$1(fs2) {
  if (constants.hasOwnProperty("O_SYMLINK") && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
    patchLchmod(fs2);
  }
  if (!fs2.lutimes) {
    patchLutimes(fs2);
  }
  fs2.chown = chownFix(fs2.chown);
  fs2.fchown = chownFix(fs2.fchown);
  fs2.lchown = chownFix(fs2.lchown);
  fs2.chmod = chmodFix(fs2.chmod);
  fs2.fchmod = chmodFix(fs2.fchmod);
  fs2.lchmod = chmodFix(fs2.lchmod);
  fs2.chownSync = chownFixSync(fs2.chownSync);
  fs2.fchownSync = chownFixSync(fs2.fchownSync);
  fs2.lchownSync = chownFixSync(fs2.lchownSync);
  fs2.chmodSync = chmodFixSync(fs2.chmodSync);
  fs2.fchmodSync = chmodFixSync(fs2.fchmodSync);
  fs2.lchmodSync = chmodFixSync(fs2.lchmodSync);
  fs2.stat = statFix(fs2.stat);
  fs2.fstat = statFix(fs2.fstat);
  fs2.lstat = statFix(fs2.lstat);
  fs2.statSync = statFixSync(fs2.statSync);
  fs2.fstatSync = statFixSync(fs2.fstatSync);
  fs2.lstatSync = statFixSync(fs2.lstatSync);
  if (fs2.chmod && !fs2.lchmod) {
    fs2.lchmod = function(path2, mode2, cb) {
      if (cb) process.nextTick(cb);
    };
    fs2.lchmodSync = function() {
    };
  }
  if (fs2.chown && !fs2.lchown) {
    fs2.lchown = function(path2, uid, gid, cb) {
      if (cb) process.nextTick(cb);
    };
    fs2.lchownSync = function() {
    };
  }
  if (platform === "win32") {
    fs2.rename = typeof fs2.rename !== "function" ? fs2.rename : function(fs$rename) {
      function rename2(from, to, cb) {
        var start = Date.now();
        var backoff = 0;
        fs$rename(from, to, function CB(er) {
          if (er && (er.code === "EACCES" || er.code === "EPERM" || er.code === "EBUSY") && Date.now() - start < 6e4) {
            setTimeout(function() {
              fs2.stat(to, function(stater, st) {
                if (stater && stater.code === "ENOENT")
                  fs$rename(from, to, CB);
                else
                  cb(er);
              });
            }, backoff);
            if (backoff < 100)
              backoff += 10;
            return;
          }
          if (cb) cb(er);
        });
      }
      if (Object.setPrototypeOf) Object.setPrototypeOf(rename2, fs$rename);
      return rename2;
    }(fs2.rename);
  }
  fs2.read = typeof fs2.read !== "function" ? fs2.read : function(fs$read) {
    function read(fd, buffer, offset, length, position, callback_) {
      var callback;
      if (callback_ && typeof callback_ === "function") {
        var eagCounter = 0;
        callback = function(er, _, __) {
          if (er && er.code === "EAGAIN" && eagCounter < 10) {
            eagCounter++;
            return fs$read.call(fs2, fd, buffer, offset, length, position, callback);
          }
          callback_.apply(this, arguments);
        };
      }
      return fs$read.call(fs2, fd, buffer, offset, length, position, callback);
    }
    if (Object.setPrototypeOf) Object.setPrototypeOf(read, fs$read);
    return read;
  }(fs2.read);
  fs2.readSync = typeof fs2.readSync !== "function" ? fs2.readSync : /* @__PURE__ */ function(fs$readSync) {
    return function(fd, buffer, offset, length, position) {
      var eagCounter = 0;
      while (true) {
        try {
          return fs$readSync.call(fs2, fd, buffer, offset, length, position);
        } catch (er) {
          if (er.code === "EAGAIN" && eagCounter < 10) {
            eagCounter++;
            continue;
          }
          throw er;
        }
      }
    };
  }(fs2.readSync);
  function patchLchmod(fs22) {
    fs22.lchmod = function(path2, mode2, callback) {
      fs22.open(
        path2,
        constants.O_WRONLY | constants.O_SYMLINK,
        mode2,
        function(err, fd) {
          if (err) {
            if (callback) callback(err);
            return;
          }
          fs22.fchmod(fd, mode2, function(err2) {
            fs22.close(fd, function(err22) {
              if (callback) callback(err2 || err22);
            });
          });
        }
      );
    };
    fs22.lchmodSync = function(path2, mode2) {
      var fd = fs22.openSync(path2, constants.O_WRONLY | constants.O_SYMLINK, mode2);
      var threw = true;
      var ret;
      try {
        ret = fs22.fchmodSync(fd, mode2);
        threw = false;
      } finally {
        if (threw) {
          try {
            fs22.closeSync(fd);
          } catch (er) {
          }
        } else {
          fs22.closeSync(fd);
        }
      }
      return ret;
    };
  }
  function patchLutimes(fs22) {
    if (constants.hasOwnProperty("O_SYMLINK") && fs22.futimes) {
      fs22.lutimes = function(path2, at, mt, cb) {
        fs22.open(path2, constants.O_SYMLINK, function(er, fd) {
          if (er) {
            if (cb) cb(er);
            return;
          }
          fs22.futimes(fd, at, mt, function(er2) {
            fs22.close(fd, function(er22) {
              if (cb) cb(er2 || er22);
            });
          });
        });
      };
      fs22.lutimesSync = function(path2, at, mt) {
        var fd = fs22.openSync(path2, constants.O_SYMLINK);
        var ret;
        var threw = true;
        try {
          ret = fs22.futimesSync(fd, at, mt);
          threw = false;
        } finally {
          if (threw) {
            try {
              fs22.closeSync(fd);
            } catch (er) {
            }
          } else {
            fs22.closeSync(fd);
          }
        }
        return ret;
      };
    } else if (fs22.futimes) {
      fs22.lutimes = function(_a, _b, _c, cb) {
        if (cb) process.nextTick(cb);
      };
      fs22.lutimesSync = function() {
      };
    }
  }
  function chmodFix(orig) {
    if (!orig) return orig;
    return function(target, mode2, cb) {
      return orig.call(fs2, target, mode2, function(er) {
        if (chownErOk(er)) er = null;
        if (cb) cb.apply(this, arguments);
      });
    };
  }
  function chmodFixSync(orig) {
    if (!orig) return orig;
    return function(target, mode2) {
      try {
        return orig.call(fs2, target, mode2);
      } catch (er) {
        if (!chownErOk(er)) throw er;
      }
    };
  }
  function chownFix(orig) {
    if (!orig) return orig;
    return function(target, uid, gid, cb) {
      return orig.call(fs2, target, uid, gid, function(er) {
        if (chownErOk(er)) er = null;
        if (cb) cb.apply(this, arguments);
      });
    };
  }
  function chownFixSync(orig) {
    if (!orig) return orig;
    return function(target, uid, gid) {
      try {
        return orig.call(fs2, target, uid, gid);
      } catch (er) {
        if (!chownErOk(er)) throw er;
      }
    };
  }
  function statFix(orig) {
    if (!orig) return orig;
    return function(target, options, cb) {
      if (typeof options === "function") {
        cb = options;
        options = null;
      }
      function callback(er, stats) {
        if (stats) {
          if (stats.uid < 0) stats.uid += 4294967296;
          if (stats.gid < 0) stats.gid += 4294967296;
        }
        if (cb) cb.apply(this, arguments);
      }
      return options ? orig.call(fs2, target, options, callback) : orig.call(fs2, target, callback);
    };
  }
  function statFixSync(orig) {
    if (!orig) return orig;
    return function(target, options) {
      var stats = options ? orig.call(fs2, target, options) : orig.call(fs2, target);
      if (stats) {
        if (stats.uid < 0) stats.uid += 4294967296;
        if (stats.gid < 0) stats.gid += 4294967296;
      }
      return stats;
    };
  }
  function chownErOk(er) {
    if (!er)
      return true;
    if (er.code === "ENOSYS")
      return true;
    var nonroot = !process.getuid || process.getuid() !== 0;
    if (nonroot) {
      if (er.code === "EINVAL" || er.code === "EPERM")
        return true;
    }
    return false;
  }
}
var Stream = require$$0$3.Stream;
var legacyStreams = legacy$1;
function legacy$1(fs2) {
  return {
    ReadStream,
    WriteStream
  };
  function ReadStream(path2, options) {
    if (!(this instanceof ReadStream)) return new ReadStream(path2, options);
    Stream.call(this);
    var self2 = this;
    this.path = path2;
    this.fd = null;
    this.readable = true;
    this.paused = false;
    this.flags = "r";
    this.mode = 438;
    this.bufferSize = 64 * 1024;
    options = options || {};
    var keys = Object.keys(options);
    for (var index = 0, length = keys.length; index < length; index++) {
      var key = keys[index];
      this[key] = options[key];
    }
    if (this.encoding) this.setEncoding(this.encoding);
    if (this.start !== void 0) {
      if ("number" !== typeof this.start) {
        throw TypeError("start must be a Number");
      }
      if (this.end === void 0) {
        this.end = Infinity;
      } else if ("number" !== typeof this.end) {
        throw TypeError("end must be a Number");
      }
      if (this.start > this.end) {
        throw new Error("start must be <= end");
      }
      this.pos = this.start;
    }
    if (this.fd !== null) {
      process.nextTick(function() {
        self2._read();
      });
      return;
    }
    fs2.open(this.path, this.flags, this.mode, function(err, fd) {
      if (err) {
        self2.emit("error", err);
        self2.readable = false;
        return;
      }
      self2.fd = fd;
      self2.emit("open", fd);
      self2._read();
    });
  }
  function WriteStream(path2, options) {
    if (!(this instanceof WriteStream)) return new WriteStream(path2, options);
    Stream.call(this);
    this.path = path2;
    this.fd = null;
    this.writable = true;
    this.flags = "w";
    this.encoding = "binary";
    this.mode = 438;
    this.bytesWritten = 0;
    options = options || {};
    var keys = Object.keys(options);
    for (var index = 0, length = keys.length; index < length; index++) {
      var key = keys[index];
      this[key] = options[key];
    }
    if (this.start !== void 0) {
      if ("number" !== typeof this.start) {
        throw TypeError("start must be a Number");
      }
      if (this.start < 0) {
        throw new Error("start must be >= zero");
      }
      this.pos = this.start;
    }
    this.busy = false;
    this._queue = [];
    if (this.fd === null) {
      this._open = fs2.open;
      this._queue.push([this._open, this.path, this.flags, this.mode, void 0]);
      this.flush();
    }
  }
}
var clone_1 = clone$1;
var getPrototypeOf = Object.getPrototypeOf || function(obj) {
  return obj.__proto__;
};
function clone$1(obj) {
  if (obj === null || typeof obj !== "object")
    return obj;
  if (obj instanceof Object)
    var copy2 = { __proto__: getPrototypeOf(obj) };
  else
    var copy2 = /* @__PURE__ */ Object.create(null);
  Object.getOwnPropertyNames(obj).forEach(function(key) {
    Object.defineProperty(copy2, key, Object.getOwnPropertyDescriptor(obj, key));
  });
  return copy2;
}
var fs$h = require$$0;
var polyfills = polyfills$1;
var legacy = legacyStreams;
var clone = clone_1;
var util = require$$4;
var gracefulQueue;
var previousSymbol;
if (typeof Symbol === "function" && typeof Symbol.for === "function") {
  gracefulQueue = Symbol.for("graceful-fs.queue");
  previousSymbol = Symbol.for("graceful-fs.previous");
} else {
  gracefulQueue = "___graceful-fs.queue";
  previousSymbol = "___graceful-fs.previous";
}
function noop() {
}
function publishQueue(context, queue2) {
  Object.defineProperty(context, gracefulQueue, {
    get: function() {
      return queue2;
    }
  });
}
var debug = noop;
if (util.debuglog)
  debug = util.debuglog("gfs4");
else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || ""))
  debug = function() {
    var m = util.format.apply(util, arguments);
    m = "GFS4: " + m.split(/\n/).join("\nGFS4: ");
    console.error(m);
  };
if (!fs$h[gracefulQueue]) {
  var queue = commonjsGlobal[gracefulQueue] || [];
  publishQueue(fs$h, queue);
  fs$h.close = function(fs$close) {
    function close(fd, cb) {
      return fs$close.call(fs$h, fd, function(err) {
        if (!err) {
          resetQueue();
        }
        if (typeof cb === "function")
          cb.apply(this, arguments);
      });
    }
    Object.defineProperty(close, previousSymbol, {
      value: fs$close
    });
    return close;
  }(fs$h.close);
  fs$h.closeSync = function(fs$closeSync) {
    function closeSync(fd) {
      fs$closeSync.apply(fs$h, arguments);
      resetQueue();
    }
    Object.defineProperty(closeSync, previousSymbol, {
      value: fs$closeSync
    });
    return closeSync;
  }(fs$h.closeSync);
  if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || "")) {
    process.on("exit", function() {
      debug(fs$h[gracefulQueue]);
      require$$5.equal(fs$h[gracefulQueue].length, 0);
    });
  }
}
if (!commonjsGlobal[gracefulQueue]) {
  publishQueue(commonjsGlobal, fs$h[gracefulQueue]);
}
var gracefulFs = patch(clone(fs$h));
if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs$h.__patched) {
  gracefulFs = patch(fs$h);
  fs$h.__patched = true;
}
function patch(fs2) {
  polyfills(fs2);
  fs2.gracefulify = patch;
  fs2.createReadStream = createReadStream;
  fs2.createWriteStream = createWriteStream;
  var fs$readFile = fs2.readFile;
  fs2.readFile = readFile2;
  function readFile2(path2, options, cb) {
    if (typeof options === "function")
      cb = options, options = null;
    return go$readFile(path2, options, cb);
    function go$readFile(path22, options2, cb2, startTime) {
      return fs$readFile(path22, options2, function(err) {
        if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
          enqueue([go$readFile, [path22, options2, cb2], err, startTime || Date.now(), Date.now()]);
        else {
          if (typeof cb2 === "function")
            cb2.apply(this, arguments);
        }
      });
    }
  }
  var fs$writeFile = fs2.writeFile;
  fs2.writeFile = writeFile2;
  function writeFile2(path2, data, options, cb) {
    if (typeof options === "function")
      cb = options, options = null;
    return go$writeFile(path2, data, options, cb);
    function go$writeFile(path22, data2, options2, cb2, startTime) {
      return fs$writeFile(path22, data2, options2, function(err) {
        if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
          enqueue([go$writeFile, [path22, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
        else {
          if (typeof cb2 === "function")
            cb2.apply(this, arguments);
        }
      });
    }
  }
  var fs$appendFile = fs2.appendFile;
  if (fs$appendFile)
    fs2.appendFile = appendFile;
  function appendFile(path2, data, options, cb) {
    if (typeof options === "function")
      cb = options, options = null;
    return go$appendFile(path2, data, options, cb);
    function go$appendFile(path22, data2, options2, cb2, startTime) {
      return fs$appendFile(path22, data2, options2, function(err) {
        if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
          enqueue([go$appendFile, [path22, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
        else {
          if (typeof cb2 === "function")
            cb2.apply(this, arguments);
        }
      });
    }
  }
  var fs$copyFile = fs2.copyFile;
  if (fs$copyFile)
    fs2.copyFile = copyFile2;
  function copyFile2(src, dest, flags, cb) {
    if (typeof flags === "function") {
      cb = flags;
      flags = 0;
    }
    return go$copyFile(src, dest, flags, cb);
    function go$copyFile(src2, dest2, flags2, cb2, startTime) {
      return fs$copyFile(src2, dest2, flags2, function(err) {
        if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
          enqueue([go$copyFile, [src2, dest2, flags2, cb2], err, startTime || Date.now(), Date.now()]);
        else {
          if (typeof cb2 === "function")
            cb2.apply(this, arguments);
        }
      });
    }
  }
  var fs$readdir = fs2.readdir;
  fs2.readdir = readdir;
  var noReaddirOptionVersions = /^v[0-5]\./;
  function readdir(path2, options, cb) {
    if (typeof options === "function")
      cb = options, options = null;
    var go$readdir = noReaddirOptionVersions.test(process.version) ? function go$readdir2(path22, options2, cb2, startTime) {
      return fs$readdir(path22, fs$readdirCallback(
        path22,
        options2,
        cb2,
        startTime
      ));
    } : function go$readdir2(path22, options2, cb2, startTime) {
      return fs$readdir(path22, options2, fs$readdirCallback(
        path22,
        options2,
        cb2,
        startTime
      ));
    };
    return go$readdir(path2, options, cb);
    function fs$readdirCallback(path22, options2, cb2, startTime) {
      return function(err, files) {
        if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
          enqueue([
            go$readdir,
            [path22, options2, cb2],
            err,
            startTime || Date.now(),
            Date.now()
          ]);
        else {
          if (files && files.sort)
            files.sort();
          if (typeof cb2 === "function")
            cb2.call(this, err, files);
        }
      };
    }
  }
  if (process.version.substr(0, 4) === "v0.8") {
    var legStreams = legacy(fs2);
    ReadStream = legStreams.ReadStream;
    WriteStream = legStreams.WriteStream;
  }
  var fs$ReadStream = fs2.ReadStream;
  if (fs$ReadStream) {
    ReadStream.prototype = Object.create(fs$ReadStream.prototype);
    ReadStream.prototype.open = ReadStream$open;
  }
  var fs$WriteStream = fs2.WriteStream;
  if (fs$WriteStream) {
    WriteStream.prototype = Object.create(fs$WriteStream.prototype);
    WriteStream.prototype.open = WriteStream$open;
  }
  Object.defineProperty(fs2, "ReadStream", {
    get: function() {
      return ReadStream;
    },
    set: function(val) {
      ReadStream = val;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(fs2, "WriteStream", {
    get: function() {
      return WriteStream;
    },
    set: function(val) {
      WriteStream = val;
    },
    enumerable: true,
    configurable: true
  });
  var FileReadStream = ReadStream;
  Object.defineProperty(fs2, "FileReadStream", {
    get: function() {
      return FileReadStream;
    },
    set: function(val) {
      FileReadStream = val;
    },
    enumerable: true,
    configurable: true
  });
  var FileWriteStream = WriteStream;
  Object.defineProperty(fs2, "FileWriteStream", {
    get: function() {
      return FileWriteStream;
    },
    set: function(val) {
      FileWriteStream = val;
    },
    enumerable: true,
    configurable: true
  });
  function ReadStream(path2, options) {
    if (this instanceof ReadStream)
      return fs$ReadStream.apply(this, arguments), this;
    else
      return ReadStream.apply(Object.create(ReadStream.prototype), arguments);
  }
  function ReadStream$open() {
    var that = this;
    open(that.path, that.flags, that.mode, function(err, fd) {
      if (err) {
        if (that.autoClose)
          that.destroy();
        that.emit("error", err);
      } else {
        that.fd = fd;
        that.emit("open", fd);
        that.read();
      }
    });
  }
  function WriteStream(path2, options) {
    if (this instanceof WriteStream)
      return fs$WriteStream.apply(this, arguments), this;
    else
      return WriteStream.apply(Object.create(WriteStream.prototype), arguments);
  }
  function WriteStream$open() {
    var that = this;
    open(that.path, that.flags, that.mode, function(err, fd) {
      if (err) {
        that.destroy();
        that.emit("error", err);
      } else {
        that.fd = fd;
        that.emit("open", fd);
      }
    });
  }
  function createReadStream(path2, options) {
    return new fs2.ReadStream(path2, options);
  }
  function createWriteStream(path2, options) {
    return new fs2.WriteStream(path2, options);
  }
  var fs$open = fs2.open;
  fs2.open = open;
  function open(path2, flags, mode2, cb) {
    if (typeof mode2 === "function")
      cb = mode2, mode2 = null;
    return go$open(path2, flags, mode2, cb);
    function go$open(path22, flags2, mode22, cb2, startTime) {
      return fs$open(path22, flags2, mode22, function(err, fd) {
        if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
          enqueue([go$open, [path22, flags2, mode22, cb2], err, startTime || Date.now(), Date.now()]);
        else {
          if (typeof cb2 === "function")
            cb2.apply(this, arguments);
        }
      });
    }
  }
  return fs2;
}
function enqueue(elem) {
  debug("ENQUEUE", elem[0].name, elem[1]);
  fs$h[gracefulQueue].push(elem);
  retry();
}
var retryTimer;
function resetQueue() {
  var now = Date.now();
  for (var i = 0; i < fs$h[gracefulQueue].length; ++i) {
    if (fs$h[gracefulQueue][i].length > 2) {
      fs$h[gracefulQueue][i][3] = now;
      fs$h[gracefulQueue][i][4] = now;
    }
  }
  retry();
}
function retry() {
  clearTimeout(retryTimer);
  retryTimer = void 0;
  if (fs$h[gracefulQueue].length === 0)
    return;
  var elem = fs$h[gracefulQueue].shift();
  var fn = elem[0];
  var args = elem[1];
  var err = elem[2];
  var startTime = elem[3];
  var lastTime = elem[4];
  if (startTime === void 0) {
    debug("RETRY", fn.name, args);
    fn.apply(null, args);
  } else if (Date.now() - startTime >= 6e4) {
    debug("TIMEOUT", fn.name, args);
    var cb = args.pop();
    if (typeof cb === "function")
      cb.call(null, err);
  } else {
    var sinceAttempt = Date.now() - lastTime;
    var sinceStart = Math.max(lastTime - startTime, 1);
    var desiredDelay = Math.min(sinceStart * 1.2, 100);
    if (sinceAttempt >= desiredDelay) {
      debug("RETRY", fn.name, args);
      fn.apply(null, args.concat([startTime]));
    } else {
      fs$h[gracefulQueue].push(elem);
    }
  }
  if (retryTimer === void 0) {
    retryTimer = setTimeout(retry, 0);
  }
}
(function(exports$1) {
  const u2 = universalify$1.fromCallback;
  const fs2 = gracefulFs;
  const api = [
    "access",
    "appendFile",
    "chmod",
    "chown",
    "close",
    "copyFile",
    "cp",
    "fchmod",
    "fchown",
    "fdatasync",
    "fstat",
    "fsync",
    "ftruncate",
    "futimes",
    "glob",
    "lchmod",
    "lchown",
    "lutimes",
    "link",
    "lstat",
    "mkdir",
    "mkdtemp",
    "open",
    "opendir",
    "readdir",
    "readFile",
    "readlink",
    "realpath",
    "rename",
    "rm",
    "rmdir",
    "stat",
    "statfs",
    "symlink",
    "truncate",
    "unlink",
    "utimes",
    "writeFile"
  ].filter((key) => {
    return typeof fs2[key] === "function";
  });
  Object.assign(exports$1, fs2);
  api.forEach((method) => {
    exports$1[method] = u2(fs2[method]);
  });
  exports$1.exists = function(filename, callback) {
    if (typeof callback === "function") {
      return fs2.exists(filename, callback);
    }
    return new Promise((resolve) => {
      return fs2.exists(filename, resolve);
    });
  };
  exports$1.read = function(fd, buffer, offset, length, position, callback) {
    if (typeof callback === "function") {
      return fs2.read(fd, buffer, offset, length, position, callback);
    }
    return new Promise((resolve, reject) => {
      fs2.read(fd, buffer, offset, length, position, (err, bytesRead, buffer2) => {
        if (err) return reject(err);
        resolve({ bytesRead, buffer: buffer2 });
      });
    });
  };
  exports$1.write = function(fd, buffer, ...args) {
    if (typeof args[args.length - 1] === "function") {
      return fs2.write(fd, buffer, ...args);
    }
    return new Promise((resolve, reject) => {
      fs2.write(fd, buffer, ...args, (err, bytesWritten, buffer2) => {
        if (err) return reject(err);
        resolve({ bytesWritten, buffer: buffer2 });
      });
    });
  };
  exports$1.readv = function(fd, buffers, ...args) {
    if (typeof args[args.length - 1] === "function") {
      return fs2.readv(fd, buffers, ...args);
    }
    return new Promise((resolve, reject) => {
      fs2.readv(fd, buffers, ...args, (err, bytesRead, buffers2) => {
        if (err) return reject(err);
        resolve({ bytesRead, buffers: buffers2 });
      });
    });
  };
  exports$1.writev = function(fd, buffers, ...args) {
    if (typeof args[args.length - 1] === "function") {
      return fs2.writev(fd, buffers, ...args);
    }
    return new Promise((resolve, reject) => {
      fs2.writev(fd, buffers, ...args, (err, bytesWritten, buffers2) => {
        if (err) return reject(err);
        resolve({ bytesWritten, buffers: buffers2 });
      });
    });
  };
  if (typeof fs2.realpath.native === "function") {
    exports$1.realpath.native = u2(fs2.realpath.native);
  } else {
    process.emitWarning(
      "fs.realpath.native is not a function. Is fs being monkey-patched?",
      "Warning",
      "fs-extra-WARN0003"
    );
  }
})(fs$i);
var makeDir$1 = {};
var utils$1 = {};
const path$b = require$$1;
utils$1.checkPath = function checkPath(pth) {
  if (process.platform === "win32") {
    const pathHasInvalidWinCharacters = /[<>:"|?*]/.test(pth.replace(path$b.parse(pth).root, ""));
    if (pathHasInvalidWinCharacters) {
      const error = new Error(`Path contains invalid characters: ${pth}`);
      error.code = "EINVAL";
      throw error;
    }
  }
};
const fs$g = fs$i;
const { checkPath: checkPath2 } = utils$1;
const getMode = (options) => {
  const defaults = { mode: 511 };
  if (typeof options === "number") return options;
  return { ...defaults, ...options }.mode;
};
makeDir$1.makeDir = async (dir, options) => {
  checkPath2(dir);
  return fs$g.mkdir(dir, {
    mode: getMode(options),
    recursive: true
  });
};
makeDir$1.makeDirSync = (dir, options) => {
  checkPath2(dir);
  return fs$g.mkdirSync(dir, {
    mode: getMode(options),
    recursive: true
  });
};
const u$e = universalify$1.fromPromise;
const { makeDir: _makeDir, makeDirSync } = makeDir$1;
const makeDir = u$e(_makeDir);
var mkdirs$2 = {
  mkdirs: makeDir,
  mkdirsSync: makeDirSync,
  // alias
  mkdirp: makeDir,
  mkdirpSync: makeDirSync,
  ensureDir: makeDir,
  ensureDirSync: makeDirSync
};
const u$d = universalify$1.fromPromise;
const fs$f = fs$i;
function pathExists$6(path2) {
  return fs$f.access(path2).then(() => true).catch(() => false);
}
var pathExists_1 = {
  pathExists: u$d(pathExists$6),
  pathExistsSync: fs$f.existsSync
};
const fs$e = fs$i;
const u$c = universalify$1.fromPromise;
async function utimesMillis$1(path2, atime, mtime) {
  const fd = await fs$e.open(path2, "r+");
  let closeErr = null;
  try {
    await fs$e.futimes(fd, atime, mtime);
  } finally {
    try {
      await fs$e.close(fd);
    } catch (e) {
      closeErr = e;
    }
  }
  if (closeErr) {
    throw closeErr;
  }
}
function utimesMillisSync$1(path2, atime, mtime) {
  const fd = fs$e.openSync(path2, "r+");
  fs$e.futimesSync(fd, atime, mtime);
  return fs$e.closeSync(fd);
}
var utimes = {
  utimesMillis: u$c(utimesMillis$1),
  utimesMillisSync: utimesMillisSync$1
};
const fs$d = fs$i;
const path$a = require$$1;
const u$b = universalify$1.fromPromise;
function getStats$1(src, dest, opts) {
  const statFunc = opts.dereference ? (file2) => fs$d.stat(file2, { bigint: true }) : (file2) => fs$d.lstat(file2, { bigint: true });
  return Promise.all([
    statFunc(src),
    statFunc(dest).catch((err) => {
      if (err.code === "ENOENT") return null;
      throw err;
    })
  ]).then(([srcStat, destStat]) => ({ srcStat, destStat }));
}
function getStatsSync(src, dest, opts) {
  let destStat;
  const statFunc = opts.dereference ? (file2) => fs$d.statSync(file2, { bigint: true }) : (file2) => fs$d.lstatSync(file2, { bigint: true });
  const srcStat = statFunc(src);
  try {
    destStat = statFunc(dest);
  } catch (err) {
    if (err.code === "ENOENT") return { srcStat, destStat: null };
    throw err;
  }
  return { srcStat, destStat };
}
async function checkPaths(src, dest, funcName, opts) {
  const { srcStat, destStat } = await getStats$1(src, dest, opts);
  if (destStat) {
    if (areIdentical$2(srcStat, destStat)) {
      const srcBaseName = path$a.basename(src);
      const destBaseName = path$a.basename(dest);
      if (funcName === "move" && srcBaseName !== destBaseName && srcBaseName.toLowerCase() === destBaseName.toLowerCase()) {
        return { srcStat, destStat, isChangingCase: true };
      }
      throw new Error("Source and destination must not be the same.");
    }
    if (srcStat.isDirectory() && !destStat.isDirectory()) {
      throw new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`);
    }
    if (!srcStat.isDirectory() && destStat.isDirectory()) {
      throw new Error(`Cannot overwrite directory '${dest}' with non-directory '${src}'.`);
    }
  }
  if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
    throw new Error(errMsg(src, dest, funcName));
  }
  return { srcStat, destStat };
}
function checkPathsSync(src, dest, funcName, opts) {
  const { srcStat, destStat } = getStatsSync(src, dest, opts);
  if (destStat) {
    if (areIdentical$2(srcStat, destStat)) {
      const srcBaseName = path$a.basename(src);
      const destBaseName = path$a.basename(dest);
      if (funcName === "move" && srcBaseName !== destBaseName && srcBaseName.toLowerCase() === destBaseName.toLowerCase()) {
        return { srcStat, destStat, isChangingCase: true };
      }
      throw new Error("Source and destination must not be the same.");
    }
    if (srcStat.isDirectory() && !destStat.isDirectory()) {
      throw new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`);
    }
    if (!srcStat.isDirectory() && destStat.isDirectory()) {
      throw new Error(`Cannot overwrite directory '${dest}' with non-directory '${src}'.`);
    }
  }
  if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
    throw new Error(errMsg(src, dest, funcName));
  }
  return { srcStat, destStat };
}
async function checkParentPaths(src, srcStat, dest, funcName) {
  const srcParent = path$a.resolve(path$a.dirname(src));
  const destParent = path$a.resolve(path$a.dirname(dest));
  if (destParent === srcParent || destParent === path$a.parse(destParent).root) return;
  let destStat;
  try {
    destStat = await fs$d.stat(destParent, { bigint: true });
  } catch (err) {
    if (err.code === "ENOENT") return;
    throw err;
  }
  if (areIdentical$2(srcStat, destStat)) {
    throw new Error(errMsg(src, dest, funcName));
  }
  return checkParentPaths(src, srcStat, destParent, funcName);
}
function checkParentPathsSync(src, srcStat, dest, funcName) {
  const srcParent = path$a.resolve(path$a.dirname(src));
  const destParent = path$a.resolve(path$a.dirname(dest));
  if (destParent === srcParent || destParent === path$a.parse(destParent).root) return;
  let destStat;
  try {
    destStat = fs$d.statSync(destParent, { bigint: true });
  } catch (err) {
    if (err.code === "ENOENT") return;
    throw err;
  }
  if (areIdentical$2(srcStat, destStat)) {
    throw new Error(errMsg(src, dest, funcName));
  }
  return checkParentPathsSync(src, srcStat, destParent, funcName);
}
function areIdentical$2(srcStat, destStat) {
  return destStat.ino !== void 0 && destStat.dev !== void 0 && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev;
}
function isSrcSubdir(src, dest) {
  const srcArr = path$a.resolve(src).split(path$a.sep).filter((i) => i);
  const destArr = path$a.resolve(dest).split(path$a.sep).filter((i) => i);
  return srcArr.every((cur, i) => destArr[i] === cur);
}
function errMsg(src, dest, funcName) {
  return `Cannot ${funcName} '${src}' to a subdirectory of itself, '${dest}'.`;
}
var stat$4 = {
  // checkPaths
  checkPaths: u$b(checkPaths),
  checkPathsSync,
  // checkParent
  checkParentPaths: u$b(checkParentPaths),
  checkParentPathsSync,
  // Misc
  isSrcSubdir,
  areIdentical: areIdentical$2
};
async function asyncIteratorConcurrentProcess$1(iterator, fn) {
  const promises = [];
  for await (const item of iterator) {
    promises.push(
      fn(item).then(
        () => null,
        (err) => err ?? new Error("unknown error")
      )
    );
  }
  await Promise.all(
    promises.map(
      (promise) => promise.then((possibleErr) => {
        if (possibleErr !== null) throw possibleErr;
      })
    )
  );
}
var async = {
  asyncIteratorConcurrentProcess: asyncIteratorConcurrentProcess$1
};
const fs$c = fs$i;
const path$9 = require$$1;
const { mkdirs: mkdirs$1 } = mkdirs$2;
const { pathExists: pathExists$5 } = pathExists_1;
const { utimesMillis } = utimes;
const stat$3 = stat$4;
const { asyncIteratorConcurrentProcess } = async;
async function copy$2(src, dest, opts = {}) {
  if (typeof opts === "function") {
    opts = { filter: opts };
  }
  opts.clobber = "clobber" in opts ? !!opts.clobber : true;
  opts.overwrite = "overwrite" in opts ? !!opts.overwrite : opts.clobber;
  if (opts.preserveTimestamps && process.arch === "ia32") {
    process.emitWarning(
      "Using the preserveTimestamps option in 32-bit node is not recommended;\n\n	see https://github.com/jprichardson/node-fs-extra/issues/269",
      "Warning",
      "fs-extra-WARN0001"
    );
  }
  const { srcStat, destStat } = await stat$3.checkPaths(src, dest, "copy", opts);
  await stat$3.checkParentPaths(src, srcStat, dest, "copy");
  const include = await runFilter(src, dest, opts);
  if (!include) return;
  const destParent = path$9.dirname(dest);
  const dirExists = await pathExists$5(destParent);
  if (!dirExists) {
    await mkdirs$1(destParent);
  }
  await getStatsAndPerformCopy(destStat, src, dest, opts);
}
async function runFilter(src, dest, opts) {
  if (!opts.filter) return true;
  return opts.filter(src, dest);
}
async function getStatsAndPerformCopy(destStat, src, dest, opts) {
  const statFn = opts.dereference ? fs$c.stat : fs$c.lstat;
  const srcStat = await statFn(src);
  if (srcStat.isDirectory()) return onDir$1(srcStat, destStat, src, dest, opts);
  if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice()) return onFile$1(srcStat, destStat, src, dest, opts);
  if (srcStat.isSymbolicLink()) return onLink$1(destStat, src, dest, opts);
  if (srcStat.isSocket()) throw new Error(`Cannot copy a socket file: ${src}`);
  if (srcStat.isFIFO()) throw new Error(`Cannot copy a FIFO pipe: ${src}`);
  throw new Error(`Unknown file: ${src}`);
}
async function onFile$1(srcStat, destStat, src, dest, opts) {
  if (!destStat) return copyFile$1(srcStat, src, dest, opts);
  if (opts.overwrite) {
    await fs$c.unlink(dest);
    return copyFile$1(srcStat, src, dest, opts);
  }
  if (opts.errorOnExist) {
    throw new Error(`'${dest}' already exists`);
  }
}
async function copyFile$1(srcStat, src, dest, opts) {
  await fs$c.copyFile(src, dest);
  if (opts.preserveTimestamps) {
    if (fileIsNotWritable$1(srcStat.mode)) {
      await makeFileWritable$1(dest, srcStat.mode);
    }
    const updatedSrcStat = await fs$c.stat(src);
    await utimesMillis(dest, updatedSrcStat.atime, updatedSrcStat.mtime);
  }
  return fs$c.chmod(dest, srcStat.mode);
}
function fileIsNotWritable$1(srcMode) {
  return (srcMode & 128) === 0;
}
function makeFileWritable$1(dest, srcMode) {
  return fs$c.chmod(dest, srcMode | 128);
}
async function onDir$1(srcStat, destStat, src, dest, opts) {
  if (!destStat) {
    await fs$c.mkdir(dest);
  }
  await asyncIteratorConcurrentProcess(await fs$c.opendir(src), async (item) => {
    const srcItem = path$9.join(src, item.name);
    const destItem = path$9.join(dest, item.name);
    const include = await runFilter(srcItem, destItem, opts);
    if (include) {
      const { destStat: destStat2 } = await stat$3.checkPaths(srcItem, destItem, "copy", opts);
      await getStatsAndPerformCopy(destStat2, srcItem, destItem, opts);
    }
  });
  if (!destStat) {
    await fs$c.chmod(dest, srcStat.mode);
  }
}
async function onLink$1(destStat, src, dest, opts) {
  let resolvedSrc = await fs$c.readlink(src);
  if (opts.dereference) {
    resolvedSrc = path$9.resolve(process.cwd(), resolvedSrc);
  }
  if (!destStat) {
    return fs$c.symlink(resolvedSrc, dest);
  }
  let resolvedDest = null;
  try {
    resolvedDest = await fs$c.readlink(dest);
  } catch (e) {
    if (e.code === "EINVAL" || e.code === "UNKNOWN") return fs$c.symlink(resolvedSrc, dest);
    throw e;
  }
  if (opts.dereference) {
    resolvedDest = path$9.resolve(process.cwd(), resolvedDest);
  }
  if (stat$3.isSrcSubdir(resolvedSrc, resolvedDest)) {
    throw new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`);
  }
  if (stat$3.isSrcSubdir(resolvedDest, resolvedSrc)) {
    throw new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`);
  }
  await fs$c.unlink(dest);
  return fs$c.symlink(resolvedSrc, dest);
}
var copy_1 = copy$2;
const fs$b = gracefulFs;
const path$8 = require$$1;
const mkdirsSync$1 = mkdirs$2.mkdirsSync;
const utimesMillisSync = utimes.utimesMillisSync;
const stat$2 = stat$4;
function copySync$1(src, dest, opts) {
  if (typeof opts === "function") {
    opts = { filter: opts };
  }
  opts = opts || {};
  opts.clobber = "clobber" in opts ? !!opts.clobber : true;
  opts.overwrite = "overwrite" in opts ? !!opts.overwrite : opts.clobber;
  if (opts.preserveTimestamps && process.arch === "ia32") {
    process.emitWarning(
      "Using the preserveTimestamps option in 32-bit node is not recommended;\n\n	see https://github.com/jprichardson/node-fs-extra/issues/269",
      "Warning",
      "fs-extra-WARN0002"
    );
  }
  const { srcStat, destStat } = stat$2.checkPathsSync(src, dest, "copy", opts);
  stat$2.checkParentPathsSync(src, srcStat, dest, "copy");
  if (opts.filter && !opts.filter(src, dest)) return;
  const destParent = path$8.dirname(dest);
  if (!fs$b.existsSync(destParent)) mkdirsSync$1(destParent);
  return getStats(destStat, src, dest, opts);
}
function getStats(destStat, src, dest, opts) {
  const statSync = opts.dereference ? fs$b.statSync : fs$b.lstatSync;
  const srcStat = statSync(src);
  if (srcStat.isDirectory()) return onDir(srcStat, destStat, src, dest, opts);
  else if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice()) return onFile(srcStat, destStat, src, dest, opts);
  else if (srcStat.isSymbolicLink()) return onLink(destStat, src, dest, opts);
  else if (srcStat.isSocket()) throw new Error(`Cannot copy a socket file: ${src}`);
  else if (srcStat.isFIFO()) throw new Error(`Cannot copy a FIFO pipe: ${src}`);
  throw new Error(`Unknown file: ${src}`);
}
function onFile(srcStat, destStat, src, dest, opts) {
  if (!destStat) return copyFile(srcStat, src, dest, opts);
  return mayCopyFile(srcStat, src, dest, opts);
}
function mayCopyFile(srcStat, src, dest, opts) {
  if (opts.overwrite) {
    fs$b.unlinkSync(dest);
    return copyFile(srcStat, src, dest, opts);
  } else if (opts.errorOnExist) {
    throw new Error(`'${dest}' already exists`);
  }
}
function copyFile(srcStat, src, dest, opts) {
  fs$b.copyFileSync(src, dest);
  if (opts.preserveTimestamps) handleTimestamps(srcStat.mode, src, dest);
  return setDestMode(dest, srcStat.mode);
}
function handleTimestamps(srcMode, src, dest) {
  if (fileIsNotWritable(srcMode)) makeFileWritable(dest, srcMode);
  return setDestTimestamps(src, dest);
}
function fileIsNotWritable(srcMode) {
  return (srcMode & 128) === 0;
}
function makeFileWritable(dest, srcMode) {
  return setDestMode(dest, srcMode | 128);
}
function setDestMode(dest, srcMode) {
  return fs$b.chmodSync(dest, srcMode);
}
function setDestTimestamps(src, dest) {
  const updatedSrcStat = fs$b.statSync(src);
  return utimesMillisSync(dest, updatedSrcStat.atime, updatedSrcStat.mtime);
}
function onDir(srcStat, destStat, src, dest, opts) {
  if (!destStat) return mkDirAndCopy(srcStat.mode, src, dest, opts);
  return copyDir(src, dest, opts);
}
function mkDirAndCopy(srcMode, src, dest, opts) {
  fs$b.mkdirSync(dest);
  copyDir(src, dest, opts);
  return setDestMode(dest, srcMode);
}
function copyDir(src, dest, opts) {
  const dir = fs$b.opendirSync(src);
  try {
    let dirent;
    while ((dirent = dir.readSync()) !== null) {
      copyDirItem(dirent.name, src, dest, opts);
    }
  } finally {
    dir.closeSync();
  }
}
function copyDirItem(item, src, dest, opts) {
  const srcItem = path$8.join(src, item);
  const destItem = path$8.join(dest, item);
  if (opts.filter && !opts.filter(srcItem, destItem)) return;
  const { destStat } = stat$2.checkPathsSync(srcItem, destItem, "copy", opts);
  return getStats(destStat, srcItem, destItem, opts);
}
function onLink(destStat, src, dest, opts) {
  let resolvedSrc = fs$b.readlinkSync(src);
  if (opts.dereference) {
    resolvedSrc = path$8.resolve(process.cwd(), resolvedSrc);
  }
  if (!destStat) {
    return fs$b.symlinkSync(resolvedSrc, dest);
  } else {
    let resolvedDest;
    try {
      resolvedDest = fs$b.readlinkSync(dest);
    } catch (err) {
      if (err.code === "EINVAL" || err.code === "UNKNOWN") return fs$b.symlinkSync(resolvedSrc, dest);
      throw err;
    }
    if (opts.dereference) {
      resolvedDest = path$8.resolve(process.cwd(), resolvedDest);
    }
    if (stat$2.isSrcSubdir(resolvedSrc, resolvedDest)) {
      throw new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`);
    }
    if (stat$2.isSrcSubdir(resolvedDest, resolvedSrc)) {
      throw new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`);
    }
    return copyLink(resolvedSrc, dest);
  }
}
function copyLink(resolvedSrc, dest) {
  fs$b.unlinkSync(dest);
  return fs$b.symlinkSync(resolvedSrc, dest);
}
var copySync_1 = copySync$1;
const u$a = universalify$1.fromPromise;
var copy$1 = {
  copy: u$a(copy_1),
  copySync: copySync_1
};
const fs$a = gracefulFs;
const u$9 = universalify$1.fromCallback;
function remove$2(path2, callback) {
  fs$a.rm(path2, { recursive: true, force: true }, callback);
}
function removeSync$1(path2) {
  fs$a.rmSync(path2, { recursive: true, force: true });
}
var remove_1 = {
  remove: u$9(remove$2),
  removeSync: removeSync$1
};
const u$8 = universalify$1.fromPromise;
const fs$9 = fs$i;
const path$7 = require$$1;
const mkdir$3 = mkdirs$2;
const remove$1 = remove_1;
const emptyDir = u$8(async function emptyDir2(dir) {
  let items;
  try {
    items = await fs$9.readdir(dir);
  } catch {
    return mkdir$3.mkdirs(dir);
  }
  return Promise.all(items.map((item) => remove$1.remove(path$7.join(dir, item))));
});
function emptyDirSync(dir) {
  let items;
  try {
    items = fs$9.readdirSync(dir);
  } catch {
    return mkdir$3.mkdirsSync(dir);
  }
  items.forEach((item) => {
    item = path$7.join(dir, item);
    remove$1.removeSync(item);
  });
}
var empty = {
  emptyDirSync,
  emptydirSync: emptyDirSync,
  emptyDir,
  emptydir: emptyDir
};
const u$7 = universalify$1.fromPromise;
const path$6 = require$$1;
const fs$8 = fs$i;
const mkdir$2 = mkdirs$2;
async function createFile$1(file2) {
  let stats;
  try {
    stats = await fs$8.stat(file2);
  } catch {
  }
  if (stats && stats.isFile()) return;
  const dir = path$6.dirname(file2);
  let dirStats = null;
  try {
    dirStats = await fs$8.stat(dir);
  } catch (err) {
    if (err.code === "ENOENT") {
      await mkdir$2.mkdirs(dir);
      await fs$8.writeFile(file2, "");
      return;
    } else {
      throw err;
    }
  }
  if (dirStats.isDirectory()) {
    await fs$8.writeFile(file2, "");
  } else {
    await fs$8.readdir(dir);
  }
}
function createFileSync$1(file2) {
  let stats;
  try {
    stats = fs$8.statSync(file2);
  } catch {
  }
  if (stats && stats.isFile()) return;
  const dir = path$6.dirname(file2);
  try {
    if (!fs$8.statSync(dir).isDirectory()) {
      fs$8.readdirSync(dir);
    }
  } catch (err) {
    if (err && err.code === "ENOENT") mkdir$2.mkdirsSync(dir);
    else throw err;
  }
  fs$8.writeFileSync(file2, "");
}
var file = {
  createFile: u$7(createFile$1),
  createFileSync: createFileSync$1
};
const u$6 = universalify$1.fromPromise;
const path$5 = require$$1;
const fs$7 = fs$i;
const mkdir$1 = mkdirs$2;
const { pathExists: pathExists$4 } = pathExists_1;
const { areIdentical: areIdentical$1 } = stat$4;
async function createLink$1(srcpath, dstpath) {
  let dstStat;
  try {
    dstStat = await fs$7.lstat(dstpath);
  } catch {
  }
  let srcStat;
  try {
    srcStat = await fs$7.lstat(srcpath);
  } catch (err) {
    err.message = err.message.replace("lstat", "ensureLink");
    throw err;
  }
  if (dstStat && areIdentical$1(srcStat, dstStat)) return;
  const dir = path$5.dirname(dstpath);
  const dirExists = await pathExists$4(dir);
  if (!dirExists) {
    await mkdir$1.mkdirs(dir);
  }
  await fs$7.link(srcpath, dstpath);
}
function createLinkSync$1(srcpath, dstpath) {
  let dstStat;
  try {
    dstStat = fs$7.lstatSync(dstpath);
  } catch {
  }
  try {
    const srcStat = fs$7.lstatSync(srcpath);
    if (dstStat && areIdentical$1(srcStat, dstStat)) return;
  } catch (err) {
    err.message = err.message.replace("lstat", "ensureLink");
    throw err;
  }
  const dir = path$5.dirname(dstpath);
  const dirExists = fs$7.existsSync(dir);
  if (dirExists) return fs$7.linkSync(srcpath, dstpath);
  mkdir$1.mkdirsSync(dir);
  return fs$7.linkSync(srcpath, dstpath);
}
var link = {
  createLink: u$6(createLink$1),
  createLinkSync: createLinkSync$1
};
const path$4 = require$$1;
const fs$6 = fs$i;
const { pathExists: pathExists$3 } = pathExists_1;
const u$5 = universalify$1.fromPromise;
async function symlinkPaths$1(srcpath, dstpath) {
  if (path$4.isAbsolute(srcpath)) {
    try {
      await fs$6.lstat(srcpath);
    } catch (err) {
      err.message = err.message.replace("lstat", "ensureSymlink");
      throw err;
    }
    return {
      toCwd: srcpath,
      toDst: srcpath
    };
  }
  const dstdir = path$4.dirname(dstpath);
  const relativeToDst = path$4.join(dstdir, srcpath);
  const exists = await pathExists$3(relativeToDst);
  if (exists) {
    return {
      toCwd: relativeToDst,
      toDst: srcpath
    };
  }
  try {
    await fs$6.lstat(srcpath);
  } catch (err) {
    err.message = err.message.replace("lstat", "ensureSymlink");
    throw err;
  }
  return {
    toCwd: srcpath,
    toDst: path$4.relative(dstdir, srcpath)
  };
}
function symlinkPathsSync$1(srcpath, dstpath) {
  if (path$4.isAbsolute(srcpath)) {
    const exists2 = fs$6.existsSync(srcpath);
    if (!exists2) throw new Error("absolute srcpath does not exist");
    return {
      toCwd: srcpath,
      toDst: srcpath
    };
  }
  const dstdir = path$4.dirname(dstpath);
  const relativeToDst = path$4.join(dstdir, srcpath);
  const exists = fs$6.existsSync(relativeToDst);
  if (exists) {
    return {
      toCwd: relativeToDst,
      toDst: srcpath
    };
  }
  const srcExists = fs$6.existsSync(srcpath);
  if (!srcExists) throw new Error("relative srcpath does not exist");
  return {
    toCwd: srcpath,
    toDst: path$4.relative(dstdir, srcpath)
  };
}
var symlinkPaths_1 = {
  symlinkPaths: u$5(symlinkPaths$1),
  symlinkPathsSync: symlinkPathsSync$1
};
const fs$5 = fs$i;
const u$4 = universalify$1.fromPromise;
async function symlinkType$1(srcpath, type) {
  if (type) return type;
  let stats;
  try {
    stats = await fs$5.lstat(srcpath);
  } catch {
    return "file";
  }
  return stats && stats.isDirectory() ? "dir" : "file";
}
function symlinkTypeSync$1(srcpath, type) {
  if (type) return type;
  let stats;
  try {
    stats = fs$5.lstatSync(srcpath);
  } catch {
    return "file";
  }
  return stats && stats.isDirectory() ? "dir" : "file";
}
var symlinkType_1 = {
  symlinkType: u$4(symlinkType$1),
  symlinkTypeSync: symlinkTypeSync$1
};
const u$3 = universalify$1.fromPromise;
const path$3 = require$$1;
const fs$4 = fs$i;
const { mkdirs, mkdirsSync } = mkdirs$2;
const { symlinkPaths, symlinkPathsSync } = symlinkPaths_1;
const { symlinkType, symlinkTypeSync } = symlinkType_1;
const { pathExists: pathExists$2 } = pathExists_1;
const { areIdentical } = stat$4;
async function createSymlink$1(srcpath, dstpath, type) {
  let stats;
  try {
    stats = await fs$4.lstat(dstpath);
  } catch {
  }
  if (stats && stats.isSymbolicLink()) {
    const [srcStat, dstStat] = await Promise.all([
      fs$4.stat(srcpath),
      fs$4.stat(dstpath)
    ]);
    if (areIdentical(srcStat, dstStat)) return;
  }
  const relative = await symlinkPaths(srcpath, dstpath);
  srcpath = relative.toDst;
  const toType = await symlinkType(relative.toCwd, type);
  const dir = path$3.dirname(dstpath);
  if (!await pathExists$2(dir)) {
    await mkdirs(dir);
  }
  return fs$4.symlink(srcpath, dstpath, toType);
}
function createSymlinkSync$1(srcpath, dstpath, type) {
  let stats;
  try {
    stats = fs$4.lstatSync(dstpath);
  } catch {
  }
  if (stats && stats.isSymbolicLink()) {
    const srcStat = fs$4.statSync(srcpath);
    const dstStat = fs$4.statSync(dstpath);
    if (areIdentical(srcStat, dstStat)) return;
  }
  const relative = symlinkPathsSync(srcpath, dstpath);
  srcpath = relative.toDst;
  type = symlinkTypeSync(relative.toCwd, type);
  const dir = path$3.dirname(dstpath);
  const exists = fs$4.existsSync(dir);
  if (exists) return fs$4.symlinkSync(srcpath, dstpath, type);
  mkdirsSync(dir);
  return fs$4.symlinkSync(srcpath, dstpath, type);
}
var symlink = {
  createSymlink: u$3(createSymlink$1),
  createSymlinkSync: createSymlinkSync$1
};
const { createFile, createFileSync } = file;
const { createLink, createLinkSync } = link;
const { createSymlink, createSymlinkSync } = symlink;
var ensure = {
  // file
  createFile,
  createFileSync,
  ensureFile: createFile,
  ensureFileSync: createFileSync,
  // link
  createLink,
  createLinkSync,
  ensureLink: createLink,
  ensureLinkSync: createLinkSync,
  // symlink
  createSymlink,
  createSymlinkSync,
  ensureSymlink: createSymlink,
  ensureSymlinkSync: createSymlinkSync
};
function stringify$3(obj, { EOL = "\n", finalEOL = true, replacer = null, spaces } = {}) {
  const EOF = finalEOL ? EOL : "";
  const str = JSON.stringify(obj, replacer, spaces);
  return str.replace(/\n/g, EOL) + EOF;
}
function stripBom$1(content) {
  if (Buffer.isBuffer(content)) content = content.toString("utf8");
  return content.replace(/^\uFEFF/, "");
}
var utils = { stringify: stringify$3, stripBom: stripBom$1 };
let _fs;
try {
  _fs = gracefulFs;
} catch (_) {
  _fs = require$$0;
}
const universalify = universalify$1;
const { stringify: stringify$2, stripBom } = utils;
async function _readFile(file2, options = {}) {
  if (typeof options === "string") {
    options = { encoding: options };
  }
  const fs2 = options.fs || _fs;
  const shouldThrow = "throws" in options ? options.throws : true;
  let data = await universalify.fromCallback(fs2.readFile)(file2, options);
  data = stripBom(data);
  let obj;
  try {
    obj = JSON.parse(data, options ? options.reviver : null);
  } catch (err) {
    if (shouldThrow) {
      err.message = `${file2}: ${err.message}`;
      throw err;
    } else {
      return null;
    }
  }
  return obj;
}
const readFile = universalify.fromPromise(_readFile);
function readFileSync(file2, options = {}) {
  if (typeof options === "string") {
    options = { encoding: options };
  }
  const fs2 = options.fs || _fs;
  const shouldThrow = "throws" in options ? options.throws : true;
  try {
    let content = fs2.readFileSync(file2, options);
    content = stripBom(content);
    return JSON.parse(content, options.reviver);
  } catch (err) {
    if (shouldThrow) {
      err.message = `${file2}: ${err.message}`;
      throw err;
    } else {
      return null;
    }
  }
}
async function _writeFile(file2, obj, options = {}) {
  const fs2 = options.fs || _fs;
  const str = stringify$2(obj, options);
  await universalify.fromCallback(fs2.writeFile)(file2, str, options);
}
const writeFile = universalify.fromPromise(_writeFile);
function writeFileSync(file2, obj, options = {}) {
  const fs2 = options.fs || _fs;
  const str = stringify$2(obj, options);
  return fs2.writeFileSync(file2, str, options);
}
var jsonfile$1 = {
  readFile,
  readFileSync,
  writeFile,
  writeFileSync
};
const jsonFile$1 = jsonfile$1;
var jsonfile = {
  // jsonfile exports
  readJson: jsonFile$1.readFile,
  readJsonSync: jsonFile$1.readFileSync,
  writeJson: jsonFile$1.writeFile,
  writeJsonSync: jsonFile$1.writeFileSync
};
const u$2 = universalify$1.fromPromise;
const fs$3 = fs$i;
const path$2 = require$$1;
const mkdir = mkdirs$2;
const pathExists$1 = pathExists_1.pathExists;
async function outputFile$1(file2, data, encoding = "utf-8") {
  const dir = path$2.dirname(file2);
  if (!await pathExists$1(dir)) {
    await mkdir.mkdirs(dir);
  }
  return fs$3.writeFile(file2, data, encoding);
}
function outputFileSync$1(file2, ...args) {
  const dir = path$2.dirname(file2);
  if (!fs$3.existsSync(dir)) {
    mkdir.mkdirsSync(dir);
  }
  fs$3.writeFileSync(file2, ...args);
}
var outputFile_1 = {
  outputFile: u$2(outputFile$1),
  outputFileSync: outputFileSync$1
};
const { stringify: stringify$1 } = utils;
const { outputFile } = outputFile_1;
async function outputJson(file2, data, options = {}) {
  const str = stringify$1(data, options);
  await outputFile(file2, str, options);
}
var outputJson_1 = outputJson;
const { stringify } = utils;
const { outputFileSync } = outputFile_1;
function outputJsonSync(file2, data, options) {
  const str = stringify(data, options);
  outputFileSync(file2, str, options);
}
var outputJsonSync_1 = outputJsonSync;
const u$1 = universalify$1.fromPromise;
const jsonFile = jsonfile;
jsonFile.outputJson = u$1(outputJson_1);
jsonFile.outputJsonSync = outputJsonSync_1;
jsonFile.outputJSON = jsonFile.outputJson;
jsonFile.outputJSONSync = jsonFile.outputJsonSync;
jsonFile.writeJSON = jsonFile.writeJson;
jsonFile.writeJSONSync = jsonFile.writeJsonSync;
jsonFile.readJSON = jsonFile.readJson;
jsonFile.readJSONSync = jsonFile.readJsonSync;
var json = jsonFile;
const fs$2 = fs$i;
const path$1 = require$$1;
const { copy } = copy$1;
const { remove } = remove_1;
const { mkdirp } = mkdirs$2;
const { pathExists } = pathExists_1;
const stat$1 = stat$4;
async function move$1(src, dest, opts = {}) {
  const overwrite = opts.overwrite || opts.clobber || false;
  const { srcStat, isChangingCase = false } = await stat$1.checkPaths(src, dest, "move", opts);
  await stat$1.checkParentPaths(src, srcStat, dest, "move");
  const destParent = path$1.dirname(dest);
  const parsedParentPath = path$1.parse(destParent);
  if (parsedParentPath.root !== destParent) {
    await mkdirp(destParent);
  }
  return doRename$1(src, dest, overwrite, isChangingCase);
}
async function doRename$1(src, dest, overwrite, isChangingCase) {
  if (!isChangingCase) {
    if (overwrite) {
      await remove(dest);
    } else if (await pathExists(dest)) {
      throw new Error("dest already exists.");
    }
  }
  try {
    await fs$2.rename(src, dest);
  } catch (err) {
    if (err.code !== "EXDEV") {
      throw err;
    }
    await moveAcrossDevice$1(src, dest, overwrite);
  }
}
async function moveAcrossDevice$1(src, dest, overwrite) {
  const opts = {
    overwrite,
    errorOnExist: true,
    preserveTimestamps: true
  };
  await copy(src, dest, opts);
  return remove(src);
}
var move_1 = move$1;
const fs$1 = gracefulFs;
const path = require$$1;
const copySync = copy$1.copySync;
const removeSync = remove_1.removeSync;
const mkdirpSync = mkdirs$2.mkdirpSync;
const stat = stat$4;
function moveSync(src, dest, opts) {
  opts = opts || {};
  const overwrite = opts.overwrite || opts.clobber || false;
  const { srcStat, isChangingCase = false } = stat.checkPathsSync(src, dest, "move", opts);
  stat.checkParentPathsSync(src, srcStat, dest, "move");
  if (!isParentRoot(dest)) mkdirpSync(path.dirname(dest));
  return doRename(src, dest, overwrite, isChangingCase);
}
function isParentRoot(dest) {
  const parent = path.dirname(dest);
  const parsedPath = path.parse(parent);
  return parsedPath.root === parent;
}
function doRename(src, dest, overwrite, isChangingCase) {
  if (isChangingCase) return rename(src, dest, overwrite);
  if (overwrite) {
    removeSync(dest);
    return rename(src, dest, overwrite);
  }
  if (fs$1.existsSync(dest)) throw new Error("dest already exists.");
  return rename(src, dest, overwrite);
}
function rename(src, dest, overwrite) {
  try {
    fs$1.renameSync(src, dest);
  } catch (err) {
    if (err.code !== "EXDEV") throw err;
    return moveAcrossDevice(src, dest, overwrite);
  }
}
function moveAcrossDevice(src, dest, overwrite) {
  const opts = {
    overwrite,
    errorOnExist: true,
    preserveTimestamps: true
  };
  copySync(src, dest, opts);
  return removeSync(src);
}
var moveSync_1 = moveSync;
const u = universalify$1.fromPromise;
var move = {
  move: u(move_1),
  moveSync: moveSync_1
};
var lib = {
  // Export promiseified graceful-fs:
  ...fs$i,
  // Export extra methods:
  ...copy$1,
  ...empty,
  ...ensure,
  ...json,
  ...mkdirs$2,
  ...move,
  ...outputFile_1,
  ...pathExists_1,
  ...remove_1
};
const fs = /* @__PURE__ */ getDefaultExportFromCjs(lib);
createRequire(import.meta.url);
const __dirname$1 = path$f.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path$f.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path$f.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path$f.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path$f.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
const getBinaryPath = () => {
  const platform2 = process.platform;
  const binaryName = platform2 === "win32" ? "yt-dlp.exe" : "yt-dlp";
  if (VITE_DEV_SERVER_URL) {
    return path$f.join(process.env.APP_ROOT, "resources", binaryName);
  }
  return path$f.join(process.resourcesPath, binaryName);
};
const getFfmpegPath = () => {
  const platform2 = process.platform;
  const binaryName = platform2 === "win32" ? "ffmpeg.exe" : "ffmpeg";
  let bundledPath;
  if (VITE_DEV_SERVER_URL) {
    bundledPath = path$f.join(process.env.APP_ROOT, "resources", binaryName);
  } else {
    bundledPath = path$f.join(process.resourcesPath, binaryName);
  }
  if (fs.existsSync(bundledPath)) {
    return bundledPath;
  }
  if (platform2 === "darwin" || platform2 === "linux") {
    const commonPaths = [
      "/opt/homebrew/bin/ffmpeg",
      // Apple Silicon Mac
      "/usr/local/bin/ffmpeg",
      // Intel Mac
      "/usr/bin/ffmpeg"
    ];
    for (const p of commonPaths) {
      if (fs.existsSync(p)) return p;
    }
  }
  return binaryName;
};
function createWindow() {
  win = new BrowserWindow({
    width: 900,
    height: 670,
    icon: path$f.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path$f.join(__dirname$1, "preload.mjs"),
      sandbox: false
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path$f.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
  const binaryPath = getBinaryPath();
  console.log(...oo_oo(`2475443129_109_4_109_62_4`, "[Self-Check] Testing binary at:", binaryPath));
  if (fs.existsSync(binaryPath)) {
    const check = spawn_1(binaryPath, ["--version"]);
    check.stdout.on("data", (d) => (
      /* eslint-disable */
      console.log(...oo_oo(`2475443129_112_39_112_95_4`, "[Self-Check] stdout:", d.toString().trim()))
    ));
    check.stderr.on("data", (d) => (
      /* eslint-disable */
      console.error(...oo_tx(`2475443129_113_39_113_97_11`, "[Self-Check] stderr:", d.toString().trim()))
    ));
    check.on("error", (e) => (
      /* eslint-disable */
      console.error(...oo_tx(`2475443129_114_33_114_72_11`, "[Self-Check] error:", e))
    ));
    check.on("close", (c) => (
      /* eslint-disable */
      console.log(...oo_oo(`2475443129_115_33_115_74_4`, "[Self-Check] exit code:", c))
    ));
  } else {
    console.error(...oo_tx(`2475443129_117_8_117_55_11`, "[Self-Check] Binary not found!"));
  }
});
ipcMain.handle("select-directory", async () => {
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, {
    properties: ["openDirectory"]
  });
  if (result.canceled) {
    return null;
  }
  return result.filePaths[0];
});
ipcMain.handle("get-formats", async (event, { url }) => {
  const binaryPath = getBinaryPath();
  console.log(...oo_oo(`2475443129_137_2_137_61_4`, "[get-formats] Fetching formats for URL:", url));
  win == null ? void 0 : win.webContents.send("download-log", `[格式查詢] 正在獲取可用格式...`);
  if (!fs.existsSync(binaryPath)) {
    const errorMsg = `Binary not found at: ${binaryPath}`;
    console.error(...oo_tx(`2475443129_143_4_143_27_11`, errorMsg));
    throw new Error(errorMsg);
  }
  const args = [
    url,
    "-F",
    // 列出所有可用格式
    "--no-warnings"
  ];
  console.log(...oo_oo(`2475443129_153_2_153_75_4`, "[get-formats] Running command:", binaryPath, args.join(" ")));
  return new Promise((resolve, reject) => {
    const worker = spawn_1(binaryPath, args);
    let output = "";
    let errorOutput = "";
    worker.stdout.on("data", (data) => {
      const text = data.toString();
      output += text;
      console.log(...oo_oo(`2475443129_163_6_163_48_4`, "[get-formats] stdout:", text));
    });
    worker.stderr.on("data", (data) => {
      const text = data.toString();
      errorOutput += text;
      console.error(...oo_tx(`2475443129_169_6_169_50_11`, "[get-formats] stderr:", text));
    });
    worker.on("close", (code) => {
      console.log(...oo_oo(`2475443129_173_6_173_66_4`, "[get-formats] Process exited with code:", code));
      if (code === 0) {
        const formats = parseFormats(output);
        console.log(...oo_oo(`2475443129_178_8_178_68_4`, "[get-formats] Parsed formats:", formats.length));
        win == null ? void 0 : win.webContents.send("download-log", `[格式查詢] 找到 ${formats.length} 個可用格式`);
        resolve({ formats, rawOutput: output });
      } else {
        const error = new Error(`Failed to get formats: ${errorOutput || "Unknown error"}`);
        console.error(...oo_tx(`2475443129_183_8_183_52_11`, "[get-formats] Error:", error));
        reject(error);
      }
    });
    worker.on("error", (err) => {
      console.error(...oo_tx(`2475443129_189_6_189_54_11`, "[get-formats] Spawn error:", err));
      reject(err);
    });
  });
});
function parseFormats(output) {
  const formats = [];
  const lines = output.split("\n");
  let startIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^ID\s+EXT\s+RESOLUTION/i)) {
      startIndex = i + 1;
      break;
    }
  }
  if (startIndex === -1) {
    console.warn(...oo_tr(`2475443129_221_4_221_69_8`, "[parseFormats] Could not find format table header"));
    return formats;
  }
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("---")) continue;
    const match = line.match(/^(\S+)\s+(\S+)\s+(\S+)?\s*(.*)/);
    if (match) {
      const [, id, ext, resolution, rest] = match;
      if (!/^\d/.test(id)) continue;
      rest ? rest.trim().split(/\s+/) : [];
      formats.push({
        id,
        ext,
        resolution: resolution || "audio only",
        fps: extractFps(rest || ""),
        filesize: extractFilesize(rest || ""),
        tbr: extractTbr(rest || ""),
        proto: extractProto(rest || ""),
        vcodec: extractCodec(rest || "", "v"),
        acodec: extractCodec(rest || "", "a"),
        note: extractNote(line)
      });
    }
  }
  console.log(...oo_oo(`2475443129_256_2_256_69_4`, "[parseFormats] Parsed formats count:", formats.length));
  return formats;
}
function extractFps(text) {
  const match = text.match(/(\d+)fps/);
  return match ? match[1] + "fps" : "";
}
function extractFilesize(text) {
  const match = text.match(/(\d+\.?\d*[KMG]iB)/);
  return match ? match[1] : "";
}
function extractTbr(text) {
  const match = text.match(/(\d+\.?\d*k)/);
  return match ? match[1] : "";
}
function extractProto(text) {
  const match = text.match(/(https?|m3u8|mhtml)/);
  return match ? match[1] : "";
}
function extractCodec(text, type) {
  if (type === "v") {
    const match = text.match(/vcodec:(\S+)/) || text.match(/(avc1|vp9|av01|h264)/);
    return match ? match[1] : "";
  } else {
    const match = text.match(/acodec:(\S+)/) || text.match(/(opus|mp4a|aac)/);
    return match ? match[1] : "";
  }
}
function extractNote(line) {
  const match = line.match(/\(([^)]+)\)$/);
  return match ? match[1] : "";
}
ipcMain.handle("start-download", async (event, { url, cookiePath, formatId, downloadPath }) => {
  const binaryPath = getBinaryPath();
  const finalDownloadPath = downloadPath || app.getPath("downloads");
  console.log(...oo_oo(`2475443129_306_2_306_73_4`, "[start-download] Final download path:", finalDownloadPath));
  const ffmpegPath = getFfmpegPath();
  console.log(...oo_oo(`2475443129_309_2_309_41_4`, "Binary Path:", binaryPath));
  console.log(...oo_oo(`2475443129_310_2_310_41_4`, "FFmpeg Path:", ffmpegPath));
  console.log(...oo_oo(`2475443129_311_2_311_57_4`, "Format ID:", formatId || "best (default)"));
  win == null ? void 0 : win.webContents.send("download-log", `Binary Path: ${binaryPath}`);
  win == null ? void 0 : win.webContents.send("download-log", `FFmpeg Path: ${ffmpegPath}`);
  win == null ? void 0 : win.webContents.send("download-log", `Format ID: ${formatId || "best (default)"}`);
  win == null ? void 0 : win.webContents.send("download-log", `Download Path: ${finalDownloadPath}`);
  if (!fs.existsSync(binaryPath)) {
    const errorMsg = `Binary not found at: ${binaryPath}`;
    console.error(...oo_tx(`2475443129_320_6_320_29_11`, errorMsg));
    win == null ? void 0 : win.webContents.send("download-log", errorMsg);
    throw new Error(errorMsg);
  }
  const args = [
    url,
    "-o",
    path$f.join(finalDownloadPath, "%(title)s.%(ext)s"),
    "--newline",
    // 确保进度输出换行
    "--no-colors",
    // 禁用颜色代码，方便正则解析
    "--progress",
    "--verbose",
    // 开启详细日志
    "--ffmpeg-location",
    ffmpegPath
    // 指定 ffmpeg 路径
  ];
  if (formatId) {
    args.push("-f", formatId);
    win == null ? void 0 : win.webContents.send("download-log", `使用指定格式: ${formatId}`);
  }
  if (cookiePath && fs.existsSync(cookiePath)) {
    args.push("--cookies", cookiePath);
  }
  win == null ? void 0 : win.webContents.send("download-log", `Starting download with args: ${args.join(" ")}`);
  return new Promise((resolve, reject) => {
    const worker = spawn_1(binaryPath, args);
    worker.stdout.on("data", (data) => {
      const output = data.toString();
      console.log(...oo_oo(`2475443129_352_6_352_43_4`, "yt-dlp output:", output));
      const progressMatch = output.match(/(\d{1,3}\.\d)%/);
      if (progressMatch) {
        const percent = parseFloat(progressMatch[1]);
        win == null ? void 0 : win.webContents.send("download-progress", percent);
      }
      const lines = output.split("\n").filter((line) => line.trim() !== "");
      lines.forEach((line) => {
        win == null ? void 0 : win.webContents.send("download-log", line);
      });
    });
    worker.stderr.on("data", (data) => {
      const errorOutput = data.toString();
      console.error(...oo_tx(`2475443129_370_6_370_45_11`, `stderr: ${errorOutput}`));
      win == null ? void 0 : win.webContents.send("download-log", `STDERR: ${errorOutput}`);
    });
    worker.on("close", (code) => {
      console.log(...oo_oo(`2475443129_375_6_375_53_4`, `Process exited with code ${code}`));
      win == null ? void 0 : win.webContents.send("download-log", `Process exited with code ${code}`);
      if (code === 0) {
        resolve({ status: "success", path: finalDownloadPath });
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
    worker.on("error", (err) => {
      console.error(...oo_tx(`2475443129_385_8_385_42_11`, "Spawn error:", err));
      win == null ? void 0 : win.webContents.send("download-log", `Spawn Error: ${err.message}`);
      reject(err);
    });
  });
});
app.whenReady().then(createWindow);
function oo_cm() {
  try {
    return (0, eval)("globalThis._console_ninja") || (0, eval)(`/* https://github.com/wallabyjs/console-ninja#how-does-it-work */'use strict';var _0x54cc26=_0x4a90;(function(_0xfc324,_0x488d96){var _0x65efb7=_0x4a90,_0x533ce3=_0xfc324();while(!![]){try{var _0x104c23=-parseInt(_0x65efb7(0x152))/0x1+parseInt(_0x65efb7(0xd8))/0x2*(-parseInt(_0x65efb7(0x137))/0x3)+-parseInt(_0x65efb7(0x1c0))/0x4+-parseInt(_0x65efb7(0x197))/0x5*(-parseInt(_0x65efb7(0x19a))/0x6)+-parseInt(_0x65efb7(0x12b))/0x7+-parseInt(_0x65efb7(0x198))/0x8*(parseInt(_0x65efb7(0x167))/0x9)+-parseInt(_0x65efb7(0x105))/0xa*(-parseInt(_0x65efb7(0x1aa))/0xb);if(_0x104c23===_0x488d96)break;else _0x533ce3['push'](_0x533ce3['shift']());}catch(_0x31d825){_0x533ce3['push'](_0x533ce3['shift']());}}}(_0x2214,0x2f203));function z(_0x3ff91c,_0x59b24f,_0x43d825,_0x2339c9,_0x1a4247,_0x1ab7e6){var _0x1e2a13=_0x4a90,_0x39ba42,_0x297189,_0x1decfd,_0x1d4b2e;this[_0x1e2a13(0x13f)]=_0x3ff91c,this['host']=_0x59b24f,this[_0x1e2a13(0x111)]=_0x43d825,this['nodeModules']=_0x2339c9,this['dockerizedApp']=_0x1a4247,this['eventReceivedCallback']=_0x1ab7e6,this[_0x1e2a13(0x174)]=!0x0,this[_0x1e2a13(0x182)]=!0x0,this[_0x1e2a13(0xdd)]=!0x1,this['_connecting']=!0x1,this['_inNextEdge']=((_0x297189=(_0x39ba42=_0x3ff91c[_0x1e2a13(0x169)])==null?void 0x0:_0x39ba42[_0x1e2a13(0x10a)])==null?void 0x0:_0x297189[_0x1e2a13(0x193)])===_0x1e2a13(0x11d),this[_0x1e2a13(0x1b1)]=!((_0x1d4b2e=(_0x1decfd=this[_0x1e2a13(0x13f)][_0x1e2a13(0x169)])==null?void 0x0:_0x1decfd[_0x1e2a13(0x12a)])!=null&&_0x1d4b2e['node'])&&!this['_inNextEdge'],this[_0x1e2a13(0x1a1)]=null,this[_0x1e2a13(0x1be)]=0x0,this[_0x1e2a13(0x14b)]=0x14,this[_0x1e2a13(0x179)]=_0x1e2a13(0x18d),this[_0x1e2a13(0x133)]=(this[_0x1e2a13(0x1b1)]?_0x1e2a13(0x15d):'Console\\x20Ninja\\x20failed\\x20to\\x20send\\x20logs,\\x20restarting\\x20the\\x20process\\x20may\\x20help;\\x20also\\x20see\\x20')+this['_webSocketErrorDocsLink'];}z[_0x54cc26(0x18a)][_0x54cc26(0x1c5)]=async function(){var _0x2c61ab=_0x54cc26,_0x3e4a2e,_0x25368c;if(this['_WebSocketClass'])return this['_WebSocketClass'];let _0x4cbaf9;if(this[_0x2c61ab(0x1b1)]||this['_inNextEdge'])_0x4cbaf9=this[_0x2c61ab(0x13f)][_0x2c61ab(0x1b5)];else{if((_0x3e4a2e=this[_0x2c61ab(0x13f)][_0x2c61ab(0x169)])!=null&&_0x3e4a2e[_0x2c61ab(0x113)])_0x4cbaf9=(_0x25368c=this[_0x2c61ab(0x13f)][_0x2c61ab(0x169)])==null?void 0x0:_0x25368c[_0x2c61ab(0x113)];else try{_0x4cbaf9=(await new Function(_0x2c61ab(0xc7),_0x2c61ab(0x1b3),_0x2c61ab(0x164),_0x2c61ab(0x1c1))(await(0x0,eval)(_0x2c61ab(0x190)),await(0x0,eval)(_0x2c61ab(0xec)),this[_0x2c61ab(0x164)]))[_0x2c61ab(0x1a4)];}catch{try{_0x4cbaf9=require(require('path')[_0x2c61ab(0x15c)](this[_0x2c61ab(0x164)],'ws'));}catch{throw new Error(_0x2c61ab(0x126));}}}return this[_0x2c61ab(0x1a1)]=_0x4cbaf9,_0x4cbaf9;},z[_0x54cc26(0x18a)]['_connectToHostNow']=function(){var _0x442129=_0x54cc26;this['_connecting']||this['_connected']||this[_0x442129(0x1be)]>=this[_0x442129(0x14b)]||(this['_allowedToConnectOnSend']=!0x1,this[_0x442129(0x125)]=!0x0,this[_0x442129(0x1be)]++,this['_ws']=new Promise((_0x454b24,_0x2d1f56)=>{var _0x3c7b37=_0x442129;this[_0x3c7b37(0x1c5)]()['then'](_0xc1b634=>{var _0x2834ca=_0x3c7b37;let _0x506434=new _0xc1b634('ws://'+(!this[_0x2834ca(0x1b1)]&&this[_0x2834ca(0x150)]?_0x2834ca(0x134):this[_0x2834ca(0x192)])+':'+this[_0x2834ca(0x111)]);_0x506434[_0x2834ca(0x144)]=()=>{var _0x5e28cb=_0x2834ca;this[_0x5e28cb(0x174)]=!0x1,this[_0x5e28cb(0x147)](_0x506434),this[_0x5e28cb(0x13c)](),_0x2d1f56(new Error(_0x5e28cb(0x1c4)));},_0x506434['onopen']=()=>{var _0x49bdba=_0x2834ca;this[_0x49bdba(0x1b1)]||_0x506434[_0x49bdba(0x13d)]&&_0x506434[_0x49bdba(0x13d)][_0x49bdba(0x15b)]&&_0x506434[_0x49bdba(0x13d)][_0x49bdba(0x15b)](),_0x454b24(_0x506434);},_0x506434['onclose']=()=>{var _0x15ef95=_0x2834ca;this[_0x15ef95(0x182)]=!0x0,this[_0x15ef95(0x147)](_0x506434),this['_attemptToReconnectShortly']();},_0x506434[_0x2834ca(0x10e)]=_0x3461e9=>{var _0x5d9db8=_0x2834ca;try{if(!(_0x3461e9!=null&&_0x3461e9[_0x5d9db8(0xca)])||!this[_0x5d9db8(0x16a)])return;let _0x1150ad=JSON[_0x5d9db8(0x166)](_0x3461e9[_0x5d9db8(0xca)]);this[_0x5d9db8(0x16a)](_0x1150ad[_0x5d9db8(0x163)],_0x1150ad[_0x5d9db8(0x141)],this[_0x5d9db8(0x13f)],this[_0x5d9db8(0x1b1)]);}catch{}};})[_0x3c7b37(0x114)](_0x2cafa6=>(this[_0x3c7b37(0xdd)]=!0x0,this[_0x3c7b37(0x125)]=!0x1,this[_0x3c7b37(0x182)]=!0x1,this[_0x3c7b37(0x174)]=!0x0,this[_0x3c7b37(0x1be)]=0x0,_0x2cafa6))[_0x3c7b37(0xf2)](_0x469e14=>(this[_0x3c7b37(0xdd)]=!0x1,this[_0x3c7b37(0x125)]=!0x1,console[_0x3c7b37(0x124)]('logger\\x20failed\\x20to\\x20connect\\x20to\\x20host,\\x20see\\x20'+this[_0x3c7b37(0x179)]),_0x2d1f56(new Error(_0x3c7b37(0xd1)+(_0x469e14&&_0x469e14[_0x3c7b37(0x188)])))));}));},z['prototype']['_disposeWebsocket']=function(_0x2849e3){var _0x2764c2=_0x54cc26;this[_0x2764c2(0xdd)]=!0x1,this[_0x2764c2(0x125)]=!0x1;try{_0x2849e3['onclose']=null,_0x2849e3[_0x2764c2(0x144)]=null,_0x2849e3['onopen']=null;}catch{}try{_0x2849e3[_0x2764c2(0x1ca)]<0x2&&_0x2849e3['close']();}catch{}},z[_0x54cc26(0x18a)]['_attemptToReconnectShortly']=function(){var _0x4b9fe0=_0x54cc26;clearTimeout(this[_0x4b9fe0(0xe3)]),!(this[_0x4b9fe0(0x1be)]>=this['_maxConnectAttemptCount'])&&(this[_0x4b9fe0(0xe3)]=setTimeout(()=>{var _0x3f71bc=_0x4b9fe0,_0x4f1396;this[_0x3f71bc(0xdd)]||this[_0x3f71bc(0x125)]||(this[_0x3f71bc(0xf0)](),(_0x4f1396=this[_0x3f71bc(0x194)])==null||_0x4f1396[_0x3f71bc(0xf2)](()=>this[_0x3f71bc(0x13c)]()));},0x1f4),this[_0x4b9fe0(0xe3)]['unref']&&this[_0x4b9fe0(0xe3)]['unref']());},z['prototype']['send']=async function(_0x1d08e5){var _0x4d9680=_0x54cc26;try{if(!this['_allowedToSend'])return;this['_allowedToConnectOnSend']&&this[_0x4d9680(0xf0)](),(await this[_0x4d9680(0x194)])[_0x4d9680(0x17d)](JSON['stringify'](_0x1d08e5));}catch(_0x15826e){this[_0x4d9680(0x143)]?console[_0x4d9680(0x124)](this['_sendErrorMessage']+':\\x20'+(_0x15826e&&_0x15826e['message'])):(this[_0x4d9680(0x143)]=!0x0,console[_0x4d9680(0x124)](this[_0x4d9680(0x133)]+':\\x20'+(_0x15826e&&_0x15826e[_0x4d9680(0x188)]),_0x1d08e5)),this[_0x4d9680(0x174)]=!0x1,this['_attemptToReconnectShortly']();}};function H(_0xaac806,_0x5ed5cc,_0x320235,_0x41fb4a,_0xb1b23a,_0x1d990d,_0x384cd6,_0x1ac656=ne){var _0x31e34b=_0x54cc26;let _0x134f7c=_0x320235[_0x31e34b(0x1c2)](',')[_0x31e34b(0x106)](_0x22f303=>{var _0x5a2d5a=_0x31e34b,_0x2a5e8e,_0x3fa0bd,_0xad4aad,_0x354175,_0x5817d6,_0x416e53,_0x1c19a5;try{if(!_0xaac806[_0x5a2d5a(0x1a5)]){let _0x3e5b68=((_0x3fa0bd=(_0x2a5e8e=_0xaac806[_0x5a2d5a(0x169)])==null?void 0x0:_0x2a5e8e['versions'])==null?void 0x0:_0x3fa0bd[_0x5a2d5a(0x128)])||((_0x354175=(_0xad4aad=_0xaac806[_0x5a2d5a(0x169)])==null?void 0x0:_0xad4aad[_0x5a2d5a(0x10a)])==null?void 0x0:_0x354175['NEXT_RUNTIME'])==='edge';(_0xb1b23a===_0x5a2d5a(0x129)||_0xb1b23a===_0x5a2d5a(0x135)||_0xb1b23a==='astro'||_0xb1b23a===_0x5a2d5a(0x18e))&&(_0xb1b23a+=_0x3e5b68?_0x5a2d5a(0xf4):'\\x20browser');let _0x3dcbaf='';_0xb1b23a==='react-native'&&(_0x3dcbaf=(((_0x1c19a5=(_0x416e53=(_0x5817d6=_0xaac806['expo'])==null?void 0x0:_0x5817d6['modules'])==null?void 0x0:_0x416e53[_0x5a2d5a(0x1a2)])==null?void 0x0:_0x1c19a5['osName'])||'')['toLowerCase'](),_0x3dcbaf&&(_0xb1b23a+='\\x20'+_0x3dcbaf,_0x3dcbaf===_0x5a2d5a(0x1a8)&&(_0x5ed5cc=_0x5a2d5a(0x108)))),_0xaac806[_0x5a2d5a(0x1a5)]={'id':+new Date(),'tool':_0xb1b23a},_0x384cd6&&_0xb1b23a&&!_0x3e5b68&&(_0x3dcbaf?console[_0x5a2d5a(0x116)]('Console\\x20Ninja\\x20extension\\x20is\\x20connected\\x20to\\x20'+_0x3dcbaf+_0x5a2d5a(0xda)):console[_0x5a2d5a(0x116)]('%c\\x20Console\\x20Ninja\\x20extension\\x20is\\x20connected\\x20to\\x20'+(_0xb1b23a[_0x5a2d5a(0x11e)](0x0)[_0x5a2d5a(0x1b6)]()+_0xb1b23a[_0x5a2d5a(0x172)](0x1))+',','background:\\x20rgb(30,30,30);\\x20color:\\x20rgb(255,213,92)',_0x5a2d5a(0x170)));}let _0x31b88=new z(_0xaac806,_0x5ed5cc,_0x22f303,_0x41fb4a,_0x1d990d,_0x1ac656);return _0x31b88['send']['bind'](_0x31b88);}catch(_0x1dd37f){return console['warn'](_0x5a2d5a(0xf8),_0x1dd37f&&_0x1dd37f['message']),()=>{};}});return _0x1bab8d=>_0x134f7c['forEach'](_0xf9f6fe=>_0xf9f6fe(_0x1bab8d));}function ne(_0x215577,_0x1d2815,_0x27483d,_0x2f114f){var _0xdebb60=_0x54cc26;_0x2f114f&&_0x215577===_0xdebb60(0x13e)&&_0x27483d[_0xdebb60(0x101)][_0xdebb60(0x13e)]();}function b(_0x4bf85c){var _0x402023=_0x54cc26,_0x39f3be,_0x1b82fe;let _0xcdf938=function(_0x5b8299,_0x5b1c4e){return _0x5b1c4e-_0x5b8299;},_0xa22518;if(_0x4bf85c[_0x402023(0x100)])_0xa22518=function(){var _0x1b3c2a=_0x402023;return _0x4bf85c[_0x1b3c2a(0x100)][_0x1b3c2a(0x1a6)]();};else{if(_0x4bf85c[_0x402023(0x169)]&&_0x4bf85c[_0x402023(0x169)][_0x402023(0xde)]&&((_0x1b82fe=(_0x39f3be=_0x4bf85c[_0x402023(0x169)])==null?void 0x0:_0x39f3be[_0x402023(0x10a)])==null?void 0x0:_0x1b82fe['NEXT_RUNTIME'])!==_0x402023(0x11d))_0xa22518=function(){var _0xdb951a=_0x402023;return _0x4bf85c[_0xdb951a(0x169)][_0xdb951a(0xde)]();},_0xcdf938=function(_0xbcdac7,_0x1f8e63){return 0x3e8*(_0x1f8e63[0x0]-_0xbcdac7[0x0])+(_0x1f8e63[0x1]-_0xbcdac7[0x1])/0xf4240;};else try{let {performance:_0x4cdf5e}=require('perf_hooks');_0xa22518=function(){var _0x194844=_0x402023;return _0x4cdf5e[_0x194844(0x1a6)]();};}catch{_0xa22518=function(){return+new Date();};}}return{'elapsed':_0xcdf938,'timeStamp':_0xa22518,'now':()=>Date[_0x402023(0x1a6)]()};}function X(_0x59955b,_0x3967e7,_0x2cce88){var _0x4215b2=_0x54cc26,_0x244b03,_0x3c8740,_0x47936d,_0x52231b,_0x3b5f0a,_0x4a40d4,_0x5240c0,_0x4c6114,_0xd96b4;if(_0x59955b[_0x4215b2(0xfa)]!==void 0x0)return _0x59955b[_0x4215b2(0xfa)];let _0xf3157d=((_0x3c8740=(_0x244b03=_0x59955b['process'])==null?void 0x0:_0x244b03[_0x4215b2(0x12a)])==null?void 0x0:_0x3c8740['node'])||((_0x52231b=(_0x47936d=_0x59955b[_0x4215b2(0x169)])==null?void 0x0:_0x47936d['env'])==null?void 0x0:_0x52231b[_0x4215b2(0x193)])===_0x4215b2(0x11d),_0x3b4db8=!!(_0x2cce88===_0x4215b2(0xd6)&&((_0x5240c0=(_0x4a40d4=(_0x3b5f0a=_0x59955b[_0x4215b2(0xcd)])==null?void 0x0:_0x3b5f0a[_0x4215b2(0x160)])==null?void 0x0:_0x4a40d4[_0x4215b2(0x1a2)])==null?void 0x0:_0x5240c0['osName']));function _0x2b6750(_0x48746a){var _0x18b065=_0x4215b2;if(_0x48746a['startsWith']('/')&&_0x48746a[_0x18b065(0x140)]('/')){let _0x45480e=new RegExp(_0x48746a[_0x18b065(0x162)](0x1,-0x1));return _0x496074=>_0x45480e['test'](_0x496074);}else{if(_0x48746a['includes']('*')||_0x48746a[_0x18b065(0x153)]('?')){let _0x3c8416=new RegExp('^'+_0x48746a[_0x18b065(0x154)](/\\./g,String['fromCharCode'](0x5c)+'.')[_0x18b065(0x154)](/\\*/g,'.*')[_0x18b065(0x154)](/\\?/g,'.')+String['fromCharCode'](0x24));return _0x472a9d=>_0x3c8416[_0x18b065(0x10f)](_0x472a9d);}else return _0x2615bb=>_0x2615bb===_0x48746a;}}let _0x1eca1e=_0x3967e7[_0x4215b2(0x106)](_0x2b6750);return _0x59955b['_consoleNinjaAllowedToStart']=_0xf3157d||!_0x3967e7,!_0x59955b[_0x4215b2(0xfa)]&&((_0x4c6114=_0x59955b[_0x4215b2(0x101)])==null?void 0x0:_0x4c6114[_0x4215b2(0x183)])&&(_0x59955b[_0x4215b2(0xfa)]=_0x1eca1e['some'](_0x3ccb07=>_0x3ccb07(_0x59955b['location'][_0x4215b2(0x183)]))),_0x3b4db8&&!_0x59955b[_0x4215b2(0xfa)]&&!((_0xd96b4=_0x59955b[_0x4215b2(0x101)])!=null&&_0xd96b4[_0x4215b2(0x183)])&&(_0x59955b[_0x4215b2(0xfa)]=!0x0),_0x59955b['_consoleNinjaAllowedToStart'];}function J(_0x31f20b,_0x5c577b,_0x1f3bee,_0x4a0483,_0x469d82,_0x2514c8){var _0x4934b8=_0x54cc26;_0x31f20b=_0x31f20b,_0x5c577b=_0x5c577b,_0x1f3bee=_0x1f3bee,_0x4a0483=_0x4a0483,_0x469d82=_0x469d82,_0x469d82=_0x469d82||{},_0x469d82[_0x4934b8(0x1cc)]=_0x469d82[_0x4934b8(0x1cc)]||{},_0x469d82['reducedLimits']=_0x469d82[_0x4934b8(0x138)]||{},_0x469d82[_0x4934b8(0xe2)]=_0x469d82[_0x4934b8(0xe2)]||{},_0x469d82[_0x4934b8(0xe2)][_0x4934b8(0x1cb)]=_0x469d82[_0x4934b8(0xe2)]['perLogpoint']||{},_0x469d82[_0x4934b8(0xe2)][_0x4934b8(0x13f)]=_0x469d82[_0x4934b8(0xe2)][_0x4934b8(0x13f)]||{};let _0x141946={'perLogpoint':{'reduceOnCount':_0x469d82[_0x4934b8(0xe2)][_0x4934b8(0x1cb)][_0x4934b8(0x12d)]||0x32,'reduceOnAccumulatedProcessingTimeMs':_0x469d82[_0x4934b8(0xe2)]['perLogpoint']['reduceOnAccumulatedProcessingTimeMs']||0x64,'resetWhenQuietMs':_0x469d82[_0x4934b8(0xe2)][_0x4934b8(0x1cb)][_0x4934b8(0xe6)]||0x1f4,'resetOnProcessingTimeAverageMs':_0x469d82[_0x4934b8(0xe2)]['perLogpoint'][_0x4934b8(0x1b0)]||0x64},'global':{'reduceOnCount':_0x469d82[_0x4934b8(0xe2)]['global'][_0x4934b8(0x12d)]||0x3e8,'reduceOnAccumulatedProcessingTimeMs':_0x469d82[_0x4934b8(0xe2)][_0x4934b8(0x13f)]['reduceOnAccumulatedProcessingTimeMs']||0x12c,'resetWhenQuietMs':_0x469d82['reducePolicy'][_0x4934b8(0x13f)][_0x4934b8(0xe6)]||0x32,'resetOnProcessingTimeAverageMs':_0x469d82[_0x4934b8(0xe2)][_0x4934b8(0x13f)]['resetOnProcessingTimeAverageMs']||0x64}},_0x42f773=b(_0x31f20b),_0x42fb36=_0x42f773[_0x4934b8(0x168)],_0x223738=_0x42f773[_0x4934b8(0xd0)];function _0x568c0c(){var _0x1fa2cb=_0x4934b8;this[_0x1fa2cb(0x13a)]=/^(?!(?:do|if|in|for|let|new|try|var|case|else|enum|eval|false|null|this|true|void|with|break|catch|class|const|super|throw|while|yield|delete|export|import|public|return|static|switch|typeof|default|extends|finally|package|private|continue|debugger|function|arguments|interface|protected|implements|instanceof)$)[_$a-zA-Z\\xA0-\\uFFFF][_$a-zA-Z0-9\\xA0-\\uFFFF]*$/,this[_0x1fa2cb(0x109)]=/^(0|[1-9][0-9]*)$/,this[_0x1fa2cb(0x159)]=/'([^\\\\']|\\\\')*'/,this[_0x1fa2cb(0x12f)]=_0x31f20b[_0x1fa2cb(0xc5)],this[_0x1fa2cb(0x161)]=_0x31f20b[_0x1fa2cb(0x1ab)],this[_0x1fa2cb(0xcf)]=Object[_0x1fa2cb(0x11a)],this[_0x1fa2cb(0x17a)]=Object[_0x1fa2cb(0x14e)],this[_0x1fa2cb(0x178)]=_0x31f20b[_0x1fa2cb(0x19f)],this[_0x1fa2cb(0xd5)]=RegExp[_0x1fa2cb(0x18a)][_0x1fa2cb(0xdf)],this[_0x1fa2cb(0x132)]=Date[_0x1fa2cb(0x18a)][_0x1fa2cb(0xdf)];}_0x568c0c[_0x4934b8(0x18a)][_0x4934b8(0x158)]=function(_0x48d78e,_0x348dcf,_0x4a6d96,_0x5a5f89){var _0x19e5e6=_0x4934b8,_0xc6b12f=this,_0x55a7d2=_0x4a6d96['autoExpand'];function _0x42e97b(_0x3952f9,_0x2bc656,_0x8c85ef){var _0x2f1a2f=_0x4a90;_0x2bc656[_0x2f1a2f(0x151)]=_0x2f1a2f(0x16e),_0x2bc656[_0x2f1a2f(0x1bb)]=_0x3952f9[_0x2f1a2f(0x188)],_0x2b7b1a=_0x8c85ef[_0x2f1a2f(0x128)][_0x2f1a2f(0xea)],_0x8c85ef['node'][_0x2f1a2f(0xea)]=_0x2bc656,_0xc6b12f[_0x2f1a2f(0xc8)](_0x2bc656,_0x8c85ef);}let _0xcd7ba5,_0x5307f1,_0x34239a=_0x31f20b[_0x19e5e6(0xd9)];_0x31f20b[_0x19e5e6(0xd9)]=!0x0,_0x31f20b['console']&&(_0xcd7ba5=_0x31f20b[_0x19e5e6(0x176)]['error'],_0x5307f1=_0x31f20b[_0x19e5e6(0x176)][_0x19e5e6(0x124)],_0xcd7ba5&&(_0x31f20b[_0x19e5e6(0x176)][_0x19e5e6(0x1bb)]=function(){}),_0x5307f1&&(_0x31f20b[_0x19e5e6(0x176)][_0x19e5e6(0x124)]=function(){}));try{try{_0x4a6d96[_0x19e5e6(0x115)]++,_0x4a6d96[_0x19e5e6(0x104)]&&_0x4a6d96['autoExpandPreviousObjects'][_0x19e5e6(0xff)](_0x348dcf);var _0x6adee3,_0xa868ce,_0x4c1789,_0x127a28,_0x1bef2c=[],_0x4dd8f0=[],_0x47c5d8,_0x18b1eb=this[_0x19e5e6(0x1ad)](_0x348dcf),_0x481e55=_0x18b1eb==='array',_0x57133b=!0x1,_0x5ca399=_0x18b1eb===_0x19e5e6(0x196),_0xbd7d8f=this['_isPrimitiveType'](_0x18b1eb),_0x417ea6=this[_0x19e5e6(0x146)](_0x18b1eb),_0x273a7e=_0xbd7d8f||_0x417ea6,_0x2a289a={},_0xcd0938=0x0,_0x14ebf7=!0x1,_0x2b7b1a,_0x30046f=/^(([1-9]{1}[0-9]*)|0)$/;if(_0x4a6d96[_0x19e5e6(0x15f)]){if(_0x481e55){if(_0xa868ce=_0x348dcf['length'],_0xa868ce>_0x4a6d96['elements']){for(_0x4c1789=0x0,_0x127a28=_0x4a6d96['elements'],_0x6adee3=_0x4c1789;_0x6adee3<_0x127a28;_0x6adee3++)_0x4dd8f0[_0x19e5e6(0xff)](_0xc6b12f[_0x19e5e6(0xcc)](_0x1bef2c,_0x348dcf,_0x18b1eb,_0x6adee3,_0x4a6d96));_0x48d78e[_0x19e5e6(0x1b9)]=!0x0;}else{for(_0x4c1789=0x0,_0x127a28=_0xa868ce,_0x6adee3=_0x4c1789;_0x6adee3<_0x127a28;_0x6adee3++)_0x4dd8f0[_0x19e5e6(0xff)](_0xc6b12f['_addProperty'](_0x1bef2c,_0x348dcf,_0x18b1eb,_0x6adee3,_0x4a6d96));}_0x4a6d96[_0x19e5e6(0x186)]+=_0x4dd8f0[_0x19e5e6(0xfc)];}if(!(_0x18b1eb==='null'||_0x18b1eb===_0x19e5e6(0xc5))&&!_0xbd7d8f&&_0x18b1eb!==_0x19e5e6(0x1c8)&&_0x18b1eb!=='Buffer'&&_0x18b1eb!==_0x19e5e6(0xed)){var _0x482677=_0x5a5f89['props']||_0x4a6d96[_0x19e5e6(0xfd)];if(this[_0x19e5e6(0x119)](_0x348dcf)?(_0x6adee3=0x0,_0x348dcf[_0x19e5e6(0x1ba)](function(_0x316011){var _0x3d6007=_0x19e5e6;if(_0xcd0938++,_0x4a6d96[_0x3d6007(0x186)]++,_0xcd0938>_0x482677){_0x14ebf7=!0x0;return;}if(!_0x4a6d96[_0x3d6007(0x11c)]&&_0x4a6d96['autoExpand']&&_0x4a6d96[_0x3d6007(0x186)]>_0x4a6d96[_0x3d6007(0x1a7)]){_0x14ebf7=!0x0;return;}_0x4dd8f0[_0x3d6007(0xff)](_0xc6b12f[_0x3d6007(0xcc)](_0x1bef2c,_0x348dcf,_0x3d6007(0xeb),_0x6adee3++,_0x4a6d96,function(_0x2dd991){return function(){return _0x2dd991;};}(_0x316011)));})):this[_0x19e5e6(0x1a3)](_0x348dcf)&&_0x348dcf[_0x19e5e6(0x1ba)](function(_0x4e9669,_0x2865be){var _0xe99383=_0x19e5e6;if(_0xcd0938++,_0x4a6d96[_0xe99383(0x186)]++,_0xcd0938>_0x482677){_0x14ebf7=!0x0;return;}if(!_0x4a6d96[_0xe99383(0x11c)]&&_0x4a6d96[_0xe99383(0x104)]&&_0x4a6d96[_0xe99383(0x186)]>_0x4a6d96[_0xe99383(0x1a7)]){_0x14ebf7=!0x0;return;}var _0x4c2eff=_0x2865be[_0xe99383(0xdf)]();_0x4c2eff[_0xe99383(0xfc)]>0x64&&(_0x4c2eff=_0x4c2eff[_0xe99383(0x162)](0x0,0x64)+_0xe99383(0xe4)),_0x4dd8f0[_0xe99383(0xff)](_0xc6b12f[_0xe99383(0xcc)](_0x1bef2c,_0x348dcf,_0xe99383(0xd7),_0x4c2eff,_0x4a6d96,function(_0x38d848){return function(){return _0x38d848;};}(_0x4e9669)));}),!_0x57133b){try{for(_0x47c5d8 in _0x348dcf)if(!(_0x481e55&&_0x30046f[_0x19e5e6(0x10f)](_0x47c5d8))&&!this[_0x19e5e6(0xce)](_0x348dcf,_0x47c5d8,_0x4a6d96)){if(_0xcd0938++,_0x4a6d96[_0x19e5e6(0x186)]++,_0xcd0938>_0x482677){_0x14ebf7=!0x0;break;}if(!_0x4a6d96[_0x19e5e6(0x11c)]&&_0x4a6d96[_0x19e5e6(0x104)]&&_0x4a6d96[_0x19e5e6(0x186)]>_0x4a6d96[_0x19e5e6(0x1a7)]){_0x14ebf7=!0x0;break;}_0x4dd8f0['push'](_0xc6b12f[_0x19e5e6(0x117)](_0x1bef2c,_0x2a289a,_0x348dcf,_0x18b1eb,_0x47c5d8,_0x4a6d96));}}catch{}if(_0x2a289a['_p_length']=!0x0,_0x5ca399&&(_0x2a289a[_0x19e5e6(0xfe)]=!0x0),!_0x14ebf7){var _0x507ca6=[][_0x19e5e6(0x112)](this['_getOwnPropertyNames'](_0x348dcf))[_0x19e5e6(0x112)](this['_getOwnPropertySymbols'](_0x348dcf));for(_0x6adee3=0x0,_0xa868ce=_0x507ca6['length'];_0x6adee3<_0xa868ce;_0x6adee3++)if(_0x47c5d8=_0x507ca6[_0x6adee3],!(_0x481e55&&_0x30046f['test'](_0x47c5d8[_0x19e5e6(0xdf)]()))&&!this[_0x19e5e6(0xce)](_0x348dcf,_0x47c5d8,_0x4a6d96)&&!_0x2a289a[typeof _0x47c5d8!=_0x19e5e6(0x10b)?_0x19e5e6(0x17e)+_0x47c5d8[_0x19e5e6(0xdf)]():_0x47c5d8]){if(_0xcd0938++,_0x4a6d96[_0x19e5e6(0x186)]++,_0xcd0938>_0x482677){_0x14ebf7=!0x0;break;}if(!_0x4a6d96[_0x19e5e6(0x11c)]&&_0x4a6d96['autoExpand']&&_0x4a6d96[_0x19e5e6(0x186)]>_0x4a6d96[_0x19e5e6(0x1a7)]){_0x14ebf7=!0x0;break;}_0x4dd8f0[_0x19e5e6(0xff)](_0xc6b12f[_0x19e5e6(0x117)](_0x1bef2c,_0x2a289a,_0x348dcf,_0x18b1eb,_0x47c5d8,_0x4a6d96));}}}}}if(_0x48d78e['type']=_0x18b1eb,_0x273a7e?(_0x48d78e['value']=_0x348dcf[_0x19e5e6(0x122)](),this[_0x19e5e6(0x139)](_0x18b1eb,_0x48d78e,_0x4a6d96,_0x5a5f89)):_0x18b1eb===_0x19e5e6(0x103)?_0x48d78e[_0x19e5e6(0xc4)]=this[_0x19e5e6(0x132)][_0x19e5e6(0x195)](_0x348dcf):_0x18b1eb===_0x19e5e6(0xed)?_0x48d78e[_0x19e5e6(0xc4)]=_0x348dcf[_0x19e5e6(0xdf)]():_0x18b1eb===_0x19e5e6(0x142)?_0x48d78e[_0x19e5e6(0xc4)]=this[_0x19e5e6(0xd5)][_0x19e5e6(0x195)](_0x348dcf):_0x18b1eb===_0x19e5e6(0x10b)&&this[_0x19e5e6(0x178)]?_0x48d78e[_0x19e5e6(0xc4)]=this[_0x19e5e6(0x178)][_0x19e5e6(0x18a)]['toString'][_0x19e5e6(0x195)](_0x348dcf):!_0x4a6d96[_0x19e5e6(0x15f)]&&!(_0x18b1eb===_0x19e5e6(0xd3)||_0x18b1eb==='undefined')&&(delete _0x48d78e[_0x19e5e6(0xc4)],_0x48d78e[_0x19e5e6(0x1ae)]=!0x0),_0x14ebf7&&(_0x48d78e[_0x19e5e6(0x13b)]=!0x0),_0x2b7b1a=_0x4a6d96[_0x19e5e6(0x128)][_0x19e5e6(0xea)],_0x4a6d96['node'][_0x19e5e6(0xea)]=_0x48d78e,this[_0x19e5e6(0xc8)](_0x48d78e,_0x4a6d96),_0x4dd8f0['length']){for(_0x6adee3=0x0,_0xa868ce=_0x4dd8f0[_0x19e5e6(0xfc)];_0x6adee3<_0xa868ce;_0x6adee3++)_0x4dd8f0[_0x6adee3](_0x6adee3);}_0x1bef2c[_0x19e5e6(0xfc)]&&(_0x48d78e[_0x19e5e6(0xfd)]=_0x1bef2c);}catch(_0x3ae5b6){_0x42e97b(_0x3ae5b6,_0x48d78e,_0x4a6d96);}this[_0x19e5e6(0x1c9)](_0x348dcf,_0x48d78e),this[_0x19e5e6(0x136)](_0x48d78e,_0x4a6d96),_0x4a6d96['node'][_0x19e5e6(0xea)]=_0x2b7b1a,_0x4a6d96[_0x19e5e6(0x115)]--,_0x4a6d96[_0x19e5e6(0x104)]=_0x55a7d2,_0x4a6d96[_0x19e5e6(0x104)]&&_0x4a6d96[_0x19e5e6(0x1b4)]['pop']();}finally{_0xcd7ba5&&(_0x31f20b[_0x19e5e6(0x176)][_0x19e5e6(0x1bb)]=_0xcd7ba5),_0x5307f1&&(_0x31f20b[_0x19e5e6(0x176)]['warn']=_0x5307f1),_0x31f20b[_0x19e5e6(0xd9)]=_0x34239a;}return _0x48d78e;},_0x568c0c[_0x4934b8(0x18a)][_0x4934b8(0x12e)]=function(_0x46f99b){var _0x55ee4f=_0x4934b8;return Object['getOwnPropertySymbols']?Object[_0x55ee4f(0x16b)](_0x46f99b):[];},_0x568c0c[_0x4934b8(0x18a)][_0x4934b8(0x119)]=function(_0x259646){var _0x583570=_0x4934b8;return!!(_0x259646&&_0x31f20b[_0x583570(0xeb)]&&this['_objectToString'](_0x259646)===_0x583570(0x17f)&&_0x259646[_0x583570(0x1ba)]);},_0x568c0c[_0x4934b8(0x18a)][_0x4934b8(0xce)]=function(_0x469950,_0x43a4d0,_0x3e7028){var _0x44d134=_0x4934b8;if(!_0x3e7028[_0x44d134(0xcb)]){let _0x5e446a=this[_0x44d134(0xcf)](_0x469950,_0x43a4d0);if(_0x5e446a&&_0x5e446a[_0x44d134(0xf5)])return!0x0;}return _0x3e7028[_0x44d134(0x1bf)]?typeof _0x469950[_0x43a4d0]==_0x44d134(0x196):!0x1;},_0x568c0c[_0x4934b8(0x18a)]['_type']=function(_0x21f464){var _0x5b73d0=_0x4934b8,_0x1012e4='';return _0x1012e4=typeof _0x21f464,_0x1012e4===_0x5b73d0(0x118)?this[_0x5b73d0(0x1c7)](_0x21f464)===_0x5b73d0(0x14c)?_0x1012e4=_0x5b73d0(0xfb):this[_0x5b73d0(0x1c7)](_0x21f464)===_0x5b73d0(0x1b8)?_0x1012e4=_0x5b73d0(0x103):this[_0x5b73d0(0x1c7)](_0x21f464)===_0x5b73d0(0x149)?_0x1012e4=_0x5b73d0(0xed):_0x21f464===null?_0x1012e4='null':_0x21f464[_0x5b73d0(0x14f)]&&(_0x1012e4=_0x21f464['constructor'][_0x5b73d0(0x1c3)]||_0x1012e4):_0x1012e4===_0x5b73d0(0xc5)&&this[_0x5b73d0(0x161)]&&_0x21f464 instanceof this['_HTMLAllCollection']&&(_0x1012e4='HTMLAllCollection'),_0x1012e4;},_0x568c0c[_0x4934b8(0x18a)][_0x4934b8(0x1c7)]=function(_0x23706a){var _0xb5b3ca=_0x4934b8;return Object[_0xb5b3ca(0x18a)][_0xb5b3ca(0xdf)]['call'](_0x23706a);},_0x568c0c[_0x4934b8(0x18a)][_0x4934b8(0x19d)]=function(_0x94e0c5){var _0x4b2537=_0x4934b8;return _0x94e0c5===_0x4b2537(0x157)||_0x94e0c5==='string'||_0x94e0c5===_0x4b2537(0x1b2);},_0x568c0c['prototype']['_isPrimitiveWrapperType']=function(_0x2f3e62){var _0x16ad9e=_0x4934b8;return _0x2f3e62===_0x16ad9e(0x199)||_0x2f3e62==='String'||_0x2f3e62===_0x16ad9e(0xe7);},_0x568c0c[_0x4934b8(0x18a)][_0x4934b8(0xcc)]=function(_0x1db57d,_0x27dec7,_0x5b27b1,_0x19ed12,_0x3015c5,_0x18e0f7){var _0x2fcbd8=this;return function(_0x2a2b77){var _0xce493a=_0x4a90,_0x174862=_0x3015c5['node'][_0xce493a(0xea)],_0x4a97c=_0x3015c5[_0xce493a(0x128)]['index'],_0x2b4936=_0x3015c5[_0xce493a(0x128)][_0xce493a(0x120)];_0x3015c5['node'][_0xce493a(0x120)]=_0x174862,_0x3015c5['node'][_0xce493a(0x14a)]=typeof _0x19ed12==_0xce493a(0x1b2)?_0x19ed12:_0x2a2b77,_0x1db57d[_0xce493a(0xff)](_0x2fcbd8[_0xce493a(0x12c)](_0x27dec7,_0x5b27b1,_0x19ed12,_0x3015c5,_0x18e0f7)),_0x3015c5[_0xce493a(0x128)][_0xce493a(0x120)]=_0x2b4936,_0x3015c5['node']['index']=_0x4a97c;};},_0x568c0c[_0x4934b8(0x18a)][_0x4934b8(0x117)]=function(_0x4469e5,_0x3fa37e,_0xeef05b,_0x125913,_0x2f3742,_0x36532d,_0x49d55f){var _0x516d33=_0x4934b8,_0x396018=this;return _0x3fa37e[typeof _0x2f3742!=_0x516d33(0x10b)?_0x516d33(0x17e)+_0x2f3742['toString']():_0x2f3742]=!0x0,function(_0xd7fcb0){var _0x3226db=_0x516d33,_0x39117a=_0x36532d[_0x3226db(0x128)][_0x3226db(0xea)],_0x50a11a=_0x36532d[_0x3226db(0x128)][_0x3226db(0x14a)],_0x4eb0c0=_0x36532d['node'][_0x3226db(0x120)];_0x36532d[_0x3226db(0x128)][_0x3226db(0x120)]=_0x39117a,_0x36532d['node'][_0x3226db(0x14a)]=_0xd7fcb0,_0x4469e5[_0x3226db(0xff)](_0x396018[_0x3226db(0x12c)](_0xeef05b,_0x125913,_0x2f3742,_0x36532d,_0x49d55f)),_0x36532d[_0x3226db(0x128)][_0x3226db(0x120)]=_0x4eb0c0,_0x36532d[_0x3226db(0x128)][_0x3226db(0x14a)]=_0x50a11a;};},_0x568c0c[_0x4934b8(0x18a)][_0x4934b8(0x12c)]=function(_0x453099,_0x4eadbd,_0x11f35a,_0x40815b,_0xa2b7cb){var _0x4b84a8=_0x4934b8,_0x5e86b1=this;_0xa2b7cb||(_0xa2b7cb=function(_0x5cea02,_0x58268c){return _0x5cea02[_0x58268c];});var _0x362525=_0x11f35a['toString'](),_0x3c06dc=_0x40815b[_0x4b84a8(0x1ce)]||{},_0x142239=_0x40815b['depth'],_0x26bf80=_0x40815b[_0x4b84a8(0x11c)];try{var _0x3aca2e=this[_0x4b84a8(0x1a3)](_0x453099),_0x4aabb3=_0x362525;_0x3aca2e&&_0x4aabb3[0x0]==='\\x27'&&(_0x4aabb3=_0x4aabb3[_0x4b84a8(0x172)](0x1,_0x4aabb3[_0x4b84a8(0xfc)]-0x2));var _0x12d722=_0x40815b['expressionsToEvaluate']=_0x3c06dc[_0x4b84a8(0x17e)+_0x4aabb3];_0x12d722&&(_0x40815b['depth']=_0x40815b['depth']+0x1),_0x40815b[_0x4b84a8(0x11c)]=!!_0x12d722;var _0x56e733=typeof _0x11f35a=='symbol',_0xa051ca={'name':_0x56e733||_0x3aca2e?_0x362525:this[_0x4b84a8(0x131)](_0x362525)};if(_0x56e733&&(_0xa051ca[_0x4b84a8(0x10b)]=!0x0),!(_0x4eadbd===_0x4b84a8(0xfb)||_0x4eadbd===_0x4b84a8(0x11b))){var _0x5b5697=this[_0x4b84a8(0xcf)](_0x453099,_0x11f35a);if(_0x5b5697&&(_0x5b5697[_0x4b84a8(0x185)]&&(_0xa051ca['setter']=!0x0),_0x5b5697[_0x4b84a8(0xf5)]&&!_0x12d722&&!_0x40815b[_0x4b84a8(0xcb)]))return _0xa051ca[_0x4b84a8(0x17b)]=!0x0,this[_0x4b84a8(0x1a0)](_0xa051ca,_0x40815b),_0xa051ca;}var _0x51fae3;try{_0x51fae3=_0xa2b7cb(_0x453099,_0x11f35a);}catch(_0x4f78cc){return _0xa051ca={'name':_0x362525,'type':_0x4b84a8(0x16e),'error':_0x4f78cc[_0x4b84a8(0x188)]},this[_0x4b84a8(0x1a0)](_0xa051ca,_0x40815b),_0xa051ca;}var _0x310e5a=this['_type'](_0x51fae3),_0x3e58ae=this[_0x4b84a8(0x19d)](_0x310e5a);if(_0xa051ca['type']=_0x310e5a,_0x3e58ae)this[_0x4b84a8(0x1a0)](_0xa051ca,_0x40815b,_0x51fae3,function(){var _0x2623ba=_0x4b84a8;_0xa051ca[_0x2623ba(0xc4)]=_0x51fae3['valueOf'](),!_0x12d722&&_0x5e86b1[_0x2623ba(0x139)](_0x310e5a,_0xa051ca,_0x40815b,{});});else{var _0x87c7d8=_0x40815b[_0x4b84a8(0x104)]&&_0x40815b[_0x4b84a8(0x115)]<_0x40815b[_0x4b84a8(0x189)]&&_0x40815b[_0x4b84a8(0x1b4)][_0x4b84a8(0x121)](_0x51fae3)<0x0&&_0x310e5a!==_0x4b84a8(0x196)&&_0x40815b['autoExpandPropertyCount']<_0x40815b[_0x4b84a8(0x1a7)];_0x87c7d8||_0x40815b[_0x4b84a8(0x115)]<_0x142239||_0x12d722?this['serialize'](_0xa051ca,_0x51fae3,_0x40815b,_0x12d722||{}):this[_0x4b84a8(0x1a0)](_0xa051ca,_0x40815b,_0x51fae3,function(){var _0x48a268=_0x4b84a8;_0x310e5a===_0x48a268(0xd3)||_0x310e5a===_0x48a268(0xc5)||(delete _0xa051ca[_0x48a268(0xc4)],_0xa051ca['capped']=!0x0);});}return _0xa051ca;}finally{_0x40815b[_0x4b84a8(0x1ce)]=_0x3c06dc,_0x40815b[_0x4b84a8(0x15f)]=_0x142239,_0x40815b[_0x4b84a8(0x11c)]=_0x26bf80;}},_0x568c0c[_0x4934b8(0x18a)][_0x4934b8(0x139)]=function(_0x5e0732,_0x1bfe86,_0xda28d7,_0x491a14){var _0x60e05=_0x4934b8,_0x33f831=_0x491a14[_0x60e05(0x110)]||_0xda28d7[_0x60e05(0x110)];if((_0x5e0732===_0x60e05(0x1a9)||_0x5e0732==='String')&&_0x1bfe86['value']){let _0x1eacb7=_0x1bfe86[_0x60e05(0xc4)][_0x60e05(0xfc)];_0xda28d7['allStrLength']+=_0x1eacb7,_0xda28d7[_0x60e05(0xd4)]>_0xda28d7[_0x60e05(0x191)]?(_0x1bfe86['capped']='',delete _0x1bfe86[_0x60e05(0xc4)]):_0x1eacb7>_0x33f831&&(_0x1bfe86[_0x60e05(0x1ae)]=_0x1bfe86[_0x60e05(0xc4)][_0x60e05(0x172)](0x0,_0x33f831),delete _0x1bfe86[_0x60e05(0xc4)]);}},_0x568c0c['prototype']['_isMap']=function(_0x251695){var _0x2d4790=_0x4934b8;return!!(_0x251695&&_0x31f20b[_0x2d4790(0xd7)]&&this[_0x2d4790(0x1c7)](_0x251695)===_0x2d4790(0x16d)&&_0x251695['forEach']);},_0x568c0c[_0x4934b8(0x18a)]['_propertyName']=function(_0x2e0688){var _0x2c8644=_0x4934b8;if(_0x2e0688[_0x2c8644(0x11f)](/^\\d+$/))return _0x2e0688;var _0x91094;try{_0x91094=JSON[_0x2c8644(0x175)](''+_0x2e0688);}catch{_0x91094='\\x22'+this['_objectToString'](_0x2e0688)+'\\x22';}return _0x91094[_0x2c8644(0x11f)](/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)?_0x91094=_0x91094['substr'](0x1,_0x91094[_0x2c8644(0xfc)]-0x2):_0x91094=_0x91094[_0x2c8644(0x154)](/'/g,'\\x5c\\x27')[_0x2c8644(0x154)](/\\\\"/g,'\\x22')[_0x2c8644(0x154)](/(^"|"$)/g,'\\x27'),_0x91094;},_0x568c0c[_0x4934b8(0x18a)][_0x4934b8(0x1a0)]=function(_0x232cbb,_0x29085f,_0x1650af,_0x1c890e){var _0x16a2a5=_0x4934b8;this[_0x16a2a5(0xc8)](_0x232cbb,_0x29085f),_0x1c890e&&_0x1c890e(),this[_0x16a2a5(0x1c9)](_0x1650af,_0x232cbb),this[_0x16a2a5(0x136)](_0x232cbb,_0x29085f);},_0x568c0c[_0x4934b8(0x18a)][_0x4934b8(0xc8)]=function(_0x49291a,_0x33bdc6){var _0x52d41e=_0x4934b8;this[_0x52d41e(0x127)](_0x49291a,_0x33bdc6),this['_setNodeQueryPath'](_0x49291a,_0x33bdc6),this[_0x52d41e(0x15a)](_0x49291a,_0x33bdc6),this[_0x52d41e(0xe0)](_0x49291a,_0x33bdc6);},_0x568c0c[_0x4934b8(0x18a)][_0x4934b8(0x127)]=function(_0x3ffba9,_0x308291){},_0x568c0c[_0x4934b8(0x18a)]['_setNodeQueryPath']=function(_0x4befcf,_0x340320){},_0x568c0c['prototype'][_0x4934b8(0x19c)]=function(_0x6d004b,_0x3e0efe){},_0x568c0c[_0x4934b8(0x18a)][_0x4934b8(0x19e)]=function(_0x3b2948){var _0x1c5336=_0x4934b8;return _0x3b2948===this[_0x1c5336(0x12f)];},_0x568c0c[_0x4934b8(0x18a)][_0x4934b8(0x136)]=function(_0x571a40,_0x11152b){var _0x17c82d=_0x4934b8;this[_0x17c82d(0x19c)](_0x571a40,_0x11152b),this[_0x17c82d(0x16c)](_0x571a40),_0x11152b['sortProps']&&this[_0x17c82d(0x1af)](_0x571a40),this['_addFunctionsNode'](_0x571a40,_0x11152b),this['_addLoadNode'](_0x571a40,_0x11152b),this['_cleanNode'](_0x571a40);},_0x568c0c[_0x4934b8(0x18a)]['_additionalMetadata']=function(_0x25d425,_0x376ba0){var _0x4c6175=_0x4934b8;try{_0x25d425&&typeof _0x25d425[_0x4c6175(0xfc)]==_0x4c6175(0x1b2)&&(_0x376ba0[_0x4c6175(0xfc)]=_0x25d425[_0x4c6175(0xfc)]);}catch{}if(_0x376ba0[_0x4c6175(0x151)]===_0x4c6175(0x1b2)||_0x376ba0['type']===_0x4c6175(0xe7)){if(isNaN(_0x376ba0['value']))_0x376ba0[_0x4c6175(0xe5)]=!0x0,delete _0x376ba0[_0x4c6175(0xc4)];else switch(_0x376ba0[_0x4c6175(0xc4)]){case Number[_0x4c6175(0x102)]:_0x376ba0[_0x4c6175(0x130)]=!0x0,delete _0x376ba0['value'];break;case Number[_0x4c6175(0xf6)]:_0x376ba0[_0x4c6175(0x184)]=!0x0,delete _0x376ba0['value'];break;case 0x0:this['_isNegativeZero'](_0x376ba0['value'])&&(_0x376ba0[_0x4c6175(0xc3)]=!0x0);break;}}else _0x376ba0['type']==='function'&&typeof _0x25d425[_0x4c6175(0x1c3)]=='string'&&_0x25d425['name']&&_0x376ba0[_0x4c6175(0x1c3)]&&_0x25d425[_0x4c6175(0x1c3)]!==_0x376ba0[_0x4c6175(0x1c3)]&&(_0x376ba0[_0x4c6175(0x145)]=_0x25d425[_0x4c6175(0x1c3)]);},_0x568c0c[_0x4934b8(0x18a)][_0x4934b8(0x187)]=function(_0x3d5c0c){var _0x21909c=_0x4934b8;return 0x1/_0x3d5c0c===Number[_0x21909c(0xf6)];},_0x568c0c['prototype'][_0x4934b8(0x1af)]=function(_0xaf6d85){var _0x257f6e=_0x4934b8;!_0xaf6d85[_0x257f6e(0xfd)]||!_0xaf6d85['props'][_0x257f6e(0xfc)]||_0xaf6d85[_0x257f6e(0x151)]===_0x257f6e(0xfb)||_0xaf6d85[_0x257f6e(0x151)]===_0x257f6e(0xd7)||_0xaf6d85[_0x257f6e(0x151)]==='Set'||_0xaf6d85[_0x257f6e(0xfd)][_0x257f6e(0xee)](function(_0xcc5a49,_0x33a07){var _0x3d0ac0=_0x257f6e,_0x216c86=_0xcc5a49[_0x3d0ac0(0x1c3)][_0x3d0ac0(0x1bd)](),_0x52e92d=_0x33a07[_0x3d0ac0(0x1c3)][_0x3d0ac0(0x1bd)]();return _0x216c86<_0x52e92d?-0x1:_0x216c86>_0x52e92d?0x1:0x0;});},_0x568c0c[_0x4934b8(0x18a)][_0x4934b8(0x18c)]=function(_0x26dd9a,_0x367b0a){var _0x3fb806=_0x4934b8;if(!(_0x367b0a[_0x3fb806(0x1bf)]||!_0x26dd9a['props']||!_0x26dd9a[_0x3fb806(0xfd)]['length'])){for(var _0x558538=[],_0x1e34a7=[],_0x4cf6c3=0x0,_0x496b22=_0x26dd9a[_0x3fb806(0xfd)]['length'];_0x4cf6c3<_0x496b22;_0x4cf6c3++){var _0x286ad8=_0x26dd9a[_0x3fb806(0xfd)][_0x4cf6c3];_0x286ad8[_0x3fb806(0x151)]===_0x3fb806(0x196)?_0x558538[_0x3fb806(0xff)](_0x286ad8):_0x1e34a7[_0x3fb806(0xff)](_0x286ad8);}if(!(!_0x1e34a7[_0x3fb806(0xfc)]||_0x558538[_0x3fb806(0xfc)]<=0x1)){_0x26dd9a[_0x3fb806(0xfd)]=_0x1e34a7;var _0x589572={'functionsNode':!0x0,'props':_0x558538};this[_0x3fb806(0x127)](_0x589572,_0x367b0a),this[_0x3fb806(0x19c)](_0x589572,_0x367b0a),this['_setNodeExpandableState'](_0x589572),this[_0x3fb806(0xe0)](_0x589572,_0x367b0a),_0x589572['id']+='\\x20f',_0x26dd9a['props'][_0x3fb806(0x1ac)](_0x589572);}}},_0x568c0c['prototype'][_0x4934b8(0xf9)]=function(_0x3a8156,_0x31dbc6){},_0x568c0c['prototype']['_setNodeExpandableState']=function(_0x27a91c){},_0x568c0c[_0x4934b8(0x18a)][_0x4934b8(0xdc)]=function(_0x309bc7){var _0x3eff3d=_0x4934b8;return Array[_0x3eff3d(0x173)](_0x309bc7)||typeof _0x309bc7=='object'&&this['_objectToString'](_0x309bc7)==='[object\\x20Array]';},_0x568c0c[_0x4934b8(0x18a)]['_setNodePermissions']=function(_0x33a0fd,_0x133d76){},_0x568c0c[_0x4934b8(0x18a)][_0x4934b8(0xef)]=function(_0xd4834e){var _0x4c0797=_0x4934b8;delete _0xd4834e[_0x4c0797(0xe9)],delete _0xd4834e[_0x4c0797(0xf3)],delete _0xd4834e[_0x4c0797(0x1b7)];},_0x568c0c[_0x4934b8(0x18a)]['_setNodeExpressionPath']=function(_0x82227e,_0x5e328e){};let _0x4277ae=new _0x568c0c(),_0x578392={'props':_0x469d82[_0x4934b8(0x1cc)][_0x4934b8(0xfd)]||0x64,'elements':_0x469d82[_0x4934b8(0x1cc)]['elements']||0x64,'strLength':_0x469d82['defaultLimits']['strLength']||0x400*0x32,'totalStrLength':_0x469d82['defaultLimits'][_0x4934b8(0x191)]||0x400*0x32,'autoExpandLimit':_0x469d82['defaultLimits']['autoExpandLimit']||0x1388,'autoExpandMaxDepth':_0x469d82[_0x4934b8(0x1cc)]['autoExpandMaxDepth']||0xa},_0x1f746a={'props':_0x469d82[_0x4934b8(0x138)][_0x4934b8(0xfd)]||0x5,'elements':_0x469d82[_0x4934b8(0x138)][_0x4934b8(0xd2)]||0x5,'strLength':_0x469d82[_0x4934b8(0x138)][_0x4934b8(0x110)]||0x100,'totalStrLength':_0x469d82[_0x4934b8(0x138)][_0x4934b8(0x191)]||0x100*0x3,'autoExpandLimit':_0x469d82[_0x4934b8(0x138)][_0x4934b8(0x1a7)]||0x1e,'autoExpandMaxDepth':_0x469d82[_0x4934b8(0x138)][_0x4934b8(0x189)]||0x2};if(_0x2514c8){let _0x31c1e0=_0x4277ae['serialize'][_0x4934b8(0xf1)](_0x4277ae);_0x4277ae[_0x4934b8(0x158)]=function(_0x1957c4,_0xc0aeb7,_0x4ead78,_0x3625d6){return _0x31c1e0(_0x1957c4,_0x2514c8(_0xc0aeb7),_0x4ead78,_0x3625d6);};}function _0x1e6d74(_0x5afffa,_0x4a459c,_0x275938,_0x334fd3,_0x45c8dc,_0x17015d){var _0x490e67=_0x4934b8;let _0x97a821,_0x4538cb;try{_0x4538cb=_0x223738(),_0x97a821=_0x1f3bee[_0x4a459c],!_0x97a821||_0x4538cb-_0x97a821['ts']>_0x141946[_0x490e67(0x1cb)][_0x490e67(0xe6)]&&_0x97a821[_0x490e67(0x180)]&&_0x97a821['time']/_0x97a821[_0x490e67(0x180)]<_0x141946[_0x490e67(0x1cb)][_0x490e67(0x1b0)]?(_0x1f3bee[_0x4a459c]=_0x97a821={'count':0x0,'time':0x0,'ts':_0x4538cb},_0x1f3bee[_0x490e67(0x1cd)]={}):_0x4538cb-_0x1f3bee[_0x490e67(0x1cd)]['ts']>_0x141946[_0x490e67(0x13f)][_0x490e67(0xe6)]&&_0x1f3bee[_0x490e67(0x1cd)][_0x490e67(0x180)]&&_0x1f3bee['hits']['time']/_0x1f3bee['hits']['count']<_0x141946[_0x490e67(0x13f)]['resetOnProcessingTimeAverageMs']&&(_0x1f3bee[_0x490e67(0x1cd)]={});let _0x7ce882=[],_0x3afea7=_0x97a821['reduceLimits']||_0x1f3bee['hits']['reduceLimits']?_0x1f746a:_0x578392,_0x204f3a=_0x4e76b9=>{var _0x2f14d5=_0x490e67;let _0x5cb8da={};return _0x5cb8da[_0x2f14d5(0xfd)]=_0x4e76b9['props'],_0x5cb8da['elements']=_0x4e76b9[_0x2f14d5(0xd2)],_0x5cb8da[_0x2f14d5(0x110)]=_0x4e76b9[_0x2f14d5(0x110)],_0x5cb8da[_0x2f14d5(0x191)]=_0x4e76b9['totalStrLength'],_0x5cb8da['autoExpandLimit']=_0x4e76b9[_0x2f14d5(0x1a7)],_0x5cb8da[_0x2f14d5(0x189)]=_0x4e76b9[_0x2f14d5(0x189)],_0x5cb8da['sortProps']=!0x1,_0x5cb8da[_0x2f14d5(0x1bf)]=!_0x5c577b,_0x5cb8da[_0x2f14d5(0x15f)]=0x1,_0x5cb8da[_0x2f14d5(0x115)]=0x0,_0x5cb8da['expId']='root_exp_id',_0x5cb8da[_0x2f14d5(0xc6)]=_0x2f14d5(0x10d),_0x5cb8da[_0x2f14d5(0x104)]=!0x0,_0x5cb8da[_0x2f14d5(0x1b4)]=[],_0x5cb8da[_0x2f14d5(0x186)]=0x0,_0x5cb8da['resolveGetters']=_0x469d82[_0x2f14d5(0xcb)],_0x5cb8da[_0x2f14d5(0xd4)]=0x0,_0x5cb8da[_0x2f14d5(0x128)]={'current':void 0x0,'parent':void 0x0,'index':0x0},_0x5cb8da;};for(var _0x7432f7=0x0;_0x7432f7<_0x45c8dc['length'];_0x7432f7++)_0x7ce882[_0x490e67(0xff)](_0x4277ae[_0x490e67(0x158)]({'timeNode':_0x5afffa===_0x490e67(0x15e)||void 0x0},_0x45c8dc[_0x7432f7],_0x204f3a(_0x3afea7),{}));if(_0x5afffa===_0x490e67(0x17c)||_0x5afffa===_0x490e67(0x1bb)){let _0x5b3615=Error[_0x490e67(0x16f)];try{Error['stackTraceLimit']=0x1/0x0,_0x7ce882['push'](_0x4277ae[_0x490e67(0x158)]({'stackNode':!0x0},new Error()[_0x490e67(0x123)],_0x204f3a(_0x3afea7),{'strLength':0x1/0x0}));}finally{Error[_0x490e67(0x16f)]=_0x5b3615;}}return{'method':_0x490e67(0x116),'version':_0x4a0483,'args':[{'ts':_0x275938,'session':_0x334fd3,'args':_0x7ce882,'id':_0x4a459c,'context':_0x17015d}]};}catch(_0x84cbeb){return{'method':_0x490e67(0x116),'version':_0x4a0483,'args':[{'ts':_0x275938,'session':_0x334fd3,'args':[{'type':_0x490e67(0x16e),'error':_0x84cbeb&&_0x84cbeb[_0x490e67(0x188)]}],'id':_0x4a459c,'context':_0x17015d}]};}finally{try{if(_0x97a821&&_0x4538cb){let _0x432ee2=_0x223738();_0x97a821['count']++,_0x97a821['time']+=_0x42fb36(_0x4538cb,_0x432ee2),_0x97a821['ts']=_0x432ee2,_0x1f3bee[_0x490e67(0x1cd)][_0x490e67(0x180)]++,_0x1f3bee[_0x490e67(0x1cd)][_0x490e67(0x15e)]+=_0x42fb36(_0x4538cb,_0x432ee2),_0x1f3bee[_0x490e67(0x1cd)]['ts']=_0x432ee2,(_0x97a821[_0x490e67(0x180)]>_0x141946[_0x490e67(0x1cb)][_0x490e67(0x12d)]||_0x97a821['time']>_0x141946[_0x490e67(0x1cb)][_0x490e67(0x1bc)])&&(_0x97a821[_0x490e67(0x171)]=!0x0),(_0x1f3bee['hits']['count']>_0x141946[_0x490e67(0x13f)][_0x490e67(0x12d)]||_0x1f3bee[_0x490e67(0x1cd)][_0x490e67(0x15e)]>_0x141946[_0x490e67(0x13f)]['reduceOnAccumulatedProcessingTimeMs'])&&(_0x1f3bee[_0x490e67(0x1cd)]['reduceLimits']=!0x0);}}catch{}}}return _0x1e6d74;}function _0x2214(){var _0x14499a=['value','undefined','rootExpression','path','_treeNodePropertiesBeforeFullValue','origin','data','resolveGetters','_addProperty','expo','_blacklistedProperty','_getOwnPropertyDescriptor','timeStamp','failed\\x20to\\x20connect\\x20to\\x20host:\\x20','elements','null','allStrLength','_regExpToString','react-native','Map','2eFQllr','ninjaSuppressConsole',',\\x20see\\x20https://tinyurl.com/2vt8jxzw\\x20for\\x20more\\x20info.','coverage','_isArray','_connected','hrtime','toString','_setNodePermissions','bound\\x20Promise','reducePolicy','_reconnectTimeout','...','nan','resetWhenQuietMs','Number','_ninjaIgnoreNextError','_hasSymbolPropertyOnItsPath','current','Set','import(\\x27url\\x27)','bigint','sort','_cleanNode','_connectToHostNow','bind','catch','_hasSetOnItsPath','\\x20server','get','NEGATIVE_INFINITY','1.0.0','logger\\x20failed\\x20to\\x20connect\\x20to\\x20host','_addLoadNode','_consoleNinjaAllowedToStart','array','length','props','_p_name','push','performance','location','POSITIVE_INFINITY','date','autoExpand','10162370kgItlO','map','disabledTrace','10.0.2.2','_numberRegExp','env','symbol','resolve','root_exp','onmessage','test','strLength','port','concat','_WebSocket','then','level','log','_addObjectProperty','object','_isSet','getOwnPropertyDescriptor','Error','isExpressionToEvaluate','edge','charAt','match','parent','indexOf','valueOf','stack','warn','_connecting','failed\\x20to\\x20find\\x20and\\x20load\\x20WebSocket','_setNodeId','node','next.js','versions','1668317DHAXqx','_property','reduceOnCount','_getOwnPropertySymbols','_undefined','positiveInfinity','_propertyName','_dateToString','_sendErrorMessage','gateway.docker.internal','remix','_treeNodePropertiesAfterFullValue','984054cwWOKG','reducedLimits','_capIfString','_keyStrRegExp','cappedProps','_attemptToReconnectShortly','_socket','reload','global','endsWith','args','RegExp','_extendedWarning','onerror','funcName','_isPrimitiveWrapperType','_disposeWebsocket','vite','[object\\x20BigInt]','index','_maxConnectAttemptCount','[object\\x20Array]',"/Users/lirunzhao/.vscode/extensions/wallabyjs.console-ninja-1.0.493/node_modules",'getOwnPropertyNames','constructor','dockerizedApp','type','142700orZAYJ','includes','replace','63740','hasOwnProperty','boolean','serialize','_quotedRegExp','_setNodeExpressionPath','unref','join','Console\\x20Ninja\\x20failed\\x20to\\x20send\\x20logs,\\x20refreshing\\x20the\\x20page\\x20may\\x20help;\\x20also\\x20see\\x20','time','depth','modules','_HTMLAllCollection','slice','method','nodeModules','_console_ninja','parse','415197WHEhXo','elapsed','process','eventReceivedCallback','getOwnPropertySymbols','_setNodeExpandableState','[object\\x20Map]','unknown','stackTraceLimit','see\\x20https://tinyurl.com/2vt8jxzw\\x20for\\x20more\\x20info.','reduceLimits','substr','isArray','_allowedToSend','stringify','console','disabledLog','_Symbol','_webSocketErrorDocsLink','_getOwnPropertyNames','getter','trace','send','_p_','[object\\x20Set]','count','','_allowedToConnectOnSend','hostname','negativeInfinity','set','autoExpandPropertyCount','_isNegativeZero','message','autoExpandMaxDepth','prototype','iterator','_addFunctionsNode','https://tinyurl.com/37x8b79t','angular','127.0.0.1','import(\\x27path\\x27)','totalStrLength','host','NEXT_RUNTIME','_ws','call','function','5lYlfxC','56GExRSR','Boolean','1563852BMXApG',{"resolveGetters":false,"defaultLimits":{"props":100,"elements":100,"strLength":51200,"totalStrLength":51200,"autoExpandLimit":5000,"autoExpandMaxDepth":10},"reducedLimits":{"props":5,"elements":5,"strLength":256,"totalStrLength":768,"autoExpandLimit":30,"autoExpandMaxDepth":2},"reducePolicy":{"perLogpoint":{"reduceOnCount":50,"reduceOnAccumulatedProcessingTimeMs":100,"resetWhenQuietMs":500,"resetOnProcessingTimeAverageMs":100},"global":{"reduceOnCount":1000,"reduceOnAccumulatedProcessingTimeMs":300,"resetWhenQuietMs":50,"resetOnProcessingTimeAverageMs":100}}},'_setNodeLabel','_isPrimitiveType','_isUndefined','Symbol','_processTreeNodeResult','_WebSocketClass','ExpoDevice','_isMap','default','_console_ninja_session','now','autoExpandLimit','android','string','11djOgAe','HTMLAllCollection','unshift','_type','capped','_sortProps','resetOnProcessingTimeAverageMs','_inBrowser','number','url','autoExpandPreviousObjects','WebSocket','toUpperCase','_hasMapOnItsPath','[object\\x20Date]','cappedElements','forEach','error','reduceOnAccumulatedProcessingTimeMs','toLowerCase','_connectAttemptCount','noFunctions','207488XhRovp','return\\x20import(url.pathToFileURL(path.join(nodeModules,\\x20\\x27ws/index.js\\x27)).toString());','split','name','logger\\x20websocket\\x20error','getWebSocketClass',["localhost","127.0.0.1","example.cypress.io","10.0.2.2","lirunzhaodeMini","192.168.50.25"],'_objectToString','String','_additionalMetadata','readyState','perLogpoint','defaultLimits','hits','expressionsToEvaluate','negativeZero'];_0x2214=function(){return _0x14499a;};return _0x2214();}function G(_0x3130d3){var _0x84a520=_0x54cc26;if(_0x3130d3&&typeof _0x3130d3==_0x84a520(0x118)&&_0x3130d3[_0x84a520(0x14f)])switch(_0x3130d3[_0x84a520(0x14f)][_0x84a520(0x1c3)]){case'Promise':return _0x3130d3[_0x84a520(0x156)](Symbol[_0x84a520(0x18b)])?Promise['resolve']():_0x3130d3;case _0x84a520(0xe1):return Promise[_0x84a520(0x10c)]();}return _0x3130d3;}function _0x4a90(_0xbf85a4,_0x245df9){var _0x2214cf=_0x2214();return _0x4a90=function(_0x4a90b3,_0x346472){_0x4a90b3=_0x4a90b3-0xc3;var _0x3eefbb=_0x2214cf[_0x4a90b3];return _0x3eefbb;},_0x4a90(_0xbf85a4,_0x245df9);}((_0x3cca3d,_0xf824c0,_0x3e0a9b,_0x5c058d,_0x38abea,_0x269295,_0x304d0c,_0x56b187,_0x5799d3,_0x19f830,_0x5a3a2e,_0x231e3c)=>{var _0x4818fc=_0x54cc26;if(_0x3cca3d[_0x4818fc(0x165)])return _0x3cca3d[_0x4818fc(0x165)];let _0x52e3da={'consoleLog':()=>{},'consoleTrace':()=>{},'consoleTime':()=>{},'consoleTimeEnd':()=>{},'autoLog':()=>{},'autoLogMany':()=>{},'autoTraceMany':()=>{},'coverage':()=>{},'autoTrace':()=>{},'autoTime':()=>{},'autoTimeEnd':()=>{}};if(!X(_0x3cca3d,_0x56b187,_0x38abea))return _0x3cca3d[_0x4818fc(0x165)]=_0x52e3da,_0x3cca3d['_console_ninja'];let _0x44b593=b(_0x3cca3d),_0x48380c=_0x44b593[_0x4818fc(0x168)],_0x1338d8=_0x44b593[_0x4818fc(0xd0)],_0x29d139=_0x44b593[_0x4818fc(0x1a6)],_0x1ed58e={'hits':{},'ts':{}},_0x19f55c=J(_0x3cca3d,_0x5799d3,_0x1ed58e,_0x269295,_0x231e3c,_0x38abea===_0x4818fc(0x129)?G:void 0x0),_0x59946f=(_0x57c8c4,_0x2ff1c0,_0x1589b0,_0x5826e5,_0xd0311c,_0x2786a0)=>{var _0x40d17e=_0x4818fc;let _0x218bcb=_0x3cca3d['_console_ninja'];try{return _0x3cca3d['_console_ninja']=_0x52e3da,_0x19f55c(_0x57c8c4,_0x2ff1c0,_0x1589b0,_0x5826e5,_0xd0311c,_0x2786a0);}finally{_0x3cca3d[_0x40d17e(0x165)]=_0x218bcb;}},_0x22921d=_0x423627=>{_0x1ed58e['ts'][_0x423627]=_0x1338d8();},_0x45102e=(_0x88203,_0x370b7a)=>{var _0x9ec8e9=_0x4818fc;let _0x3d041a=_0x1ed58e['ts'][_0x370b7a];if(delete _0x1ed58e['ts'][_0x370b7a],_0x3d041a){let _0x52a6eb=_0x48380c(_0x3d041a,_0x1338d8());_0x312a62(_0x59946f(_0x9ec8e9(0x15e),_0x88203,_0x29d139(),_0x9b859d,[_0x52a6eb],_0x370b7a));}},_0x2ee867=_0x41fceb=>{var _0x5bbca8=_0x4818fc,_0x5ba44d;return _0x38abea==='next.js'&&_0x3cca3d[_0x5bbca8(0xc9)]&&((_0x5ba44d=_0x41fceb==null?void 0x0:_0x41fceb[_0x5bbca8(0x141)])==null?void 0x0:_0x5ba44d[_0x5bbca8(0xfc)])&&(_0x41fceb['args'][0x0][_0x5bbca8(0xc9)]=_0x3cca3d[_0x5bbca8(0xc9)]),_0x41fceb;};_0x3cca3d[_0x4818fc(0x165)]={'consoleLog':(_0x1d0443,_0x2f73e4)=>{var _0x97f6bc=_0x4818fc;_0x3cca3d[_0x97f6bc(0x176)][_0x97f6bc(0x116)][_0x97f6bc(0x1c3)]!==_0x97f6bc(0x177)&&_0x312a62(_0x59946f(_0x97f6bc(0x116),_0x1d0443,_0x29d139(),_0x9b859d,_0x2f73e4));},'consoleTrace':(_0x4f29ba,_0x40e0fb)=>{var _0x5ea07f=_0x4818fc,_0xb083e5,_0x274db5;_0x3cca3d[_0x5ea07f(0x176)][_0x5ea07f(0x116)][_0x5ea07f(0x1c3)]!==_0x5ea07f(0x107)&&((_0x274db5=(_0xb083e5=_0x3cca3d['process'])==null?void 0x0:_0xb083e5[_0x5ea07f(0x12a)])!=null&&_0x274db5[_0x5ea07f(0x128)]&&(_0x3cca3d[_0x5ea07f(0xe8)]=!0x0),_0x312a62(_0x2ee867(_0x59946f(_0x5ea07f(0x17c),_0x4f29ba,_0x29d139(),_0x9b859d,_0x40e0fb))));},'consoleError':(_0x2bc0da,_0x1c2aec)=>{var _0x1781f6=_0x4818fc;_0x3cca3d[_0x1781f6(0xe8)]=!0x0,_0x312a62(_0x2ee867(_0x59946f(_0x1781f6(0x1bb),_0x2bc0da,_0x29d139(),_0x9b859d,_0x1c2aec)));},'consoleTime':_0x39580d=>{_0x22921d(_0x39580d);},'consoleTimeEnd':(_0x3bc815,_0x207b89)=>{_0x45102e(_0x207b89,_0x3bc815);},'autoLog':(_0x1feae7,_0x412215)=>{var _0x28d3ed=_0x4818fc;_0x312a62(_0x59946f(_0x28d3ed(0x116),_0x412215,_0x29d139(),_0x9b859d,[_0x1feae7]));},'autoLogMany':(_0x2ec4aa,_0x3ebbc7)=>{_0x312a62(_0x59946f('log',_0x2ec4aa,_0x29d139(),_0x9b859d,_0x3ebbc7));},'autoTrace':(_0x1181a3,_0x59d6b5)=>{_0x312a62(_0x2ee867(_0x59946f('trace',_0x59d6b5,_0x29d139(),_0x9b859d,[_0x1181a3])));},'autoTraceMany':(_0x5d59ec,_0x321085)=>{var _0x254ed6=_0x4818fc;_0x312a62(_0x2ee867(_0x59946f(_0x254ed6(0x17c),_0x5d59ec,_0x29d139(),_0x9b859d,_0x321085)));},'autoTime':(_0x221590,_0x1740ad,_0x144e01)=>{_0x22921d(_0x144e01);},'autoTimeEnd':(_0x37d7ca,_0x1b7b6f,_0x52089f)=>{_0x45102e(_0x1b7b6f,_0x52089f);},'coverage':_0x2fe387=>{var _0xeb334b=_0x4818fc;_0x312a62({'method':_0xeb334b(0xdb),'version':_0x269295,'args':[{'id':_0x2fe387}]});}};let _0x312a62=H(_0x3cca3d,_0xf824c0,_0x3e0a9b,_0x5c058d,_0x38abea,_0x19f830,_0x5a3a2e),_0x9b859d=_0x3cca3d[_0x4818fc(0x1a5)];return _0x3cca3d[_0x4818fc(0x165)];})(globalThis,_0x54cc26(0x18f),_0x54cc26(0x155),_0x54cc26(0x14d),_0x54cc26(0x148),_0x54cc26(0xf7),'1763815490528',_0x54cc26(0x1c6),_0x54cc26(0x181),'','1',_0x54cc26(0x19b));`);
  } catch (e) {
    console.error(e);
  }
}
function oo_oo(i, ...v) {
  try {
    oo_cm().consoleLog(i, v);
  } catch (e) {
  }
  return v;
}
function oo_tr(i, ...v) {
  try {
    oo_cm().consoleTrace(i, v);
  } catch (e) {
  }
  return v;
}
function oo_tx(i, ...v) {
  try {
    oo_cm().consoleError(i, v);
  } catch (e) {
  }
  return v;
}
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
