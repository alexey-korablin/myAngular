'use strict';

const setupModuleLoader = require('../src/loader');

describe('setupModuleLoader', function() {

    beforeEach(() => {
        delete window.angular;
    });

    beforeEach(() => {
        setupModuleLoader(window);
    });

    it('exposes angular on the window', () => {
        expect(window.angular).toBeDefined();
    });
    it('creates angular just once', () => {
        const ng = window.angular;
        setupModuleLoader(window);
        expect(ng).toBe(window.angular);
    });
    it('exposes the angular module function', () => {
        expect(window.angular.module).toBeDefined();
    });
    it('exposes the angular module function just once', () => {
        const module = window.angular.module;
        setupModuleLoader(window);
        expect(window.angular.module).toBe(module);
    });

    describe('modules', () => {

        it('allows registering a module', () => {
            const myModule = window.angular.module('myModule', []);
            expect(myModule).toBeDefined();
            expect(myModule.name).toBe('myModule');
        });
        it('replaces a module when registered with same name again', () => {
            const myModule = window.angular.module('myModule', []);
            const myNewModule = window.angular.module('myModule', []);
            expect(myModule).not.toBe(myNewModule);
        });
        it('attaches the requires array to the registered module', () => {
            const myModule = window.angular.module('myModule', ['myOtherModule']);
            expect(myModule.requires).toEqual(['myOtherModule']);
        });
        it('allows getting a module', () => {
            const myModule = window.angular.module('myModule', []);
            const gotModule = window.angular.module('myModule');
            expect(myModule).toBe(gotModule);
        });
        it('throws when trying to get a nonexistent module', () => {
            expect(function() { window.angular.module('myModule'); }).toThrow();
        });
        it('does not allow a module to be called hasOwnProperty', () => {
            expect(function() {window.angular.module('hasOwnProperty', []);}).toThrow();
        });
    });
});