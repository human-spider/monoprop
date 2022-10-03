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
        if (!prop$ || prop$.isEnded) {
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
          if (!cached || cached.isEnded) {
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
    prop.next(value as Definitely<T>);
    prop.error.next(null);
  }).catch((error: any) => {
    if (error instanceof Error) {
      prop.error.next(error);
    } else {
      prop.error.next(new Error(error));
    }
  });
}

export const asyncUpdate = <T>(prop: Prop<T>, updateFn: (value: Maybe<T>) => Promise<T>): void => {
  mergePromise(prop, updateFn(prop.value))
}

export const toPromise = <T>(prop: Prop<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    const unsub = prop.subscribe(x => {
      resolve(x)
      unsub()
      errorUnsub()
    }, false)
    let errorSkipNext = prop.error.isInitialized
    const errorUnsub = prop.error.subscribe(x => {
      reject(x)
      unsub()
      errorUnsub()
    }, false)
  })
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

export const merge = <T>(...props: Prop<T>[]): Prop<Maybe<T>> => {
  const prop = Prop.pending<T>();
  for (let i = 0; i < props.length; i++) {
    prop.onEnd(props[i].subscribe(x => {
      prop.next(x);
    }));
  }
  return prop;
}

type PropSubject<T> = T extends Prop<infer K> ? K : never
type ComposedProp<T> = T extends Prop<any>[] ?
  Prop<{[K in keyof T]: PropSubject<T[K]>}> 
  : never

