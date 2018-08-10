'use strict';

const sayHello = require( '../src/hello');

describe('Hello', function () {

    it('says hello',  () => {
        const name = 'Jane';
        const expectedResult = `Hello, ${name}!`;
        expect(sayHello(name)).toBe(expectedResult);
    });
});