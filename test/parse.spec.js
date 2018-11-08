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

    it('can parse a number in scientific notation', () => {
        const fn = parse('42e3');
        expect(fn()).toBe(42000);
    });

    it('can parse scientific notation with a float coefficient', () => {
        const fn = parse('.42e2');
        expect(fn()).toBe(42);
    });

    it('can parse scientific notation with negative exponents', () => {
        const fn = parse('4200e-2');
        expect(fn()).toBe(42);
    });

    it('can parse scientific notation with the + sign', () => {
        const fn = parse('.42e+2');
        expect(fn()).toBe(42);
    });

    it('can parse upper case scientific notation', () => {
        const fn = parse('.42E2');
        expect(fn()).toBe(42);
    });

    it('will not parse invalid scientific notation', () => {
        expect(() => parse('42e-')).toThrow();
        expect(() => parse('42e-a')).toThrow();
    });
});