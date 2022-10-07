var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var __privateWrapper = (obj, member, setter, getter) => ({
  set _(value) {
    __privateSet(obj, member, value, setter);
  },
  get _() {
    return __privateGet(obj, member, getter);
  }
});
var __privateMethod = (obj, member, method) => {
  __accessCheck(obj, member, "access private method");
  return method;
};

// src/prop.ts
var _value, _error;
var PropValue = class {
  constructor(value, error) {
    __privateAdd(this, _value, void 0);
    __privateAdd(this, _error, void 0);
    if (value !== void 0) {
      __privateSet(this, _value, value);
    }
    __privateSet(this, _error, error);
  }
  unwrap(errorHandler = (error) => {
    throw error;
  }) {
    if (this.error) {
      errorHandler(this.error);
    }
    return this.value;
  }
  get value() {
    return __privateGet(this, _value);
  }
  get error() {
    return __privateGet(this, _error);
  }
};
_value = new WeakMap();
_error = new WeakMap();
var _callbacks, _endCallbacks, _ended, _subscriberCount, _last, _initialized, _runCallbacks, runCallbacks_fn, _runCallback, runCallback_fn;
var _Prop = class {
  constructor(value, error = null, initialize = true) {
    __privateAdd(this, _runCallbacks);
    __privateAdd(this, _runCallback);
    __privateAdd(this, _callbacks, {});
    __privateAdd(this, _endCallbacks, []);
    __privateAdd(this, _ended, false);
    __privateAdd(this, _subscriberCount, 0);
    __privateAdd(this, _last, void 0);
    __privateAdd(this, _initialized, false);
    this.set = this.next;
    this.watch = this.subscribe;
    __privateSet(this, _last, new PropValue(value, error));
    __privateSet(this, _initialized, initialize);
  }
  static pending() {
    return new _Prop(void 0, null, false);
  }
  get last() {
    return __privateGet(this, _last);
  }
  get initialized() {
    return __privateGet(this, _initialized);
  }
  next(value, error = null) {
    __privateSet(this, _last, new PropValue(value, error));
    __privateSet(this, _initialized, true);
    __privateMethod(this, _runCallbacks, runCallbacks_fn).call(this);
  }
  tap() {
    __privateMethod(this, _runCallbacks, runCallbacks_fn).call(this);
  }
  setError(error) {
    this.next(this.last.value, error);
  }
  update(updateFn) {
    try {
      this.next(updateFn(this.last.value));
    } catch (error) {
      this.setError(error);
    }
  }
  subscribe(callback, notifyImmediately = __privateGet(this, _initialized)) {
    if (__privateGet(this, _ended)) {
      return () => {
      };
    }
    const key = String(__privateWrapper(this, _subscriberCount)._++);
    __privateGet(this, _callbacks)[key] = callback;
    if (notifyImmediately) {
      __privateMethod(this, _runCallback, runCallback_fn).call(this, key, this.last);
    }
    return () => {
      this.unsubscribe(key);
    };
  }
  unsubscribe(key) {
    if (__privateGet(this, _callbacks)[key]) {
      delete __privateGet(this, _callbacks)[key];
    }
  }
  get ended() {
    return __privateGet(this, _ended);
  }
  end() {
    __privateSet(this, _ended, true);
    const keys = Object.keys(__privateGet(this, _callbacks));
    for (let i = 0; i < keys.length; i++) {
      this.unsubscribe(keys[i]);
    }
    for (let i = 0; i < __privateGet(this, _endCallbacks).length; i++) {
      __privateGet(this, _endCallbacks)[i]();
    }
    __privateGet(this, _endCallbacks).length = 0;
  }
  onEnd(callback) {
    __privateGet(this, _endCallbacks).push(callback);
  }
  get subscriberCount() {
    return Object.keys(__privateGet(this, _callbacks)).length;
  }
};
var Prop = _Prop;
_callbacks = new WeakMap();
_endCallbacks = new WeakMap();
_ended = new WeakMap();
_subscriberCount = new WeakMap();
_last = new WeakMap();
_initialized = new WeakMap();
_runCallbacks = new WeakSet();
runCallbacks_fn = function() {
  for (let key in __privateGet(this, _callbacks)) {
    __privateMethod(this, _runCallback, runCallback_fn).call(this, key, this.last);
  }
};
_runCallback = new WeakSet();
runCallback_fn = function(key, propValue) {
  __privateGet(this, _callbacks)[key]?.(propValue);
};

