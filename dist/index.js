(() => {
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined")
      return require.apply(this, arguments);
    throw new Error('Dynamic require of "' + x + '" is not supported');
  });

  // src/index.ts
  var import_throttle_debounce = __require("throttle-debounce");
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
      callback = (0, import_throttle_debounce.debounce)(options.debounce, callback, { atBegin: !!options.debounceLeading });
    } else if (options.throttle && Number(options.throttle) > 0) {
      callback = (0, import_throttle_debounce.throttle)(options.throttle, callback);
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
  var asyncUpdate = (prop, updateFn) => {
    mergePromise(prop, updateFn(prop.value));
  };
  var toPromise = (prop) => {
    return new Promise((resolve, reject) => {
      const unsub = prop.subscribe((x) => {
        resolve(x);
        unsub();
        errorUnsub();
      }, false);
      let errorSkipNext = prop.error.isInitialized;
      const errorUnsub = prop.error.subscribe((x) => {
        reject(x);
        unsub();
        errorUnsub();
      }, false);
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
      if (props[i] instanceof Prop) {
        res.push(props[i].value);
      } else {
        res.push(props[i]);
      }
    }
    const allPending = !props.find((x) => x.isInitialized);
    let prop;
    if (allPending) {
      prop = Prop.pending();
    } else {
      prop = new Prop(res);
    }
    for (let i = 0; i < props.length; i++) {
      if (props[i] instanceof Prop) {
        props[i].subscribe((x) => {
          res[i] = x;
          prop.next(res);
        });
      }
    }
    return prop;
  };
  var subscribe = (props, callbackFn) => {
    return compose(...props).subscribe((values) => {
      callbackFn(...values);
    });
  };
  var map = (props, mapperFn) => {
    const prop = compose(...props);
    return prop.map((values) => mapperFn(...values));
  };
  var filter = (props, filterFn) => {
    const prop = compose(...props);
    return prop.filter((values) => filterFn(...values));
  };
  var composeObject = (template) => {
    const res = {}, props = new Array();
    walkObject(template, [], (x, path) => {
      if (x instanceof Prop) {
        deepSet(res, path, x.value);
        props.push([path, x]);
      } else {
        deepSet(res, path, x);
      }
    });
    const allPending = !props.find((x) => x[1].isInitialized);
    let prop;
    if (allPending) {
      prop = Prop.pending();
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
  var get = (key) => (value) => value[key];
  var set = (key) => (value, chunkValue) => {
    if (value[key] !== chunkValue) {
      value[key] = chunkValue;
    }
  };
  var liftError = (prop) => {
    return [prop, prop.error];
  };
  var Prop = class {
    constructor(value, initialize = true) {
      this.callbacks = {};
      this.endCallbacks = [];
      this.ended = false;
      this.initialized = false;
      this.subscriberCount = 0;
      this._error = null;
      this.set = this.next;
      this.watch = this.subscribe;
      if (initialize && value !== void 0) {
        this.setCurrentValue(value);
      }
    }
    static pending() {
      return new Prop(void 0, false);
    }
    set value(value) {
      this.next(value);
    }
    getValue() {
      return this._value;
    }
    get value() {
      return this.getValue();
    }
    getError() {
      return this._error;
    }
    get isInitialized() {
      return this.initialized;
    }
    next(value) {
      this.setCurrentValue(value);
      this._error = null;
    }
    setError(error) {
    }
    tap() {
      if (this.isInitialized) {
        this.next(this._value);
      }
    }
    update(updateFn) {
      updateFn(this._value);
      this.tap();
    }
    subscribe(callback, notifyImmediately = true) {
      if (this.ended) {
        return () => {
        };
      }
      const key = String(this.subscriberCount++);
      this.callbacks[key] = callback;
      if (notifyImmediately) {
        this.runCallback(key, this._value);
      }
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
      const prop = this.deriveProp();
      prop.onEnd(this.subscribe((value) => {
        if (filterFn(value)) {
          prop.next(value);
        }
      }));
      return prop;
    }
    uniq() {
      const prop = this.deriveProp(this._value);
      prop.onEnd(this.subscribe((value) => {
        if (prop.value !== value) {
          prop.next(value);
        }
      }));
      return prop;
    }
    map(mapper) {
      const prop = this.deriveProp();
      prop.onEnd(this.subscribe((value) => prop.next(mapper(value))));
      return prop;
    }
    mapUniq(mapper) {
      const prop = this.deriveProp();
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
      if (this._value !== value) {
        this._value = value;
      }
    }
    runCallback(key, value) {
      if (this.initialized && this.callbacks[key]) {
        this.callbacks[key](value);
      }
    }
    deriveProp(initialValue = void 0) {
      return new Prop(initialValue, this.initialized);
    }
    runCallbacks() {
      for (let key in this.callbacks) {
        this.runCallback(key, this._value, this._error);
      }
    }
  };
})();
