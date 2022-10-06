import { fromPromise, mergePromise, Prop, asyncUpdate, PropValue } from './../src/index';
import test from 'ava'
import { sleep } from './helper.js'

test('fromPomise', async t => {
  let resolve: Function; 
  const promise = new Promise<boolean>(x => {
    resolve = x
  })
  let notified: PropValue<boolean>
  const prop = fromPromise<boolean>(promise);
  t.false(prop.initialized, 'prop from promise was not pending')
  prop.subscribe(x => { notified = x })
  resolve!(true)
  await promise
  t.true(prop.initialized, 'prop from promise was not initialized after resolving promise')
  t.is(notified!.value, true, 'subscriber was not notified of resolved promise')
  t.is(notified!.error, null, 'error was updated from resolved promise')
})

test('fromPomise rejected', async t => {
  let reject: Function
  const promise = new Promise<boolean>((_, x) => {
    reject = x
  })
  let notified: PropValue<boolean>
  const prop = fromPromise<boolean>(promise);
  t.false(prop.initialized, 'prop from promise was not pending')
  prop.subscribe(x => { notified = x })
  reject!('badger')
  try {
    await promise
  } catch (e) {}
  await sleep(1) // immediately after awaiting promise error is not yet updated 
  t.true(prop.initialized, 'prop from promise was not initialized after resolving promise')
  t.is(notified!.value, undefined as any, 'value was updated from rejected promise')
  t.is(notified!.error?.message, 'badger', 'subscriber was not notified of error')
})

test('mergePomise', async t => {
  let resolve: Function; 
  const promise = new Promise<boolean>(x => {
    resolve = x
  })
  let notified: PropValue<boolean>
  const prop = Prop.pending<boolean>()
  mergePromise(prop, promise);
  t.false(prop.initialized, 'prop from promise was not pending')
  prop.subscribe(x => { notified = x })
  resolve!(true)
  await promise
  t.true(prop.initialized, 'prop from promise was not initialized after resolving promise')
  t.is(notified!.value, true, 'subscriber was not notified of resolved promise')
  t.is(notified!.error, null, 'error was updated from resolved promise')
})

test('mergePomise rejected', async t => {
  let reject: Function
  const promise = new Promise<boolean>((_, x) => {
    reject = x
  })
  let notified: PropValue<boolean>
  const prop = Prop.pending<boolean>()
  mergePromise(prop, promise);
  t.false(prop.initialized, 'prop from promise was not pending')
  prop.subscribe(x => { notified = x })
  reject!('badger')
  try {
    await promise
  } catch (e) {}
  await sleep(1) // immediately after awaiting promise error is not yet updated 
  t.true(prop.initialized, 'prop from promise was not initialized after resolving promise')
  t.is(notified!.value, undefined as any, 'value was updated from rejected promise')
  t.is(notified!.error?.message, 'badger', 'subscriber was not notified of error')
})