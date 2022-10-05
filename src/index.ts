import { throttle, debounce } from 'throttle-debounce';

function isPlainObject(obj) {
  if (!obj) return false;
  const prototype = Object.getPrototypeOf(obj);
  return prototype === null || prototype.constructor === Object;
}

const bindingsCache = new WeakMap<Prop<any>, object>();
const deepBindingsCache = new WeakMap<Prop<any>, object>();

type PropBindings<T extends object> = {
  [K in keyof T]: Prop<T[K]>
}

export const of = <T extends object>(property: Prop<T>): PropBindings<T> => {
  let proxy = bindingsCache.get(property);
  if (!proxy) {
    const propCache = {} as PropBindings<T>;
    proxy = new Proxy(propCache, {
      get(target: typeof propCache, prop: string | symbol, receiver?: any): Prop<any> {
        let prop$;
        // get prop from cache
        if (target.hasOwnProperty(prop)) {
          prop$ = Reflect.get(target, prop, receiver);
        }
        const propName = String(prop);
        if (!prop$ || prop$.ended) {
          prop$ = property.bind(get(propName as keyof T) as PropMapper<T, Definitely<T[keyof T]>>, set(propName as keyof T));
          propCache[propName] = prop$;
        }
        return prop$;
      }
    })
    bindingsCache.set(property, proxy);
  }
  return proxy as PropBindings<T>;
}

type DeepPropBindings<T extends object> = {
  [K in keyof T]: T[K] extends object ?
      DeepPropBindings<T[K]>
      : { $: Prop<T[K]> }
} & {
  $: Prop<T>
}

export const into = <T extends object>(property: Prop<T>): DeepPropBindings<T> => {
  let proxy = deepBindingsCache.get(property);
  let path: string[] = []
  if (!proxy) {
    const propCache = {} as DeepPropBindings<T>;
    proxy = new Proxy(propCache, {
      get(target: typeof propCache, prop: string | symbol): Prop<any> | DeepPropBindings<T> {
        const propName = String(prop);
        if (propName === '$') {
          const cacheKey = '.' + path.join('.')
          let cached = propCache[cacheKey]
          if (!cached || cached.ended) {
            const localPath = [...path]
            propCache[cacheKey] = property.bind(
              value => deepGet(value, localPath),
              (value, chunk) => deepSet(value, localPath, chunk)
            )
          }
          path.length = 0
          return propCache[cacheKey]
        } else {
          path.push(propName);
          return proxy as DeepPropBindings<T>;
        }
      }
    })
    deepBindingsCache.set(property, proxy);
  }
  return proxy as DeepPropBindings<T>;
}

type useEventOptions = { 
  throttle?: number,
  debounce?: number,
  debounceLeading?: boolean,
  transform?: (e: Event) => any
}

export const fromEvent = (target: Node, eventName: string, options: useEventOptions = {}): Prop<Maybe<Event>> => {
  const prop = Prop.pending<Event>();
  mergeEvent(prop, target, eventName, options);
  return prop;
}

export const mergeEvent = <T extends Event>(bus: Prop<Maybe<T>>, target: Node, eventName: string, options: useEventOptions = {}): void => {
  let callback;
  if (options.transform && typeof options.transform === 'function') {
    callback = (event) => {
      bus.next(options.transform!(event));
    }
  } else {
    callback = (event) => {
      bus.next(event);
    }
  }
  if (options.debounce && Number(options.debounce) > 0) {
    callback = debounce(options.debounce, callback, { atBegin: !!options.debounceLeading });
  } else if (options.throttle && Number(options.throttle) > 0) {
    callback = throttle(options.throttle, callback);
  }
  bus.onEnd(() => {
    target.removeEventListener(eventName, callback);
  })
  target.addEventListener(eventName, callback);
}

export const fromPromise = <T>(promise: Promise<T>): Prop<Maybe<T>> => {
  const prop = Prop.pending<T>();
  mergePromise(prop, promise);
  return prop;
}

export const mergePromise = <T>(prop: Prop<T>, promise: Promise<T>): void => {
  promise.then((value: T) => {
    prop.next(value);
  }).catch((error: any) => {
    if (error instanceof Error) {
      prop.setError(error);
    } else {
      prop.setError(new Error(error));
    }
  });
}

export const asyncUpdate = <T>(prop: Prop<T>, updateFn: (value: PropValue<T>) => Promise<T>): void => {
  mergePromise(prop, updateFn(prop.last))
}

const walkObject = (x: object, basePath: Array<string>, callback: (value: any, path: string[]) => void): void => {
  const keys = Object.keys(x);
  for (let i = 0; i < keys.length; i++) {
    const path = [...basePath, keys[i]];
    if (isPlainObject(x[keys[i]])) {
      walkObject(x[keys[i]], path, callback);
    } else {
      callback(x[keys[i]], path);
    }
  }
}

