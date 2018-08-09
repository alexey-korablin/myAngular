'use strict';

import sayHello from './src/hello';

describe('Hello', function () {

    it('says hello', () => {
        expect(sayHello()).toBe('Hello, world!');
    });
});