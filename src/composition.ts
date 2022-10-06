import { deepSet, walkObject, isPlainObject } from './helpers';
import { map } from './operations';
import { Prop } from './prop'
import type { PropValue } from './prop'
import type { Maybe, Nullable } from './helpers'

type PropSubject<T> = T extends Prop<infer K> ? K : never
type ComposedPropValues<T> = T extends Prop<any>[] ?
  {[K in keyof T]: Maybe<PropSubject<T[K]>>}
  : never
type ComposedProp<T> = T extends Prop<any>[] ?
  Prop<ComposedPropValues<T>> 
  : never

const getAggregateError = (props: Prop<any>[]): Nullable<AggregateError> => {
  let errors = [] as Error[]
  for(let i = 0; i < props.length; i++) {
    if (props[i] instanceof Prop && props[i].last.error) {
      errors[i] = (props[i].last.error!)
    }
  }
  if (!errors.length) {
    return null
  }
  return AggregateError(errors)
}

export const tuple = <T extends Array<Prop<any>>>(...props: T): ComposedProp<T> => {
  const values = [] as PropSubject<T[keyof T]>[]
  let initialized = false
  for (let i = 0; i < props.length; i++) {
    if (props[i] instanceof Prop) {
      values.push(props[i].last.value);
      initialized ||= props[i].initialized
    } else {
      values.push(props[i] as any);
    }
  }
  let prop
  if (initialized) {
    prop = new Prop(values, getAggregateError(props)) as ComposedProp<T>
  } else {
    prop = Prop.pending<ComposedPropValues<T>>()
  }
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
  [K in keyof T]: T[K] extends Prop<infer P> ? Maybe<P>
    : T[K] extends ObjectWithProps ? 
      ComposedPropObject<T[K]> 
      : never 
}
type DictErrors<T extends object> = {
  [K in keyof T]: T[K] extends Prop<infer P> ? P
    : T[K] extends ObjectWithProps ? 
      ComposedPropObject<T[K]> 
      : never 
}

export class DictError<T extends Object> extends Error {
  errors: DictErrors<T>

	constructor(errors: DictErrors<T>, message = '') {
		super(message);
		if (!isPlainObject(errors)) {
			throw new TypeError(`${errors} is not a plain object`);
		}
		this.errors = errors;
	}
}

const getDictError = <T extends ObjectWithProps>(template: T): Nullable<DictError<T>> => {
  let result = {} as DictErrors<T>, errors: Array<Error> = []

  walkObject(template, [], (x, path: string[]) => {
    if (x instanceof Prop) {
      if (x.last.error) {
        deepSet(result, path, x.last.error);
        errors.push(x.last.error);
      }
    } else {
      deepSet(result, path, x)
    }
  });

  if (!errors.length) {
    return null
  }
  return new DictError(result)
}

export const dict = <T extends ObjectWithProps>(template: T): Prop<ComposedPropObject<T>> => {
  const res = {} as ComposedPropObject<T>,
    props: Array<Prop<any>> = new Array(),
    paths: string[][] = []
  let initialized: boolean = false
  walkObject(template, [], (x, path: string[]) => {
    if (x instanceof Prop) {
      deepSet(res, path, x.last.value);
      props.push(x);
      paths.push(path)
      initialized ||= x.initialized
    } else {
      deepSet(res, path, x)
    }
  })
  let prop
  if (initialized) {
    prop = new Prop(res, getDictError(template))
  } else {
    prop = Prop.pending<ComposedPropObject<T>>()
  }
  for (let i = 0; i < props.length; i++) {
    props[i].subscribe((newValue) => {
      deepSet(res, paths[i], newValue.value)
      prop.next(res, getDictError(template))
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