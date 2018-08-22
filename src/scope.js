'use strict';

const _ = require('lodash');

const initWatchVal = () => {};

class Scope {
    constructor() {
        this.$$watchers = [];
        this.$$lastDirtyWatch = null;
        this.$$asyncQueue = [];
    }

    $evalAsync(expr) {
        this.$$asyncQueue.push({scope: this, expression: expr});
    }

    $apply(expr) {
        try {
            this.$eval(expr);
        } finally {
            this.$digest();
        }
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
        const watcher = {
            watchFn,
            listenerFn,
            valueEq: !!valueEq,
            last: initWatchVal
        };
        this.$$watchers.push(watcher);
        this.$$lastDirtyWatch = null;
    }

    $$digestOnce() {
        const self = this;
        let newValue;
        let oldValue;
        let dirty = false;
        _.forEach(this.$$watchers, watcher => {
            newValue = watcher.watchFn(self);
            oldValue = watcher.last;
            if (!self.$$areEqual(newValue, oldValue, watcher.valueEq)) {
                self.$$lastDirtyWatch = watcher;
                watcher.last = watcher.valueEq ? _.cloneDeep(newValue) : newValue;
                watcher.listenerFn(newValue, (oldValue === initWatchVal ? newValue : oldValue), self);
                dirty = true;
            } else if (self.$$lastDirtyWatch === watcher) {
                return false;
            }
        });
        return dirty;
    }

    $digest() {
        let dirty;
        let ttl = 10;
        this.$$lastDirtyWatch = null;
        do {
            while (this.$$asyncQueue.length) {
                const asyncTask = this.$$asyncQueue.shift();
                asyncTask.scope.$eval(asyncTask.expression);
            }
            dirty = this.$$digestOnce();
            if ((dirty || this.$$asyncQueue.length) && !(ttl--)) {
                throw '10 digest iterations reached';
            }
        } while (dirty || this.$$asyncQueue.length);
    }
}

module.exports = Scope;