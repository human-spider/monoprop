import test from 'ava'
import { Prop } from "./dist/index.js"

test('Prop holds and returns value', t => {
  const prop = new Prop(0)
  t.is(prop.value, 0)
})

test('Prop provides methods to set value', t => {
  const prop = new Prop(0)
  prop.set(1)
  t.is(prop.value, 1)
  prop.next(2)
  t.is(prop.value, 2)
  prop.value = 3
  t.is(prop.value, 3)
})

test('Prop notifies subscribers when value is changed', t => {
  let notified = -1
  let prop = new Prop(0)
  prop.subscribe(x => {
    notified = x
  })
  t.is(notified, 0, 'subscriber was not notified of initial value')
  prop.value = 1
  t.is(notified, 1, 'subscriber was not notified of updated value')
})

test('pending Prop has undefined value and does not notify subscribers until initialized', t => {
  let notified = -1
  const prop = Prop.pending()
  prop.subscribe(x => {
    notified = x
  })
  t.is(prop.value, undefined)
  t.is(notified, -1, 'subscriber was notified of initial value on pending Prop')
  prop.value = 1
  t.is(notified, 1, 'subscriber was not notified of updated value on pending Prop')
})

test('subscribe() call returns unsubscribe function', t => {
  let notified = -1
  let prop = new Prop(0)
  let unsub = prop.subscribe(x => {
    notified = x
  })
  t.is(notified, 0)
  unsub()
  prop.value = 1
  t.is(notified, 0, 'subscriber was notified after unsubscribing')
  t.is(Object.keys(prop.callbacks).length, 0, 'callback was not cleared after unsubscribing')
})

test('ended Prop does not notify subscribers', t => {
  let notified = -1
  const prop = new Prop(0)
  prop.subscribe(x => {
    notified = x
  })
  t.is(notified, 0)
  prop.end()
  prop.value = 1
  t.is(notified, 0)
  t.is(prop.value, 1, 'subscriber was notified after prop ended')
})

test('ended Prop', t => {
  let ended = false
  const prop = new Prop(0)
  prop.onEnd(() => { ended = true })
  t.false(prop.isEnded)
  prop.end()
  t.true(ended, 'end callback was not called')
  t.true(prop.isEnded, 'isEnded property was not updated')
  t.is(Object.keys(prop.callbacks).length, 0)
  t.is(prop.endCallbacks.length, 0)
})

test('filtering props', t => {
  let notified = -1
  const prop = new Prop(0)
  prop.filter(x => x % 2 === 0)
    .subscribe(x => { notified = x })
  prop.value = 1
  t.is(notified, 0, 'subscriber was notified of filtered value');
  prop.value = 2
  t.is(notified, 2);
  prop.value = 3
  t.is(notified, 2, 'subscriber was notified of filtered value');
  prop.value = 8
  t.is(notified, 8);
})

test('unique prop values', t => {
  let notifiedTimes = 0
  const prop = Prop.pending()
  const uniq = prop.uniq()
  uniq.subscribe(_ => { notifiedTimes++ })
  prop.value = 1
  t.is(notifiedTimes, 1);
  prop.value = 1
  t.is(notifiedTimes, 1, 'subscriber was notified of repeated value');
  prop.value = 2
  t.is(notifiedTimes, 2);
  uniq.end();
  t.is(Object.keys(prop.callbacks).length, 0, 'callback was not cleared after uniq ended')
})

test('mapping props', t => {
  let notified = -1
  const prop = new Prop(0)
  const mapped = prop.map(x => x*x)
  mapped.subscribe(x => { notified = x })
  prop.value = 1
  t.is(notified, 1);
  prop.value = 2
  t.is(notified, 4);
  prop.value = 3
  t.is(notified, 9);
  mapped.end();
  t.is(Object.keys(prop.callbacks).length, 0, 'callback was not cleared after mapped ended')
})

test('mapping unique prop values', t => {
  let notifiedTimes = 0, notified = -1
  const prop = Prop.pending()
  const mapped = prop.mapUniq(x => x*x)
  mapped.subscribe(x => { notified = x; notifiedTimes++ })
  prop.value = 1
  t.is(notifiedTimes, 1);
  prop.value = 1
  t.is(notifiedTimes, 1, 'subscriber was notified of repeated value');
  prop.value = 2
  t.is(notifiedTimes, 2);
  t.is(notified, 4);
  mapped.end();
  t.is(Object.keys(prop.callbacks).length, 0, 'callback was not cleared after mapped ended')
})

test('merging prop into another prop', t => {
  let notified = -1
  const prop = new Prop(0)
  prop.subscribe(x => { notified = x })
  const merged = new Prop(1)
  prop.merge(merged);
  t.is(notified, 1);
  prop.value = 2
  t.is(notified, 2);
  merged.value = 3
  t.is(notified, 3, 'subscriber was not notified of merged value');
})

test('prop with error', t => {
  let notified = -1
  let error
  const prop = new Prop(0)
  prop.subscribe(x => { notified = x })
  prop.error.subscribe(x => { error = x })
  t.is(error, undefined, 'subscriber was notified of initial error value')
  prop.error.value = new Error()
  t.true(error instanceof Error, 'error subscriber was not notified');
  prop.value = 1
  t.is(error, null, 'error was not cleared when new value was pushed')
})

test('update object using update method', t => {
  let notified = {}
  const prop = new Prop({ badger: 'badger' })
  prop.subscribe(x => { notified = x })
  prop.update(x => {
    x.badger = 'mushroom'
  })
  t.is(notified.badger, 'mushroom', 'prop was not updated via update method')
})

test('update object using tap method', t => {
  let notified = {}
  const prop = new Prop({ badger: 'badger' })
  prop.subscribe(x => { notified = x })
  prop.value.badger = 'mushroom'
  prop.tap()
  t.is(notified.badger, 'mushroom', 'prop was not updated via tap method')
})