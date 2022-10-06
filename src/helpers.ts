export type Nullable<T> = T | null
export type Maybe<T> = T | undefined

export const walkObject = (x: object, basePath: Array<string>, callback: (value: any, path: string[]) => void): void => {
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

export const deepGet = <T extends object>(x: T, path: string[]): any => {
  if (path.length === 1) {
    return x[path[0]];
  } else {
    const [key, ...rest] = path
    return deepGet(x[key], rest);
  }
}
  
export const deepSet = (x: object, path: string[], value: unknown): void => {
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

export const isPlainObject = (obj: any): obj is Object => {
  if (!obj) return false;
  const prototype = Object.getPrototypeOf(obj);
  return prototype === null || prototype.constructor === Object;
}