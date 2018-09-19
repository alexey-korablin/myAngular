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

        it('allows destroying a $watch  with a removal function', () => {
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

        it('can be derigistered', () => {
            let counter = 0;
            scope.aValue = 1;
            scope.anotherValue = 2;

            const destroyGroup = scope.$watchGroup(
                [
                    (scope) => scope.aValue,
                    (scope) => scope.anotherValue
                ],
                (newValues, oldValues, scope) => counter++
            );

            scope.$digest();

            scope.anotherValue = 3;
            destroyGroup();
            scope.$digest();

            expect(counter).toBe(1);
        });

        it('does not call the zero-watch listener when derigistered first', () => {
            let counter = 0;

            const destroyGroup = scope.$watchGroup([], (newValues, oldValues, scope) => counter++);

            destroyGroup();
            scope.$digest();

            expect(counter).toBe(0);
        });
    });
    describe('inheritance', () => {

        it('iherits the parent\'s properties', () => {
            const parent = new Scope();
            let child;
            const expectedResult = [1, 2, 3];

            parent.aValue = [1, 2, 3];
            child = parent.$new();

            expect(child.aValue).toEqual(expectedResult);
        });

        it('does not cause a parent inherit its properties', () => {
            const parent = new Scope();
            let child;

            child = parent.$new();
            child.aValue = [1, 2, 3];

            expect(parent.aValue).toBeUndefined();
        });

        it('inherits the parent\'s properties whenever they are defined', () => {
            const parent = new Scope();
            const child = parent.$new();
            const expectedResult = [1, 2, 3];

            parent.aValue = [1, 2, 3];

            expect(child.aValue).toEqual(expectedResult);
        });

        it('can manipulate parent scope\'s properties', () => {
            const parent = new Scope();
            const child = parent.$new();
            const expectedResult = [1, 2, 3, 4];

            parent.aValue = [1, 2, 3];
            child.aValue.push(4);

            expect(parent.aValue).toEqual(expectedResult);
            expect(child.aValue).toEqual(expectedResult);
        });

        it('can watch a property in the parent', () => {
            const parent = new Scope();
            const child = parent.$new();

            parent.aValue = [1, 2, 3];
            child.counter = 0;

            child.$watch(
                (scope) => scope.aValue,
                (newValue, oldValue, scope) => scope.counter++,
                true
            );

            child.$digest();
            expect(child.counter).toBe(1);

            parent.aValue.push(4);
            child.$digest();
            expect(child.counter).toBe(2);
        });

        it('can be nested at any depth', () => {
            const a = new Scope();
            const aa = a.$new();
            const aaa = aa.$new();
            const aab = aa.$new();
            const ab = a.$new();
            const abb = ab.$new();

            a.aValue = 1;
            expect(aa.aValue).toBe(1);
            expect(aaa.aValue).toBe(1);
            expect(aab.aValue).toBe(1);
            expect(ab.aValue).toBe(1);
            expect(abb.aValue).toBe(1);

            ab.anotherValue = 2;
            expect(abb.anotherValue).toBe(2);
            expect(aa.anotherValue).toBeUndefined();
            expect(aaa.anotherValue).toBeUndefined();
        });

        it('shadows a parent\'s property with the same name', () => {
            const parent = new Scope();
            const child = parent.$new();

            parent.name = 'Joe';
            child.name = 'Jill';

            expect(child.name).toBe('Jill');
            expect(parent.name).toBe('Joe');
        });

        it('does not shadow members of parent scope\'s attributes', () => {
            const parent = new Scope();
            const child = parent.$new();

            parent.user = { name: 'Joe' };
            child.user.name = 'Jill';

            expect(child.user.name).toBe('Jill');
            expect(parent.user.name).toBe('Jill');
        });

        it('does not digest its parent(s)', () => {
            const parent = new Scope();
            const child = parent.$new();

            parent.aValue = 'abc';

            parent.$watch(
                (scope) => scope.aValue,
                (newValue, oldValue, scope) => scope.aValueWas = newValue
            );

            child.$digest();
            expect(child.aValueWas).toBeUndefined();
        });

        it('keeps a record of its children', () => {
            const parent = new Scope();
            const child1 = parent.$new();
            const child2 = parent.$new();
            const child2_1 = child2.$new();

            expect(parent.$$children.length).toBe(2);
            expect(parent.$$children[0]).toBe(child1);
            expect(parent.$$children[1]).toBe(child2);

            expect(child1.$$children.length).toBe(0);
            expect(child2.$$children.length).toBe(1);
            expect(child2.$$children[0]).toBe(child2_1);
        });

        it('digest its children', () => {
            const parent = new Scope();
            const child = parent.$new();

            parent.aValue = 'abc';
            child.$watch(
                (scope) => scope.aValue,
                (newValue, oldValue, scope) => scope.aValueWas = newValue
            );

            parent.$digest();
            expect(child.aValueWas).toBe('abc');
        });

        it('digests from root on $apply', () => {
            const parent = new Scope();
            const child = parent.$new();
            const child2 = child.$new();

            parent.aValue = 'abc';
            parent.counter = 0;
            parent.$watch(
                (scope) => scope.aValue,
                (newValue, oldValue, scope) => scope.counter++
            );

            child2.$apply((scope) => {});
            expect(parent.counter).toBe(1);
        });

        it('schedules a digest from root on $evalAsync', (done) => {
            const parent = new Scope();
            const child = parent.$new();
            const child2 = child.$new();

            parent.aValue = 'abc';
            parent.counter = 0;
            parent.$watch(
                (scope) => scope.aValue,
                (newValue, oldValue, scope) => scope.counter++
            );

            child2.$evalAsync((scope) => {});
            setTimeout(() => {
                expect(parent.counter).toBe(1);
                done();
            }, 50);
        });

        it('does not have access to parent attributes when isolated', () => {
            const parent = new Scope();
            const child = parent.$new(true);

            parent.aValue = 'abc';

            expect(child.aValue).toBeUndefined();
        });

        it('cannot watch parent attributes when isolated', () => {
            const parent = new Scope();
            const child = parent.$new(true);

            parent.aValue = 'abc';
            child.$watch(
                (scope) => scope.aValue,
                (newValue, oldValue, scope) => scope.aValueWas = newValue
            );

            child.$digest();
            expect(child.aValueWas).toBeUndefined();
        });

        it('digest its isolated children', () => {
            const parent = new Scope();
            const child = parent.$new(true);

            child.aValue = 'abc';
            child.$watch(
                (scope) => scope.aValue,
                (newValue, oldValue, scope) => scope.aValueWas = newValue
            );

            parent.$digest();
            expect(child.aValueWas).toBe('abc');
        });

        it('digests from root on $apply when isolated', () => {
            const parent = new Scope();
            const child = parent.$new(true);
            const child2 = child.$new();

            parent.aValue = 'abc';
            parent.counter = 0;
            parent.$watch(
                scope => scope.aValue,
                (newValue, oldValue, scope) => scope.counter++
            );

            child2.$apply((scope) => {});

            expect(parent.counter).toBe(1);
        });

        it('schedules a digest from root on $evalAsync when isolated', (done) => {
            const parent = new Scope();
            const child = parent.$new(true);
            const child2 = child.$new();

            parent.aValue = 'abc';
            parent.counter = 0;
            parent.$watch(
                scope => scope.aValue,
                (newValue, oldValue, scope) => scope.counter++
            );

            child2.$evalAsync((scope) => {});
            setTimeout(() => {
                expect(parent.counter).toBe(1);
                done();
            }, 50);
        });

        it('executes $evalAsync functions on isolated scopes', (done) => {
            const parent = new Scope();
            const child = parent.$new(true);

            child.$evalAsync((scope) => scope.didEvalAsync = true);
            setTimeout(() => {
                expect(child.didEvalAsync).toBe(true);
                done();
            }, 50);
        });

        it('executes $$postDigest functions on isolated scopes', () => {
            const parent = new Scope();
            const child = parent.$new(true);

            child.$$postDigest(() => child.didPostDigest = true);
            parent.$digest();

            expect(child.didPostDigest).toBe(true);
        });

        it('cab take some other scope as the parent', () => {
            const prototypeParent = new Scope();
            const hierarchyParent = new Scope();
            const child = prototypeParent.$new(false, hierarchyParent);

            prototypeParent.a = 42;
            expect(child.a).toBe(42);

            child.counter = 0;
            child.$watch(scope => { scope.counter++; });

            prototypeParent.$digest();
            expect(child.counter).toBe(0);

            hierarchyParent.$digest();
            expect(child.counter).toBe(2);
        });

        it('is no longer digested when $destroy has been called', () => {
            const parent = new Scope();
            const child = parent.$new();

            child.aValue = [1, 2, 3];
            child.counter = 0;
            child.$watch(
                scope => scope.aValue,
                (newValue, oldValue, scope) => scope.counter++,
                true
            );

            parent.$digest();
            expect(child.counter).toBe(1);

            child.aValue.push(4);
            parent.$digest();
            expect(child.counter).toBe(2);

            child.$destroy();
            child.aValue.push(5);
            parent.$digest();
            expect(child.counter).toBe(2);
        });
    });
    describe('$watchCollection', () => {
        let scope;

        beforeEach(() => {
            scope = new Scope();
        });

        it('works like a normal watch for non-collections', () => {
            let valueProvided;
            scope.aValue = 42;
            scope.counter = 0;

            scope.$watchCollection(
                (scope) => scope.aValue,
                (newValue, oldValue, scope) => {
                    valueProvided = newValue;
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
            expect(valueProvided).toBe(42);

            scope.aValue = 43;
            scope.$digest();
            expect(scope.counter).toBe(2);
            expect(valueProvided).toBe(43);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('works like a normal watch for NaNs', () => {
            scope.aValue = 0 / 0;
            scope.counter = 0;

            scope.$watchCollection(
                scope => scope.aValue,
                (newValue, oldValue, scope) => scope.counter++
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('notices when the value becomes an array', () => {
            scope.counter = 0;

            scope.$watchCollection(
                scope => scope.arr,
                (newValue, oldValue, scope) => scope.counter++
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.arr = [1, 2, 3];
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('notices an item added to an array', () => {
            scope.arr = [1, 2, 3];
            scope.counter = 0;

            scope.$watchCollection(
                scope => scope.arr,
                (newValue, oldValue, scope) => scope.counter++
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.arr.push(4);
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('notices an item remowed from an array', () => {
            scope.arr = [1, 2, 3];
            scope.counter = 0;

            scope.$watchCollection(
                scope => scope.arr,
                (newValue, oldValue, scope) => scope.counter++
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.arr.shift();
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('notices an item replaced in an array', () => {
            scope.arr = [1, 2, 3];
            scope.counter = 0;

            scope.$watchCollection(
                scope => scope.arr,
                (newValue, oldValue, scope) => scope.counter++
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.arr[1] = 42;
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('notices an item reordered in an array', () => {
            scope.arr = [2, 1, 3];
            scope.counter = 0;

            scope.$watchCollection(
                scope => scope.arr,
                (newValue, oldValue, scope) => scope.counter++
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.arr.sort();
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('does not fail on NaNs in arrays', () => {
            scope.arr = [1, NaN, 3];
            scope.counter = 0;

            scope.$watchCollection(
                scope => scope.arr,
                (newValue, oldValue, scope) => scope.counter++
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });
        
        it('notices an item replaced in an arguments object', () => {
            (function () {
                scope.arrayLike = arguments;
            })(1, 2, 3);
            scope.counter = 0;

            scope.$watchCollection(
                scope => scope.arrayLike,
                (newValue, oldValue, scope) => scope.counter++
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.arrayLike[1] = 42;
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('notices an item replacedin a NodeList object', () => {
            document.documentElement.appendChild(document.createElement('div'));
            scope.arrayLike = document.querySelectorAll('div');
            scope.counter = 0;

            scope.$watchCollection(
                scope => scope.arrayLike,
                (newValue, oldValue, scope) => scope.counter++
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            document.documentElement.appendChild(document.createElement('div'));
            scope.arrayLike = document.querySelectorAll('div');
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('notices when the value becomes an object', () => {
            scope.counter = 0;

            scope.$watchCollection(
                scope => scope.obj,
                (newValue, oldValue, scope) => scope.counter++
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.obj = { a: 1 };
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('notices when an attribute is added to an object', () => {
            scope.obj = { a: 1 };
            scope.counter = 0;

            scope.$watchCollection(
                scope => scope.obj,
                (newValue, oldValue, scope) => scope.counter++
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.obj.b = 2;
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('notices when an attribute is changed in an object', () => {
            scope.obj = { a: 1 };
            scope.counter = 0;

            scope.$watchCollection(
                scope => scope.obj,
                (newValue, oldValue, scope) => scope.counter++
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.obj.a = 2;
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('does not fail on NaN attributes in object', () => {
            scope.obj = { a: NaN };
            scope.counter = 0;

            scope.$watchCollection(
                scope => scope.obj,
                (newValue, oldValue, scope) => scope.counter++
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('notices when an attribute is removed from an object', () => {
            scope.obj = { a: 1 };
            scope.counter = 0;

            scope.$watchCollection(
                scope => scope.obj,
                (newValue, oldValue, scope) => scope.counter++
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            delete scope.obj.a;
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('does not consider any object with a length property an array', () => {
            scope.obj = { length: 42, otherKey: 'abc'};
            scope.counter = 0;

            scope.$watchCollection(
                scope => scope.obj,
                (newValue, oldValue, scope) => scope.counter++
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.obj.newKey = 'def';
            scope.$digest();
            expect(scope.counter).toBe(2);
        });
    });
    describe('Events', () => {
        let parent;
        let child;
        let scope;
        let isolatedChild;

        beforeEach(() => {
            parent = new Scope();
            scope = parent.$new();
            child = scope.$new();
            isolatedChild = scope.$new(true);
        });

        it('allows registering listeners', () => {
            const listener1 = () => {};
            const listener2 = () => {};
            const listener3 = () => {};

            scope.$on('someEvent', listener1);
            scope.$on('someEvent', listener2);
            scope.$on('someOtherEvent', listener3);

            expect(scope.$$listeners).toEqual({
                'someEvent': [listener1, listener2],
                'someOtherEvent': [listener3]
            });
        });

        it('register different listeners for every scope', () => {
            const listener1 = () => {};
            const listener2 = () => {};
            const listener3 = () => {};

            scope.$on('someEvent', listener1);
            child.$on('someEvent', listener2);
            isolatedChild.$on('someEvent', listener3);

            expect(scope.$$listeners).toEqual({'someEvent': [listener1]});
            expect(child.$$listeners).toEqual({'someEvent': [listener2]});
            expect(isolatedChild.$$listeners).toEqual({'someEvent': [listener3]});
        });

        _.forEach(['$emit', '$broadcast'], (method) => {
            it(`calls the listeners of the matching event on ${method}`, () => {
                const listener1 = jasmine.createSpy();
                const listener2 = jasmine.createSpy();
                
                scope.$on('someEvent', listener1);
                scope.$on('someOtherEvent', listener2);
    
                scope[method]('someEvent');
    
                expect(listener1).toHaveBeenCalled();
                expect(listener2).not.toHaveBeenCalled();
            });

            it(`passes an event object with a name to listeners on ${method}`, () => {
                const listener = jasmine.createSpy();

                scope.$on('someEvent', listener);

                scope[method]('someEvent');

                expect(listener).toHaveBeenCalled();
                expect(listener.calls.mostRecent().args[0].name).toBe('someEvent');
            });

            it(`passes the same event object to each listener on ${method}`, () => {
                const listener1 = jasmine.createSpy();
                const listener2 = jasmine.createSpy();

                scope.$on('someEvent', listener1);
                scope.$on('someEvent', listener2);

                scope[method]('someEvent');

                const event1 = listener1.calls.mostRecent().args[0];
                const event2 = listener2.calls.mostRecent().args[0];

                expect(event1).toBe(event2);
            });

            it(`passes additional arguments to listener on ${method}`, () => {
                const listener = jasmine.createSpy();

                scope.$on('someEvent', listener);

                scope[method]('someEvent', 'and', ['additional', 'arguments'], '...');

                expect(listener.calls.mostRecent().args[1]).toEqual('and');
                expect(listener.calls.mostRecent().args[2]).toEqual(['additional', 'arguments']);
                expect(listener.calls.mostRecent().args[3]).toEqual('...');
            });

            it(`return the event object on ${method}`, () => {
                const returnedEvent = scope[method]('someEvent');

                expect(returnedEvent).toBeDefined();
                expect(returnedEvent.name).toBe('someEvent');
            });
        });
    });
});