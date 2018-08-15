'use strict';

const _ = require('lodash');

const initWatchVal = () => {};

class Scope {
    constructor() {
        this.$$watchers = [];
        this.$$lastDirtyWatch = null;
    }

    $watch(watchFn, listenerFn = () => {}) {
        const watcher = {watchFn, listenerFn, last: initWatchVal};
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
            if (newValue !== oldValue) {
                self.$$lastDirtyWatch = watcher;
                watcher.last = newValue;
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
            dirty = this.$$digestOnce();
            if (dirty && !(ttl--)) {
                throw '10 digest iterations reached';
            }
        } while (dirty);
    }
}

module.exports = Scope;