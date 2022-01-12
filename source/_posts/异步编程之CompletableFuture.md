---
title: 异步编程之CompletableFuture
date: 2021-10-12 23:01:04
tags: [java]
categories: 后端
img: ../../../../images/2021/10-12/completablefuture-1.png
cover: ../../../../images/2021/10-12/completablefuture-1.png
---

在Java8中新增了`CompletableFuture`类，该类实现了`Future`和`CompletionStage`接口。提供了强大的`Future`扩展功能，简化了异步编程的复杂性，提供了函数式编程的能力。可通过异步回调方式处理结果，还可以对任务进行组合处理。<!-- more -->

# 概览

<div align=center><img src="../../../../images/2021/10-12/completable-mind.png" algin="center"/></div><!-- more -->



# 创建异步任务

`CompletableFuture`提供了四个静态方法来创建一个异步操作。

```java
// 无返回值
public static CompletableFuture<Void> runAsync(Runnable runnable)
public static CompletableFuture<Void> runAsync(Runnable runnable, Executor executor)
// 有返回值
public static <U> CompletableFuture<U> supplyAsync(Supplier<U> supplier)
public static <U> CompletableFuture<U> supplyAsync(Supplier<U> supplier, Executor executor)
```

没有指定`Executor`的话默认会使用`ForkJoinPool.commonPool()` 作为缺省线程池执行异步代码，其中`ForkJoinPool.commonPool()`核心线程数量为**CPU-1**核心数。如果指定线程池，则使用指定的线程池执行任务。

## runAsync

以`Runnable`函数式接口类型为参数，无返回值。

```java
private static void runAsync() throws Exception {
  // runAsync直接执行，无返回值
  CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
    System.out.println("runAsync线程名称: " + Thread.currentThread().getName());
  });
  future.get();
}

// runAsync线程名称: ForkJoinPool.commonPool-worker-1
```

##  supplyAsync

以`Supplier<U>`函数式接口类型为参数,`CompletableFuture`的计算结果类型为`U`。

```java
private static void supplyAsync() throws Exception {
  // supplyAsync支持返回值
  CompletableFuture<Long> future = CompletableFuture.supplyAsync(() -> {
    System.out.println("supplyAsync线程名称: " + Thread.currentThread().getName());
    return System.currentTimeMillis();
  });
  System.out.println("阻塞获取结果。结果为：" + future.get());
}

// supplyAsync线程名称: ForkJoinPool.commonPool-worker-1
// 阻塞获取结果。结果为：1640446068495
```

以异步场景为例，可与List结合使用。

```java
// 先将 List<Integer> 转换成 -> List<CompletableFuture<String>>的list 然后对这个list进行join操作
List<Integer> collect = Lists.newArrayList(2, 1, 3)
        .stream()
        .map(i -> CompletableFuture.supplyAsync(() -> {
            Uninterruptibles.sleepUninterruptibly(1, TimeUnit.SECONDS);
            return i;
        }))
        .collect(Collectors.toList())
        .stream()
        .map(CompletableFuture::join).collect(Collectors.toList());
```

# 异步回调

## thenRun/thenRunAsync

```java
public CompletableFuture<Void> thenRun(Runnable action);
```

执行完第一个任务再执行第二个任务，前后两个任务没有参数传递，第二个任务(`thenRun`)也没有返回值。

```java
private static void thenRun() throws Exception {
    // supplyAsync执行完成后执行thenRun(无参数，无返回)
    CompletableFuture<Void> future = CompletableFuture.supplyAsync(() -> {
        int result = new Random().nextInt(100);
        System.out.println("supplyAsync线程名称: " + Thread.currentThread().getName() + "。结果为：" + result);
        return result;
    }).thenRun(() -> {
        System.out.println("thenRun线程名称: " + Thread.currentThread().getName() + "。无参数，无返回值");
    });
    System.out.println("阻塞获取结果。结果为：" + future.get());
}

// supplyAsync线程名称: ForkJoinPool.commonPool-worker-1。结果为：64
// thenRun线程名称: main。无参数，无返回值
// 阻塞获取结果。结果为：null
```

### thenRun和thenRunAsync区别

