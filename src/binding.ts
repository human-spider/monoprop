import { Prop } from "./prop";
import { mapUniq } from "./operations";
import { deepGet, deepSet } from "./helpers";
import type { PropValue } from "./prop";
import type { PropMapper } from './operations'


  
  // export const merge = <T>(...props: Prop<T>[]): Prop<Maybe<T>> => {
  //   const prop = Prop.pending<T>();
  //   for (let i = 0; i < props.length; i++) {
  //     prop.onEnd(props[i].subscribe(x => {
  //       prop.next(x);
  //     }));
  //   }
  //   return prop;
  // }
  
  
  
interface PropUpdater<T, K> {
  (propValue: T, chunkValue: PropValue<K>): T
}
  
export const bind = <T extends Object, K>(prop: Prop<T>, mapper: PropMapper<T, K>, updater: PropUpdater<T, K>): Prop<K> => {
  const derived = mapUniq(prop, mapper);
  let newValue
  prop.onEnd(derived.subscribe(chunkValue => {
    try {
      newValue = updater(prop.last.value, chunkValue)
    } catch (error) {
      prop.setError(error)
    }
    if (newValue !== undefined) {
      prop.set(newValue);
    } else {
      prop.tap()
    }
  }, false));
  return derived;
}

type GetterFn<T extends object, K extends keyof T> = { (value: PropValue<T>): T[K] }
type SetterFn<T extends object, K extends keyof T> = { (value: T, chunkValue: PropValue<T[K]>): T }
export const get = <T extends object, K extends keyof T>(key: K): GetterFn<T, K> => value => value.unwrap()[key]
export const set = <T extends object, K extends keyof T>(key: K): SetterFn<T, K> => (value, chunkValue) => {
  value[key] = chunkValue.unwrap()
  return value
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
          prop$ = bind(property, get(propName as keyof T) as PropMapper<T, T[keyof T]>, set(propName as keyof T));
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
            propCache[cacheKey] = bind(property,
              value => deepGet(value.unwrap(), localPath),
              (value, chunk) => {
                deepSet(value, localPath, chunk.unwrap())
                return value;
              }
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

  