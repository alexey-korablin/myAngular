module.exports = (config) => {
    config.set({
        frameworks: ['jasmine'],
        files: [
            'src/**/*.js',
            'test/**/*.spec.js'
        ],
        preprocessors: {
            'src/**/*.js': ['jshint', 'babel'],
            'test/**/*.spec.js': ['jshint', 'babel']
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
        babelPreprocessor: {
            options: {
              presets: ['es2015'],
            //   plugins: ['transform-class-properties'],
              sourceMap: 'inline'
            },
            filename: function (file) {
              return file.originalPath.replace(/\.js$/, '.es5.js');
            },
            sourceFileName: function (file) {
              return file.originalPath;
            }
        },
        logLevel: config.LOG_INFO,
        concurrency: Infinity
    })
}