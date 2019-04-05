'use strict';

const _ = require('lodash');

const setupModuleLoader = require('../src/loader');
const createInjector = require('../src/injector');

describe('injector', function() {
    
    beforeEach(() => {
        delete window.angular;
        setupModuleLoader(window);
    });

    it('can be created', () => {
        const injector = createInjector();
        expect(injector).toBeDefined();
    });
    it('has a constant that has been registered to a module', () => {
        const module = window.angular.module('myModule', []);
        module.constant('aConstant', 42);
        const injector = createInjector(['myModule']);
        expect(injector.has('aConstant')).toBe(true);
    });
    it('does not have a non-registered constant', () => {
        const module = window.angular.module('myModule', []);
        const injector = createInjector(['myModule']);
        expect(injector.has('aConstant')).toBe(false);
    });
    it('does not allow a constant called hasOwnProperty', () => {
        const module = window.angular.module('myModule', []);
        module.constant('hasOwnProperty', false);
        expect(function () {
            createInjector(['myModule']);
        }).toThrow();
    });
    it('has a constant that has been registered to a module', () => {
        const module = window.angular.module('myModule', []);
        module.constant('aConstant', 42);
        const injector = createInjector(['myModule']);
        expect(injector.get('aConstant')).toBe(42);
    });
    it('loads multiple modules', () => {
        const module1 = window.angular.module('myModule', []);
        const module2 = window.angular.module('myOtherModule', []);
        module1.constant('aConstant', 42);
        module2.constant('anotherConstant', 43);
        const injector = createInjector(['myModule', 'myOtherModule']);
        expect(injector.has('aConstant')).toBe(true);
        expect(injector.has('anotherConstant')).toBe(true);
    });
    it('loads the required modules of a module', () => {
        const module1 = window.angular.module('myModule', []);
        const module2 = window.angular.module('myOtherModule', ['myModule']);
        module1.constant('aConstant', 42);
        module2.constant('anotherConstant', 43);
        const injector = createInjector(['myOtherModule']);
        expect(injector.has('aConstant')).toBe(true);
        expect(injector.has('anotherConstant')).toBe(true);
    });
    it('loads the transitively required modules of a module', () => {
        const module1 = window.angular.module('myModule', []);
        const module2 = window.angular.module('myOtherModule', ['myModule']);
        const module3 = window.angular.module('myThirdModule', ['myOtherModule']);
        module1.constant('aConstant', 42);
        module2.constant('anotherConstant', 43);
        module3.constant('aThirdConstant', 44);
        const injector = createInjector(['myThirdModule']);
        expect(injector.has('aConstant')).toBe(true);
        expect(injector.has('anotherConstant')).toBe(true);
        expect(injector.has('aThirdConstant')).toBe(true);
    });
    it('loads each module only once', () => {
        window.angular.module('myModule', ['myOtherModule']);
        window.angular.module('myOtherModule', ['myModule']);
        createInjector(['myModule']);
    });
    it('invokes an annotated function with dependency injection', () => {
        const module = window.angular.module('myModule', []);
        module.constant('a', 1);
        module.constant('b', 2);
        const injector = createInjector(['myModule']);

        const fn = (one, two) => one + two;
        fn.$inject = ['a', 'b'];

        expect(injector.invoke(fn)).toBe(3);
    });
    it('does not accept non-string as injection tokens', () => {
        const module = window.angular.module('myModule', []);
        module.constant('a', 1);
        const injector = createInjector(['myModule']);

        const fn = (one, two) => one + two;
        fn.$inject = ['a', 2];

        expect(function() {
            injector.invoke(fn);
        }).toThrow();
    });
    it('invokes a function with the given this context', () => {
        const module = window.angular.module('myModule', []);
        module.constant('a', 1);
        const injector = createInjector(['myModule']);

        const obj = {
            two: 2,
            fn: function (one) { return one + this.two; }
        };

        obj.fn.$inject = ['a'];

        expect(injector.invoke(obj.fn, obj)).toBe(3);
    });
    it('overrides dependencies with locals when invoking', () => {
        const module = window.angular.module('myModule', []);
        module.constant('a', 1);
        module.constant('b', 2);
        const injector = createInjector(['myModule']);

        const fn = (one, two) => one + two;
        fn.$inject = ['a', 'b'];

        expect(injector.invoke(fn, null, {'b': 3})).toBe(4);
    });

    describe('annotate', () => {

        it('returns the $inject annotation of a function when it has one', () => {
            const injector = createInjector([]);

            const fn = () => {};
            fn.$inject = ['a', 'b'];

            expect(injector.annotate(fn)).toEqual(['a', 'b']);
        });
        it('returns an empty array for a non-annotated 0-arg funciton', () => {
            const injector = createInjector([]);
            const fn = () => {};
            expect(injector.annotate(fn)).toEqual([]);
        });
        it('returns annotations parsed from function args when not annotated', () => {
            const injector = createInjector([]);
            const fn = (a, b) => {};
            expect(injector.annotate(fn)).toEqual(['a', 'b']);
        });
        it('strips comments from argument lists when parsing', () => {
            const injector = createInjector([]);
            const fn = (a, /*b,*/ c) => {};
            expect(injector.annotate(fn)).toEqual(['a', 'c']);
        });
        it('strip several comments from argument lists when parsing', () => {
            const injector = createInjector([]);
            const fn = (a, /*b,*/ c/*, d*/) => {};
            expect(injector.annotate(fn)).toEqual(['a', 'c']);
        });
        it('strip // comments from argument lists when parsing', () => {
            const injector = createInjector([]);
            const fn = (a, 
                //b
                 c) => {};
            expect(injector.annotate(fn)).toEqual(['a', 'c']);
        });
        it('strips surroundin underscores from argument names when parsing', () => {
            const injector = createInjector([]);
            const fn = (a, _b_, c_, _d, an_argument) => {};
            expect(injector.annotate(fn)).toEqual(['a', 'b', 'c_', '_d', 'an_argument']);
        });
        it('throws when using a non-annotated fn in strict mode', () => {
            const injector = createInjector([], true);
            const fn = (a, b, c) => {};
            expect(function () {
                injector.annotate(fn);
            }).toThrow();
        });
        it('invokes an array-annotated function with dependency injection', () => {
            const module = window.angular.module('myModule', []);
            module.constant('a', 1);
            module.constant('b', 2);
            const injector = createInjector(['myModule']);

            const fn = ['a', 'b', function (one, two) { return one + two; }];

            expect(injector.invoke(fn)).toBe(3);
        });
        it('invokes a non-annotated function with dependency injection', () => {
            const module = window.angular.module('myModule', []);
            module.constant('a', 1);
            module.constant('b', 2);
            const injector = createInjector(['myModule']);

            const fn = (a, b) => a + b;

            expect(injector.invoke(fn)).toBe(3);
        });
        it('instantiates an annotated constructor function', () => {
            const module = window.angular.module('myModule', []);
            module.constant('a', 1);
            module.constant('b', 2);
            const injector = createInjector(['myModule']);

            function Type(one, two) {
                this.result = one + two;
            }
            Type.$inject = ['a', 'b'];

            const instance = injector.instantiate(Type);

            expect(instance.result).toBe(3);
        });
        it('instantiates an array-annotated constructor function', () => {
            const module = window.angular.module('myModule', []);
            module.constant('a', 1);
            module.constant('b', 2);
            const injector = createInjector(['myModule']);

            function Type(one, two) {
                this.result = one + two;
            }

            const instance = injector.instantiate(['a', 'b', Type]);

            expect(instance.result).toBe(3);
        });
        it('instantiates a non-annotated constructor function', () => {
            const module = window.angular.module('myModule', []);
            module.constant('a', 1);
            module.constant('b', 2);
            const injector = createInjector(['myModule']);

            function Type(a, b) {
                this.result = a + b;
            }

            const instance = injector.instantiate(Type);

            expect(instance.result).toBe(3);
        });
        it('uses the prototype of the constructor when instantiating', () => {
            function BaseType() {}
            BaseType.prototype.getValue = _.constant(42);

            function Type() {
                this.v = this.getValue();
            }
            Type.prototype = BaseType.prototype;

            const module = window.angular.module('myModule', []);
            const injector = createInjector(['myModule']);
            const instance = injector.instantiate(Type);

            expect(instance.v).toBe(42);
        });
        it('support locals when instantiating', () => {
            const module = window.angular.module('myModule', []);
            module.constant('a', 1);
            module.constant('b', 2);
            const injector = createInjector(['myModule']);

            function Type(a, b) {
                this.result = a + b;
            }

            const instance = injector.instantiate(Type, { b: 3 });

            expect(instance.result).toBe(4);
        });
        // Providers block
        it('allows registering a providera and uses its $get', () => {
            const module = window.angular.module('myModule', []);
            module.provider('a', {
                $get: function () { return 42; }
            });
            const injector = createInjector(['myModule']);
            expect(injector.has('a')).toBe(true);
            expect(injector.get('a')).toBe(42);
        });
        it('injects the $get method of a provider', () => {
            const module = window.angular.module('myModule', []);
            module.constant('a', 1);
            module.provider('b', {
                $get: function (a) { return a + 2; }
            });
            const injector = createInjector(['myModule']);
            expect(injector.get('b')).toBe(3);
        });
        it('inject the $get method of a provider lazily', () => {
            const module = window.angular.module('myModule', []);
            module.provider('b', {
                $get: function (a) { return a + 2; }
            });
            module.provider('a', { $get: _.constant(1) });
            const injector = createInjector(['myModule']);
            expect(injector.get('b')).toBe(3);
        });
        it('instantiates a dependency only once', () => {
            const module = window.angular.module('myModule', []);
            module.provider('a', { $get: function () { return {}; }});
            const injector = createInjector(['myModule']);
            expect(injector.get('a')).toBe(injector.get('a'));
        });
        it('notifies the user about a circular dependency', () => {
            const module = window.angular.module('myModule', []);
            module.provider('a1', { $get: function (b1) {}});
            module.provider('b1', { $get: function (c1) {}});
            module.provider('c1', { $get: function (a1) {}});
            const injector = createInjector(['myModule']);
            expect(function() {
                injector.get('a1');
            }).toThrowError('Circular dependency found: a1 <- c1 <- b1 <- a1');
        });
        it('cleans up the circular marker when instantiation fails', () => {
            const module = window.angular.module('myModule', []);
            module.provider('a', { $get: function() {
                throw 'Failing instantiation!';
            } });
            const injector = createInjector(['myModule']);
            expect(function() { injector.get('a'); }).toThrow('Failing instantiation!');
            expect(function() { injector.get('a'); }).toThrow('Failing instantiation!');
        });
        it('instantiates a provider if given as a constructor function', () => {
            const module = window.angular.module('myModule', []);
            module.provider('a', function AProvider() {
                this.$get = () => 42;
            });
            const injector = createInjector(['myModule']);
            expect(injector.get('a')).toBe(42);
        });
        it('injects the given provider constructor function', () => {
            const module = window.angular.module('myModule', []);
            module.constant('b', 2);
            module.provider('a', function AProvider(b) {
                this.$get = () => b + 1;
            });
            const injector = createInjector(['myModule']);
            expect(injector.get('a')).toBe(3);
        });
        it('injects another provider to a provider constructor function', () => {
            const module = window.angular.module('myModule', []);
            module.provider('a', function AProvider() {
                let value = 1;
                this.setValue = (v) => value = v;
                this.$get = () => value; 
            });
            module.provider('b', function BProvider(aProvider) {
                aProvider.setValue(2);
                this.$get = () => {};
            });
            const injector = createInjector(['myModule']);
            expect(injector.get('a')).toBe(2);
        });
        it('does not inject an instance to a provider constructor function', () => {
            const module = window.angular.module('myModule', []);
            module.provider('a', function AProvider() {
                this.$get = () => 1; 
            });
            module.provider('b', function BProvider(a) {
                this.$get = () => a;
            });
            expect(function() {
                createInjector(['myModule']);
            }).toThrow();
        });
        it('does not inject a provider to invoke', () => {
            const module = window.angular.module('myModule', []);
            module.provider('a', function AProvider() {
                this.$get = () => 1; 
            });
            const injector = createInjector(['myModule']);
            expect(function () {
                injector.invoke(function (aProvider) {});
            }).toThrow();
        });
        it('does not give access to providers through get', () => {
            const module = window.angular.module('myModule', []);
            module.provider('a', function AProvider() {
                this.$get = () => 1; 
            });
            const injector = createInjector(['myModule']);
            expect(function () {
                injector.get('aProvider');
            }).toThrow();
        });
        it('registers constants first to make them available to provides', () => {
            const module = window.angular.module('myModule', []);
            module.provider('a', function AProvider(b) {
                this.$get = () => b; 
            });
            module.constant('b', 42);
            const injector = createInjector(['myModule']);
            expect(injector.get('a')).toBe(42);
        });
        it('allows injecting the instance injector to $get', () => {
            const module = window.angular.module('myModule', []);
            module.constant('a', 42);
            module.provider('b', function BProvider() {
                this.$get = ($injector) => $injector.get('a'); 
            });
            const injector = createInjector(['myModule']);
            expect(injector.get('b')).toBe(42);
        });
        it('allows injecting the provider injector to provider', () => {
            const module = window.angular.module('myModule', []);
            module.provider('a', function AProvider() {
                this.value = 42;
                this.$get = function () { return this.value; };
            });
            module.provider('b', function BProvider($injector) {
                const aProvider = $injector.get('aProvider');
                this.$get = () => aProvider.value; 
            });
            const injector = createInjector(['myModule']);
            expect(injector.get('b')).toBe(42);
        });
        it('allows injecting the $provide service to providers', () => {
            const module = window.angular.module('myModule', []);
            module.provider('a', function AProvider($provide) {
                $provide.constant('b', 2);
                this.$get = (b) => 1 + b;
            });
            const injector = createInjector(['myModule']);
            expect(injector.get('a')).toBe(3);
        });
        it('does not allow injecting the $provider service to $get', () => {
            const module = window.angular.module('myModule', []);
            module.provider('a', function AProvider() {
                this.$get = ($provide) => {};
            });
            const injector = createInjector(['myModule']);
            expect(function () {
                injector.get('a');
            }).toThrow();
        });
        it('runs config blocks when the injector is created', () => {
            const module = window.angular.module('myModule', []);
            let hasRun = false;
            module.config(function () {
                hasRun = true;
            });
            createInjector(['myModule']);
            expect(hasRun).toBe(true);
        });
        it('inject config blocks with provider injector', () => {
            const module = window.angular.module('myModule', []);
            module.config(function ($provide) {
                $provide.constant('a', 42);
            });
            const injector = createInjector(['myModule']);
            expect(injector.get('a')).toBe(42);
        });
        it('allows regidtering config blocks before providers', () => {
            const module = window.angular.module('myModule', []);
            module.config(function (aProvider) {});
            module.provider('a', function () {
                this.$get = _.constant(42);
            });
            const injector = createInjector(['myModule']);
            expect(injector.get('a')).toBe(42);
        });
        it('runs a config block added during module registration', () => {
            const module = window.angular.module('myModule', [], function ($provide) {
                $provide.constant('a', 42);
            });

            const injector = createInjector(['myModule']);
            expect(injector.get('a')).toBe(42);
        });
        it('runs run blocks when the injector is created', () => {
            const module = window.angular.module('myModule', []);
            let hasRun = false;
            module.run(function() {
                hasRun = true;
            });
            createInjector(['myModule']);
            expect(hasRun).toBe(true);
        });
        it('injects run blocks with the instance injector', () => {
            const module = window.angular.module('myModule', []);
            module.provider('a', {$get: _.constant(42)});
            let gotA = null;
            module.run(function(a) {
                gotA = a;
            });
            createInjector(['myModule']);
            expect(gotA).toBe(42);
        });
        it('configures all modules before running any run blocks', () => {
            let result = null;
            const module1 = window.angular.module('myModule', []);
            module1.provider('a', {$get: _.constant(1)});
            module1.run(function(a, b) {
                result = a + b;
            });

            const module2 = window.angular.module('myAnotherModule', []);
            module2.provider('b', {$get: _.constant(2)});

            createInjector(['myModule', 'myAnotherModule']);
            expect(result).toBe(3);
        });
        it('runs a function module dependency as a config block', () => {
            const functionModule = function($provide) {
                $provide.constant('a', 42);
            };
            window.angular.module('myModule', [functionModule]);
            const injector = createInjector(['myModule']);
            expect(injector.get('a')).toBe(42);
        });
        it('runs a function module with array injection as a config block', () => {
            const functionModule = ['$provide', function($provide) {
                $provide.constant('a', 42);
            }];
            window.angular.module('myModule', [functionModule]);
            const injector = createInjector(['myModule']);
            expect(injector.get('a')).toBe(42);
        });
        it('supports returrning a run block from a function module', () => {
            let result = null;
            const functionModule = function ($provide) {
                $provide.constant('a', 42);
                return a => result = a;
            };
            window.angular.module('myModule', [functionModule]);
            createInjector(['myModule']);
            expect(result).toBe(42);
        });
        it('only loads function modules once', () => {
            let loadedTimes = 0;
            const functionModule = function () {
                loadedTimes++;
            };
            window.angular.module('myModule', [functionModule, functionModule]);
            createInjector(['myModule']);
            expect(loadedTimes).toBe(1);
        });
        it('allows registering a factory', () => {
            const module = window.angular.module('myModule', []);
            module.factory('a', function () { return 42; });
            const injector = createInjector(['myModule']);
            expect(injector.get('a')).toBe(42);
        });
        it('injects a factory function with instances', () => {
            const module = window.angular.module('myModule', []);
            module.factory('a', function () { return 1; });
            module.factory('b', function (a) { return a + 2; });
            const injector = createInjector(['myModule']);
            expect(injector.get('b')).toBe(3);
        });
        it('only calls a factory function once', () => {
            const module = window.angular.module('myModule', []);
            module.factory('a', function () { return {}; });
            const injector = createInjector(['myModule']);
            expect(injector.get('a')).toEqual(injector.get('a'));
        });
        it('forces a factory to return a value', () => {
            const module = window.angular.module('myModule', []);
            module.factory('a', function () {});
            module.factory('b', function () { return null; });
            const injector = createInjector(['myModule']);
            expect(() => {
                injector.get('a');
            }).toThrow();
            expect(injector.get('b')).toBeNull();
        });
        it('allows registering a value', () => {
            const module = window.angular.module('myModule', []);
            module.value('a', 42);
            const injector = createInjector(['myModule']);
            expect(injector.get('a')).toBe(42);
        });
        it('does not make values available to config blocks', () => {
            const module = window.angular.module('myModule', []);
            module.value('a', 42);
            module.config(function(a) {});
            expect(function() {
                createInjector(['myModule']);
            }).toThrow();
        });
        it('allows an undefined value', () => {
            const module = window.angular.module('myModule', []);
            module.value('a', undefined);
            const injector = createInjector(['myModule']);
            expect(injector.get('a')).toBeUndefined();
        });
        it('allows registering a service', () => {
            const module = window.angular.module('myModule', []);
            module.service('aService', function MyService() {
                this.getValue = function () { return 42; };
            });
            const injector = createInjector(['myModule']);
            expect(injector.get('aService').getValue()).toBe(42);
        });
        it('injects service constructor with instances', () => {
            const module = window.angular.module('myModule', []);
            module.value('theValue', 42);
            module.service('aService', function MyService(theValue) {
                this.getValue = function () { return theValue; };
            });
            const injector = createInjector(['myModule']);
            expect(injector.get('aService').getValue()).toBe(42);
        });
        it('only instantiates service once', () => {
            const module = window.angular.module('myModule', []);
            module.service('aService', function MyService() {});
            const injector = createInjector(['myModule']);
            expect(injector.get('aService')).toBe(injector.get('aService'));
        });
    });
});