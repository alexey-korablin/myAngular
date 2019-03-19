'use strict';

const setupModuleLoader = require('../src/loader');

describe('setupModuleLoader', function() {

    beforeEach(() => {
        delete window.angular;
    });

    it('exposes angular on the window', () => {
        setupModuleLoader(window);
        expect(window.angular).toBeDefined();
    });
    it('creates angular just once', () => {
        setupModuleLoader(window);
        const ng = window.angular;
        setupModuleLoader(window);
        expect(ng).toBe(window.angular);
    });
});