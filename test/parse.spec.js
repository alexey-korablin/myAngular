'use strict';

const parse = require('../src/parse');

describe('parse #', function() {

    it('can parse an integer', () => {
        const fn = parse('42');
        expect(fn).toBeDefined();
        expect(fn()).toBe(42);
    });
});