const deepGet = <T extends object>(x: T, path: string[]): any => {
  if (path.length === 1) {
    return x[path[0]];
  } else {
    const [key, ...rest] = path
    return deepGet(x[key], rest);
  }
}

const deepSet = (x: object, path: string[], value: unknown): void => {
  if (path.length === 1) {
    Object.assign(x, { [path[0]]: value });
  } else {
    const [key, ...rest] = path
    if (x[key] === undefined) {
      Object.assign(x, { [key]: {} });
    }
    deepSet(x[key], rest, value);
  }
}

// export const merge = <T>(...props: Prop<T>[]): Prop<Maybe<T>> => {
//   const prop = Prop.pending<T>();
//   for (let i = 0; i < props.length; i++) {
//     prop.onEnd(props[i].subscribe(x => {
//       prop.next(x);
//     }));
//   }
//   return prop;
// }

interface PropMapper<T, K> {
  (propValue: PropValue<T>): Maybe<K>
}

export const map = <T, K>(prop: Prop<T>, mapperFn: PropMapper<T, K>): Prop<K> => {
  // if parent prop is pending, the derived prop will stay pending too
  // if parent prop has value, derived prop will be initialized when initial value is passed to subscribe method
  const derived = Prop.pending<K>()
  derived.onEnd(prop.subscribe(propValue => {
    let newValue
    try {
      newValue = mapperFn(propValue)
    } catch (error) {
      newValue = new PropValue(propValue.value, error);
    }
    // undefined is a special value that will skip prop update if error is not present
    if (newValue!== undefined) {
      derived.next(newValue)
    }
  }));
  return derived;
}

export const filter = <T>(prop: Prop<T>, filterFn: (value: PropValue<T>) => boolean): Prop<T> => {
  return map(prop, propValue => {
    if (!filterFn(propValue)) {
      return undefined;
    }
    return propValue.unwrap();
  })
}

export const uniq = <T>(prop: Prop<T>): Prop<T> => {
  const derived = filter(prop, propValue => {
    return propValue.value === derived.last.value
  })
  return derived;
}

export const mapUniq = <T, K>(prop: Prop<T>, mapper: PropMapper<T, K>): Prop<K> => {
  const derived = map(prop, propValue => {
    const newValue = mapper(propValue);
    if (newValue === derived.last.value) {
      return undefined;
    }
    return newValue;
  })
  return derived;
}

interface PropUpdater<T, K> {
  (propValue: PropValue<T>, chunkValue: PropValue<K>): T
}

export const bind = <T extends Object, K>(prop: Prop<T>, mapper: PropMapper<T, K>, updater: PropUpdater<T, K>): Prop<K> => {
  const derived = mapUniq(prop, mapper);
  prop.onEnd(derived.subscribe(chunkValue => {
    prop.update(value => updater(value, chunkValue));
  }));
  return derived;
}

type PropSubject<T> = T extends Prop<infer K> ? K : never
type ComposedPropValues<T> = T extends Prop<any>[] ?
  {[K in keyof T]: PropSubject<T[K]>}
  : never
type ComposedProp<T> = T extends Prop<any>[] ?
  Prop<ComposedPropValues<T>> 
  : never

const getAggregateError = (props: Prop<any>[]): Nullable<AggregateError> => {
  const errors = props.map(x => x.last.error)
  if (!errors.length) {
    return null
  }
  return AggregateError(errors)
}

export const tuple = <T extends Array<Prop<any>>>(...props: T): ComposedProp<T> => {
  const values = [] as PropSubject<T[keyof T]>[];
  for (let i = 0; i < props.length; i++) {
    if (props[i] instanceof Prop) {
      values.push(props[i].last.value);
    } else {
      values.push(props[i] as any);
    }
  }
  const prop = new Prop(values, getAggregateError(props)) as ComposedProp<T>
  for (let i = 0; i < props.length; i++) {
    if (props[i] instanceof Prop) {
      props[i].subscribe(x => {
        values[i] = x.value;
        prop.next(values, getAggregateError(props));
      });
    }
  }
  return prop;
}

type ObjectWithProps = { [key: string | symbol]: Prop<any> | ObjectWithProps }
type ComposedPropObject<T extends object> = {
  [K in keyof T]: T[K] extends Prop<infer P> ? P
    : T[K] extends ObjectWithProps ? 
      ComposedPropObject<T[K]> 
      : never 
}