```java
private static final Executor asyncPool = useCommonPool? ForkJoinPool.commonPool() : new ThreadPerTaskExecutor();

public CompletableFuture<Void> thenRun(Runnable action) {
	return uniRunStage(null, action);
}

public CompletableFuture<Void> thenRunAsync(Runnable action) {
	return uniRunStage(asyncPool, action);
}
```

如果在执行第一个任务的时候传入了一个自定义线程池：

- 调用`thenRun`方法执行第二个任务时，第二个任务和第一个任务共用一个线程池；
- 调用`thenRunAsync`方法执行第二个任务时，第一个任务使用自己传入的线程池，第二个任务使用`ForkJoinPool`；

后面所说的`thenAccept`和`thenAcceptAsync`、`thenApply`和`thenApplyAsync`等，它们之间的区别也是如此。

## thenAccept/thenAcceptAsync

```java
public CompletableFuture<Void> thenAccept(Consumer<? super T> action)
```

执行完第一个任务后，将执行结果作为入参传递到回调方法(`thenAccept`)中，回调方法无返回值。

```java
private static void thenAccept() throws Exception {
    // supplyAsync执行完成后执行thenAccept(参数为上个任务的结果，无返回值)
    CompletableFuture<Void> future = CompletableFuture.supplyAsync(() -> {
        int result = new Random().nextInt(100);
        System.out.println("supplyAsync线程名称: " + Thread.currentThread().getName() + "。结果为：" + result);
        return result;
    }).thenAccept(arg -> {
        int result = arg * 10;
        System.out.println("thenAccept线程名称: " + Thread.currentThread().getName() + "。结果为：" + result);
    });
    System.out.println("阻塞获取结果。结果为：" + future.get());
}

// supplyAsync线程名称: ForkJoinPool.commonPool-worker-1。结果为：66
// thenAccept线程名称: main。结果为：660
// 阻塞获取结果。结果为：null
```

## thenApply/thenApplyAsync

```java
public <U> CompletableFuture<U> thenApply(Function<? super T,? extends U> fn)
```

执行完第一个任务后，将执行结果作为入参传递到回调方法(`thenApply`)中，回调方法有返回值。

```java
private static void thenApply() throws Exception {
    // 执行完supplyAsync拿到返回结果后执行thenApply(参数为上个任务的结果，有返回值)
    CompletableFuture<Integer> future = CompletableFuture.supplyAsync(() -> {
        int result = new Random().nextInt(100);
        System.out.println("supplyAsync线程名称: " + Thread.currentThread().getName() + "。结果为：" + result);
        return result;
    }).thenApply(arg -> {
        int result = arg * 10;
        System.out.println("thenApply线程名称: " + Thread.currentThread().getName() + "。结果为：" + result);
        return result;
    });
    System.out.println("阻塞获取结果。结果为：" + future.get());
}

// supplyAsync线程名称: ForkJoinPool.commonPool-worker-1。结果为：44
// thenApply线程名称: main。结果为：440
// 阻塞获取结果。结果为：440
```

## exceptionally

```java
public CompletableFuture<T> exceptionally(Function<Throwable, ? extends T> fn)
```

某个任务执行异常时，执行的回调方法，并且将抛出异常作为参数，传递到回调方法，`exceptionally`方法有返回值。

```java
private static void exceptionally() throws Exception {
    // supplyAsync中发生异常进入exceptionally块，最终结果为exceptionally中返回值
    CompletableFuture<Object> future = CompletableFuture.supplyAsync(() -> {
        System.out.println("supplyAsync线程名称: " + Thread.currentThread().getName());
        throw new RuntimeException();
    }).exceptionally(e -> {
        e.printStackTrace();
        return "系统异常";
    });
    System.out.println("阻塞获取结果。结果为：" + future.get());
}

// supplyAsync线程名称: ForkJoinPool.commonPool-worker-1
// java.util.concurrent.CompletionException: java.lang.RuntimeException
// Caused by: java.lang.RuntimeException
//	at com.user.provider.utils.Test.lambda$exceptionally$19(Test.java:160)
//	at java.util.concurrent.CompletableFuture$AsyncSupply.run$$$capture(CompletableFuture.java:1590)
// 	... 7 more
// 阻塞获取结果。结果为：系统异常
```

