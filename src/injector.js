'use strict';

const _ = require('lodash');
const FN_ARGS = /^function\s*[^\()]*\(\s*([^\)]*)\)/m;
const FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;
const STRIP_COMMENTS = /(\/\/.*$)|\/\*.*?\*\//mg;
const INSTANTIATING = {};

function createInjector(modulesToLoad, strictDI) {
    const cache = {};
    const providerCache = {};
    const instanceCache = {};
    const loadedModules = {};
    const path = [];
    strictDI = (strictDI === true);
    const $provide = {
        constant: function (key, value) {
            if ( key === 'hasOwnProperty' ) { throw 'hasOwnProperty is not valid constant name!'; }
            instanceCache[key] = value;
        },
        provider: function (key, provider) {
            if (_.isFunction(provider)) {
                provider = instantiate(provider); 
            }
            providerCache[`${key}Provider`] = provider;
        }
    };

    function getService(name) {
        if (instanceCache.hasOwnProperty(name)) {
            if (instanceCache[name] === INSTANTIATING) {
                throw new Error(`Circular dependency found: ${name} <- ${path.join(' <- ')}`);
            }
            return instanceCache[name];
        } else if (providerCache.hasOwnProperty(`${name}Provider`)) {
            instanceCache[name] = INSTANTIATING;
            path.unshift(name);
            try {
                const provider = providerCache[`${name}Provider`];
                const instance = instanceCache[name] = invoke(provider.$get);
                return instance;
            } finally {
                path.shift();
                if (instanceCache[name] === INSTANTIATING) {
                    delete instanceCache[name];
                }
            } 
        }
    }

    function instantiate(Type, locals) {
        const UnwrippedType = _.isArray(Type) ? _.last(Type) : Type;
        const instance = Object.create(UnwrippedType.prototype);
        invoke(Type, instance, locals);
        return instance;
    }

    function annotate(fn) {
        if (_.isArray(fn)) {
            return fn.slice(0, fn.length - 1);
        } else if (fn.$inject){
            return fn.$inject;
        } else if (!fn.length) {
            return [];
        } else {
            if (strictDI) {
                throw 'fn is not using explicit annotation and cannot be invoked in strict mode';
            }
            const source = fn.toString().replace(STRIP_COMMENTS, '');
            const argDeclaration = source.match(FN_ARGS);
            return _.map(argDeclaration[1].split(','), (argName) =>  argName.match(FN_ARG)[2]);
        }
    }

    function invoke(fn, self, locals) {
        const args = _.map(annotate(fn), (token) => {
            if (_.isString(token)) {
                return locals && locals.hasOwnProperty(token) ?
                locals[token] : getService(token);
            } else {
                throw `Incorrect injection token! Expected a string, got ${token}`;
            }
        });
        if (_.isArray(fn)) {
            fn = _.last(fn);
        }
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
        has: function (key) { return instanceCache.hasOwnProperty(key) ||
            providerCache.hasOwnProperty(`${key}Provider`); },
        get: getService,
        invoke,
        annotate,
        instantiate
    };
}   

module.exports = createInjector;