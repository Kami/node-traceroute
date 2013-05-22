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

var EventEmitter = require('events').EventEmitter;
var childprocess = require('child_process');
var fs = require('fs');

var Traceroute = require('../lib/traceroute').Traceroute;

// Mock childprocess
exports.getEmitter = function(filePath, returnError) {
  returnError = returnError || false;
  var data = fs.readFileSync(filePath, 'utf8').toString();

  function get() {
    var emitter, split;

    emitter = new EventEmitter();
    data = data.replace(/^\s+|\s+$/g, '');
    split = data.split(/\n+/);

    emitter.stdout = new EventEmitter();
    emitter.stderr = new EventEmitter();

    setTimeout(function() {
      split.forEach(function(line) {
        if (!returnError) {
          emitter.stdout.emit('data', line + '\n');
        }
        else {
          emitter.stderr.emit('data', line + '\n');
        }
      });

      if (!returnError) {
        emitter.emit('exit', 0);
      }
      else {
        emitter.emit('exit', 1);
      }
    }, 100);

    return emitter;
  }

  return get;
};

exports['test_traceroute_route_1'] = function(test, assert) {
  var hopCount, splitHops, hopNumber, tr;

  hopCount = 0;
  splitHops = {};
  hopNumber = 0;

  tr = new Traceroute('193.2.1.87', {});
  Traceroute.prototype._spawn = exports.getEmitter('./tests/fixtures/output_without_hostnames.txt');
  tr.traceroute();

  tr.on('hop', function(hop) {
    hopCount++;
    hopNumber = hop.number;

    if (!splitHops[hopNumber]) {
      splitHops[hopNumber] = 0;
    }

    splitHops[hopNumber] = splitHops[hopNumber] + 1;

    if (hopCount === 1) {
      assert.equal(hop.number, 1);
      assert.equal(hop.ip, '192.168.1.1');
      assert.deepEqual(hop.rtts, [0.496, 0.925, 1.138]);
    }
    else if (hopCount === 8) {
      assert.equal(hop.number, 8);
      assert.equal(hop.ip, '154.54.2.165');
      assert.deepEqual(hop.rtts, [46.276]);
    }
    else if (hopCount === 9) {
      assert.equal(hop.number, 8);
      assert.equal(hop.ip, '154.54.5.37');
      assert.deepEqual(hop.rtts, [46.271]);
    }
    else if (hopCount === 10) {
      assert.equal(hop.number, 8);
      assert.equal(hop.ip, '154.54.5.57');
      assert.deepEqual(hop.rtts, [45.894]);
    }
    else if (hopNumber === 21) {
      if (splitHops[hopNumber] === 1) {
        assert.equal(hop.number, 21);
        assert.equal(hop.ip, '*');
        assert.deepEqual(hop.rtts, {});
      }
      else if (splitHops[hopNumber] === 2) {
        assert.equal(hop.number, 21);
        assert.equal(hop.ip, '88.200.7.249');
        assert.deepEqual(hop.rtts, [210.282, 207.316]);
      }
    }
    else if (hopNumber === 22) {
      assert.equal(hop.number, 22);
      assert.equal(hop.ip, '88.200.7.249');
      assert.deepEqual(hop.rtts, [196.908]);
    }
  });

  tr.on('end', function() {
    assert.equal(hopNumber, 22);
    test.finish();
  });
};

exports['test_traceroute_route_2'] = function(test, assert) {
  var hopCount, splitHops, hopNumber, tr;

  hopCount = 0;
  splitHops = {};
  hopNumber = 0;

  tr = new Traceroute('184.106.74.174', {});
  Traceroute.prototype._spawn = exports.getEmitter('./tests/fixtures/output_split_routes_2.txt');
  tr.traceroute();

  tr.on('hop', function(hop) {
    hopCount++;
    hopNumber = hop.number;

    if (!splitHops[hopNumber]) {
      splitHops[hopNumber] = 0;
    }

    splitHops[hopNumber] = splitHops[hopNumber] + 1;

    if (hopCount === 1) {
      assert.equal(hop.number, 1);
      assert.equal(hop.ip, '50.56.142.130');
      assert.deepEqual(hop.rtts.length, 3);
    }
    else if (hopNumber === 3) {
      if (splitHops[hopNumber] === 1) {
        assert.equal(hop.number, 3);
        assert.equal(hop.ip, '174.143.123.87');
        assert.deepEqual(hop.rtts, [1.115]);
      }
      else if (splitHops[hopNumber] === 2) {
        assert.equal(hop.number, 3);
        assert.equal(hop.ip, '174.143.123.85');
        assert.deepEqual(hop.rtts, [1.517, 1.527]);
      }
    }
  });

  tr.on('end', function() {
    assert.equal(hopNumber, 7);
    test.finish();
  });
};

