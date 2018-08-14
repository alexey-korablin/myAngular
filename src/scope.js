'use strict';

// const _ = require('lodash'); // Currently it doesn't need

const initWatchVal = () => {};

class Scope {
    constructor() {
        this.$$watchers = [];
    }

    $watch(watchFn, listenerFn = () => {}) {
        const watcher = {watchFn, listenerFn, last: initWatchVal};
        this.$$watchers.push(watcher);
    }

    $$digestOnce() {
        const self = this;
        let newValue;
        let oldValue;
        let dirty = false;
        this.$$watchers.forEach(watcher => {
            newValue = watcher.watchFn(self);
            oldValue = watcher.last;
            if (newValue !== oldValue) {
                watcher.last = newValue;
                watcher.listenerFn(newValue, (oldValue === initWatchVal ? newValue : oldValue), self);
                dirty = true;
            }
        });
        return dirty;
    }

    $digest() {
        let dirty;
        do {
            dirty = this.$$digestOnce();
        } while (dirty);
    }
}

module.exports = Scope;