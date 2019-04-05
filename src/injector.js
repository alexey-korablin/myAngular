'use strict';

const _ = require('lodash');
const HashMap = require('./hash_map').HashMap;

const FN_ARGS = /^function\s*[^\()]*\(\s*([^\)]*)\)/m;
const FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;
const STRIP_COMMENTS = /(\/\/.*$)|\/\*.*?\*\//mg;
const INSTANTIATING = {};

function createInjector(modulesToLoad, strictDI) {
    const path = [];
    const providerCache = {};
    const providerInjector = providerCache.$injector = createInternalInjector(providerCache, function () {
        throw `Unknown provider: ${path.join(' <- ')}`;
    });
    const instanceCache = {};
    const instanceInjector = instanceCache.$injector = createInternalInjector(instanceCache, function (name) {
        const provider = providerInjector.get(`${name}Provider`);
        return instanceInjector.invoke(provider.$get, provider);
    });
    const loadedModules = new HashMap();
    strictDI = (strictDI === true);
    function enforceReturnValue(factoryFn) {
        return function () {
            const value = instanceInjector.invoke(factoryFn);
            if (_.isUndefined(value)) {
                throw 'factory must return a value';
            }
            return value;
        }
    }
    providerCache.$provide = {
        constant: function (key, value) {
            if ( key === 'hasOwnProperty' ) { throw 'hasOwnProperty is not valid constant name!'; }
            instanceCache[key] = value;
            providerCache[key] = value;
        },
        provider: function (key, provider) {
            if (_.isFunction(provider)) {
                provider = providerInjector.instantiate(provider); 
            }
            providerCache[`${key}Provider`] = provider;
        },
        factory: function (key, factoryFn) {
            this.provider(key, {$get: enforceReturnValue(factoryFn)});
        },
        value: function (key, value) {
            this.factory(key, _.constant(value));
        }
    };

    function createInternalInjector(cache, factoryFn) {
        function getService(name) {
            if (cache.hasOwnProperty(name)) {
                if (cache[name] === INSTANTIATING) {
                    throw new Error(`Circular dependency found: ${name} <- ${path.join(' <- ')}`);
                }
                return cache[name];
            } else {
                path.unshift(name);
                cache[name] = INSTANTIATING;
                try {
                    return (cache[name] = factoryFn(name));
                } finally {
                    path.shift();
                    if (cache[name] === INSTANTIATING) {
                        delete cache[name];
                    }
                } 
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

        function instantiate(Type, locals) {
            const UnwrippedType = _.isArray(Type) ? _.last(Type) : Type;
            const instance = Object.create(UnwrippedType.prototype);
            invoke(Type, instance, locals);
            return instance;
        }

        return { 
            has: function (name) { return cache.hasOwnProperty(name) ||
                providerCache.hasOwnProperty(`${name}Provider`); },
            get: getService,
            invoke,
            annotate,
            instantiate
        };
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

    function runInvokeQueue(queue) {
        _.forEach(queue, (invokeArgs) => {
            const service = providerInjector.get(invokeArgs[0]);
            const method = invokeArgs[1];
            const args = invokeArgs[2];
            service[method].apply(service, args);
        });
    }

    let runBlocks = [];

    _.forEach(modulesToLoad, function loadModule(module) {
        if (!loadedModules.get(module)) {
            loadedModules.put(module, true);
            if (_.isString(module)) {
                module = window.angular.module(module);
                _.forEach(module.requires, loadModule);
                runInvokeQueue(module._invokeQueue);
                runInvokeQueue(module._configBlocks);
                runBlocks = runBlocks.concat(module._runBlocks);
            } else if (_.isFunction(module) || _.isArray(module)) {
                runBlocks.push(providerInjector.invoke(module));
            }
        } 
    });
    _.forEach(_.compact(runBlocks), (runBlock) => {
        instanceInjector.invoke(runBlock);
    });
    return instanceInjector;
}   

module.exports = createInjector;