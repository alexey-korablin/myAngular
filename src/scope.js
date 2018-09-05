'use strict';

const _ = require('lodash');

const initWatchVal = () => {};

class Scope {
    constructor() {
        this.$$watchers = [];
        this.$$lastDirtyWatch = null;
        this.$$asyncQueue = [];
        this.$$phase = null;
        this.$$applyAsyncQueue = [];
        this.$$applyAsyncId = null;
        this.$$postDigestQueue = [];
        this.$$children = [];
        this.$root = this;
    }

    $$postDigest(fn) {
        this.$$postDigestQueue.push(fn);
    }

    $beginPhase(phase) {
        if (this.$$phase === phase) {
            throw `${this.$$phase} already in progress`;
        }
        this.$$phase = phase;
    }

    $clearPhase() {
        this.$$phase = null;
    }

    $$flushApplyAsync() {
        while(this.$$applyAsyncQueue.length) {
            try {
                this.$$applyAsyncQueue.shift()();
            } catch (e) {
                console.error(e);
            }
        }
        this.$root.$$applyAsyncId = null;
    }

    $applyAsync(expr) {
        const self = this;
        self.$$applyAsyncQueue.push(() => self.$eval(expr));
        if (self.$root.$$applyAsyncId === null) {
            self.$root.$$applyAsyncId = setTimeout(() => self.$apply(_.bind(self.$$flushApplyAsync, self)), 0);
        }
    }

    $apply(expr) {
        try {
            this.$beginPhase('$apply');
            this.$eval(expr);
        } finally {
            this.$clearPhase();
            this.$root.$digest();
        }
    }
    
    $evalAsync(expr) {
        const self = this;
        if (!self.$$phase && !self.$$asyncQueue.length) {
            setTimeout(() => {
                if (self.$$asyncQueue.length) {
                    self.$root.$digest();
                }
            }, 0);
        }
        self.$$asyncQueue.push({scope: self, expression: expr});
    }

    $eval(expr, locals) {
        return expr(this, locals);
    }

    $$areEqual(newValue, oldValue, valueEq) {
        return valueEq ? _.isEqual(newValue, oldValue)
        : newValue === oldValue || (typeof newValue === 'number' &&
        typeof oldValue === 'number' && isNaN(newValue) &&
        isNaN(oldValue));
    }

    $watch(watchFn, listenerFn = () => {}, valueEq = false) {
        const self = this;
        const watcher = {
            watchFn,
            listenerFn,
            valueEq: !!valueEq,
            last: initWatchVal
        };
        this.$$watchers.unshift(watcher);
        this.$root.$$lastDirtyWatch = null;
        return () => {
            const index = self.$$watchers.indexOf(watcher);
            if (index > -1) {
                self.$$watchers.splice(index, 1);
                self.$root.$$lastDirtyWatch = null;
            }
        };
    }

    $watchGroup(watchFns, listenerFn) {
        const self = this;
        const newValues = new Array(watchFns.length);
        const oldValues = new Array(watchFns.length);
        let shouldCall = false;
        let firstRun = true;
        let changeReactionScheduled = false;

        if (watchFns.length === 0) {
            shouldCall = true;
            self.$evalAsync(() => {
                if (shouldCall) {
                    listenerFn(newValues, oldValues, self);
                }
            });
            return () => shouldCall = false;
        }

        const watchGroupListener = () => {
            if (firstRun) {
                firstRun = false;
                listenerFn(newValues, newValues, self);
            } else {
                listenerFn(newValues, oldValues, self);
            }
            changeReactionScheduled = false;
        };

        const destroyFunctions = _.map(watchFns, (watchFn, i) => {
            return self.$watch(watchFn, (newValue, oldValue) => {
                newValues[i] = newValue;
                oldValues[i] = oldValue;
                if (!changeReactionScheduled) {
                    changeReactionScheduled = true;
                    self.$evalAsync(watchGroupListener);
                }
            });
        });

        return () => _.forEach(destroyFunctions, (destroyFunction) => destroyFunction());
    }