## whenComplete

```java
public CompletableFuture<T> whenComplete(BiConsumer<? super T, ? super Throwable> action)
```

某个任务执行完成后，将上个任务的结果和异常传递到回调方法`whenComplete`中，无返回值。

```java
private static void whenComplete() throws Exception {
    // supplyAsync执行完成后执行whenComplete(参数为上个任务的结果，无返回值)
    CompletableFuture<Integer> future = CompletableFuture.supplyAsync(() -> {
        int result = new Random().nextInt(100);
        System.out.println("supplyAsync线程名称: " + Thread.currentThread().getName() + "。结果为：" + result);
        return result;
    }).whenComplete((arg, e) -> {
        System.out.println("whenComplete线程名称: " + Thread.currentThread().getName() + "。参数为：" + arg);
    });
    System.out.println("阻塞获取结果。结果为：" + future.get());
}

// supplyAsync线程名称: ForkJoinPool.commonPool-worker-1。结果为：66
// whenComplete线程名称: main。参数为：66
// 阻塞获取结果。结果为：66
```

## handle

```java
public <U> CompletableFuture<U> handle(BiFunction<? super T, Throwable, ? extends U> fn) 
```

某个任务执行完成后，将上个任务的结果和异常传递到回调方法`handle`中，有返回值。

```java
private static void handle() throws Exception {
    // supplyAsync执行完成后执行handle(参数为上个任务的结果，有返回值)
    CompletableFuture<Integer> future = CompletableFuture.supplyAsync(() -> {
        int result = new Random().nextInt(100);
        System.out.println("supplyAsync线程名称: " + Thread.currentThread().getName() + "。结果为：" + result);
        return result;
    }).handle((arg, e) -> {
        int result = arg * 10;
        System.out.println("handle线程名称: " + Thread.currentThread().getName() + "。结果为：" + result);
        return result;
    });
    System.out.println("阻塞获取结果。结果为：" + future.get());
}

// supplyAsync线程名称: ForkJoinPool.commonPool-worker-1。结果为：45
// handle线程名称: ForkJoinPool.commonPool-worker-1。结果为：450
// 阻塞获取结果。结果为：450
```

# 任务组合



## AND组合关系

```java
public <U,V> CompletableFuture<V> thenCombine(CompletionStage<? extends U> other, BiFunction<? super T,? super U,? extends V> fn)
public <U> CompletionStage<Void> thenAcceptBoth(CompletionStage<? extends U> other, BiConsumer<? super T, ? super U> action)
public CompletionStage<Void> runAfterBoth(CompletionStage<?> other, Runnable action)
```

`thenCombine`/`thenAcceptBoth`/`runAfterBoth`都表示：**将两个`CompletableFuture`组合起来，只有这两个都正常执行完成才会执行某个任务**。区别为：

- `thenCombine`：将两个任务的执行结果作为方法入参，传递到指定方法中，**有返回值**
- `thenAcceptBoth`: 会将两个任务的执行结果作为方法入参，传递到指定方法中，**无返回值**
- `runAfterBoth`：**不会把执行结果当做方法入参，没有返回值**

```java
private static void thenCombine() throws Exception {
    // supplyAsync1和supplyAsync2都执行完成后执行thenCombine(接收两个参数，有返回值)
    CompletableFuture<Integer> f1 = CompletableFuture.supplyAsync(() -> {
        System.out.println("supplyAsync1线程名称: " + Thread.currentThread().getName() + "。结果为：100");
        return 100;
    });
    CompletableFuture<Integer> f2 = CompletableFuture.supplyAsync(() -> {
        System.out.println("supplyAsync2线程名称: " + Thread.currentThread().getName() + "。结果为：200");
        return 200;
    });
    CompletableFuture<Integer> future = f1.thenCombine(f2, (arg1, arg2) -> {
        System.out.println("thenCombine线程名称: " + Thread.currentThread().getName() + "。结果1为：" + arg1 + "。结果2为：" + arg2);
        return arg1 + arg2;
    });
    System.out.println("阻塞获取结果。结果为：" + future.get());
}

// supplyAsync1线程名称: ForkJoinPool.commonPool-worker-1。结果为：100
// supplyAsync2线程名称: ForkJoinPool.commonPool-worker-1。结果为：200
// thenCombine线程名称: main。结果1为：100。结果2为：200
// 阻塞获取结果。结果为：300
```

