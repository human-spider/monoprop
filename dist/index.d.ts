declare type PropBindings<T extends object> = {
    [K in keyof T]: Prop<T[K]>;
};
export declare const of: <T extends object>(property: Prop<T>) => PropBindings<T>;
declare type DeepPropBindings<T extends object> = {
    [K in keyof T]: T[K] extends object ? DeepPropBindings<T[K]> : {
        $: Prop<T[K]>;
    };
} & {
    $: Prop<T>;
};
export declare const into: <T extends object>(property: Prop<T>) => DeepPropBindings<T>;
declare type useEventOptions = {
    throttle?: number;
    debounce?: number;
    debounceLeading?: boolean;
    transform?: (e: Event) => any;
};
export declare const fromEvent: (target: Node, eventName: string, options?: useEventOptions) => Prop<Maybe<Event>>;
export declare const mergeEvent: <T extends Event>(bus: Prop<Maybe<T>>, target: Node, eventName: string, options?: useEventOptions) => void;
export declare const fromPromise: <T>(promise: Promise<T>) => Prop<Maybe<T>>;
export declare const mergePromise: <T>(prop: Prop<T>, promise: Promise<T>) => void;
export declare const asyncUpdate: <T>(prop: Prop<T>, updateFn: (value: Maybe<T>) => Promise<T>) => void;
export declare const toPromise: <T>(prop: Prop<T>) => Promise<T>;
export declare const merge: <T>(...props: Prop<T>[]) => Prop<Maybe<T>>;
declare type PropSubject<T> = T extends Prop<infer K> ? K : never;
declare type ComposedProp<T> = T extends Prop<any>[] ? Prop<{
    [K in keyof T]: PropSubject<T[K]>;
}> : never;
export declare const compose: <T extends Prop<any>[]>(...props: T) => ComposedProp<T>;
declare type ObjectWithProps = {
    [key: string | symbol]: Prop<any> | ObjectWithProps;
};
declare type ComposedPropObject<T extends object> = {
    [K in keyof T]: T[K] extends Prop<infer P> ? P : T[K] extends ObjectWithProps ? ComposedPropObject<T[K]> : never;
};
export declare const composeObject: <T extends ObjectWithProps>(template: T) => Prop<ComposedPropObject<T>>;
export declare const not: (prop: Prop<any>) => Prop<boolean>;
export declare const every: (...props: Prop<any>[]) => Prop<boolean>;
export declare const some: (...props: Prop<any>[]) => Prop<boolean>;
declare type GetterFn<T extends object, K extends keyof T> = {
    (value: T): T[K];
};
declare type SetterFn<T extends object, K extends keyof T> = {
    (value: T, chunkValue: T[K]): void;
};
export declare const get: <T extends object, K extends keyof T>(key: K) => GetterFn<T, K>;
export declare const set: <T extends object, K extends keyof T>(key: K) => SetterFn<T, K>;
interface PropCallback<T> {
    (arg: Definitely<T>): void;
}
interface PropMapper<T, K> {
    (arg: Definitely<T>): Definitely<K>;
}
interface PropUpdater<T, K> {
    (propValue: T, chunkValue: K): void;
}
declare type Nullable<T> = T | null;
declare type Maybe<T> = T | undefined;
declare type Definitely<T> = T extends Maybe<any> ? Exclude<T, undefined> : T;
export declare class Prop<T> {
    protected callbacks: {
        [key: number]: PropCallback<T>;
    };
    protected endCallbacks: Function[];
    protected ended: boolean;
    protected currentValue: T;
    protected initialized: boolean;
    protected errorProp: Nullable<Prop<Maybe<Nullable<Error>>>>;
    protected subscriberCount: number;
    static pending<T>(): Prop<Maybe<T>>;
    constructor(value: T, initialize?: boolean);
    set value(value: T);
    getValue(): T;
    get value(): T;
    get isInitialized(): boolean;
    next(value: Definitely<T>): void;
    set: (value: Definitely<T>) => void;
    tap(): void;
    update(updateFn: (value: T) => void): void;
    subscribe(callback: PropCallback<T>, notifyImmediately?: boolean): Function;
    watch: (callback: PropCallback<T>, notifyImmediately?: boolean) => Function;
    unsubscribe(key: string): void;
    filter(filterFn: (arg: T) => boolean): Prop<T>;
    uniq(): Prop<T>;
    map<K>(mapper: PropMapper<T, K>): Prop<K>;
    mapUniq<K>(mapper: PropMapper<T, K>): Prop<K>;
    merge(...props: Prop<T>[]): void;
    bind<K>(mapper: PropMapper<T, K>, updater: PropUpdater<T, K>): Prop<K>;
    getError(): Prop<Maybe<Nullable<Error>>>;
    get error(): Prop<Maybe<Nullable<Error>>>;
    get isEnded(): boolean;
    end(): void;
    onEnd(callback: Function): void;
    protected setCurrentValue(value: T): void;
    protected get errorPropInstance(): Prop<Maybe<Nullable<Error>>>;
    protected runCallback(key: string, value: T): void;
    protected deriveProp<K>(initialValue?: K): Prop<K>;
}
export {};
