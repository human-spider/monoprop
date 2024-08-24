# Monoprop

Monoprop is a tiny library that provides easy to understand and ergonomic reactive primitives with minimal overhead. Unlike full featured (and huge) reactive libraries, such as RxJS, Monoprop uses just a single `Prop` class, which is designed to keep things simple, but still provide enough functionality to power an interactive application.

Monoprop is fast and memory efficient. It allows you to safely manage state without constantly cloning large objects.

Monoprop is designed to be explicit and feature no hidden flows. You only need to remember a couple of simple rules to always be sure your state is safe.

Monoprop is framework agnostic. Built with vanilla TS, it provides type safe abstractions for any architecture.

## Basics

To create a reactive value, wrap it in a `Prop`.

```ts
  const prop = new Prop(0)
```

Prop always holds its latest value, available by accessing the `last` property.

```ts
  console.log(prop.last.unwrap()) // prints 0
```

Define side effects using `subscribe` method. A function you pass to this method will be called every time Prop receives new value.

```ts
  // print value to console every time it changes
  prop.subscribe(value => console.log(value.unwrap()))
```

Assign new value to a Prop using `set` and `update` methods

```ts
  prop.set(1) // prints 1
  prop.update(value => value + 1) // prints 2
```

Create derived Props with `map` and `filter` functions.

```ts
  // create Prop that receives modified value returned by the function
  const squared = map(prop, value => Math.pow(value.unwrap(), 2))

  // create Prop that receives only values for which the function returns true
  const onlyPositive = filter(prop, value => value.unwrap() > 0)
```

This is it for the basics of Monoprop. There's no book to read. Of course, this functionality alone is not enough to cover the needs of a modern application. Monoprop builds upon these simple blocks to provide many more convenient features, aiming to claim the middle ground between minimalistic patterns such as React's `useState` hook and rich functional libraries like RxJS that turn your code into abstract algebra. Now let's take a deeper look at Monoprop's features.

## Errors

Monoprop is built with error handling in mind. When you update a Prop it wraps the value in a special `PropValue` wrapper that also optionally holds an error. From here you have several ways to check for and handle the error.

Get value and error using object destructuring.
```ts
  const { value, error } = prop.last
```

The `unwrap` method will return the value help by `PropValue`. If error is present, `unwrap` will throw the error instead. If you pass an optional callback function to the `unwrap` method, it will be called on error instead of throwing.
```ts
  const value = prop.last.unwrap() // throws the error if present
  const value = prop.last.unwrap(console.error) // logs the error to console instead of throwing it
```

You can set the error by passing it as an optional second argument to `set` method.
```ts
  const divider = new Prop(0)
  const divisionResult = new Prop(0)
  divider.subscribe(x => {
    const value = x.value
    if (value === 0) {
      divisionResult.set(Math.Infinity, new Error('Division by zero!'))
    } else {
      divisionResult.set(Math.PI / value)
    }
  })
```

If you are making a derived Prop using function like `map` or `filter`, any error thrown inside the callback will be automatically caught and passed to the resulting Prop. So the above example simplifies to the following.
```ts
  const divider = new Prop(0)
  const divisionResult = map(prop, x => {
    const value = x.unwrap()
    if (value === 0) {
      throw new Error('Division by zero!')
    }
    return Math.PI / value
  })
```

Note that when you call `unwrap` inside `map` callback, the error is automatically passed to the derived prop. This means that you don't have to worry about handling errors every time you make a derived Prop. In the above example, if `divider` Prop held an error, it will be passed to the `divisionResult` prop when we unwrap its value, and the division result will not be calculated (since the value is probably not valid).

Another way to handle errors in callbacks is `fold` function, which takes a callback receiving a PropValue and produces a function that takes two callbacks - one receiving unwrapped value and one receiving error.

```ts
  const divider = new Prop(0)
  const divisionResult = new Prop(0)
  divider.subscribe(fold(value => {
    if (value === 0) {
      divisionResult.set(Math.Infinity, new Error('Division by zero!'))
    } else {
      divisionResult.set(Math.PI / value)
    }
  }, console.error)

  // or

  const divisionResult = map(prop, fold(value => {
    if (value === 0) {
      throw new Error('Division by zero!')
    }
    return Math.PI / value
  }, console.error)
```

