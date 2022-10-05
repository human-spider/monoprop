import { PendingPropError, skipPending } from './../src/index';
import test from 'ava'
import { Prop, PropValue, filter, map, uniq, mapUniq } from "../src/index.js"

test('Prop returns last value as PropValue', t => {
  const prop = new Prop(0)
  t.is(prop.last.value, 0)
  t.is(prop.last.error, null)
})

test('PropValue has unwrap method', t => {
  t.plan(3)
  const prop = new Prop(0)
  t.is(prop.last.unwrap(), 0)
  const error = new Error()
  prop.setError(error)
  let lastError: Error
  try {
    prop.last.unwrap()
  } catch (e) {
    t.is(e, error)
  }
  prop.last.unwrap(e => { lastError = e })
  t.is(lastError!, error, 'onError callback was not called')
})

test('Prop provides methods to set value', t => {
  const prop = new Prop(0)
  prop.set(1)
  t.is(prop.last.value, 1)
  prop.next(2)
  t.is(prop.last.value, 2)
  prop.update(x => x + 1)
  t.is(prop.last.value, 3)
})

test('Prop provides methods to set error', t => {
  const prop = new Prop(0)
  const error = new Error()
  prop.setError(error)
  t.is(prop.last.value, 0, 'value was changed after calling setError')
  t.is(prop.last.error, error)
  const error2 = new Error()
  prop.update(_ => {
    throw error2
  })
  t.is(prop.last.value, 0, 'value was changed after calling setError')
  t.is(prop.last.error, error2)
})

test('Prop notifies subscribers when value is changed', t => {
  let notified: PropValue<number>
  let prop = new Prop(0)
  prop.subscribe(x => {
    notified = x
  })
  t.is(notified!.unwrap(), 0, 'subscriber was not notified of initial value')
  prop.set(1)
  t.is(notified!?.unwrap(), 1, 'subscriber was not notified of updated value')
})

test('subscribe with no initial notification', t => {
  let notified: PropValue<number> | undefined = undefined
  let prop = new Prop(0)
  prop.subscribe(x => {
    notified = x
  }, false)
  t.is(notified, undefined, 'subscriber was notified of initial value with immediate notification disabled')
  prop.set(1)
  t.is(notified!.unwrap(), 1, 'subscriber was not notified of updated value with immediate notification disabled')
})

test('pending Prop has undefined value and PendingPropError error', t => {
  let notified = -1
  let error
  const prop = Prop.pending<number>()
  prop.subscribe(x => {
    notified = x.value
    error = x.error
  })
  t.is(notified, undefined as any)
  t.true(error instanceof PendingPropError)
  prop.set(1)
  t.is(notified, 1)
  t.is(error, null)
})

test('skipPending method suppresses PendingPropError in subscribe callback', t => {
  let notified = -1
  let error
  const prop = Prop.pending<number>()
  prop.subscribe(skipPending(x => {
    notified = x.value
    error = x.error
  }))
  t.is(notified, -1)
  prop.set(1)
  t.is(notified, 1, 'subscriber was not notified of updated value')
  t.is(error, null, 'error was not set to null after updated value')
  prop.setError(new Error())
  t.true(error instanceof Error, 'subscriber was not notified of updated error')
})

test('subscribe() call returns unsubscribe function', t => {
  let notified = -1
  let prop = new Prop(0)
  let unsub = prop.subscribe(x => {
    notified = x.value
  })
  t.is(notified, 0)
  unsub()
  prop.set(1)
  t.is(notified, 0, 'subscriber was notified after unsubscribing')
  t.is(prop.subscriberCount, 0, 'callback was not cleared after unsubscribing')
})

test('ended Prop does not notify subscribers', t => {
  let notified = -1
  const prop = new Prop(0)
  prop.subscribe(x => {
    notified = x.value
  })
  t.is(notified, 0)
  prop.end()
  prop.set(1)
  t.is(notified, 0)
  t.is(prop.last.value, 1)
})

test('onEnd callback', t => {
  let ended = false
  const prop = new Prop(0)
  prop.onEnd(() => { ended = true })
  t.false(prop.ended)
  prop.end()
  t.true(ended, 'end callback was not called')
  t.true(prop.ended, 'isEnded property was not updated')
  t.is(prop.subscriberCount, 0)
})

test('filtering props', t => {
  let notified = -1
  const prop = new Prop(0)
  filter(prop, x => x.value % 2 === 0)
    .subscribe(x => { notified = x.value })
  prop.set(1)
  t.is(notified, 0, 'subscriber was notified of filtered value');
  prop.set(2)
  t.is(notified, 2);
  prop.set(3)
  t.is(notified, 2, 'subscriber was notified of filtered value');
  prop.set(8)
  t.is(notified, 8);
})

test('unique prop values', t => {
  let notifiedTimes = 0
  const prop = Prop.pending()
  const uniqProp = uniq(prop)
  uniqProp.subscribe(_ => { notifiedTimes++ })
  t.is(notifiedTimes, 1, 'subscriber was not notified of pending value');
  prop.set(1)
  t.is(notifiedTimes, 2, 'subscriber was not notified of first unique value');
  prop.set(1)
  t.is(notifiedTimes, 2, 'subscriber was notified of repeated value');
  prop.set(2)
  t.is(notifiedTimes, 3, 'subscriber was not notified of second unique value');
  uniqProp.end();
  t.is(prop.subscriberCount, 0, 'callback was not cleared after unsubscribing')
})

test('mapping props', t => {
  let notified = -1
  const prop = new Prop(0)
  const mapped = map(prop, x => Math.pow(x.value, 2))
  mapped.subscribe(x => { notified = x.value })
  prop.set(1)
  t.is(notified, 1);
  prop.set(2)
  t.is(notified, 4);
  prop.set(3)
  t.is(notified, 9);
  mapped.end();
  t.is(prop.subscriberCount, 0)
})

test('mapping unique prop values', t => {
  let notifiedTimes = 0, notified = -1
  const prop = Prop.pending<number>()
  const mapped = mapUniq(prop, x => Math.pow(x.value, 2))
  mapped.subscribe(x => { notified = x.value; notifiedTimes++ })
  t.is(notifiedTimes, 1, 'subscriber was not notified of pending value');
  prop.set(1)
  t.is(notifiedTimes, 2, 'subscriber was not notified of first unique value');
  prop.set(1)
  t.is(notifiedTimes, 2, 'subscriber was notified of repeated value');
  prop.set(2)
  t.is(notifiedTimes, 3, 'subscriber was not notified of second unique value');
  t.is(notified, 4, 'subscrber was not notified of unique mapped value');
  mapped.end();
  t.is(prop.subscriberCount, 0, 'callback was not cleared after unsubscribing')
})