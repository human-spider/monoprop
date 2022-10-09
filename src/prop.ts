import type { Nullable, Maybe } from './helpers'

export class PropValue<T> {
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

interface PropCallback<T> {
  (propValue: PropValue<T>): void
}

export class PendingPropError extends Error {}

export class Prop<T> {
  #callbacks: { [key: symbol]: PropCallback<T> } = {};
  #endCallbacks: Function[] = [];
  #ended = false;
  #last: PropValue<T>
  #initialized: boolean = false

  static pending<T>(): Prop<T> {
    return new Prop<T>(undefined, new PendingPropError(), false);
  }

  constructor(value: Maybe<T>, error: Nullable<Error> = null, initialize = true) {
    this.#last = new PropValue(value, error)
    this.#initialized = initialize
  }

  get last(): PropValue<T> {
    return this.#last;
  }

  get initialized(): boolean {
    return this.#initialized;
  }

  next(value: T | PropValue<T>, error: Nullable<Error> = null): void {
    if (value instanceof PropValue) {
      this.#last = value
    } else {
      this.#last = new PropValue(value, error)
    }
    this.#initialized = true
    this.#runCallbacks()
  }

  set = this.next

  tap(): void {
    this.#runCallbacks()
  }

  setError(error: Error): void {
    this.next(this.last.value, error);
  }

  update(updateFn: (value: T) => T | PropValue<T>): void {
    try {
      this.next(updateFn(this.last.value))
    } catch (error) {
      this.setError(error)
    }
  }

  subscribe(callback: PropCallback<T>, notifyImmediately = this.#initialized): Function {
    if (this.#ended) {
      return () => {}
    }
    const key = Symbol();
    this.#callbacks[key] = callback;
    if (notifyImmediately) {
      this.#runCallback(key, this.last);
    }
    return () => {
      this.unsubscribe(key);
    };
  }

  watch = this.subscribe

  unsubscribe(key: symbol): void {
    if (this.#callbacks[key]) {
      delete this.#callbacks[key];      
    }
  }

  get ended() {
    return this.#ended;
  }

  end() {
    this.#ended = true;
    const keys = Object.getOwnPropertySymbols(this.#callbacks);
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

  get subscriberCount(): number {
    return Object.getOwnPropertySymbols(this.#callbacks).length;
  }

  #runCallbacks(): void {
    for (let key of Object.getOwnPropertySymbols(this.#callbacks)) {
      this.#runCallback(key, this.last)
    }
  }

  #runCallback(key: symbol, propValue: PropValue<T>): void {
    this.#callbacks[key]?.(propValue)
  }
}

interface FoldedValueCallback<T, K> {
  (value: T): K
}
interface FoldedErrorCallback<T> {
  (error: Nullable<Error>): void
}
interface FoldedCallback<T, K> {
  (propValue: PropValue<T>): K
} 
export const fold = <T, K>(onValue: FoldedValueCallback<T, K>, onError?: FoldedErrorCallback<T>): FoldedCallback<T, K> => {
  return propValue => onValue(propValue.unwrap(onError))
}