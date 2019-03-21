'use strict';

function setupModuleLoader(window) {
    const ensure = (obj, name, factory) => obj[name] || (obj[name] = factory());

    const angular = ensure(window, 'angular', Object);

    const createModule = (name, requires, modules, configFn) => {
        if  (name === 'hasOwnProperty') { throw 'hasOwnProperty is not valid module name'; }
        const invokeQueue = [];
        const configBlocks = [];
        const invokeLater = function (service, method, arrayMethod, queue) {
            return function () {
                queue = queue || invokeQueue;
                queue[arrayMethod || 'push']([service, method, arguments]);
                return moduleInstance;
            };
        };
        const moduleInstance = {
            name,
            requires,
            constant: invokeLater('$provide', 'constant', 'unshift'),
            provider: invokeLater('$provide', 'provider'),
            config: invokeLater('$injector', 'invoke', 'push', configBlocks),
            run: function (fn) {
                moduleInstance._runBlocks.push(fn);
                return moduleInstance;
            },
            _invokeQueue: invokeQueue,
            _configBlocks: configBlocks,
            _runBlocks: []
        };

        if (configFn) {
            moduleInstance.config(configFn);
        }

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
        return function (name, requires, configFn) {
            if (requires) {
                return createModule(name, requires, modules, configFn);
            } else {
                return getModule(name, modules);
            }
        };
    });
}

module.exports = setupModuleLoader;