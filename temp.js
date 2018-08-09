module.exports = function(config) { 
    config.set({ 
        browsers: ['Chrome'],
        frameworks: ['jasmine', 'browserify'],
        plugins: [ 'karma-jasmine', 'karma-chrome-launcher', 'karma-babel-preprocessor', 'karma-browserify' ],
        preprocessors: { 
            '../src/js/app.js': ['browserify'],
            '../src/js/login/login-ctrl.js': ['browserify'],
            './unit/*.spec.js': ['browserify'] },
        files: [ 
            '../../node_modules/angular/angular.js',
            '../../node_modules/angular-mocks/angular-mocks.js',
            '../src/js/app.js',
            '../dist/js/partials/templates-all.js',
            '../src/js/login/login-ctrl.js',
            'unit/*.spec.js' ],
        browserify: {
            debug: true,
            transform: [ ['babelify'] ] 
        },
        singleRun: false,
        reporters: ['progress'],
        colors: true });
    };