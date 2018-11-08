'use strict';

const parse = require('../src/parse');

describe('parse #', function() {

    it('can parse an integer', () => {
        const fn = parse('42');
        expect(fn).toBeDefined();
        expect(fn()).toBe(42);
    });

    it('can parse a floating point number', () => {
        const fn = parse('4.2');
        expect(fn()).toBe(4.2);
    });

    it('can parse a floating point number without an integer part', () => {
        const fn = parse('.42');
        expect(fn()).toBe(0.42);
    });
});