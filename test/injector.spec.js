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
});