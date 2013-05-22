/**
 *  Copyright Tomaz Muraus
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

var childprocess = require('child_process');
var net = require('net');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var LineEmitter = require('line-emitter').LineEmitter;

function Traceroute(target, options) {
  EventEmitter.call(this);

  options = options || {};
  this._target = target;
  this._options = options;
  this._packetLen = options.packetLen || 60;
  this._maxTtl = options.maxTtl || 30;
  this._waitTime = options.waitTime || 5;

  if (net.isIP(target) === 4) {
    this._addressType = 'ipv4';
  }
  else if (net.isIP(target) === 6) {
    this._addressType = 'ipv6';
  }
  else {
    throw new Error('Target is not a valid IPv4 or IPv6 address');
  }
}

util.inherits(Traceroute, EventEmitter);

/**
 * Return EventEmitter instance which emitts 'hop' event for every hop.
 *
 * Each 'hop' event contains a data object with the following keys:
 * ip, number, rtts.
 */
Traceroute.prototype.traceroute = function() {
  var self = this;

  process.nextTick(function() {
    var emitter = self._run(self._target);

    emitter.on('end', function() {
      self.emit('end');
    });

    emitter.on('hop', function(hop) {
      self.emit('hop', hop);
    });

    emitter.on('error', function(err) {
      self.emit('error', err);
    });
  });
};

Traceroute.prototype._run = function(target) {
  var self = this, args, child, lineEmitter, emitter, stderrBuffer;

  args = [];

  if (this._addressType === 'ipv4') {
    args.push('-4');
  }
  else {
    args.push('-6');
  }

  args.push('-n');
  args.push('-m');
  args.push(this._maxTtl);
  args.push('-w');
  args.push(this._waitTime);
  args.push(target);
  args.push(this._packetLen);

  child = this._spawn('traceroute', args);
  lineEmitter = new LineEmitter();
  emitter = new EventEmitter();
  stderrBuffer = '';

  lineEmitter.on('data', function(line) {
    line = line.replace(/^\s+|\s+$/g, '');
    var hops = self._parseLine(line);

    if (!hops) {
      return;
    }

    hops.forEach(function(hop) {
      emitter.emit('hop', hop);
    });
  });

  child.stdout.on('data', function(chunk) {
    lineEmitter.write(chunk);
  });

  child.stderr.on('data', function(chunk) {
    stderrBuffer += chunk;
  });

  child.on('exit', function(code) {
    var err;

    if (code === 0) {
      process.nextTick(function() {
        emitter.emit('end');
      });
    }
    else {
      err = new Error('Error: ' + stderrBuffer);

      process.nextTick(function() {
        emitter.emit('error', err);
      });
    }
  });

  return emitter;
};

Traceroute.prototype._spawn = function(cmd, args) {
  var child = childprocess.spawn('traceroute', args);
  return child;
};

Traceroute.prototype._parseLine = function(line) {
  var result, host, ip, hopsStart, hopNumber, splitLine, value, dotCount,
      lastIndex, item, i;

  result = [];
  item = {};
  hopsStart = 1;

  // Skip first line
  if (line.indexOf('traceroute to') !== -1 || !line) {
    return false;
  }

  // for now just ignore those
  line = line.replace(/[!XHNP]/g, '');
  splitLine = line.split(/\s+/);

  hopNumber = parseInt(splitLine[0], 10);

  i = hopsStart; // hops start at index 1
  while (i < (splitLine.length - 1)) {
    value = splitLine[i];
    dotCount = value.split('.').length;

    if ((this._isAddress(value, this._addressType)) || (value === '*' && i === hopsStart)) {
      if (i > hopsStart) {
        // Insert old item
        result.push(item);
      }

      item = {
        'ip': value,
        'number': hopNumber,
        'rtts': []
      };
    }
    else if (['ms', '*'].indexOf(value) === -1) {
      value = parseFloat(value, 10);

      if (!isNaN(value)) {
        item.rtts.push(value);
      }
    }

    i++;
  }

  result.push(item);

  return result;
};

Traceroute.prototype._isAddress = function(value, family) {
  var dotCount;

  if (family === 'ipv4') {
    dotCount = value.split('.').length;
    return dotCount === 4;
  }
  else if (family === 'ipv6') {
    return value.indexOf(':') !== -1;
  }
  else {
    throw new Error('Invalid family: ' + family);
  }
};

module.exports = {
  'Traceroute': Traceroute
};
