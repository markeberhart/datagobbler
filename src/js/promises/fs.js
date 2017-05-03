var promises = require('./promises');
var fs = require('fs');

var FSPromise = promises.Promise.extend();
exports.Promise = FSPromise;

exports.rename = promises.wrap(fs.rename, FSPromise);
exports.truncate = promises.wrap(fs.truncate, FSPromise);
exports.chown = promises.wrap(fs.chown, FSPromise);
exports.fchown = promises.wrap(fs.fchown, FSPromise);
exports.lchown = promises.wrap(fs.lchown, FSPromise);
exports.chmod = promises.wrap(fs.chmod, FSPromise);
exports.fchmod = promises.wrap(fs.fchmod, FSPromise);
exports.lchmod = promises.wrap(fs.lchmod, FSPromise);
exports.stat = promises.wrap(fs.stat, FSPromise);
exports.lstat = promises.wrap(fs.lstat, FSPromise);
exports.fstat = promises.wrap(fs.fstat, FSPromise);
exports.link = promises.wrap(fs.link, FSPromise);
exports.symlink = promises.wrap(fs.symlink, FSPromise);
exports.readlink = promises.wrap(fs.readlink, FSPromise);
exports.realpath = promises.wrap(fs.realpath, FSPromise);
exports.unlink = promises.wrap(fs.unlink, FSPromise);
exports.rmdir = promises.wrap(fs.rmdir, FSPromise);
exports.mkdir = promises.wrap(fs.mkdir, FSPromise);
exports.readdir = promises.wrap(fs.readdir, FSPromise);
exports.close = promises.wrap(fs.close, FSPromise);
exports.open = promises.wrap(fs.open, FSPromise);
exports.utimes = promises.wrap(fs.utimes, FSPromise);
exports.futimes = promises.wrap(fs.futimes, FSPromise);
exports.write = promises.wrap(fs.write, FSPromise);
exports.read = promises.wrap(fs.read, FSPromise);
exports.readFile = promises.wrap(fs.readFile, FSPromise);
exports.writeFile = promises.wrap(fs.writeFile, FSPromise);
exports.appendFile = promises.wrap(fs.appendFile, FSPromise);
exports.watchFile = promises.wrap(fs.watchFile, FSPromise);
exports.unwatchFile = promises.wrap(fs.unwatchFile, FSPromise);
exports.watch = promises.wrap(fs.watch, FSPromise);
exports.exists = promises.wrap(fs.exists, FSPromise);