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

    it('can parse a string in single quotes', () => {
        const fn = parse("'abc'");
        expect(fn()).toBe('abc');
    });

    it('will not parse a string with mismatching quotes', () => {
        expect(() => parse('"abc\'')).toThrow();
    });

    it('can parse a string with single quotes inside', () => {
        const fn = parse("'a\\\'b'");
        expect(fn()).toBe('a\'b');
    });

    it('can parse a string with double quotes inside', () => {
        const fn = parse('"a\\\"b"');
        expect(fn()).toBe('a\"b');
    });

    it('will parse a string with unicode escapes', () => {
        const fn = parse('"\\u00A0"');
        expect(fn()).toEqual('\u00A0');
    });

    it('will not parse string with invalid unicode escapes', () => {
        expect(() => parse('"\\u00T0"')).toThrow();
    });

    it('will parse null', () => {
        const fn = parse('null');
        expect(fn()).toBe(null);
    });

    it('will parse true', () => {
        const fn = parse('true');
        expect(fn()).toBe(true);
    });

    it('will parse false', () => {
        const fn = parse('false');
        expect(fn()).toBe(false);
    });

    it('ignores whitespace', () => {
        const fn = parse(' \n42 ');
        expect(fn()).toEqual(42);
    });

    it('will parse an empty array', () => {
        const fn = parse('[]');
        expect(fn()).toEqual([]);
    });

    it('will parse non empty array', () => {
        const fn = parse('[1, "two", [3], true]');
        expect(fn()).toEqual([1, 'two', [3], true]);
    });

    it('will parse an empty object', () => {
        const fn = parse('{}');
        expect(fn()).toEqual({});
    });

    it('will parse a non-empty object', () => {
        const fn = parse('{"a key": 1, \'another-key\': 2}');
        expect(fn()).toEqual({'a key': 1, 'another-key': 2});
    });

    it('will parse an object with identifier keys', () => {
        const fn = parse('{a: 1, b: [2, 3], c: {d: 4}}');
        expect(fn()).toEqual({a: 1, b: [2, 3], c: {d: 4}});
    });
});