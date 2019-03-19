'use strict';

function setupModuleLoader(window) {
    const ensure = (obj, name, factory) => obj[name] || (obj[name] = factory());

    const angular = ensure(window, 'angular', Object);

    ensure(angular, 'module', function () {
        return function () {};
    });
}

module.exports = setupModuleLoader;