// src/operations.ts
var map = (prop, mapperFn) => {
  const derived = Prop.pending();
  derived.onEnd(prop.subscribe((propValue) => {
    try {
      const newValue = mapperFn(propValue);
      if (newValue !== void 0) {
        derived.next(newValue);
      }
    } catch (error) {
      derived.setError(error);
    }
  }));
  return derived;
};
var filter = (prop, filterFn) => {
  return map(prop, (propValue) => {
    if (!filterFn(propValue)) {
      return void 0;
    }
    return propValue.unwrap();
  });
};
var uniq = (prop) => {
  const derived = filter(prop, (propValue) => {
    return propValue.value !== derived.last.value;
  });
  return derived;
};
var mapUniq = (prop, mapper) => {
  const derived = map(prop, (propValue) => {
    const newValue = mapper(propValue);
    if (newValue === derived.last.value) {
      return void 0;
    }
    return newValue;
  });
  return derived;
};
var merge = (...props) => {
  const prop = Prop.pending();
  for (let i = 0; i < props.length; i++) {
    prop.onEnd(props[i].subscribe((x) => {
      prop.next(x.value, x.error);
    }));
  }
  return prop;
};

// src/helpers.ts
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
var isPlainObject = (obj) => {
  if (!obj)
    return false;
  const prototype = Object.getPrototypeOf(obj);
  return prototype === null || prototype.constructor === Object;
};

// src/composition.ts
var getAggregateError = (props) => {
  let errors = [];
  for (let i = 0; i < props.length; i++) {
    if (props[i] instanceof Prop && props[i].last.error) {
      errors[i] = props[i].last.error;
    }
  }
  if (!errors.length) {
    return null;
  }
  return AggregateError(errors);
};
var tuple = (...props) => {
  const values = [];
  let initialized = false;
  for (let i = 0; i < props.length; i++) {
    if (props[i] instanceof Prop) {
      values.push(props[i].last.value);
      initialized ||= props[i].initialized;
    } else {
      values.push(props[i]);
    }
  }
  let prop;
  if (initialized) {
    prop = new Prop(values, getAggregateError(props));
  } else {
    prop = Prop.pending();
  }
  for (let i = 0; i < props.length; i++) {
    if (props[i] instanceof Prop) {
      props[i].subscribe((x) => {
        values[i] = x.value;
        prop.next(values, getAggregateError(props));
      });
    }
  }
  return prop;
};
var DictError = class extends Error {
  constructor(errors, message = "") {
    super(message);
    if (!isPlainObject(errors)) {
      throw new TypeError(`${errors} is not a plain object`);
    }
    this.errors = errors;
  }
};
var getDictError = (template) => {
  let result = {}, errors = [];
  walkObject(template, [], (x, path) => {
    if (x instanceof Prop) {
      if (x.last.error) {
        deepSet(result, path, x.last.error);
        errors.push(x.last.error);
      }
    } else {
      deepSet(result, path, x);
    }
  });
  if (!errors.length) {
    return null;
  }
  return new DictError(result);
};
var dict = (template) => {
  const res = {}, props = new Array(), paths = [];
  let initialized = false;
  walkObject(template, [], (x, path) => {
    if (x instanceof Prop) {
      deepSet(res, path, x.last.value);
      props.push(x);
      paths.push(path);
      initialized ||= x.initialized;
    } else {
      deepSet(res, path, x);
    }
  });
  let prop;
  if (initialized) {
    prop = new Prop(res, getDictError(template));
  } else {
    prop = Prop.pending();
  }
  for (let i = 0; i < props.length; i++) {
    props[i].subscribe((newValue) => {
      deepSet(res, paths[i], newValue.value);
      prop.next(res, getDictError(template));
    });
  }
  return prop;
};
var not = (prop) => {
  return map(prop, (x) => !x.unwrap());
};
var every = (...props) => {
  return map(tuple(...props), (x) => x.unwrap().every((x2) => x2));
};
var some = (...props) => {
  return map(tuple(...props), (x) => x.unwrap().some((x2) => x2));
};

