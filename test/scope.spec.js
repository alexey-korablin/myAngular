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
    });
});