## OR组合关系

```java
public <U> CompletionStage<U> applyToEither(CompletionStage<? extends T> other,Function<? super T, U> fn);
public CompletableFuture<Void> acceptEither(CompletionStage<? extends T> other, Consumer<? super T> action);
public CompletableFuture<Void> runAfterEither(CompletionStage<?> other, Runnable action);
```

`applyToEither`/`acceptEither`/`runAfterEither`都表示：将两个`CompletableFuture`组合起来，只要其中一个执行完了就会执行下个任务。

区别在于：

- `applyToEither`：将已经执行完成的任务结果作为方法入参，传递到指定方法中，**有返回值**
- `acceptEither`：将已经执行完成的任务结果作为方法入参，传递到指定方法中，**无返回值**
- `runAfterEither`：**不会把执行结果当做方法入参，没有返回值**

```java
private static void acceptEither() throws Exception {
    // supplyAsync1、supplyAsync2其中一个执行完成后执行acceptEither(接收一个参数，为f1、f2先执行完的结果。无返回值)
    Random random = new Random();
    CompletableFuture<Integer> f1 = CompletableFuture.supplyAsync(() -> {
        Uninterruptibles.sleepUninterruptibly(random.nextInt(200), TimeUnit.MILLISECONDS);
        System.out.println("supplyAsync1线程名称: " + Thread.currentThread().getName() + "。结果为：100");
        return 100;
    });
    CompletableFuture<Integer> f2 = CompletableFuture.supplyAsync(() -> {
        Uninterruptibles.sleepUninterruptibly(random.nextInt(200), TimeUnit.MILLISECONDS);
        System.out.println("supplyAsync2线程名称: " + Thread.currentThread().getName() + "。结果为：200");
        return 200;
    });
    CompletableFuture<Void> future = f1.acceptEither(f2, arg -> {
        System.out.println("acceptEither线程名称: " + Thread.currentThread().getName() + "。参数为：" + arg + "。无返回值");
    });
    System.out.println("阻塞获取结果。结果为：" + future.get());
}

// supplyAsync2线程名称: ForkJoinPool.commonPool-worker-2。结果为：200
// acceptEither线程名称: ForkJoinPool.commonPool-worker-2。参数为：200。无返回值
// 阻塞获取结果。结果为：null
```

## anyOf

```java
public static CompletableFuture<Object> anyOf(CompletableFuture<?>... cfs)
```

任意一个任务执行完，就执行`anyOf`返回的`CompletableFuture`。如果执行的任务异常，`anyOf`的`CompletableFuture`执行`get()`方法会抛出异常。

```java
private static void anyOf() throws Exception {
    Random random = new Random();
    CompletableFuture<Integer> f1 = CompletableFuture.supplyAsync(() -> {
        Uninterruptibles.sleepUninterruptibly(random.nextInt(200), TimeUnit.MILLISECONDS);
        System.out.println("supplyAsync1线程名称: " + Thread.currentThread().getName() + "。结果为：100");
        return 100;
    });
    CompletableFuture<Integer> f2 = CompletableFuture.supplyAsync(() -> {
        Uninterruptibles.sleepUninterruptibly(random.nextInt(100), TimeUnit.MILLISECONDS);
        System.out.println("supplyAsync2线程名称: " + Thread.currentThread().getName() + "。结果为：200");
        return 200;
    });
    CompletableFuture<Object> future = CompletableFuture.anyOf(f1, f2).whenComplete((arg, throwable) -> {
        System.out.println("anyOf线程名称: " + Thread.currentThread().getName() + "。参数为：" + arg + "。无返回值");
    });
    System.out.println("阻塞获取结果。结果为：" + future.get());
}

// supplyAsync2线程名称: ForkJoinPool.commonPool-worker-2。结果为：200
// anyOf线程名称: ForkJoinPool.commonPool-worker-2。参数为：200。无返回值
// 阻塞获取结果。结果为：200
```

