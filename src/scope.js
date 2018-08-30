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
        this.$$applyAsyncId = null;
    }

    $applyAsync(expr) {
        const self = this;
        self.$$applyAsyncQueue.push(() => self.$eval(expr));
        if (self.$$applyAsyncId === null) {
            self.$$applyAsyncId = setTimeout(() => self.$apply(_.bind(self.$$flushApplyAsync, self)), 0);
        }
    }

    $apply(expr) {
        try {
            this.$beginPhase('$apply');
            this.$eval(expr);
        } finally {
            this.$clearPhase();
            this.$digest();
        }
    }
    
    $evalAsync(expr) {
        const self = this;
        if (!self.$$phase && !self.$$asyncQueue.length) {
            setTimeout(() => {
                if (self.$$asyncQueue.length) {
                    self.$digest();
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
        self.$$watchers.unshift(watcher);
        self.$$lastDirtyWatch = null;
        return () => {
            const index = self.$$watchers.indexOf(watcher);
            if (index > -1) {
                self.$$watchers.splice(index, 1);
                self.$$lastDirtyWatch = null;
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
                            self.$$lastDirtyWatch = watcher;
                            watcher.last = watcher.valueEq ? _.cloneDeep(newValue) : newValue;
                            watcher.listenerFn(newValue, (oldValue === initWatchVal ? newValue : oldValue), scope);
                            dirty = true;
                        } else if (self.$$lastDirtyWatch === watcher) {
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
        this.$$lastDirtyWatch = null;
        if (this.$$applyAsyncId) {
            clearTimeout(this.$$applyAsyncId);
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
    $new() {
        let child;
        // const ChildScope = function () {};
        // ChildScope.prototype = this;
        // return (child = new ChildScope());
        child = Object.create(this);
        this.$$children.push(child);
        child.$$watchers = [];
        child.$$children = [];
        return child;
    }
}

module.exports = Scope;