'use strict';

const setupModuleLoader = require('./loader');

function publishExternalAPI() {
    setupModuleLoader(window);
    const ngModule = window.angular.module('ng', []);
    ngModule.provider('$filter', require('./filter'));
}

module.exports = publishExternalAPI;