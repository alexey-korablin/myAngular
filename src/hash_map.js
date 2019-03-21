'use strict';

function hashKey(value) {
    const type = typeof value;
    return `${type}:${value}`;
}

module.exports = {hashKey};