// Original source code coming from https://github.com/jaw187/node-traceroute/blob/master/traceroute.js
// The source license under ISC by James Weston https://github.com/jaw187/node-traceroute/blob/72498d1a7ccb006b2e310abe3948e198dc0723c7/package.json#L34

"use strict";

const child = require("child_process");
const dns = require("dns");
const net = require("net");
const os = require("os");

const internals = {};

internals.isWin = /^win/.test(os.platform());

module.exports = internals.Traceroute = {};

internals.Traceroute.trace = function (host, callback) {
  dns.lookup(host.toUpperCase(), (err) => {
    if (err && net.isIP(host) === 0) {
      return callback(new Error("Invalid host"));
    }

    const command =
      (internals.isWin ? "tracert -d " : "traceroute -q 1 -n ") + host;
    child.exec(command, (err, stdout, stderr) => {
      if (err) {
        return callback(err);
      }

      const results = internals.parseOutput(stdout);
      return callback(null, results);
    });
  });
};

internals.parseHop = function (hop) {
  let line = hop.replace(/\*/g, "0");

  if (internals.isWin) {
    line = line.replace(/\</g, "");
  }

  const s = line.split(" ");
  for (let i = s.length - 1; i > -1; --i) {
    if (s[i] === "" || s[i] === "ms") {
      s.splice(i, 1);
    }
  }

  return internals.isWin ? internals.parseHopWin(s) : internals.parseHopNix(s);
};

internals.parseHopWin = function (line) {
  if (line[4] === "Request") {
    return false;
  }

  const hop = {};
  hop[line[4]] = [+line[1], +line[2], +line[3]];

  return hop;
};

internals.parseHopNix = function (line) {
  if (line[1] === "0") {
    return false;
  }

  const hop = {};
  let lastip = line[1];

  hop[line[1]] = [+line[2]];

  for (let i = 3; i < line.length; ++i) {
    if (net.isIP(line[i])) {
      lastip = line[i];
      if (!hop[lastip]) {
        hop[lastip] = [];
      }
    } else {
      hop[lastip].push(+line[i]);
    }
  }

  return hop;
};

internals.parseOutput = function (output) {
  const lines = output.split("\n");
  const hops = [];

  lines.shift();
  lines.pop();

  if (internals.isWin) {
    for (let i = 0; i < lines.length; ++i) {
      if (/^\s+1/.test(lines[i])) {
        break;
      }
      lines.splice(0, i);
    }
    lines.pop();
    lines.pop();
  }

  for (let i = 0; i < lines.length; ++i) {
    hops.push(internals.parseHop(lines[i]));
  }

  return hops;
};
