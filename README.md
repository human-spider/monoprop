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

So far we have only defined side effects for a single Prop. This can be very limiting, and in real scenarios you will probably want to base your logic on more than one value. This is possible with `compose` method that takes two or more Props and returns a Prop that updates with a tuple of their current values whenever any of these Props changes.

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

Let's wrap an object in a Prop and see how you can work with its contents. The most simple way to access its properties is through basic `map` method.

```ts
  const prop = new Prop({
    count: 0
  })
  const count = prop.map(x => x.count)
  // or using get helper:
  const count = prop.map(get('count'))
```