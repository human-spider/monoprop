import { Prop } from './prop'
import type { Maybe } from './helpers'

type useEventOptions = { 
  map?: (event: Event) => Maybe<Event>,
  wrap?: <T extends Function>(callback: T) => T
}

const emitterKinds = {
  dom: ['addEventListener', 'removeEventListener'],
  node: ['addListener', 'removeListener']
}
type DomEmitter = {
  addEventListener: Function,
  removeEventListener: Function
}
type NodeEmitter = {
  addListener: Function,
  removeListener: Function
}
type EmitterLike = DomEmitter | NodeEmitter
type EventOrArgumentsArray = Event | any[]

export const fromEvent = <T extends EventOrArgumentsArray>(target: EmitterLike, eventName: string, options: useEventOptions = {}): Prop<T> => {
  const prop = Prop.pending<T>();
  mergeEvent(prop, target, eventName, options);
  return prop;
}

export const mergeEvent = <T extends EventOrArgumentsArray>(prop: Prop<T>, target: EmitterLike, eventName: string, options: useEventOptions = {}): void => {
  const mapFn = options.map || (x => x)
  const wrapFn = options.wrap || (x => x)
  const emitterKind = getEmitterKind(target);
  const callback = getCallbackForEmitterKind(prop, emitterKind, mapFn, wrapFn);
  mergeEmitter(prop, target, emitterKind, eventName, callback);
}

const mergeEmitter = <T extends EventOrArgumentsArray>(prop: Prop<T>, target: EmitterLike, kind: keyof typeof emitterKinds, eventName: string, callback: (...args: EventCallbackArgs<T>) => void): void => {
  const [onMethod, offMethod] = emitterKinds[kind]
  prop.onEnd(() => {
    target[offMethod](eventName, callback);
  })
  target[onMethod](eventName, callback);
}

const getEmitterKind = (target: EmitterLike): keyof typeof emitterKinds => {
  for (let kind in emitterKinds) {
    if (isEmitterKind(target, kind as keyof typeof emitterKinds)) {
      return kind as keyof typeof emitterKinds;
    }
  }
  throw new TypeError(`target is not emitter like`)
}

const isEmitterKind = (target: EmitterLike, kind: keyof typeof emitterKinds): boolean =>
  emitterKinds[kind].every(key => target[key] instanceof Function)

type EventCallbackArgs<T extends EventOrArgumentsArray> = T extends Event ? [Event]: T

const getCallbackForEmitterKind = <T extends EventOrArgumentsArray>(prop: Prop<T>, emitterKind: keyof typeof emitterKinds, mapFn: Function, wrapFn: Function): (...args: EventCallbackArgs<T>) => void => {
  if (emitterKind === 'dom') {
    return wrapFn((event: Event): void => { prop.next(mapFn(event)) })
  }
  if (emitterKind === 'node') {
    return wrapFn((...args: any[]): void => { prop.next(mapFn(args)) })
  }
  throw new TypeError(`emitterKind must be one of: ${Object.keys(emitterKinds)}`)
}