exports['test_traceroute_route_3'] = function(test, assert) {
  var hopCount, splitHops, hopNumber, tr;

  hopCount = 0;
  splitHops = {};
  hopNumber = 0;

  tr = new Traceroute('94.236.68.69', {});
  Traceroute.prototype._spawn = exports.getEmitter('./tests/fixtures/output_split_routes_3.txt');
  tr.traceroute();

  tr.on('hop', function(hop) {
    hopCount++;
    hopNumber = hop.number;

    if (!splitHops[hopNumber]) {
      splitHops[hopNumber] = 0;
    }

    splitHops[hopNumber] = splitHops[hopNumber] + 1;

    if (hopNumber === 17) {
      if (splitHops[hopNumber] === 1) {
        assert.equal(hop.number, 17);
        assert.equal(hop.ip, '164.177.137.103');
        assert.deepEqual(hop.rtts, [155.621]);
      }
      else if (splitHops[hopNumber] === 2) {
        assert.equal(hop.number, 17);
        assert.equal(hop.ip, '164.177.137.101');
        assert.deepEqual(hop.rtts, [155.285]);
      }
      else if (splitHops[hopNumber] === 3) {
        assert.equal(hop.number, 17);
        assert.equal(hop.ip, '164.177.137.103');
        assert.deepEqual(hop.rtts, [154.711]);
      }
    }
  });

  tr.on('end', function() {
    assert.equal(hopNumber, 19);
    test.finish();
  });
};

exports['test_traceroute_error_invalid_target'] = function(test, assert) {
  var tr, thrown;

  try {
    tr = new Traceroute('foo.com', {});
  }
  catch (err) {
    thrown = true;
  }

  assert.ok(thrown);
  test.finish();
};

exports['test_traceroute_error_invalid_hostname'] = function(test, assert) {
  var hopCount, tr;

  hopCount = 0;
  tr = new Traceroute('127.8.8.8', {});
  Traceroute.prototype._spawn = exports.getEmitter('./tests/fixtures/error_invalid_hostname.txt', true);
  tr.traceroute();

  tr.on('hop', function(hop) {
    hopCount++;
  });

  tr.on('error', function(err) {
    assert.equal(hopCount, 0);
    assert.match(err.message, /Name or service not known/);
    test.finish();
  });
};

exports['test_traceroute_ipv6'] = function(test, assert) {
  var hopCount, splitHops, hopNumber, tr;

  hopCount = 0;
  splitHops = {};
  hopNumber = 0;

  tr = new Traceroute('2607:f8b0:4009:803::1000', {});
  Traceroute.prototype._spawn = exports.getEmitter('./tests/fixtures/output_ipv6_split_routes.txt', false);
  tr.traceroute();

  tr.on('hop', function(hop) {
    hopCount++;
    hopNumber = hop.number;

    if (!splitHops[hopNumber]) {
      splitHops[hopNumber] = 0;
    }

    splitHops[hopNumber] = splitHops[hopNumber] + 1;

    if (hopCount === 2) {
        assert.equal(hop.number, 2);
        assert.equal(hop.ip, '2001:4801:800:c3:601a:2::');
        assert.deepEqual(hop.rtts, [0.974, 1.147, 1.150]);
    }
    else if (hopNumber === 3) {
      if (splitHops[hopNumber] === 1) {
        assert.equal(hop.ip, '2001:4801:800:cb:c3::');
        assert.deepEqual(hop.rtts, [0.766]);
      }
      else if (splitHops[hopNumber] === 2) {
        assert.equal(hop.ip, '2001:4801:800:ca:c3::');
        assert.deepEqual(hop.rtts, [0.773]);
      }
      else if (splitHops[hopNumber] === 3) {
        assert.equal(hop.ip, '2001:4801:800:cb:c3::');
        assert.deepEqual(hop.rtts, [0.954]);
      }
    }
  });

  tr.on('end', function(err) {
    assert.equal(hopNumber, 10);
    test.finish();
  });
};
