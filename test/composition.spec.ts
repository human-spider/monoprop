import { Prop, tuple, dict, some, every, not, PropValue, map, PendingPropError } from './../src/index';
import test from 'ava'

test('tuple', t => {
  const num = new Prop(0)
  const str = new Prop('badger')
  const composed = tuple(num, str)
  let notified: PropValue<[number, string]>
  composed.subscribe(x => { notified = x })
  t.deepEqual(notified!.unwrap(), [0, 'badger'])
  num.set(1)
  t.deepEqual(notified!.unwrap(), [1, 'badger'])
  str.set('mushroom')
  t.deepEqual(notified!.unwrap(), [1, 'mushroom'])
})

test('tuple ignores static values', t => {
  const num = new Prop(0)
  const str = new Prop('')
  const composed = tuple(num, str, 'snake' as any)
  let notified: PropValue<[number, string, any]>
  composed.subscribe(x => { notified = x })
  t.deepEqual(notified!.unwrap(), [0, '', 'snake'])
  num.set(1)
  t.deepEqual(notified!.unwrap(), [1, '', 'snake'])
  str.set('mushroom')
  t.deepEqual(notified!.unwrap(), [1, 'mushroom', 'snake'])
})

test('tuple has PendingPropError when all props are pending', t => {
  const num = Prop.pending<number>()
  const str = Prop.pending<string>()
  const composed = tuple(num, str, 'snake' as any)
  let notified: PropValue<[number, string, any]>
  composed.subscribe(x => { notified = x })
  t.true(notified!.error instanceof PendingPropError)
})

test('tuple has AggregateError when some props have errors', t => {
  const num = new Prop(0)
  const str = new Prop('')
  const composed = tuple(num, str)
  const error = new Error()
  str.setError(error)
  let notified: PropValue<[number, string]>
  composed.subscribe(x => { notified = x })
  t.true(notified!.error instanceof AggregateError)
  t.deepEqual(notified!.error!.errors, [error])
})

test('dict', t => {
  const num = new Prop(0)
  const str = new Prop('badger')
  const composed = dict({num, deep: {str}})
  let notified: PropValue<{num: number, deep: {str: string}}>
  composed.subscribe(x => { notified = x })
  t.deepEqual(notified!.unwrap(), { num: 0, deep: { str: 'badger' } })
  num.set(1)
  t.deepEqual(notified!.unwrap(), { num: 1, deep: { str: 'badger' } })
  str.set('mushroom')
  t.deepEqual(notified!.unwrap(), { num: 1, deep: { str: 'mushroom' } })
})

test('dict ignores static values', t => {
  const num = new Prop(0)
  const str = new Prop('badger')
  const composed = dict({num, deep: {str, static: 'snake' as any}})
  let notified: PropValue<{num: number, deep: {str: string, static: any}}>
  composed.subscribe(x => { notified = x })
  t.deepEqual(notified!.unwrap(), { num: 0, deep: { str: 'badger', static: 'snake' } })
  num.set(1)
  t.deepEqual(notified!.unwrap(), { num: 1, deep: { str: 'badger', static: 'snake' } })
  str.set('mushroom')
  t.deepEqual(notified!.unwrap(), { num: 1, deep: { str: 'mushroom', static: 'snake' } })
})

test('dict has PendingPropError when all props are pending', t => {
  const num = Prop.pending<number>()
  const str = Prop.pending<string>()
  let notified: PropValue<{num: number, deep: {str: string}}>
  const composed = dict({num, deep: {str}})
  composed.subscribe(x => { notified = x })
  t.true(notified!.error instanceof PendingPropError)
})

test('dict has AggregateError when some props have errors', t => {
  const num = new Prop(0)
  const str = new Prop('')
  const error = new Error()
  str.setError(error)
  let notified: PropValue<{num: number, deep: {str: string}}>
  const composed = dict({num, deep: {str}})
  composed.subscribe(x => { notified = x })
  t.true(notified!.error instanceof AggregateError)
  t.deepEqual(notified!.error!.errors, [error])
})

test('logical operators', t => {
  const pos = new Prop(1)
  const neg = new Prop(-1)
  const bool = new Prop(false)
  const isPositive = (x: PropValue<number>) => x.value > 0
  const isFiniteValue = (x: PropValue<number>) => isFinite(x.value)
  t.true(some(pos, bool).last.value)
  t.true(some(map(pos, isPositive), bool).last.value)
  t.true(some(map(pos, isPositive), map(neg, isPositive)).last.value)
  t.false(every(pos, bool).last.value)
  t.false(every(map(pos, isPositive), bool).last.value)
  t.false(every(map(pos, isPositive), map(neg, isPositive)).last.value)
  t.true(every(map(pos, isFiniteValue), map(neg, isFiniteValue)).last.value)
  t.true(not(bool).last.value)
  t.true(every(map(pos, isFiniteValue), map(neg, isFiniteValue), not(bool)).last.value)
  t.false(not(pos).last.value)
})