'use strict';

const setupModuleLoader = require('../src/loader');
const createInjector = require('../src/injector');

describe('injector', function() {
    
    beforeEach(() => {
        delete window.angular;
        setupModuleLoader(window);
    });

    it('can be created', () => {
        const injector = createInjector();
        expect(injector).toBeDefined();
    });
    it('has a constant that has been registered to a module', () => {
        const module = window.angular.module('myModule', []);
        module.constant('aConstant', 42);
        const injector = createInjector(['myModule']);
        expect(injector.has('aConstant')).toBe(true);
    });
    it('does not have a non-registered constant', () => {
        const module = window.angular.module('myModule', []);
        const injector = createInjector(['myModule']);
        expect(injector.has('aConstant')).toBe(false);
    });
    it('does not allow a constant called hasOwnProperty', () => {
        const module = window.angular.module('myModule', []);
        module.constant('hasOwnProperty', false);
        expect(function () {
            createInjector(['myModule']);
        }).toThrow();
    });
    it('has a constant that has been registered to a module', () => {
        const module = window.angular.module('myModule', []);
        module.constant('aConstant', 42);
        const injector = createInjector(['myModule']);
        expect(injector.get('aConstant')).toBe(42);
    });
});