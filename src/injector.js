'use strict';

const _ = require('lodash');

function createInjector(modulesToLoad) {
    const cache = {};
    const loadedModules = {};
    const $provide = {
        constant: function (key, value) {
            if ( key === 'hasOwnProperty' ) { throw 'hasOwnProperty is not valid constant name!'; }
            cache[key] = value;
        }
    };

    function invoke(fn) {
        const args = _.map(fn.$inject, (token) => cache[token]);
        return fn.apply(null, args);
    }

    _.forEach(modulesToLoad, function loadModule(moduleName) {
        if (!loadedModules.hasOwnProperty(moduleName)) {
            loadedModules[moduleName] = true;
            const module = window.angular.module(moduleName);
            _.forEach(module.requires, loadModule);
            _.forEach(module._invokeQueue, (invokeArgs) => {
                const method = invokeArgs[0];
                const args = invokeArgs[1];
                $provide[method].apply($provide, args);
            });
        }
    });
    return { 
        has: function (key) { return cache.hasOwnProperty(key); },
        get: function (key) { return cache[key]; },
        invoke
    };
}   

module.exports = createInjector;