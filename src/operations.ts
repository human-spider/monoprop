import { Prop } from './prop.ts'
import type { PropValue } from './prop.ts'
import type { Maybe } from './helpers.ts'

export interface PropMapper<T, K> {
  (propValue: PropValue<T>): Maybe<K | PropValue<K>>
}

export const map = <T, K>(prop: Prop<T>, mapperFn: PropMapper<T, K>): Prop<K> => {
  // if parent prop is pending, the derived prop will stay pending too
  // if parent prop has value, derived prop will be initialized when initial value is passed to subscribe method
  const derived = Prop.pending<K>()
  derived.onEnd(prop.subscribe(propValue => {
    try {
      const newValue = mapperFn(propValue)
      // undefined is a special value that will skip prop update if error is not present
      if (newValue !== undefined) {
        derived.next(newValue)
      }
    } catch (error) {
      derived.setError(error)
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
    return propValue.value !== derived.last.value
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

export const merge = <T>(...props: Prop<T>[]): Prop<T> => {
  const prop = Prop.pending<T>();
  for (let i = 0; i < props.length; i++) {
    prop.onEnd(props[i].subscribe(x => {
      prop.next(x.value, x.error);
    }));
  }
  return prop;
}