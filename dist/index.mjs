// src/index.ts
import { debounce, throttle } from "tiny-throttle";
function isPlainObject(obj) {
  if (!obj)
    return false;
  const prototype = Object.getPrototypeOf(obj);
  return prototype === null || prototype.constructor === Object;
}
var bindingsCache = /* @__PURE__ */ new WeakMap();
var deepBindingsCache = /* @__PURE__ */ new WeakMap();
var of = (property) => {
  let proxy = bindingsCache.get(property);
  if (!proxy) {
    const propCache = {};
    proxy = new Proxy(propCache, {
      get(target, prop, receiver) {
        let prop$;
        if (target.hasOwnProperty(prop)) {
          prop$ = Reflect.get(target, prop, receiver);
        }
        const propName = String(prop);
        if (!prop$ || prop$.isEnded) {
          prop$ = property.bind(get(propName), set(propName));
          propCache[propName] = prop$;
        }
        return prop$;
      }
    });
    bindingsCache.set(property, proxy);
  }
  return proxy;
};
var into = (property) => {
  let proxy = deepBindingsCache.get(property);
  let path = [];
  if (!proxy) {
    const propCache = {};
    proxy = new Proxy(propCache, {
      get(target, prop) {
        const propName = String(prop);
        if (propName === "$") {
          const cacheKey = "." + path.join(".");
          let cached = propCache[cacheKey];
          if (!cached || cached.isEnded) {
            const localPath = [...path];
            propCache[cacheKey] = property.bind(
              (value) => deepGet(value, localPath),
              (value, chunk) => deepSet(value, localPath, chunk)
            );
          }
          path.length = 0;
          return propCache[cacheKey];
        } else {
          path.push(propName);
          return proxy;
        }
      }
    });
    deepBindingsCache.set(property, proxy);
  }
  return proxy;
};
var fromEvent = (target, eventName, options = {}) => {
  const prop = Prop.pending();
  mergeEvent(prop, target, eventName, options);
  return prop;
};
var mergeEvent = (bus, target, eventName, options = {}) => {
  let callback;
  if (options.transform && typeof options.transform === "function") {
    callback = (event) => {
      bus.next(options.transform(event));
    };
  } else {
    callback = (event) => {
      bus.next(event);
    };
  }
  if (options.debounce && Number(options.debounce) > 0) {
    callback = debounce(callback, options.debounce, options.debounceLeading);
  } else if (options.throttle && Number(options.throttle) > 0) {
    callback = throttle(callback, options.throttle);
  }
  bus.onEnd(() => {
    target.removeEventListener(eventName, callback);
  });
  target.addEventListener(eventName, callback);
};
var fromPromise = (promise) => {
  const prop = Prop.pending();
  mergePromise(prop, promise);
  return prop;
};
var mergePromise = (prop, promise) => {
  promise.then((value) => {
    prop.next(value);
    prop.error.next(null);
  }).catch((error) => {
    if (error instanceof Error) {
      prop.error.next(error);
    } else {
      prop.error.next(new Error(error));
    }
  });
};
var walkObject = (x, basePath, callback) => {
  const keys = Object.keys(x);
  for (let i = 0; i < keys.length; i++) {
    const path = [...basePath, keys[i]];
    if (isPlainObject(x[keys[i]])) {
      walkObject(x[keys[i]], path, callback);
    } else {
      callback(x[keys[i]], path);
    }
  }
};
var deepGet = (x, path) => {
  if (path.length === 1) {
    return x[path[0]];
  } else {
    const [key, ...rest] = path;
    return deepGet(x[key], rest);
  }
};
var deepSet = (x, path, value) => {
  if (path.length === 1) {
    Object.assign(x, { [path[0]]: value });
  } else {
    const [key, ...rest] = path;
    if (x[key] === void 0) {
      Object.assign(x, { [key]: {} });
    }
    deepSet(x[key], rest, value);
  }
};
var merge = (...props) => {
  const prop = Prop.pending();
  for (let i = 0; i < props.length; i++) {
    prop.onEnd(props[i].subscribe((x) => {
      prop.next(x);
    }));
  }
  return prop;
};
var compose = (...props) => {
  const res = [];
  for (let i = 0; i < props.length; i++) {
    res.push(props[i].value);
  }
  const prop = new Prop(res);
  for (let i = 0; i < props.length; i++) {
    props[i].subscribe((x) => {
      res[i] = x;
      prop.next(res);
    });
  }
  return prop;
};
var composeObject = (template) => {
  const res = {}, props = new Array();
  walkObject(template, [], (x, path) => {
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
};
var not = (prop) => {
  return prop.map((x) => !x);
};
var every = (...props) => {
  return compose(...props).map((x) => x.every((x2) => x2));
};
var some = (...props) => {
  return compose(...props).map((x) => x.some((x2) => x2));
};
var once = (prop) => {
  prop.subscribe(() => prop.end());
  return prop;
};
var get = (key) => (value) => value[key];
var set = (key) => (value, chunkValue) => {
  if (value[key] !== chunkValue) {
    value[key] = chunkValue;
  }
};
var Prop = class {
  constructor(value, initialize = true) {
    this.callbacks = {};
    this.endCallbacks = [];
    this.ended = false;
    this.initialized = false;
    this.errorProp = null;
    this.subscriberCount = 0;
    this.set = this.next;
    this.watch = this.subscribe;
    if (initialize && value !== null) {
      this.setCurrentValue(value);
    }
  }
  static from(value) {
    return new Prop(value);
  }
  static pending() {
    return new Prop(null, false);
  }
  set value(value) {
    this.next(value);
  }
  getValue() {
    return this.currentValue;
  }
  get value() {
    return this.getValue();
  }
  next(value) {
    this.setCurrentValue(value);
    if (this.errorProp !== null && this.error.value !== null) {
      this.error.set(null);
    }
    for (let key in this.callbacks) {
      this.runCallback(key, value);
    }
  }
  tap() {
    this.next(this.currentValue);
  }
  update(updateFn) {
    updateFn(this.currentValue);
    this.tap();
  }
  subscribe(callback) {
    if (this.ended) {
      return () => {
      };
    }
    const key = String(this.subscriberCount++);
    this.callbacks[key] = callback;
    this.runCallback(key, this.currentValue);
    return () => {
      this.unsubscribe(key);
    };
  }
  unsubscribe(key) {
    if (this.callbacks[key]) {
      delete this.callbacks[key];
    }
  }
  filter(filterFn) {
    const prop = Prop.pending();
    prop.onEnd(this.subscribe((value) => {
      if (filterFn(value)) {
        prop.next(value);
      }
    }));
    return prop;
  }
  uniq() {
    const prop = Prop.pending();
    prop.onEnd(this.subscribe((value) => {
      if (prop.value !== value) {
        prop.next(value);
      }
    }));
    return prop;
  }
  map(mapper) {
    const prop = Prop.pending();
    prop.onEnd(this.subscribe((value) => prop.next(mapper(value))));
    return prop;
  }
  mapUniq(mapper) {
    const prop = Prop.pending();
    prop.onEnd(this.subscribe((value) => {
      const newValue = mapper(value);
      if (prop.value !== newValue) {
        prop.next(newValue);
      }
    }));
    return prop;
  }
  merge(...props) {
    for (let i = 0; i < props.length; i++) {
      this.onEnd(props[i].subscribe((x) => {
        this.next(x);
      }));
    }
  }
  bind(mapper, updater) {
    const prop = this.mapUniq(mapper);
    this.onEnd(prop.subscribe((x) => {
      this.update((value) => {
        updater(value, x);
      });
    }));
    return prop;
  }
  getError() {
    return this.errorPropInstance;
  }
  get error() {
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
  onEnd(callback) {
    this.endCallbacks.push(callback);
  }
  setCurrentValue(value) {
    this.initialized = true;
    if (this.currentValue !== value) {
      this.currentValue = value;
    }
  }
  get errorPropInstance() {
    if (!this.errorProp) {
      this.errorProp = Prop.pending();
    }
    return this.errorProp;
  }
  runCallback(key, value) {
    if (this.initialized && this.callbacks[key]) {
      this.callbacks[key](value);
    }
  }
};
export {
  Prop,
  compose,
  composeObject,
  every,
  fromEvent,
  fromPromise,
  get,
  into,
  merge,
  mergeEvent,
  mergePromise,
  not,
  of,
  once,
  set,
  some
};