    // 
    $watchCollection(watchFn, listenerFn) {
        const self = this;
        let newValue;
        let oldValue;
        let changeCount = 0;
        const internalWatchFn = (scope) => { 
            newValue = watchFn(scope);
            //Check for changes
            if (_.isObject(newValue)) {
                if (_.isArray(newValue)) {
                    if (!_.isArray(oldValue)) {
                        changeCount++;
                        oldValue = [];
                    }
                    if (newValue.length !== oldValue.length) {
                        changeCount++;
                        oldValue.length = newValue.length;
                    }
                    _.forEach(newValue, (el, i) => {
                        const bothNaN = _.isNaN(el) && _.isNaN(oldValue[i]);
                        if (!bothNaN && el !== oldValue[i]) {
                            changeCount++;
                            oldValue[i] = el;
                        }
                    });
                } else {

                }
            } else {
                if (!this.$$areEqual(newValue, oldValue, false)) {
                    oldValue = newValue;
                    changeCount += 1;
                }
            }
            return changeCount;
        };
        const internalListenerFn = () => listenerFn(newValue, oldValue, self);
        return this.$watch(internalWatchFn, internalListenerFn);
    }

    $$everyScope(fn) {
        if (fn(this)) {
            return this.$$children.every((child) => child.$$everyScope(fn));
        } else {
            return false;
        }
    }

    $$digestOnce() {
        const self = this;
        let dirty = false;
        let continueLoop = true;
        this.$$everyScope((scope) => {
            let newValue;
            let oldValue;
            _.forEachRight(scope.$$watchers, watcher => {
                try {
                    if (watcher) {
                        newValue = watcher.watchFn(scope);
                        oldValue = watcher.last;
                        if (!scope.$$areEqual(newValue, oldValue, watcher.valueEq)) {
                            self.$root.$$lastDirtyWatch = watcher;
                            watcher.last = watcher.valueEq ? _.cloneDeep(newValue) : newValue;
                            watcher.listenerFn(newValue, (oldValue === initWatchVal ? newValue : oldValue), scope);
                            dirty = true;
                        } else if (self.$root.$$lastDirtyWatch === watcher) {
                            continueLoop = false;
                            return false;
                        }
                    }
                } catch (e) {
                    console.error(e);
                }
            });
            return continueLoop;
        });
        return dirty;
    }

    $digest() {
        let dirty;
        let ttl = 10;
        this.$beginPhase('$digest');
        this.$root.$$lastDirtyWatch = null;
        if (this.$root.$$applyAsyncId) {
            clearTimeout(this.$root.$$applyAsyncId);
            this.$$flushApplyAsync();
        }
        do {
            while (this.$$asyncQueue.length) {
                try {
                    const asyncTask = this.$$asyncQueue.shift();
                    asyncTask.scope.$eval(asyncTask.expression);
                } catch (e) {
                    console.error(e);
                }
            }
            dirty = this.$$digestOnce();
            if ((dirty || this.$$asyncQueue.length) && !(ttl--)) {
                this.$clearPhase();
                throw '10 digest iterations reached';
            }
        } while (dirty || this.$$asyncQueue.length);
        this.$clearPhase();
        while(this.$$postDigestQueue.length) {
            try {
                this.$$postDigestQueue.shift()();
            } catch (e) {
                console.error(e);
            }
        }
    }

    // inheritance. $new()
    $destroy() {
        if (this.$parent) {
            const siblings = this.$parent.$$children;
            const indexOfThis = siblings.indexOf(this);
            if (indexOfThis > -1) {
                siblings.splice(indexOfThis, 1);
            }
        }
        this.$$watchers = null;
    }

    $new(isolated, parent) {
        let child;
        parent = parent || this;
        // const ChildScope = function () {};
        // ChildScope.prototype = this;
        // return (child = new ChildScope());
        if (isolated) {
            child = new Scope();
            child.$root = parent.$root;
            child.$$asyncQueue = parent.$$asyncQueue;
            child.$$postDigestQueue = parent.$$postDigestQueue;
            child.$$applyAsyncQueue = parent.$$applyAsyncQueue;
        } else {
            child = Object.create(this);
        }
        parent.$$children.push(child);
        child.$$watchers = [];
        child.$$children = [];
        child.$parent = parent;
        return child;
    }
}

module.exports = Scope;