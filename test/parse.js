'use strict';

const tap = require('tap');

const parse = require('../lib/parse');

const cases = [
  {
    input: [ 'concat-stream@1.x' ],
    output: {
      module_scope: null,
      module_name: 'concat-stream',
      module_semver: '1.x',
      debug: false,
      standalone: false
    }
  },
  {
    input: [ '@myscope/mymodule@1.x' ],
    output: {
      module_scope: '@myscope',
      module_name: 'mymodule',
      module_semver: '1.x',
      debug: false,
      standalone: false
    }
  },
  {
    input: [ 'mymodule/foo/bar@1.x' ],
    output: {
      module_scope: null,
      module_name: 'mymodule',
      module_semver: '1.x',
      module_subfile: 'foo/bar',
      debug: false,
      standalone: false
    }
  }
];

tap.plan(cases.length);

cases.forEach((testCase) => {
  tap.test(testCase.input, (t) => {
    let result;

    t.doesNotThrow(() => {
      result = parse.apply(null, testCase.input);
    }, 'should validate');

    t.same(result, testCase.output, 'result is as expected');
    t.end();
  });
});
