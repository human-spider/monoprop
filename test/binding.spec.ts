import test from 'ava'
import { Prop, get, set, of, into, bind, PropValue } from "../src/index.js"

test('two way binding with bind method', t => {
  let notified: PropValue<{ badger: string }>, bound: PropValue<string>
  const prop = new Prop({ badger: 'badger' })
  const unsub = prop.subscribe(x => { notified = x })
  const badger = bind(prop,
    x => x.unwrap().badger,
    (x, value) => ({
      badger: value.unwrap()
    })
  )
  badger.subscribe(x => { bound = x })
  prop.next({ badger: 'mushroom' })
  t.is(bound!.value, 'mushroom', 'bound prop was not updated')
  badger.set('snake')
  t.is(notified!.value?.badger, 'snake', 'parent prop was not updated')
  badger.end();
  unsub();
  t.is(prop.subscriberCount, 0, 'callback was not cleared after unsubscribing')
})

test('two way binding with bind method using getter and setter', t => {
  let notified: PropValue<{ badger: string }>, bound: PropValue<string>
  const prop = new Prop({ badger: 'badger' })
  const unsub = prop.subscribe(x => { notified = x })
  const badger = bind(prop,
    get('badger'),
    set('badger')
  )
  badger.subscribe(x => { bound = x })
  prop.next({ badger: 'mushroom' })
  t.is(bound!.value, 'mushroom', 'bound prop was not updated')
  badger.set('snake')
  t.is(notified!.value?.badger, 'snake', 'parent prop was not updated')
  badger.end();
  unsub();
  t.is(prop.subscriberCount, 0, 'callback was not cleared after unsubscribing')
})

test('two way binding with of helper', t => {
  let notified: PropValue<{ badger: string }>, bound: PropValue<string>
  const prop = new Prop({ badger: 'badger' })
  const unsub = prop.subscribe(x => { notified = x })
  const badger = of(prop).badger
  badger.subscribe(x => { bound = x })
  prop.next({ badger: 'mushroom' })
  t.is(bound!.value, 'mushroom', 'bound prop was not updated')
  badger.set('snake')
  t.is(notified!.value?.badger, 'snake', 'parent prop was not updated')
  badger.end();
  unsub();
  t.is(prop.subscriberCount, 0, 'callback was not cleared after unsubscribing')
  badger.set('mushroom')
  t.is(bound!.value, 'snake', 'bound was updated after it ended')
  t.not(of(prop).badger, badger, 'bound was not restarted after accessed through of helper after previous prop ended')
  of(prop).badger.subscribe(x => { bound = x })
  of(prop).badger.set('badger')
  t.is(bound!.value, 'badger', 'bound was not restarted after accessed through of helper after previous prop ended')
})

test('deep two way binding with into helper', t => {
  let notified: PropValue<{ inner: { badger: string } }>, bound: PropValue<string>
  const prop = new Prop({ inner: { badger: 'badger' } })
  const unsub = prop.subscribe(x => { notified = x })
  const badger = into(prop).inner.badger.$
  badger.subscribe(x => { bound = x })
  prop.update(x => {
    x.inner.badger = 'mushroom'
    return x
  })
  t.is(bound!.value, 'mushroom', 'bound prop was not updated')
  badger.set('snake')
  t.is(notified!.value.inner.badger, 'snake', 'parent prop was not updated')
  t.is(into(prop).inner.badger.$, badger, 'bound was not cached')
  badger.end();
  unsub();
  t.is(prop.subscriberCount, 0, 'callback was not cleared after unsubscribing')
  badger.set('mushroom')
  t.is(bound!.value, 'snake', 'bound was updated after it ended')
  t.not(into(prop).inner.badger.$, badger, 'bound was not restarted after accessed through of helper after previous prop ended')
  into(prop).inner.badger.$.subscribe(x => { bound = x })
  into(prop).inner.badger.$.set('badger')
  t.is(bound!.value, 'badger', 'bound was not restarted after accessed through into helper after previous prop ended')
})