// src/binding.ts
var bind = (prop, mapper, updater) => {
  const derived = mapUniq(prop, mapper);
  let newValue;
  prop.onEnd(derived.subscribe((chunkValue) => {
    try {
      newValue = updater(prop.last.value, chunkValue);
    } catch (error) {
      prop.setError(error);
    }
    if (newValue !== void 0) {
      prop.set(newValue);
    } else {
      prop.tap();
    }
  }, false));
  return derived;
};
var get = (key) => (value) => value.unwrap()[key];
var set = (key) => (value, chunkValue) => {
  value[key] = chunkValue.unwrap();
  return value;
};
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
        if (!prop$ || prop$.ended) {
          prop$ = bind(property, get(propName), set(propName));
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
          if (!cached || cached.ended) {
            const localPath = [...path];
            propCache[cacheKey] = bind(
              property,
              (value) => deepGet(value.unwrap(), localPath),
              (value, chunk) => {
                deepSet(value, localPath, chunk.unwrap());
                return value;
              }
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

// src/promise.ts
var fromPromise = (promise) => {
  const prop = Prop.pending();
  mergePromise(prop, promise);
  return prop;
};
var mergePromise = (prop, promise) => {
  promise.then((value) => {
    prop.next(value);
  }, (error) => {
    if (error instanceof Error) {
      prop.setError(error);
    } else {
      prop.setError(new Error(error));
    }
  });
};

// src/event.ts
var emitterKinds = {
  dom: ["addEventListener", "removeEventListener"],
  node: ["addListener", "removeListener"]
};
var fromEvent = (target, eventName, options = {}) => {
  const prop = Prop.pending();
  mergeEvent(prop, target, eventName, options);
  return prop;
};
var mergeEvent = (prop, target, eventName, options = {}) => {
  const mapFn = options.map || ((x) => x);
  const wrapFn = options.wrap || ((x) => x);
  const emitterKind = getEmitterKind(target);
  const callback = getCallbackForEmitterKind(prop, emitterKind, mapFn, wrapFn);
  mergeEmitter(prop, target, emitterKind, eventName, callback);
};
var mergeEmitter = (prop, target, kind, eventName, callback) => {
  const [onMethod, offMethod] = emitterKinds[kind];
  prop.onEnd(() => {
    target[offMethod](eventName, callback);
  });
  target[onMethod](eventName, callback);
};
var getEmitterKind = (target) => {
  for (let kind in emitterKinds) {
    if (isEmitterKind(target, kind)) {
      return kind;
    }
  }
  throw new TypeError(`target is not emitter like`);
};
var isEmitterKind = (target, kind) => emitterKinds[kind].every((key) => target[key] instanceof Function);
var getCallbackForEmitterKind = (prop, emitterKind, mapFn, wrapFn) => {
  if (emitterKind === "dom") {
    return wrapFn((event) => {
      prop.next(mapFn(event));
    });
  }
  if (emitterKind === "node") {
    return wrapFn((...args) => {
      prop.next(mapFn(args));
    });
  }
  throw new TypeError(`emitterKind must be one of: ${Object.keys(emitterKinds)}`);
};
export {
  DictError,
  Prop,
  PropValue,
  bind,
  dict,
  every,
  filter,
  fromEvent,
  fromPromise,
  get,
  into,
  map,
  mapUniq,
  merge,
  mergeEvent,
  mergePromise,
  not,
  of,
  set,
  some,
  tuple,
  uniq
};
