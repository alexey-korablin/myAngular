'use strict';

const _ = require('lodash');
const FN_ARGS = /^function\s*[^\()]*\(\s*([^\)]*)\)/m;
const FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;
const STRIP_COMMENTS = /(\/\/.*$)|\/\*.*?\*\//mg;

function createInjector(modulesToLoad) {
    const cache = {};
    const loadedModules = {};
    const $provide = {
        constant: function (key, value) {
            if ( key === 'hasOwnProperty' ) { throw 'hasOwnProperty is not valid constant name!'; }
            cache[key] = value;
        }
    };

    function annotate(fn) {
        if (_.isArray(fn)) {
            return fn.slice(0, fn.length - 1);
        } else if (fn.$inject){
            return fn.$inject;
        } else if (!fn.length) {
            return [];
        } else {
            const source = fn.toString().replace(STRIP_COMMENTS, '');
            const argDeclaration = source.match(FN_ARGS);
            return _.map(argDeclaration[1].split(','), (argName) =>  argName.match(FN_ARG)[2]);
        }
    }

    function invoke(fn, self, locals) {
        const args = _.map(fn.$inject, (token) => {
            if (_.isString(token)) {
                return locals && locals.hasOwnProperty(token) ?
                locals[token] : cache[token];
            } else {
                throw `Incorrect injection token! Expected a string, got ${token}`;
            }
        });
        return fn.apply(self, args);
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
        invoke,
        annotate
    };
}   

module.exports = createInjector;