import { Prop } from "./prop.ts";

export const fromPromise = <T>(promise: Promise<T>): Prop<T> => {
  const prop = Prop.pending<T>();
  mergePromise(prop, promise);
  return prop;
}

export const mergePromise = <T>(prop: Prop<T>, promise: Promise<T>): void => {
  promise.then((value: T) => {
    prop.next(value);
  }, (error: any) => {
    if (error instanceof Error) {
      prop.setError(error);
    } else {
      prop.setError(new Error(error));
    }
  });
}