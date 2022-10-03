import { Prop, compose, composeObject, some, every, not } from './../src/index';
import test from 'ava'

test('compose', t => {
  const num = new Prop(0)
  const str = new Prop('badger')
  const composed = compose(num, str)
  let notified = new Array()
  composed.subscribe(x => { notified = x })
  t.deepEqual(notified, [0, 'badger'])
  num.value = 1
  t.deepEqual(notified, [1, 'badger'])
  str.value = 'mushroom'
  t.deepEqual(notified, [1, 'mushroom'])
})

test('compose partial pending', t => {
  const num = new Prop(0)
  const str = Prop.pending<string>()
  const composed = compose(num, str)
  let notified = new Array()
  composed.subscribe(x => { notified = x })
  t.deepEqual(notified, [0, undefined], 'composed prop was not initialized when some component props are pending')
  num.value = 1
  t.deepEqual(notified, [1, undefined])
  str.value = 'mushroom'
  t.deepEqual(notified, [1, 'mushroom'])
})

test('compose all pending', t => {
  const num = Prop.pending<number>()
  const str = Prop.pending<string>()
  const composed = compose(num, str)
  let notified = new Array()
  composed.subscribe(x => { notified = x })
  t.deepEqual(notified, [], 'composed prop was initialized when all component props are pending')
  num.value = 1
  t.deepEqual(notified, [1, undefined])
  str.value = 'mushroom'
  t.deepEqual(notified, [1, 'mushroom'])
})

test('compose ignores static values', t => {
  const num = Prop.pending<number>()
  const str = Prop.pending<string>()
  const composed = compose(num, str, 'snake' as any)
  let notified = new Array()
  composed.subscribe(x => { notified = x })
  t.deepEqual(notified, [], 'composed prop all pending with static value was initialized')
  num.value = 1
  t.deepEqual(notified, [1, undefined, 'snake'])
  str.value = 'mushroom'
  t.deepEqual(notified, [1, 'mushroom', 'snake'])
})

test('composeObject', t => {
  const num = new Prop(0)
  const str = new Prop('badger')
  const composed = composeObject({num, deep: {str}})
  let notified = new Object()
  composed.subscribe(x => { notified = x })
  t.deepEqual(notified, { num: 0, deep: { str: 'badger' } })
  num.value = 1
  t.deepEqual(notified, { num: 1, deep: { str: 'badger' } })
  str.value = 'mushroom'
  t.deepEqual(notified, { num: 1, deep: { str: 'mushroom' } })
})

test('composeObject partial pending', t => {
  const num = new Prop(0)
  const str = Prop.pending<string>()
  const composed = composeObject({num, deep: {str}})
  let notified = new Object()
  composed.subscribe(x => { notified = x })
  t.deepEqual(notified, { num: 0, deep: { str: undefined } }, 'composed object prop was not initialized when some component props are pending')
  num.value = 1
  t.deepEqual(notified, { num: 1, deep: { str: undefined } })
  str.value = 'mushroom'
  t.deepEqual(notified, { num: 1, deep: { str: 'mushroom' } })
})

test('composeObject all pending', t => {
  const num = Prop.pending<number>()
  const str = Prop.pending<string>()
  const composed = composeObject({num, deep: {str}})
  let notified = new Object()
  composed.subscribe(x => { notified = x })
  t.deepEqual(notified, {}, 'composed object prop was initialized when all component props are pending')
  num.value = 1
  t.deepEqual(notified, { num: 1, deep: { str: undefined } })
  str.value = 'mushroom'
  t.deepEqual(notified, { num: 1, deep: { str: 'mushroom' } })
})

test('composeObject ignores static values', t => {
  const num = Prop.pending<number>()
  const str = Prop.pending<string>()
  const composed = composeObject({num, deep: {str, static: 'snake'}} as any)
  let notified = new Object()
  composed.subscribe(x => { notified = x })
  t.deepEqual(notified, {}, 'composed object prop all pending with static value was initialized')
  num.value = 1
  t.deepEqual(notified, { num: 1, deep: { str: undefined, static: 'snake' } })
  str.value = 'mushroom'
  t.deepEqual(notified, { num: 1, deep: { str: 'mushroom', static: 'snake' } })
})

test('logical operators', t => {
  const pos = new Prop(1)
  const neg = new Prop(-1)
  const bool = new Prop(false)
  const isPositive = x => x > 0
  t.true(some(pos, bool).value)
  t.true(some(pos.map(isPositive), bool).value)
  t.true(some(pos.map(isPositive), neg.map(isPositive)).value)
  t.false(every(pos, bool).value)
  t.false(every(pos.map(isPositive), bool).value)
  t.false(every(pos.map(isPositive), neg.map(isPositive)).value)
  t.true(every(pos.map(isFinite), neg.map(isFinite)).value)
  t.true(not(bool).value)
  t.true(every(pos.map(isFinite), neg.map(isFinite), not(bool)).value)
  t.false(not(pos).value)
})