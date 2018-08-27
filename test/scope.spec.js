'use strict';

const _ = require('lodash');
const Scope = require('../src/scope');

describe('Scope', function () {

    it('can be cinstructed and used as an object', () => {
        const scope = new Scope();
        scope.aProperty = 1;

        expect(scope.aProperty).toBe(1);
    });

    describe('digest', () => {

        let scope;

        beforeEach(() => {
            scope = new Scope();
        });

        it('calls the listener function of a watch on first $digest', () => {
            const watchFn = () => 'wat';
            const listenerFn = jasmine.createSpy();
            scope.$watch(watchFn, listenerFn);

            scope.$digest();

            expect(listenerFn).toHaveBeenCalled();
        });

        it('calls the watch function with the scope as the argument', () => {
            const watchFn = jasmine.createSpy();
            const listenerFn = () => {};
            scope.$watch(watchFn, listenerFn);

            scope.$digest();

            expect(watchFn).toHaveBeenCalledWith(scope);
        });

        it('call the listener function when the watched value changes', () => {
            scope.someValue = 'a';
            scope.counter = 0;

            scope.$watch((scope) => scope.someValue, (newValue, oldValue, scope) =>  scope.counter++);

            expect(scope.counter).toBe(0);

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.someValue = 'b';
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('calls listener when watch value is first undefined', () => {
            scope.counter = 0;

            scope.$watch((scope) => scope.someValue, (newValue, oldValue, scope) => scope.counter++);
            scope.$digest();

            expect(scope.counter).toBe(1);
        });

        it('calls listener with new value as old value the first time', () => {
            scope.someValue = 123;
            let oldValueGiven;

            scope.$watch((scope) => scope.someValue, (newValue, oldValue, scope) => oldValueGiven = oldValue);

            scope.$digest();
            expect(oldValueGiven).toBe(123);
        });

        it('may have watchers that omit the listener function', () => {
            const watchFn = jasmine.createSpy().and.returnValue('something');
            scope.$watch(watchFn);

            scope.$digest();

            expect(watchFn).toHaveBeenCalled();
        });

        it('triggers chained watchers in the same digest', () => {
            scope.name = 'Jane';

            scope.$watch(
                (scope) => scope.nameUpper,
                (newValue, oldValue, scope) => {
                    if (newValue) {
                        scope.initial = newValue.substring(0, 1) + '.';
                    }
                }
            );
            scope.$watch(
                (scope) => scope.name,
                (newValue, oldValue, scope) => {
                    if (newValue) {
                        scope.nameUpper = newValue.toUpperCase();
                    }
                }
            );

            scope.$digest();
            expect(scope.initial).toBe('J.');

            scope.name = 'Bob';
            scope.$digest();
            expect(scope.initial).toBe('B.');
        });

        it('gives up on the watches after 10 iterations', () => {
            scope.counterA = 0;
            scope.counterB = 0;

            scope.$watch(
                (scope) => scope.counterB,
                (newValue, oldValue, scope) => {
                    scope.counterA++;
                }
            );
            scope.$watch(
                (scope) => scope.counterA,
                (newValue, oldValue, scope) => {
                    scope.counterB++;
                }
            );

            expect(() => scope.$digest()).toThrow();
        });

        it('ends the digest when the last watch is clean', () => {
            scope.array = new Array(100).fill(1);
            let watchExecutions = 0;

            scope.array.forEach((item, i) => {
                scope.$watch((scope) => {
                    watchExecutions++;
                    return scope.array[i];
                }, (newValue, oldValue, scope) => {});
            });

            scope.$digest();
            expect(watchExecutions).toBe(200);

            scope.array[0] = 420;
            scope.$digest();
            expect(watchExecutions).toBe(301);
        });

        it('does not end digest so that new watchers are not run', () => {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                (scope) => scope.aValue,
                (newValue, oldValue, scope) => {
                    scope.$watch(
                        scope => scope.aValue,
                        (newValue, oldValue, scope) => scope.counter++
                    );
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('compares based on value if enabled', () => {
            scope.aValue = [1, 2, 3];
            scope.counter = 0;

            scope.$watch(
                (scope) => scope.aValue,
                (newValue, oldValue, scope) => scope.counter++,
                true
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.aValue.push(4);
            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('correctly handles NaNs', () => {
            scope.number = 0 / 0;
            scope.counter = 0;

            scope.$watch(
                (scope) => scope.number,
                (newValue, oldValue, scope) => scope.counter++
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('executes $eval\'ed function and returns result', () => {
            scope.aValue = 42;

            const result = scope.$eval((scope) => scope.aValue);

            expect(result).toBe(42);
        });

        it('passes the second $eval argument straight through', () => {
            scope.aValue = 42;

            const result = scope.$eval((scope, val) => scope.aValue + val, 2);

            expect(result).toBe(44);
        });

        it('executes $apply\'ed fuction and starts the digest', () => {
            scope.aValue = 'someValue';
            scope.counter = 0;

            scope.$watch(
                (scope) => scope.aValue,
                (newValue, oldValue, scope) => scope.counter++
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$apply((scope) => scope.aValue = 'someOtherValue');
            expect(scope.counter).toBe(2);
        });

        it('executes $evalAsync\'ed funciton later in the same digest', () => {
            scope.aValue = [1, 2, 3];
            scope.asyncEvaluated = false;
            scope.asyncEvaluatedImmediatelly = false;

            scope.$watch(
                (scope) => scope.aValue,
                (newValue, oldValue, scope) => {
                    scope.$evalAsync((scope) => scope.asyncEvaluated = true);
                    scope.asyncEvaluatedImmediatelly = scope.asyncEvaluated;
                }
            );

            scope.$digest();
            expect(scope.asyncEvaluated).toBe(true);
            expect(scope.asyncEvaluatedImmediatelly).toBe(false);
        });

        it('executes $evalAsync\'ed functions added by watch functions', () => {
            scope.aValue = [1, 2, 3];
            scope.asyncEvaluated = false;

            scope.$watch(
                (scope) => {
                    if (!scope.asyncEvaluated) {
                        scope.$evalAsync((scope) => scope.asyncEvaluated = true);
                    }
                    return scope.aValue;
                },
                (newValue, oldValue, scope) => {}
            );

            scope.$digest();
            expect(scope.asyncEvaluated).toBe(true);
        });

        it('executes $evalAsync\'ed functions even when not dirty', () => {
            scope.aValue = [1, 2, 3];
            scope.asyncEvaluatedTimes = 0;

            scope.$watch(
                (scope) => {
                    if (scope.asyncEvaluatedTimes < 2) {
                        scope.$evalAsync((scope) => scope.asyncEvaluatedTimes++);
                    }
                    return scope.aValue;
                },
                (newValue, oldValue, scope) => {}
            );

            scope.$digest();
            expect(scope.asyncEvaluatedTimes).toBe(2);
        });

        it('eventyally halts $evalAsyncs added by watches', () => {
            scope.aValue = [1, 2, 3];
            
            scope.$watch(
                (scope) => {
                    scope.$evalAsync((scope) => {});
                    return scope.aValue;
                },
                (newValue, oldValue, scope) => {}
            );

            expect(() => scope.$digest()).toThrow();
        });

        it('has a $$phase field whose value is the current digest phase', () => {
            scope.aValue = [1, 2, 3];
            scope.phaseInWatchFunction = undefined;
            scope.phaseInListenerFunction = undefined;
            scope.phaseInApplyFunction = undefined;

            scope.$watch(
                (scope) => {
                    scope.phaseInWatchFunction = scope.$$phase;
                    return scope.aValue;
                },
                (newValue, oldValue, scope) => scope.phaseInListenerFunction = scope.$$phase
            );

            scope.$apply((scope) => scope.phaseInApplyFunction = scope.$$phase);

            expect(scope.phaseInWatchFunction).toBe('$digest');
            expect(scope.phaseInListenerFunction).toBe('$digest');
            expect(scope.phaseInApplyFunction).toBe('$apply');
        });

        it('schedules digest in $evalAsync', (done) => {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                (scope) => scope.aValue,
                (newValue, oldValue, scope) => scope.counter++
            );

            scope.$evalAsync((scope) => {});

            expect(scope.counter).toBe(0);
            setTimeout(() => {
                expect(scope.counter).toBe(1);
                done();
            }, 50);
        });

        it('allows async $apply with $applyAsync', (done) => {
            scope.counter = 0;

            scope.$watch(
                (scope) => scope.aValue,
                (newValue, oldValue, scope) => scope.counter++
            );

            scope.$digest();

            expect(scope.counter).toBe(1);

            scope.$applyAsync((scope) => scope.aValue = 'abc');
            expect(scope.counter).toBe(1);

            setTimeout(() => {
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        });

        it('never executes $applyAsync\'ed function in the same cycle', (done) => {
            scope.aValue = [1, 2, 3];
            scope.asyncApplied = false;

            scope.$watch(
                (scope) => scope.aValue,
                (newValue, oldValue, scope) => {
                    scope.$applyAsync((scope) => scope.asyncApplied = true);
                }
            );

            scope.$digest();
            expect(scope.asyncApplied).toBe(false);
            setTimeout(() => {
                expect(scope.asyncApplied).toBe(true);
                done();
            }, 50);
        });

        it('coalesce many calls $applyAsync', (done) => {
            scope.counter = 0;

            scope.$watch(
                (scope) => {
                    scope.counter++;
                    return scope.aValue;
                },
                (newValue, oldValue, scope) => {}
            );

            scope.$applyAsync((scope) => scope.aValue = 'abc');
            scope.$applyAsync((scope) => scope.aValue = 'def');
            setTimeout(() => {
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        });

        it('cancels and flushes $applyAsync if dugested first', (done) => {
            scope.counter = 0;

            scope.$watch(
                (scope) => {
                    scope.counter++;
                    return scope.aValue;
                },
                (newValue, oldValue, scope) => {}
            );

            scope.$applyAsync((scope) => scope.aValue = 'abc');
            scope.$applyAsync((scope) => scope.aValue = 'def');
            
            scope.$digest();
            expect(scope.counter).toBe(2);
            expect(scope.aValue).toBe('def');

            setTimeout(() => {
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        });

        it('runs a $$postDigest function after each digest', () => {
            scope.counter = 0;

            scope.$$postDigest(() => scope.counter++);

            expect(scope.counter).toBe(0);

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('does not include $$postDigest in the digest',  () => {
            scope.aValue = 'original value';

            scope.$$postDigest(() => scope.aValue = 'changed value');
            scope.$watch(
                (scope) => scope.aValue,
                (newValue, oldValue, scope) => scope.watchedValue = newValue
            );

            scope.$digest();
            expect(scope.watchedValue).toBe('original value');

            scope.$digest();
            expect(scope.watchedValue).toBe('changed value');
        });

        it('catches exception in the watch functions and continues', () => {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                (scope) => { throw 'Error'; },
                (newValue, oldValue, scope) => {}
            );
            scope.$watch(
                (scope) => scope.aValue,
                (newValue, oldValue, scope) => scope.counter++
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('catches exception in the listener functions and continues', () => {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                (scope) => scope.aValue,
                (newValue, oldValue, scope) => { throw 'Error'; }
            );
            scope.$watch(
                (scope) => scope.aValue,
                (newValue, oldValue, scope) => scope.counter++
            );

            scope.$digest();
            expect(scope.counter).toBe(1); 
        });

        it('catches exceptions in $evalAsync', (done) => {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                (scope) => scope.aValue,
                (newValue, oldValue, scope) => scope.counter++
            );
            scope.$evalAsync((scope) => { throw 'Error'; });

            setTimeout(() => {
                expect(scope.counter).toBe(1);
                done();
            }, 50);
        });

        it('catches exceptions in $applyAsync', (done) => {
            scope.$applyAsync((scope) => { throw 'Error'; });
            scope.$applyAsync((scope) => { throw 'Error'; });
            scope.$applyAsync((scope) => scope.applied = true);

            setTimeout(() => {
                expect(scope.applied).toBe(true);
                done();
            }, 50);
        });

        it('catches exceptions in $$postDigest', () => {
            let didRun = false;

            scope.$$postDigest(() => { throw 'Error'; });
            scope.$$postDigest(() => didRun = true);

            scope.$digest();
            expect(didRun).toBe(true);
        });

        it('allows detroying a $watch  with a removal function', () => {
            scope.aValue = 'abc';
            scope.counter = 0;

            const destroyWatch = scope.$watch(
                (scope) => scope.aValue,
                (newValue, oldValue, scope) => scope.counter++
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.aValue = 'def';
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.aValue = 'ghi';
            destroyWatch();
            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('allows destroying a $watch during digest', () => {
            scope.aValue = 'abc';

            const expectedResult = ['first', 'second', 'third', 'first', 'third'];

            let watchCalls = [];

            scope.$watch(
                (scope) => {
                    watchCalls.push('first');
                    return scope.aValue;
                }
            );

            const destroyWatch = scope.$watch(
                (scope) => {
                    watchCalls.push('second');
                    destroyWatch();
                }  
            );

            scope.$watch(
                (scope) => {
                    watchCalls.push('third');
                    return scope.aValue;
                }
            );

            scope.$digest();
            expect(watchCalls).toEqual(expectedResult);
        });

        it('allows a $watch to destroy another during digest', () => {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                (scope) => scope.aValue,
                (newValue, oldValue, scope) => destroyWatch()
            );

            var destroyWatch = scope.$watch(
                (scope) => {},
                (newValue, oldValue, scope) => {}
            );

            scope.$watch(
                (scope) => scope.aValue,
                (newValue, oldValue, scope) => scope.counter++
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('allows destroying several $watches during digest', () => {
            scope.aValue = 'abc';
            scope.counter = 0;

            
            const destroyWatch1 = scope.$watch(
                (scope) => {
                    destroyWatch1();
                    destroyWatch2();
                }
            ); 
            
            var destroyWatch2 = scope.$watch(
                (scope) => scope.aValue,
                (newValue, oldValue, scope) => scope.counter++
            );
            scope.$digest();
            expect(scope.counter).toBe(0);
        });
    });

    describe('watchGroup', () => {
        let scope;

        beforeEach(() => {
            scope = new Scope();
        });

        it('takes watchers as an array and calls listener with arrays', () => {
            let gotNewValues;
            let gotOldValues;
            const expectedResult = [1, 2];

            scope.aValue = 1;
            scope.anotherValue = 2;

            scope.$watchGroup(
                [
                    (scope) => scope.aValue,
                    (scope) => scope.anotherValue
                ], 
                (newValues, oldValues, scope) => {
                    gotNewValues = newValues;
                    gotOldValues = oldValues;
                }
            );

            scope.$digest();
            expect(gotNewValues).toEqual(expectedResult);
            expect(gotOldValues).toEqual(expectedResult);
        });

        it('only calls listener once per digest', () => {
            let counter = 0;

            scope.aValue = 1;
            scope.anotherValue = 2;

            scope.$watchGroup([
                    (scope) => scope.aValue,
                    (scope) => scope.anotherValue
                ],
                (newValues, oldValues, scope) => counter++
            );

            scope.$digest();
            expect(counter).toBe(1);
        });

        it('uses the same array of old and new values on first run', () => {
            let gotNewValues;
            let gotOldValues;

            scope.aValue = 1;
            scope.anotherValue = 2;

            scope.$watchGroup(
                [
                    (scope) => scope.aValue,
                    (scope) => scope.anotherValue
                ],
                (newValues, oldValues, scope) => {
                    gotNewValues = newValues;
                    gotOldValues = oldValues;
                }
            );

            scope.$digest();
            expect(gotNewValues).toBe(gotOldValues);
        });

        it('uses different arrays for old and new values on subsequent runs', () => {
            let gotNewValues;
            let gotOldValues;

            scope.aValue = 1;
            scope.anotherValue = 2;

            scope.$watchGroup(
                [
                    (scope) => scope.aValue,
                    (scope) => scope.anotherValue
                ],
                (newValues, oldValues, scope) => {
                    gotNewValues = newValues;
                    gotOldValues = oldValues;
                }
            );

            scope.$digest();
            expect(gotNewValues).toBe(gotOldValues);

            scope.anotherValue = 3;
            scope.$digest();
            expect(gotNewValues).toEqual([1, 3]);
            expect(gotOldValues).toEqual([1, 2]);
        });

        it('calls the listener once when the watch array is empty', () => {
            let gotNewValues;
            let gotOldValues;

            scope.$watchGroup(
                [],
                (newValues, oldValues, scope) => {
                    gotNewValues = newValues;
                    gotOldValues = oldValues;
                }
            );

            scope.$digest();
            expect(gotNewValues).toEqual([]);
            expect(gotOldValues).toEqual([]);
        });
    });
});