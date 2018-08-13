'use strict';

// const _ = require('lodash'); // Currently it doesn't need

class Scope {
    constructor() {
        this.$$watchers = [];
    }

    $watch(watchFn, listenerFn) {
        const watcher = {watchFn, listenerFn};
        this.$$watchers.push(watcher);
    }

    $digest() {
        const self = this;
        let newValue;
        let oldValue;
        this.$$watchers.forEach(watcher => {
            newValue = watcher.watchFn(self);
            oldValue = watcher.last;
            if (newValue !== oldValue) {
                watcher.last = newValue;
                watcher.listenerFn(newValue, oldValue, self);
            }
        });
    }
}

module.exports = Scope;