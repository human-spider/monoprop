import { throttle, debounce } from 'throttle-debounce';
import { Prop } from './prop'

type useEventOptions = { 
  throttle?: number,
  debounce?: number,
  debounceLeading?: boolean,
  transform?: (e: Event) => any
}

export const fromEvent = (target: Node, eventName: string, options: useEventOptions = {}): Prop<Event> => {
  const prop = Prop.pending<Event>();
  mergeEvent(prop, target, eventName, options);
  return prop;
}

export const mergeEvent = <T extends Event>(bus: Prop<T>, target: Node, eventName: string, options: useEventOptions = {}): void => {
  let callback;
  if (options.transform && typeof options.transform === 'function') {
    callback = (event) => {
      bus.next(options.transform!(event));
    }
  } else {
    callback = (event) => {
      bus.next(event);
    }
  }
  if (options.debounce && Number(options.debounce) > 0) {
    callback = debounce(options.debounce, callback, { atBegin: !!options.debounceLeading });
  } else if (options.throttle && Number(options.throttle) > 0) {
    callback = throttle(options.throttle, callback);
  }
  bus.onEnd(() => {
    target.removeEventListener(eventName, callback);
  })
  target.addEventListener(eventName, callback);
}