export const compose = <T extends Array<Prop<any>>>(...props: T): ComposedProp<T> => {
  const res = [] as PropSubject<T[keyof T]>;
  for (let i = 0; i < props.length; i++) {
    if (props[i] instanceof Prop) {
      res.push((props[i]).value);
    } else {
      res.push((props[i]));
    }
  }
  const allPending = !props.find(x => x.isInitialized)
  let prop
  if (allPending) {
    prop = Prop.pending() as ComposedProp<T>
  } else {
    prop = new Prop(res) as unknown as ComposedProp<T>;
  }
  for (let i = 0; i < props.length; i++) {
    if (props[i] instanceof Prop) {
      props[i].subscribe(x => {
        res[i] = x;
        prop.next(res as any[]);
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

export const composeObject = <T extends ObjectWithProps>(template: T): Prop<ComposedPropObject<T>> => {
  const res = {} as ComposedPropObject<T>, props: Array<[string[], Prop<any>]> = new Array();
  walkObject(template, [], (x, path: string[]) => {
    if (x instanceof Prop) {
      deepSet(res, path, x.value);
      props.push([path, x]);
    } else {
      deepSet(res, path, x)
    }
  });
  const allPending = !props.find(x => x[1].isInitialized)
  let prop
  if (allPending) {
    prop = Prop.pending<ComposedPropObject<T>>()
  } else {
    prop = new Prop(res);
  }
  for (let i = 0; i < props.length; i++) {
    props[i][1].subscribe((newValue) => {
      deepSet(res, props[i][0], newValue);
      prop.next(res);
    });
  }
  return prop;
}

export const not = (prop: Prop<any>): Prop<boolean> => {
  return prop.map(x => !x);
}

export const every = (...props: Prop<any>[]): Prop<boolean> => {
  return compose(...props).map((x: any[]) => x.every(x => x));
}

export const some = (...props: Prop<any>[]): Prop<boolean> => {
  return compose(...props).map((x: any[]) => x.some(x => x));
}

type GetterFn<T extends object, K extends keyof T> = { (value: T): T[K] }
type SetterFn<T extends object, K extends keyof T> = { (value: T, chunkValue: T[K]): void }
export const get = <T extends object, K extends keyof T>(key: K): GetterFn<T, K> => value => value[key]
export const set = <T extends object, K extends keyof T>(key: K): SetterFn<T, K> => (value, chunkValue) => {
  if (value[key] !== chunkValue) {
    value[key] = chunkValue
  }
}

interface PropCallback<T> {
  (arg: Definitely<T>): void
}

interface PropMapper<T, K> {
  (arg: Definitely<T>): Definitely<K>
}

interface PropUpdater<T, K> {
  (propValue: T, chunkValue: K): void
}

type Nullable<T> = T | null
type Maybe<T> = T | undefined
type Definitely<T> = T extends Maybe<any> ? Exclude<T, undefined> : T

export class Prop<T> {
  protected callbacks: { [key: number]: PropCallback<T> } = {};
  protected endCallbacks: Function[] = [];
  protected ended = false;
  protected currentValue: T;
  protected initialized: boolean = false;
  protected errorProp: Nullable<Prop<Maybe<Nullable<Error>>>> = null;
  protected subscriberCount = 0;

  static pending<T>(): Prop<Maybe<T>> {
    return new Prop<Maybe<T>>(undefined, false);
  }

  constructor(value: T, initialize = true) {
    if (initialize && value !== undefined) {
      this.setCurrentValue(value);
    }
  }

  set value(value: T) {
    this.next(value as Definitely<T>);
  }

  getValue(): T {
    return this.currentValue;
  }

  get value(): T {
    return this.getValue();
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  next(value: Definitely<T>): void {
    this.setCurrentValue(value);
    if (this.errorProp !== null && this.errorProp!.isInitialized) {
      this.error.set(null);
    }
    for (let key in this.callbacks) {
      this.runCallback(key, value);
    }
  }

  set = this.next

  tap() {
    if (this.isInitialized) {
      this.next(this.currentValue as Definitely<T>);
    }
  }

  update(updateFn: (value: T) => void): void {
    updateFn(this.currentValue);
    this.tap();
  }

  subscribe(callback: PropCallback<T>, notifyImmediately = true): Function {
    if (this.ended) {
      return () => {}
    }
    const key = String(this.subscriberCount++);
    this.callbacks[key] = callback;
    if (notifyImmediately) {
      this.runCallback(key, this.currentValue);
    }
    return () => {
      this.unsubscribe(key);
    };
  }

  watch = this.subscribe

  unsubscribe(key: string): void {
    if (this.callbacks[key]) {
      delete this.callbacks[key];      
    }
  }

  filter(filterFn: (arg: T) => boolean): Prop<T> {
    const prop: Prop<T> = this.deriveProp();
    prop.onEnd(this.subscribe(value => {
      if (filterFn(value)) {
        prop.next(value);
      }
    }));
    return prop;
  }

  uniq(): Prop<T> {
    const prop: Prop<T> = this.deriveProp(this.currentValue)
    prop.onEnd(this.subscribe(value => {
      if (prop.value !== value) {
        prop.next(value);
      }
    }));
    return prop;
  }

  map<K>(mapper: PropMapper<T, K>): Prop<K> {
    const prop = this.deriveProp<K>();
    prop.onEnd(this.subscribe(value => prop.next(mapper(value))));
    return prop;
  }

  mapUniq<K>(mapper: PropMapper<T, K>): Prop<K> {
    const prop = this.deriveProp<K>();
    prop.onEnd(this.subscribe(value => {
      const newValue = mapper(value);
      if (prop.value !== newValue) {
        prop.next(newValue);
      }
    }));
    return prop;
  }

  merge(...props: Prop<T>[]): void {
    for (let i = 0; i < props.length; i++) {
      this.onEnd(props[i].subscribe(x => {
        this.next(x);
      }));
    }
  }

  bind<K>(mapper: PropMapper<T, K>, updater: PropUpdater<T, K>): Prop<K> {
    const prop = this.mapUniq(mapper);
    this.onEnd(prop.subscribe(x => {
      this.update(value => {
        updater(value, x);
      });
    }));
    return prop;
  }

  getError(): Prop<Maybe<Nullable<Error>>> {
    return this.errorPropInstance;
  }

  get error(): Prop<Maybe<Nullable<Error>>> {
    return this.getError();
  }

  get isEnded() {
    return this.ended;
  }

  end() {
    this.ended = true;
    const keys = Object.keys(this.callbacks);
    for (let i = 0; i < keys.length; i++) {
      this.unsubscribe(keys[i]);
    }
    for (let i = 0; i < this.endCallbacks.length; i++) {
      this.endCallbacks[i]();
    }
    this.endCallbacks.length = 0;
  }

  onEnd(callback: Function) {
    this.endCallbacks.push(callback);
  }

  protected setCurrentValue(value: T): void {
    this.initialized = true;
    if (this.currentValue !== value) {
      this.currentValue = value;
    }
  }
  
  protected get errorPropInstance(): Prop<Maybe<Nullable<Error>>> {
    if (!this.errorProp) {
      this.errorProp = Prop.pending<Maybe<Nullable<Error>>>();
    }
    return this.errorProp;
  }

  protected runCallback(key: string, value: T): void {
    if (this.initialized && this.callbacks[key]) {
      this.callbacks[key](value);
    }
  }

  protected deriveProp<K>(initialValue: K = undefined as K) {
    return new Prop<K>(initialValue, this.initialized);
  }
}