You can also call `setError` method to push an error to the Prop. In this case the previous prop value will be retained. Throwing an error inside `map` callback in equivalent to calling `setError` on resulting Prop and will also retain its previous value.

```ts
  const divider = new Prop(0)
  const divisionResult = new Prop(0)
  divider.subscribe(x => {
    const { value, error } = x
    if (error) {
      divisionResult.setError(error)
    } else if (value === 0) {
      divisionResult.set(Math.Infinity, new Error('Division by zero!'))
    } else {
      divisionResult.set(Math.PI / value)
    }
  })
```

## Composition

So far we have only defined side effects for a single Prop. This can be very limiting, and in real scenarios you will probably want to base your logic on more than one value. To enable this, Monoprop features helper functions that allow you to take multiple Props and combine them into a single Prop in a verbose and explicit way.

The `tuple` function takes multiple Props as arguments and returns a Prop wrapping an array of values held by those Props. The resulting Prop will notify its subscribers every time any of the source Props is updated. Once you create a tuple, you can `subscribe` to it, `map` it, and `filter` it just like any Prop.

```ts
  const num = Prop(0)
  const str = Prop('')
  const composed = tuple(num, str)
  composed.subscribe(x => {
    console.log(x.unwrap()) // prints [0, '']
  })
  composed.subscribe(fold(([num, str]) => {
    console.log(x.unwrap()) // prints [0, '']
  }, console.error))
```

## Objects and two-way binding

Let's wrap an object in a Prop and see how you can work with its contents. The most simple way to access its properties is through basic `map` method, which creates an one way binding in the form of child Prop that will follow the value of the `count` property of the parent Prop's value.

```ts
  const prop = new Prop({
    count: 0
  })
  const count = prop.map(x => x.count)
  // or using get helper:
  const count = prop.map(get('count'))
```
You can create a two-way binding by using the `bind` method, which takes a setter function in addition to a getter function, and returns a Prop that will update the parent every time child prop is updated.

```ts
  const count = prop.bind(
    value => value.count
    (value, countValue) => { value.count = countValue }
  )

  // or using get and set helpers:
  const count = prop.bind(get('count'), set('count'))

  count.set(3) // prop value is now { count: 3 }
```

This common pattern can be used to bind object properties to form value, and many more things. However, it can be tedious to manually define bindings for all properties you need to expose. The `of` helper provides a much shorted way to create two way bindings for properties.

```ts
  const count = of(prop).count
  count.value = 3  // prop value is now { count: 3 }
```

This form has more advantages than just being shorter. The `of` helper will cache and reuse bindings for you, so it's safe to call `of(prop).count` many times without polluting the memory with identical props.

```ts
  // the following calls do not create new props
  of(prop).count.subscribe(console.log)
  of(prop).count.value = 3
  of(prop).count.map(x => -x)
```

The `of` helper is type safe - if the base object has a defined type, properties accessed via `of` helper will carry over their types to derived Props. In the above case, `of(prop).count` has type `Prop<number>`. `of` will also tell you if you're trying to access a property that doesn't exist on the target object.

The `of` helper only allows you to access top level properties of the target object. To traverse deeper into nested objects, Monoprop also provides the `into` helper, which works in a similar way and also provides caching and type safety for derived Props.

```ts
  const prop = new Prop({
    inner: {
      count: 0
    }
  })
  const count = into(prop).inner.count.$
  count.value = 3 // prop value is now { inner: { count: 3 } }
```

The main difference compared to `of` helper is that you have to use special `.$` property at the end to specify that you're done traversing the object and want to get a property at the current level instead of going deeper into it.

> Bindings can be fragile, so use them carefully. A sure way to break your bindings is to change the structure of the target object so that the target property no longer exists on it. This is especially true when using the `into` helper, as the number of things that can go wrong increases as you deal with more nested properties that can be removed. If you actually need to handle the case where properties may not exist, use `bind` method with custom getter and setter functions that can handle this case.

> Another gotcha is that all other ways to make derived properties create one-way bindings, so attaching bindings to derived props created with functions like `map` and `filter` will not let you update the target prop. To avoid issues, always attach bindings to props that directly hold the target object.