'use strict';

const _ = require('lodash');

function hashKey(value) {
    const type = typeof value;
    let uid = null;
    if (type === 'function' || (type === 'object' && value !== null)) {
        uid = value.$$hashKey;
        if (typeof uid === 'function') {
            uid = value.$$hashKey();
        } else if (uid === undefined) {
            uid = value.$$hashKey = _.uniqueId();
        }
    } else {
        uid = value;
    }
    return `${type}:${uid}`;
}

class HashMap {
    put(key, value) {
        this[hashKey(key)] = value;
    }
    get(key) {
        return this[hashKey(key)];
    }
    remove(key) {
        key = hashKey(key);
        const value = this[key];
        delete this[key];
        return value;
    }
}

module.exports = {hashKey, HashMap};