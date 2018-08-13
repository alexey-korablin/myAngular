'use strict';

const Scope = require('../src/scope');

describe('Scope', function () {

    it('can be cinstructed and used as an object', () => {
        const scope = new Scope();
        scope.aProperty = 1;

        expect(scope.aProperty).toBe(1);
    });

    describe('digest', () => {

        let scope;

        beforeEach(() => {
            scope = new Scope();
        });

        it('calls the listener function of a watch on first $digest', () => {
            const watchFn = () => 'wat';
            const listenerFn = jasmine.createSpy();
            scope.$watch(watchFn, listenerFn);

            scope.$digest();

            expect(listenerFn).toHaveBeenCalled();
        });

        it('calls the watch function with the scope as the argument', () => {
            const watchFn = jasmine.createSpy();
            const listenerFn = () => {};
            scope.$watch(watchFn, listenerFn);

            scope.$digest();

            expect(watchFn).toHaveBeenCalledWith(scope);
        });

        it('call the listener function when the watched value changes', () => {
            scope.someValue = 'a';
            scope.counter = 0;

            scope.$watch((scope) => scope.someValue, (newValue, oldValue, scope) =>  scope.counter++);

            expect(scope.counter).toBe(0);

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.someValue = 'b';
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('calls listener when watch value is first undefined', () => {
            scope.counter = 0;

            scope.$watch((scope) => scope.someValue, (newValue, oldValue, scope) => scope.counter++);
            scope.$digest();

            expect(scope.counter).toBe(1);
        });

        it('calls listener with new value as old value the first time', () => {
            scope.someValue = 123;
            let oldValueGiven;

            scope.$watch((scope) => scope.someValue, (newValue, oldValue, scope) => oldValueGiven = oldValue);

            scope.$digest();
            expect(oldValueGiven).toBe(123);
        });
    });
});