'use strict';

function setupModuleLoader(window) {
    const ensure = (obj, name, factory) => obj[name] || (obj[name] = factory());

    const angular = ensure(window, 'angular', Object);

    const createModule = (name, requires) => ({name, requires});

    ensure(angular, 'module', function () {
        return function (name, requires) {
            return createModule(name, requires);
        };
    });
}

module.exports = setupModuleLoader;