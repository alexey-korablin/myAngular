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
        this.$$watchers.forEach(watcher => {
            watcher.watchFn(self);
            watcher.listenerFn(null, null, self);
        });
    }
}

module.exports = Scope;