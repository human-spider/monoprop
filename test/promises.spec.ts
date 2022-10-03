import { fromPromise, mergePromise, toPromise, Prop, asyncUpdate } from './../src/index';
import test from 'ava'
import { sleep } from './helper.js'

test('fromPomise', async t => {
  let resolve: Function; 
  const promise = new Promise<boolean>(x => {
    resolve = x
  })
  let notified = false
  const prop = fromPromise<boolean>(promise);
  t.is(prop.value, undefined as any, 'prop from promise was not pending')
  prop.subscribe(x => { notified = x })
  resolve!(true)
  await promise
  t.is(notified, true, 'subscriber was not notified of resolved promise')
  t.is(prop.error.value, null, 'error was updated from resolved promise')
})

test('fromPomise rejected', async t => {
  let reject: Function
  const promise = new Promise<boolean>((_, x) => {
    reject = x
  })
  let notified = false
  const prop = fromPromise<boolean>(promise);
  t.is(prop.value, undefined as any, 'prop from promise was not pending')
  prop.subscribe(x => { notified = x })
  reject!('badger')
  try {
    await promise
  } catch (e) {}
  await sleep(1) // immediately after awaiting promise error is not yet updated 
  t.false(prop.isInitialized, 'fromPromise prop was initialized after promise rejection')
  t.is(notified, false, 'subscriber was notified of rejected promise')
  t.is(prop.error.value?.message, 'badger', 'subscriber was not notified of error')
})

test('mergePomise', async t => {
  let resolve: Function; 
  const promise = new Promise<boolean>(x => {
    resolve = x
  })
  let notified = false
  const prop = Prop.pending<boolean>()
  mergePromise(prop, promise);
  t.is(prop.value, undefined as any, 'prop from promise was not pending')
  prop.subscribe(x => { notified = x })
  resolve!(true)
  await promise
  t.is(notified, true, 'subscriber was not notified of resolved promise')
  t.is(prop.error.value, null, 'error was updated from resolved promise')
})

test('mergePomise rejected', async t => {
  let reject: Function
  const promise = new Promise<boolean>((_, x) => {
    reject = x
  })
  let notified = false
  const prop = Prop.pending<boolean>()
  mergePromise(prop, promise);
  t.is(prop.value, undefined as any, 'prop from promise was not pending')
  prop.subscribe(x => { notified = x })
  reject!('badger')
  try {
    await promise
  } catch (e) {}
  await sleep(1) // immediately after awaiting promise error is not yet updated 
  t.false(prop.isInitialized, 'fromPromise prop was initialized after promise rejection')
  t.is(notified, false, 'subscriber was notified of rejected promise')
  t.is(prop.error.value?.message, 'badger', 'subscriber was not notified of error')
})

test('asyncUpdate', async t => {
  let notified = -1, valueInCallback, resolve: Function
  const prop = new Prop(0)
  const promise = new Promise<number>(x => {
    resolve = x
  })
  asyncUpdate(prop, x => {
    valueInCallback = x
    return promise
  })
  t.is(valueInCallback, 0, 'current value was not passed to callback')
  resolve!(1)
  await promise
  t.is(prop.value, 1, 'prop was not updated with value from resolved promise')
})

test('asyncUpdate pending', async t => {
  let notified = -1, valueInCallback, resolve: Function
  const prop = Prop.pending<number>()
  const promise = new Promise<number>(x => {
    resolve = x
  })
  asyncUpdate(prop, x => {
    valueInCallback = x
    return promise
  })
  t.is(valueInCallback, undefined, 'value was not passed to callback from pending promise')
  resolve!(1)
  await promise
  t.is(prop.value, 1, 'prop was not updated with value from resolved promise')
  t.is(prop.error.value, null, 'error was updated from resolved asyncUpdate')
})

test('asyncUpdate error', async t => {
  let notified = -1, reject: Function
  const prop = Prop.pending<number>()
  const promise = new Promise<number>((_, x) => {
    reject = x
  })
  asyncUpdate(prop, x => promise)
  reject!('badger')
  promise.catch(() => {})
  try {
    await promise
  } catch (e) {}
  await sleep(1) // immediately after awaiting promise error is not yet updated 
  t.false(prop.isInitialized, 'prop was updated after asyncUpdate promise rejected')
  t.is(prop.error.value?.message, 'badger', 'subscriber was not notified of error from asyncUpdate rejection')
})

test('toPromise', async t => {
  const prop = Prop.pending<number>()
  const promise = toPromise(prop)
  prop.value = 1
  t.is(await promise, 1)
  t.is(Object.keys(prop['callbacks']).length, 0, 'toPromise callback was not cleared')
  t.is(Object.keys(prop.error['callbacks']).length, 0, 'toPromise error callback was not cleared')
})

test('toPromise error', async t => {
  const prop = Prop.pending<boolean>()
  const promise = toPromise(prop)
  prop.error.value = new Error('badger')
  try {
    await promise
  } catch(e) {
    t.is(e.message, 'badger')
  }
})

test('toPromise initialized', async t => {
  const prop = new Prop(0)
  const promise = toPromise(prop)
  prop.value = 1
  t.is(await promise, 1, 'toPromise did not wait for next value and notified with current value')
})