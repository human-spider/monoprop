import test from 'ava'
import { Prop, get, set, of, into } from "../src/index.js"

test('two way binding with bind method', t => {
  let notified = { badger: '' }, bound = ''
  const prop = new Prop({ badger: 'badger' })
  const unsub = prop.subscribe(x => { notified = x })
  const badger = prop.bind(
    x => x.badger,
    (x, value) => x.badger = value
  )
  badger.subscribe(x => { bound = x })
  prop.value = { badger: 'mushroom' }
  t.is(bound, 'mushroom', 'bound prop was not updated')
  badger.value = 'snake'
  t.is(notified.badger, 'snake', 'parent prop was not updated')
  badger.end();
  unsub();
  t.is(Object.keys(prop['callbacks']).length, 0, 'callback was not cleared after bound ended')
})

test('two way binding with bind method using getter and setter', t => {
  let notified = { badger: '' }, bound = ''
  const prop = new Prop({ badger: 'badger' })
  const unsub = prop.subscribe(x => { notified = x })
  const badger = prop.bind(
    get('badger'),
    set('badger')
  )
  badger.subscribe(x => { bound = x })
  prop.value = { badger: 'mushroom' }
  t.is(bound, 'mushroom', 'bound prop was not updated')
  badger.value = 'snake'
  t.is(notified.badger, 'snake', 'parent prop was not updated')
  badger.end();
  unsub();
  t.is(Object.keys(prop['callbacks']).length, 0, 'callback was not cleared after bound ended')
})

test('two way binding with of helper', t => {
  let notified = { badger: '' }, bound = ''
  const prop = new Prop({ badger: 'badger' })
  const unsub = prop.subscribe(x => { notified = x })
  const badger = of(prop).badger
  badger.subscribe(x => { bound = x })
  prop.value = { badger: 'mushroom' }
  t.is(bound, 'mushroom', 'bound prop was not updated')
  badger.value = 'snake'
  t.is(notified.badger, 'snake', 'parent prop was not updated')
  t.is(of(prop).badger, badger, 'bound was not cached')
  badger.end();
  unsub();
  t.is(Object.keys(prop['callbacks']).length, 0, 'callback was not cleared after bound ended')
  badger.value = 'mushroom'
  t.is(bound, 'snake', 'bound was updated after it ended')
  t.not(of(prop).badger, badger, 'bound was not restarted after accessed through of helper after previous prop ended')
  of(prop).badger.subscribe(x => { bound = x })
  of(prop).badger.value = 'badger'
  t.is(bound, 'badger', 'bound was not restarted after accessed through of helper after previous prop ended')
})

test('deep two way binding with into helper', t => {
  let notified = { inner: { badger: '' } }, bound = ''
  const prop = new Prop({ inner: { badger: 'badger' } })
  const unsub = prop.subscribe(x => { notified = x })
  const badger = into(prop).inner.badger.$
  badger.subscribe(x => { bound = x })
  prop.update(x => {
    x.inner.badger = 'mushroom'
  })
  t.is(bound, 'mushroom', 'bound prop was not updated')
  badger.value = 'snake'
  t.is(notified.inner.badger, 'snake', 'parent prop was not updated')
  t.is(into(prop).inner.badger.$, badger, 'bound was not cached')
  badger.end();
  unsub();
  t.is(Object.keys(prop['callbacks']).length, 0, 'callback was not cleared after bound ended')
  badger.value = 'mushroom'
  t.is(bound, 'snake', 'bound was updated after it ended')
  t.not(into(prop).inner.badger.$, badger, 'bound was not restarted after accessed through of helper after previous prop ended')
  into(prop).inner.badger.$.subscribe(x => { bound = x })
  into(prop).inner.badger.$.value = 'badger'
  t.is(bound, 'badger', 'bound was not restarted after accessed through into helper after previous prop ended')
})