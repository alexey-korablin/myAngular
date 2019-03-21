'use strict';

const hashKey = require('../src/hash_map').hashKey;

describe('hash', function () {
    describe('hashKey', () => {


        it('is undefined:undefined for undefined', () => {
            expect(hashKey(undefined)).toEqual('undefined:undefined');
        });
        it('is object:null for null', () => {
            expect(hashKey(null)).toEqual('object:null');
        });
        it('is boolean:true for true', () => {
            expect(hashKey(true)).toEqual('boolean:true');
        });
        it('is boolean:false for false', () => {
            expect(hashKey(false)).toEqual('boolean:false');
        });
        it('is number:42 for 42', () => {
            expect(hashKey(42)).toEqual('number:42');
        });
        it('is string:42 for "42"', () => {
            expect(hashKey('42')).toEqual('string:42');
        });
        it('is object:[unique id] for objects', () => {
            expect(hashKey({})).toMatch(/^object:\S+$/);
        });
        it('is the same key when asked for the same object many times', () => {
            const obj = {};
            expect(hashKey(obj)).toEqual(hashKey(obj));
        });
        it('does not change when object value changed', () => {
            const obj = { a: 42 };
            const hash1 = hashKey(obj);
            obj.a = 43;
            const hash2 = hashKey(obj);
            expect(hash1).toEqual(hash2);
        });
        it('is not the same for different objects even with the same value', () => {
            const obj1 = { a: 42 };
            const obj2 = { a: 42 };
            expect(hashKey(obj1)).not.toEqual(hashKey(obj2));
        });
        it('is function:[unique id] for functions', () => {
            const fn = a => a;
            expect(hashKey(fn)).toMatch(/^function:\S+$/);
        });
        it('is the same key when asked for the same function many times', () => {
            const fn = () => {};
            expect(hashKey(fn)).toEqual(hashKey(fn));
        });
    });
});