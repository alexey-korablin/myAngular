'use strict';

function setupModuleLoader(window) {
    const ensure = (obj, name, factory) => obj[name] || (obj[name] = factory());

    const angular = ensure(window, 'angular', Object);

    const createModule = (name, requires, modules) => {
        if  (name === 'hasOwnProperty') { throw 'hasOwnProperty is not valid module name'; }
        const invokeQueue = [];
        const moduleInstance = {
            name,
            requires,
            constant: function (key, value) {
                invokeQueue.push(['constant', [key, value]]);
            },
            _invokeQueue: invokeQueue
        };
        modules[name] = moduleInstance;
        return moduleInstance;
    };

    const getModule = (name, modules) => {
        if (modules.hasOwnProperty(name)) {
            return modules[name];
        } else {
            throw `Module ${name} is not available!`;
        }
    };

    ensure(angular, 'module', function () {
        const modules = {};
        return function (name, requires) {
            if (requires) {
                return createModule(name, requires, modules);
            } else {
                return getModule(name, modules);
            }
        };
    });
}

module.exports = setupModuleLoader;