## allOf

```java
public static CompletableFuture<Void> allOf(CompletableFuture<?>... cfs)
```

所有任务都执行完成后，才执行`allOf`返回的`CompletableFuture`。如果任意一个任务异常，`allOf`的`CompletableFuture`执行`get()`方法都会抛出异常。

```java
private static void allOf() throws Exception {
    Random random = new Random();
    CompletableFuture<Integer> f1 = CompletableFuture.supplyAsync(() -> {
        Uninterruptibles.sleepUninterruptibly(random.nextInt(200), TimeUnit.MILLISECONDS);
        System.out.println("supplyAsync1线程名称: " + Thread.currentThread().getName() + "。结果为：100");
        return 100;
    });
    CompletableFuture<Integer> f2 = CompletableFuture.supplyAsync(() -> {
        Uninterruptibles.sleepUninterruptibly(random.nextInt(100), TimeUnit.MILLISECONDS);
        System.out.println("supplyAsync2线程名称: " + Thread.currentThread().getName() + "。结果为：200");
        return 200;
    });
    CompletableFuture<Void> future = CompletableFuture.allOf(f1, f2).whenComplete((unused, throwable) -> {
        System.out.println("allOf线程名称: " + Thread.currentThread().getName() + "。参数为：" + unused + "。无返回值");
    });
    System.out.println("阻塞获取结果。结果为：" + future.get());
}


// supplyAsync2线程名称: ForkJoinPool.commonPool-worker-2。结果为：200
// supplyAsync1线程名称: ForkJoinPool.commonPool-worker-1。结果为：100
// allOf线程名称: ForkJoinPool.commonPool-worker-1。参数为：null。无返回值
// 阻塞获取结果。结果为：null
```

## thenCompose

```java
public <U> CompletableFuture<U> thenCompose(Function<? super T, ? extends CompletionStage<U>> fn)
```

在某个任务执行完成后，将该任务的执行结果作为方法入参去执行指定的方法。该方法会返回一个新的`CompletableFuture`实例。

```java
private static void thenCompose() throws Exception {
    Random random = new Random();
    CompletableFuture<Integer> future = CompletableFuture.supplyAsync(() -> {
        Uninterruptibles.sleepUninterruptibly(random.nextInt(200), TimeUnit.MILLISECONDS);
        System.out.println("supplyAsync线程名称: " + Thread.currentThread().getName() + "。结果为：100");
        return 100;
    }).thenCompose(arg -> CompletableFuture.supplyAsync(() -> {
        Uninterruptibles.sleepUninterruptibly(random.nextInt(100), TimeUnit.MILLISECONDS);
        System.out.println("thenCompose线程名称: " + Thread.currentThread().getName() + "。接收参数为：" + arg + "。返回：200");
        return 200;
    }));
    System.out.println("阻塞获取结果。结果为：" + future.get());
}

// supplyAsync线程名称: ForkJoinPool.commonPool-worker-1。结果为：100
// thenCompose线程名称: ForkJoinPool.commonPool-worker-2。接收参数为：100。返回：200
// 阻塞获取结果。结果为：200
```

# 注意事项

## CompletableFuture.get方法是阻塞的

`CompletableFuture`的`get()`方法是阻塞的，如果使用它来获取异步调用的返回值，最好添加超时时间。

> CompletableFuture.get()：获取返回值抛出异常。
>
> CompletableFuture.join()：获取返回值不抛出异常。

## 线程池

`CompletableFuture`默认使用`ForkJoinPool.commonPool`线程池，核心数量为服务器**CPU-1**。当有大量请求处理且任务耗时较久时就会响应很慢。建议使用自定义线程池，配置自定义线程池参数。

## Future需要获取返回值才能获取异常信息

```java
CompletableFuture<Void> future = CompletableFuture.supplyAsync(() -> {
    return 100 / 0;
}).thenAccept(System.out::println);

// 不加get()方法这一行，看不到异常信息
future.get();
```

`Future`需要获取返回值，才能获取到异常信息。如果不加 `get()`/`join()`方法，看不到异常信息。使用的时候需要考虑是否加`try...catch...`或者使用`exceptionally`方法。