export const dict = <T extends ObjectWithProps>(template: T): Prop<ComposedPropObject<T>> => {
  const res = {} as ComposedPropObject<T>,
    props: Array<Prop<any>> = new Array(),
    paths: string[][] = []
  walkObject(template, [], (x, path: string[]) => {
    if (x instanceof Prop) {
      deepSet(res, path, x.last.value);
      props.push(x);
      paths.push(path)
    } else {
      deepSet(res, path, x)
    }
  });
  const prop = new Prop(res, getAggregateError(props))
  for (let i = 0; i < props.length; i++) {
    props[i].subscribe((newValue) => {
      deepSet(res, paths[i], newValue.value);
      prop.next(res, getAggregateError(props));
    });
  }
  return prop;
}

export const not = (prop: Prop<any>): Prop<boolean> => {
  return map(prop, x => !x.unwrap());
}

export const every = (...props: Prop<any>[]): Prop<boolean> => {
  return map(tuple(...props), (x: PropValue<any[]>) => x.unwrap().every(x => x));
}

export const some = (...props: Prop<any>[]): Prop<boolean> => {
  return map(tuple(...props), (x: PropValue<any[]>) => x.unwrap().some(x => x));
}

type GetterFn<T extends object, K extends keyof T> = { (value: PropValue<T>): T[K] }
type SetterFn<T extends object, K extends keyof T> = { (value: PropValue<T>, chunkValue: T[K]): void }
export const get = <T extends object, K extends keyof T>(key: K): GetterFn<T, K> => value => value.unwrap()[key]
export const set = <T extends object, K extends keyof T>(key: K): SetterFn<T, K> => (value, chunkValue) => {
  value.unwrap()[key] = chunkValue
}

interface PropCallback<T> {
  (propValue: PropValue<T>): void
}

type Nullable<T> = T | null
type Maybe<T> = T | undefined
type Definitely<T> = T extends Maybe<any> ? Exclude<T, undefined> : T

export class PendingPropError extends Error {}
export class CannotMutateValue extends Error {}

class PropValue<T> {
  #value: T
  #error: Nullable<Error>

  constructor(value: Maybe<T>, error: Nullable<Error>) {
    if (value !== undefined) {
      this.#value = value;
    }
    this.#error = error;
  }

  unwrap(errorHandler: (error: Error) => void = error => { throw error }): T {
    if (this.error) {
      errorHandler(this.error);
    }
    return this.value;
  }

  get value(): T {
    return this.#value;
  }

  get error(): Nullable<Error> {
    return this.#error;
  }
}

export class Prop<T> {
  #callbacks: { [key: number]: PropCallback<T> } = {};
  #endCallbacks: Function[] = [];
  #ended = false;
  #subscriberCount = 0;
  #last: PropValue<T>

  static pending<T>(): Prop<T> {
    return new Prop<T>(undefined, new PendingPropError());
  }

  constructor(value: Maybe<T>, error: Nullable<Error> = null) {
    this.#last = new PropValue(value, error)
  }

  get last(): PropValue<T> {
    return this.#last;
  }

  next(value: T, error: Nullable<Error> = null): void {
    this.#last = new PropValue(value, error)
    this.#runCallbacks()
  }

  set = this.next

  setError(error: Error): void {
    this.next(this.last.value, error);
  }

  update(updateFn: (propValue: PropValue<T>) => T): void {
    try {
      this.next(updateFn(this.last))
    } catch (error) {
      this.setError(error)
    }
  }

  subscribe(callback: PropCallback<T>, notifyImmediately = true): Function {
    if (this.#ended) {
      return () => {}
    }
    const key = String(this.#subscriberCount++);
    this.#callbacks[key] = callback;
    if (notifyImmediately) {
      this.#runCallback(key, this.last);
    }
    return () => {
      this.unsubscribe(key);
    };
  }

  watch = this.subscribe

  unsubscribe(key: string): void {
    if (this.#callbacks[key]) {
      delete this.#callbacks[key];      
    }
  }

  get ended() {
    return this.#ended;
  }

  end() {
    this.#ended = true;
    const keys = Object.keys(this.#callbacks);
    for (let i = 0; i < keys.length; i++) {
      this.unsubscribe(keys[i]);
    }
    for (let i = 0; i < this.#endCallbacks.length; i++) {
      this.#endCallbacks[i]();
    }
    this.#endCallbacks.length = 0;
  }

  onEnd(callback: Function) {
    this.#endCallbacks.push(callback);
  }

  #runCallbacks(): void {
    for (let key in this.#callbacks) {
      this.#runCallback(key, this.last)
    }
  }

  #runCallback(key: string, propValue: PropValue<T>): void {
    this.#callbacks[key]?.(propValue)
  }
}