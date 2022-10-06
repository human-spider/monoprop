import test from 'ava'
import { JSDOM } from 'jsdom'
import { Prop, mergeEvent, fromEvent, PropValue } from "../src/index.js"
import { sleep } from './helper.js'

const { window } = new JSDOM() as { window: any }
const document = window.document as Document

test('fromEvent', t => {
  let notified: PropValue<Event>
  const prop = fromEvent(document, 'click')
  prop.subscribe(x => { notified = x })
  const event = new window.Event('click')
  document.dispatchEvent(event)
  t.is(notified!.value, event)
})

test.serial('fromEvent with throttle', async t => {
  let notifiedCount = 0
  const prop = fromEvent(document, 'click', { throttle: 10 })
  prop.subscribe(x => { notifiedCount++ })
  for (let i = 0; i < 10; i++) {
    document.dispatchEvent(new window.Event('click'))
  }
  await sleep(5);
  t.is(notifiedCount, 1, 'subscriber was not notified once at the end of throttle interval')
  await sleep(10);
  document.dispatchEvent(new window.Event('click'))
  t.is(notifiedCount, 2, 'subscriber was not notified again after throttle interval passed')
})

test.serial('fromEvent with debounce', async t => {
  let notifiedCount = 0
  const prop = fromEvent(document, 'click', { debounce: 10 })
  prop.subscribe(x => { notifiedCount++ })
  for (let i = 0; i < 10; i++) {
    document.dispatchEvent(new window.Event('click'))
  }
  await sleep(5)
  t.is(notifiedCount, 0, 'subscriber was notified before debounce interval passed since last event')
  await sleep(10)
  t.is(notifiedCount, 1, 'subscriber was not notified once after debounce interval since last event')
  document.dispatchEvent(new window.Event('click'))
  t.is(notifiedCount, 1, 'subscriber was notified again before debounce interval passed since last event')
})

test.serial('fromEvent with debounce leading', async t => {
  let notifiedCount = 0
  const prop = fromEvent(document, 'click', { debounce: 10, debounceLeading: true })
  prop.subscribe(x => { notifiedCount++ })
  for (let i = 0; i < 10; i++) {
    document.dispatchEvent(new window.Event('click'))
  }
  t.is(notifiedCount, 1, 'subscriber was not notified once before debounce interval')
  await sleep(10)
  document.dispatchEvent(new window.Event('click'))
  t.is(notifiedCount, 2, 'subscriber was not notified again after debounce interval passed since last event')
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

test.serial('mergeEvent with throttle', async t => {
  let notifiedCount = 0
  const prop = Prop.pending<Event>(); 
  mergeEvent(prop, document, 'click', { throttle: 10 })
  prop.subscribe(x => { notifiedCount++ })
  for (let i = 0; i < 10; i++) {
    document.dispatchEvent(new window.Event('click'))
  }
  await sleep(5);
  t.is(notifiedCount, 1, 'subscriber was not notified once at the end of throttle interval')
  await sleep(10);
  document.dispatchEvent(new window.Event('click'))
  t.is(notifiedCount, 2, 'subscriber was not notified again after throttle interval passed')
})

test.serial('mergeEvent with debounce', async t => {
  let notifiedCount = 0
  const prop = Prop.pending<Event>(); 
  mergeEvent(prop, document, 'click', { debounce: 10 })
  prop.subscribe(x => { notifiedCount++ })
  for (let i = 0; i < 10; i++) {
    document.dispatchEvent(new window.Event('click'))
  }
  await sleep(5)
  t.is(notifiedCount, 0, 'subscriber was notified before debounce interval passed since last event')
  await sleep(10)
  t.is(notifiedCount, 1, 'subscriber was not notified once after debounce interval since last event')
  document.dispatchEvent(new window.Event('click'))
  t.is(notifiedCount, 1, 'subscriber was notified again before debounce interval passed since last event')
})

test.serial('mergeEvent with debounce leading', async t => {
  let notifiedCount = 0
  const prop = Prop.pending<Event>(); 
  mergeEvent(prop, document, 'click', { debounce: 10, debounceLeading: true })
  prop.subscribe(x => { notifiedCount++ })
  for (let i = 0; i < 10; i++) {
    document.dispatchEvent(new window.Event('click'))
  }
  t.is(notifiedCount, 1, 'subscriber was not notified once before debounce interval')
  await sleep(10)
  document.dispatchEvent(new window.Event('click'))
  t.is(notifiedCount, 2, 'subscriber was not notified again after debounce interval passed since last event')
})