import test from 'ava'
import { JSDOM } from 'jsdom'
import { Prop, mergeEvent, fromEvent, PropValue } from "../src/index.js"
import { EventEmitter } from 'node:events'

const { window } = new JSDOM() as { window: any }
const document = window.document as Document

test('fromEvent', t => {
  let notified: PropValue<Event>
  const prop = fromEvent<Event>(document, 'click')
  prop.subscribe(x => { notified = x })
  const event = new window.Event('click')
  document.dispatchEvent(event)
  t.is(notified!.value, event)
})

test('mergeEvent', t => {
  let notified: PropValue<Event>
  const prop = Prop.pending<Event>()
  mergeEvent(prop, document, 'click')
  prop.subscribe(x => { notified = x })
  const event = new window.Event('click')
  document.dispatchEvent(event)
  t.is(notified!.value, event)
})

test('fromEvent with EventEmitter', t => {
  let notified: PropValue<string[]>
  const emitter = new EventEmitter()
  const prop = fromEvent<string[]>(emitter, 'badger')
  prop.subscribe(x => { notified = x })
  emitter.emit('badger')
  t.deepEqual(notified!.value, [])
  emitter.emit('badger', 'snake', 'mushroom')
  t.deepEqual(notified!.value, ['snake', 'mushroom'])
})

test('mergeEvent with EventEmitter', t => {
  let notified: PropValue<string[]>
  const prop = Prop.pending<string[]>()
  const emitter = new EventEmitter()
  mergeEvent(prop, emitter, 'badger')
  prop.subscribe(x => { notified = x })
  emitter.emit('badger')
  t.deepEqual(notified!.value, [])
  emitter.emit('badger', 'snake', 'mushroom')
  t.deepEqual(notified!.value, ['snake', 'mushroom'])
})