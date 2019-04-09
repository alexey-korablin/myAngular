'use strict';

const publishExternalAPI = require('../src/angular_public');
const createInjector = require('../src/injector');

describe('angularPublic', function () {
    it('sets up the angular object and the module loader', () => {
        publishExternalAPI();

        expect(window.angular).toBeDefined();
        expect(window.angular.module).toBeDefined();
    });
    it('sets up the ng module', () => {
        publishExternalAPI();
        expect(createInjector(['ng'])).toBeDefined();
    });
    it('sets up the $filter service', () => {
        publishExternalAPI();
        const injector = createInjector(['ng']);
        expect(injector.has('$filter')).toBe(true);
    });
});