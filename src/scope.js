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
        this.$$watchers.forEach(watcher => watcher.listenerFn());
    }
}

module.exports = Scope;