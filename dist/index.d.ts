declare module "helpers" {
    export type Nullable<T> = T | null;
    export type Maybe<T> = T | undefined;
    export const walkObject: (x: object, basePath: Array<string>, callback: (value: any, path: string[]) => void) => void;
    export const deepGet: <T extends object>(x: T, path: string[]) => any;
    export const deepSet: (x: object, path: string[], value: unknown) => void;
    export const isPlainObject: (obj: any) => obj is Object;
}
declare module "prop" {
    import type { Nullable, Maybe } from "helpers";
    export class PropValue<T> {
        #private;
        constructor(value: Maybe<T>, error: Nullable<Error>);
        unwrap(errorHandler?: (error: Error) => void): T;
        get value(): T;
        get error(): Nullable<Error>;
    }
    interface PropCallback<T> {
        (propValue: PropValue<T>): void;
    }
    export class Prop<T> {
        #private;
        static pending<T>(): Prop<T>;
        constructor(value: Maybe<T>, error?: Nullable<Error>, initialize?: boolean);
        get last(): PropValue<T>;
        get initialized(): boolean;
        next(value: T, error?: Nullable<Error>): void;
        set: (value: T, error?: Nullable<Error>) => void;
        tap(): void;
        setError(error: Error): void;
        update(updateFn: (value: T) => T): void;
        subscribe(callback: PropCallback<T>, notifyImmediately?: boolean): Function;
        watch: (callback: PropCallback<T>, notifyImmediately?: boolean) => Function;
        unsubscribe(key: string): void;
        get ended(): boolean;
        end(): void;
        onEnd(callback: Function): void;
        get subscriberCount(): number;
    }
}
declare module "operations" {
    import { Prop } from "prop";
    import type { PropValue } from "prop";
    import type { Maybe } from "helpers";
    export interface PropMapper<T, K> {
        (propValue: PropValue<T>): Maybe<K>;
    }
    export const map: <T, K>(prop: Prop<T>, mapperFn: PropMapper<T, K>) => Prop<K>;
    export const filter: <T>(prop: Prop<T>, filterFn: (value: PropValue<T>) => boolean) => Prop<T>;
    export const uniq: <T>(prop: Prop<T>) => Prop<T>;
    export const mapUniq: <T, K>(prop: Prop<T>, mapper: PropMapper<T, K>) => Prop<K>;
    export const merge: <T>(...props: Prop<T>[]) => Prop<T>;
}
declare module "binding" {
    import { Prop } from "prop";
    import type { PropValue } from "prop";
    import type { PropMapper } from "operations";
    interface PropUpdater<T, K> {
        (propValue: T, chunkValue: PropValue<K>): T;
    }
    export const bind: <T extends Object, K>(prop: Prop<T>, mapper: PropMapper<T, K>, updater: PropUpdater<T, K>) => Prop<K>;
    type GetterFn<T extends object, K extends keyof T> = {
        (value: PropValue<T>): T[K];
    };
    type SetterFn<T extends object, K extends keyof T> = {
        (value: T, chunkValue: PropValue<T[K]>): T;
    };
    export const get: <T extends object, K extends keyof T>(key: K) => GetterFn<T, K>;
    export const set: <T extends object, K extends keyof T>(key: K) => SetterFn<T, K>;
    type PropBindings<T extends object> = {
        [K in keyof T]: Prop<T[K]>;
    };
    export const of: <T extends object>(property: Prop<T>) => PropBindings<T>;
    type DeepPropBindings<T extends object> = {
        [K in keyof T]: T[K] extends object ? DeepPropBindings<T[K]> : {
            $: Prop<T[K]>;
        };
    } & {
        $: Prop<T>;
    };
    export const into: <T extends object>(property: Prop<T>) => DeepPropBindings<T>;
}
declare module "composition" {
    import { Prop } from "prop";
    import type { Maybe } from "helpers";
    type PropSubject<T> = T extends Prop<infer K> ? K : never;
    type ComposedPropValues<T> = T extends Prop<any>[] ? {
        [K in keyof T]: Maybe<PropSubject<T[K]>>;
    } : never;
    type ComposedProp<T> = T extends Prop<any>[] ? Prop<ComposedPropValues<T>> : never;
    export const tuple: <T extends Prop<any>[]>(...props: T) => ComposedProp<T>;
    type ObjectWithProps = {
        [key: string | symbol]: Prop<any> | ObjectWithProps;
    };
    type ComposedPropObject<T extends object> = {
        [K in keyof T]: T[K] extends Prop<infer P> ? Maybe<P> : T[K] extends ObjectWithProps ? ComposedPropObject<T[K]> : never;
    };
    type DictErrors<T extends object> = {
        [K in keyof T]: T[K] extends Prop<infer P> ? P : T[K] extends ObjectWithProps ? ComposedPropObject<T[K]> : never;
    };
    export class DictError<T extends Object> extends Error {
        errors: DictErrors<T>;
        constructor(errors: DictErrors<T>, message?: string);
    }
    export const dict: <T extends ObjectWithProps>(template: T) => Prop<ComposedPropObject<T>>;
    export const not: (prop: Prop<any>) => Prop<boolean>;
    export const every: (...props: Prop<any>[]) => Prop<boolean>;
    export const some: (...props: Prop<any>[]) => Prop<boolean>;
}
declare module "event" {
    import { Prop } from "prop";
    import type { Maybe } from "helpers";
    type useEventOptions = {
        map?: (event: Event) => Maybe<Event>;
        wrap?: <T extends Function>(callback: T) => T;
    };
    const emitterKinds: {
        dom: string[];
        onoff: string[];
        node: string[];
    };
    type EmitterLike<T extends keyof typeof emitterKinds> = Object & {
        [K in typeof emitterKinds[T][number]]: Function;
    };
    export const fromEvent: (target: EmitterLike<any>, eventName: string, options?: useEventOptions) => Prop<Event>;
    export const mergeEvent: <T extends Event>(prop: Prop<T>, target: EmitterLike<any>, eventName: string, options?: useEventOptions) => void;
}
declare module "promise" {
    import { Prop } from "prop";
    export const fromPromise: <T>(promise: Promise<T>) => Prop<T>;
    export const mergePromise: <T>(prop: Prop<T>, promise: Promise<T>) => void;
}
declare module "index" {
    export * from "prop";
    export * from "operations";
    export * from "composition";
    export * from "binding";
    export * from "promise";
    export * from "event";
}
