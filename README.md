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

Prop always holds its latest value.

```ts
  console.log(prop.value) // prints 0
```

Define side effects using `subscribe` method. A function you pass to this method will be called every time Prop receives new value.

```ts
  // print value to console every time it changes
  prop.subscribe(value => console.log(value))
```

Assign new value to a Prop simply by assigning to `value` property.

```ts
  prop.value = 1 // prints 1
```

Create derived Props with `map` and `filter` methods.

```ts
  // create Prop that receives modified value returned by the function
  const squared = prop.map(value => value * value)

  // create Prop that receives only values for which the function returns true
  const onlyPositive = prop.filter(value => value > 0)
```

This is it for the basics of Monoprop. There's no book to read. Of course, this functionality alone is not enough to cover the needs of a modern application. Monoprop builds upon these simple blocks to provide many more convenient features, aiming to claim middle ground between minimalistic patterns such as React's `useState` hook and rich functional libraries that turn your code into abstract algebra. Let's take a look at more advanced features of Monoprop.

## Errors

Every `Prop` comes with built in error handling in form of `error` property, which is also a Prop.

```ts
  const divider = new Prop(0)
  const divisionResult = new Prop(0)
  divider.subscribe(value => {
    if (value === 0) {
      divisionResult.error.value = new Error('Division by zero!')
      divisionResult.value = Math.Infinity
    } else {
      divisionResult.value = Math.PI / value
    }
  })
  divisionResult.error.subscribe(console.error)
```
> Pushing an error to `error` property doesn't update the main value. You decide if you want this to happen. However, pushing a new value to the main property clears the error by setting it to `null`, so you don't have to worry about clearing errors associated with previous values. The `error` child prop does not exist until you first access it, so if you need the error to be completely independent, just use a separate `Prop` to represent it.

## Composition

So far we have only defined side effects for a single Prop. This can be very limiting, and in real scenarios you will probably want to base your logic on more than one value. The `subscribe` helper function lets you define side effects for multiple Props.

```ts
  subscribe([divisionResult, divisionResult.error], (result, error) => {
    if (!error && result > 10) {
      console.log('10 has been surpassed!')
    }
  })

  // liftError helper simplifies this common pattern
  subscribe(liftError(divisionResult), (result, error) => {
    ...
  })
```

You can also map and filter multiple props using `map` and `filter` helper methods that work in a similar fashion.

```ts
  // this will create a boolean prop that will tell whether 10 has been surpassed yet
  const is10Surpassed = map(
    liftError(divisionResult),
    (result, error) => !error && result > 10
  )

  // this will create a filtered prop that will return value and error only if 10 has been surpassed
  const onlyWhen10Surpassed = filter(
    liftError(divisionResult),
    (result, error) => !error && result > 10
  )
```

All of this works via the `compose` method that takes two or more Props and returns a Prop that updates with a tuple of their current values whenever any of these Props changes. You can use `compose` directly to create reusable composed props.

```ts
  const results = compose(divisionResult, divisionResult.error)
  results.subscribe(([result, error]) => {
    if (error) {
      handleError(error)
    } else {
      displayValue(value)
    }
  })
```

Another way to compose props is `composeObject` method that works in a similar way, but using the object structure.

```ts
  const results = composeObject({
    result: divisionResult,
    error: divisionResult.error
  })
  results.subscribe(({result, error}) => {
    if (error) {
      handleError(error)
    } else {
      displayValue(value)
    }
  })
```
These helpers allow you to easily build global (or semi-global) tracked state from any number of reactive pieces. But you can also choose to go top-down - Monoprop provides powerful methods to help you work with objects.

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