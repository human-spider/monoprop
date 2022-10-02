import { debounce, throttle } from "tiny-throttle";

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
      get(target: typeof propCache, prop: string | symbol): Prop<any> {
        let prop$;
        // get prop from cache
        if (target.hasOwnProperty(prop)) {
          prop$ = Reflect.get(...arguments);
        }
        const propName = String(prop);
        if (!prop$ || prop$.isEnded) {
          prop$ = property.bind(get(propName as keyof T), set(propName as keyof T));
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
          return proxy;
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

export const fromEvent = (target: Node, eventName: string, options: useEventOptions = {}): Prop<Event> => {
  const prop: Prop<Event> = Prop.pending();
  mergeEvent(prop, target, eventName, options);
  return prop;
}

export const mergeEvent = <T extends Event>(bus: Prop<T>, target: Node, eventName: string, options: useEventOptions = {}): void => {
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
    callback = debounce(callback, options.debounce, options.debounceLeading);
  } else if (options.throttle && Number(options.throttle) > 0) {
    callback = throttle(callback, options.throttle);
  }
  bus.onEnd(() => {
    target.removeEventListener(eventName, callback);
  })
  target.addEventListener(eventName, callback);
}

export const fromPromise = <T>(promise: Promise<T>): Prop<T> => {
  const prop: Prop<T> = Prop.pending();
  mergePromise(prop, promise);
  return prop;
}

export const mergePromise = <T>(prop: Prop<T>, promise: Promise<T>): void => {
  promise.then((value: T) => {
    prop.next(value);
    prop.error.next(null);
  }).catch((error: any) => {
    if (error instanceof Error) {
      prop.error.next(error);
    } else {
      prop.error.next(new Error(error));
    }
  });
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
  // let level: object = x;
  // for(let i = 0; i < path.length; i++) {
  //   if (i === path.length - 1) {
  //     return level[path[i]]
  //   } else if (typeof level[path[i]] === 'object') {
  //     level = level[path[i]];
  //   } else {
  //     return null;
  //   }
  // }
  // return null;
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
  // let level: object = x;
  // for(let i = 0; i < path.length; i++) {
  //   if (i === path.length - 1) {
  //     Object.assign(level, { [path[i]]: value });
  //     // level[path[i]] = value;
  //   } else {
  //     if (!level[path[i]]) {
  //       level[path[i]] = {}
  //     }
  //     level = level[path[i]];
  //   }
  // }
}

export const merge = <T>(...props: Prop<T>[]): Prop<T> => {
  const prop: Prop<T> = Prop.pending();
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
    res.push((props[i]).value);
  }
  const prop = new Prop(res) as unknown as ComposedProp<T>;
  for (let i = 0; i < props.length; i++) {
    props[i].subscribe(x => {
      res[i] = x;
      prop.next(res as any[]);
    });
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
    }
  });
  const prop = new Prop(res);
  for (let i = 0; i < props.length; i++) {
    props[i][1].subscribe((newValue) => {
      deepSet(res, props[i][0], newValue);
      prop.next(res);
    });
  }
  return prop;
}

export const not = (prop: Prop<unknown>): Prop<boolean> => {
  return prop.map(x => !x);
}

export const every = (...props: Prop<unknown>[]): Prop<boolean> => {
  return compose(...props).map((x: unknown[]) => x.every(x => x));
}

export const some = (...props: Prop<unknown>[]): Prop<boolean> => {
  return compose(...props).map((x: unknown[]) => x.some(x => x));
}

export const once = <T extends Prop<any>>(prop: T): T => {
  prop.subscribe(() => prop.end());
  return prop;
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
  (arg: T): void
}

interface PropMapper<T, K> {
  (arg: T): K
}

interface PropUpdater<T, K> {
  (propValue: T, chunkValue: K): void
}

type Nullable<T> = T | null

export class Prop<T> {
  protected callbacks: { [key: number]: PropCallback<T> } = {};
  protected endCallbacks: Function[] = [];
  protected ended = false;
  protected currentValue: T;
  protected initialized: boolean = false;
  protected errorProp: Nullable<Prop<Nullable<Error>>> = null;
  protected subscriberCount = 0;

  static pending<T>(): Prop<T> {
    return new Prop(null as T, false);
  }

  constructor(value: Nullable<T>, initialize = true) {
    if (initialize && value !== null) {
      this.setCurrentValue(value);
    }
  }

  set value(value: T) {
    this.next(value);
  }

  getValue(): T {
    return this.currentValue;
  }

  get value(): T {
    return this.getValue();
  }

  next(value: T): void {
    this.setCurrentValue(value);
    if (this.errorProp !== null && this.error.value !== null) {
      this.error.set(null);
    }
    for (let key in this.callbacks) {
      this.runCallback(key, value);
    }
  }

  set = this.next

  tap() {
    this.next(this.currentValue);
  }

  update(updateFn: (rawValue: T) => void): void {
    updateFn(this.currentValue);
    this.tap();
  }

  subscribe(callback: PropCallback<T>): Function {
    if (this.ended) {
      return () => {}
    }
    const key = String(this.subscriberCount++);
    this.callbacks[key] = callback;
    this.runCallback(key, this.currentValue);
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
    const prop: Prop<T> = Prop.pending();
    prop.onEnd(this.subscribe(value => {
      if (filterFn(value)) {
        prop.next(value);
      }
    }));
    return prop;
  }

  uniq(): Prop<T> {
    const prop: Prop<T> = Prop.pending();
    prop.onEnd(this.subscribe(value => {
      if (prop.value !== value) {
        prop.next(value);
      }
    }));
    return prop;
  }

  map<K>(mapper: PropMapper<T, K>): Prop<K> {
    const prop: Prop<K> = Prop.pending();
    prop.onEnd(this.subscribe(value => prop.next(mapper(value))));
    return prop;
  }

  mapUniq<K>(mapper: PropMapper<T, K>): Prop<K> {
    const prop: Prop<K> = Prop.pending();
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

  getError(): Prop<Nullable<Error>> {
    return this.errorPropInstance;
  }

  get error(): Prop<Nullable<Error>> {
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
  
  protected get errorPropInstance(): Prop<Nullable<Error>> {
    if (!this.errorProp) {
      this.errorProp = Prop.pending<Nullable<Error>>();
    }
    return this.errorProp;
  }

  protected runCallback(key: string, value: T): void {
    if (this.initialized && this.callbacks[key]) {
      this.callbacks[key](value);
    }
  }
}