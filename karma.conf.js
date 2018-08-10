"use strict";
module.exports = (config) => {
    config.set({
        frameworks: ['jasmine', 'browserify'],
        files: [
            'src/**/*.js',
            'test/**/*.spec.js'
        ],
        preprocessors: {
            'src/**/*.js': ['jshint', 'browserify'], //'babel', 
            'test/**/*.spec.js': ['jshint', 'browserify'] //'babel', 
        },
        browsers: ['ChromeNoSandboxHeadless'],
        customLaunchers: {
            ChromeNoSandboxHeadless: {
              base: 'Chrome',
              flags: [
                '--no-sandbox',
                '--headless',
                '--disable-gpu',
                ' --remote-debugging-port=9222'
              ]
            }
        },
        browserify: {
            debug: true,
            transform: [['babelify', {presets: ['es2015']} ]]
        },
        colors: true,
        jshintPreprocessor: {
            jshintrc: './.jshintrc'
          },
        // babelPreprocessor: {
        //     options: {
        //       presets: ['es2015', 'env'],
        //       plugins: ['transform-class-properties'],
        //       sourceMap: 'inline'
        //     },
        //     filename: function (file) {
        //       return file.originalPath.replace(/\.js$/, '.es5.js');
        //     },
        //     sourceFileName: function (file) {
        //       return file.originalPath;
        //     }
        // },
        logLevel: config.LOG_INFO,
        // logLevel: config.LOG_DEBUG,
        // singleRun: true,
        concurrency: Infinity
    });
};