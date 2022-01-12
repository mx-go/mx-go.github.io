---
title: 异步编程之ExecutorCompletionService
date: 2021-11-27 16:54:40
tags: [java]
categories: 后端
cover: ../../../../images/2022/1-3/executecompletionservice-cover.jpeg
---

[ExecutorCompletionService](https://jdk6.net/util-concurrent/ExecutorCompletionService.html)是JDK1. 6中新增的异步类，可获取异步执行的结果。有着相同功能的`ExcutorService`中`Future.get`方法是阻塞的直到返回结果，也就是顺序执行`get`方法，即使后续任务先执行完成也会阻塞在前面的任务的`get`方法。而`ExecutorCompletionService`执行结果无序且线程池中先执行完成的任务会先执行后续的逻辑，不会发生阻塞。<!-- more -->

## 异步任务获取结果方式

多线程异步任务获取结果最常见的方式莫过于重写`Callable`接口，然后通过`future.get()`获取结果。但这种方法弊端很明显，`get`方法会产生阻塞，导致任务耗时增加。当前有三种方法可以实现异步任务获取结果：

1. 重写`Callable`，通过`future.get`获取结果。
2. `CompletableFuture`异步通过`join`方法获取结果。
3. 通过`ExecutorCompletionService`获取结果。

### Callable

```java
/**
 * 初始化固定大小为3的线程池
 */
private final static ExecutorService EXECUTOR = Executors.newFixedThreadPool(3);

public static void main(String[] args) {
    method1();
    //method2();
}

@SneakyThrows
private static void method1() {
    List<Task> tasks = getTasks();

    long start = System.currentTimeMillis();
    for (Future<Integer> future : EXECUTOR.invokeAll(tasks)) {
        Integer result = future.get();
        // 模拟其他业务逻辑
        Uninterruptibles.sleepUninterruptibly(1, TimeUnit.SECONDS);
        System.out.println("任务返回结果：" + result);
    }
    System.out.println("共耗时：" + (System.currentTimeMillis() - start));
    // 关闭线程池
    EXECUTOR.shutdown();
}

@SneakyThrows
private static void method2() {
    List<Task> tasks = getTasks();

    long start = System.currentTimeMillis();
    List<Future<Integer>> futures = new ArrayList<>();
    for (Task task : tasks) {
        futures.add(EXECUTOR.submit(task));
    }

    // 遍历Future list，通过get()方法获取每个future结果
    for (Future<Integer> future : futures) {
        Integer result = future.get();
        // 模拟其他业务逻辑
        Uninterruptibles.sleepUninterruptibly(1, TimeUnit.SECONDS);
        System.out.println("任务返回结果：" + result);
    }
    System.out.println("共耗时：" + (System.currentTimeMillis() - start));
    // 关闭线程池
    EXECUTOR.shutdown();
}

public static List<Task> getTasks() {
    List<Task> tasks = new ArrayList<>();
    tasks.add(new Task(5));
    tasks.add(new Task(3));
    tasks.add(new Task(1));
    return tasks;
}

static class Task implements Callable<Integer> {

    /**
     * 秒级时间
     */
    public int time;

    public Task(int time) {
        this.time = time;
    }

    @Override
    public Integer call() {
        Uninterruptibles.sleepUninterruptibly(time, TimeUnit.SECONDS);
        return time;
    }
}
```

`method1`和`method2`执行结果相同，输出结果如下：

```ASN.1
任务返回结果：5
任务返回结果：3
任务返回结果：1
共耗时：8039
```

为什么说`future.get()`阻塞获取结果，可以通过下图看出，只有等**任务1**`get`到任务结果并执行完成后续所有业务逻辑后才会轮到下一个任务执行后续逻辑，且`get`方法按照提交顺序获取结果。总结为：**先添加先处理**。

<div align=center><img width="600" height="400" src="../../../../images/2022/1-3/Callable.png" algin="center"/></div>

### CompletableFuture

```java
/**
 * 初始化固定大小为3的线程池
 */
private final static ExecutorService EXECUTOR = Executors.newFixedThreadPool(3);

public static void main(String[] args) {
    completableFuture();
}

private static void completableFuture() {
    List<Task> tasks = getTasks();

    long start = System.currentTimeMillis();
    tasks.parallelStream().map(task -> CompletableFuture.supplyAsync(task::call, EXECUTOR))
            .collect(Collectors.toList())
            .parallelStream()
            .map(CompletableFuture::join)
            .forEach(result -> {
                // 模拟其他业务逻辑
                Uninterruptibles.sleepUninterruptibly(1, TimeUnit.SECONDS);
                System.out.println("任务返回结果：" + result);
            });
    System.out.println("共耗时：" + (System.currentTimeMillis() - start));
    // 关闭线程池
    EXECUTOR.shutdown();
}

public static List<Task> getTasks() {
    List<Task> tasks = new ArrayList<>();
    tasks.add(new Task(5));
    tasks.add(new Task(3));
    tasks.add(new Task(1));
    return tasks;
}

static class Task implements Callable<Integer> {

    /**
     * 秒级时间
     */
    public int time;

    public Task(int time) {
        this.time = time;
    }

    @Override
    public Integer call() {
        Uninterruptibles.sleepUninterruptibly(time, TimeUnit.SECONDS);
        return time;
    }
}
```

输出结果如下：

```apl
任务返回结果：1
任务返回结果：3
任务返回结果：5
共耗时：6078
```

`CompletableFuture`把`Task.call`作为普通方法调用执行，将外层包装为`CompletableFuture.supplyAsync`获取结果。

### ExecutorCompletionService

```java
/**
 * 初始化固定大小为3的线程池
 */
private final static ExecutorService EXECUTOR = Executors.newFixedThreadPool(3);

public static void main(String[] args) {
    executorCompletionService();
}

@SneakyThrows
private static void executorCompletionService() {
    List<Task> tasks = getTasks();

    long start = System.currentTimeMillis();
    // 以executor为构造器的参数，新建一个ExecutorCompletionService线程池
    ExecutorCompletionService<Integer> completionService = new ExecutorCompletionService<>(EXECUTOR);
    // 提交任务
    for (Task task : tasks) {
        completionService.submit(task);
    }

    for (Task task : tasks) {
        Integer time = completionService.take().get();
        // 模拟其他业务逻辑
        Uninterruptibles.sleepUninterruptibly(1, TimeUnit.SECONDS);
        System.out.println("任务返回结果：" + time);
    }
    System.out.println("共耗时：" + (System.currentTimeMillis() - start));
    // 关闭线程池
    EXECUTOR.shutdown();
}

public static List<Task> getTasks() {
    List<Task> tasks = new ArrayList<>();
    tasks.add(new Task(5));
    tasks.add(new Task(3));
    tasks.add(new Task(1));
    return tasks;
}

static class Task implements Callable<Integer> {

    /**
     * 秒级时间
     */
    public int time;

    public Task(int time) {
        this.time = time;
    }

    @Override
    public Integer call() {
        Uninterruptibles.sleepUninterruptibly(time, TimeUnit.SECONDS);
        return time;
    }
}
```

输出结果如下

```js
任务返回结果：1
任务返回结果：3
任务返回结果：5
共耗时：6030
```

可以看到`ExecutorCompletionService`比`Callable`在性能有一定提升。`ExecutorCompletionService`先执行完成线程会继续执行后续业务逻辑，并不会产生阻塞。总结为：**谁快谁优先**。

<div align=center><img width="600" height="500" src="../../../../images/2022/1-3/ExecutorCompletionService.png" algin="center"/></div>

### 小结

获取异步线程执行结果性能排行

1. ExecutorCompletionService
2. CompletableFuture
3. Callable

## 解析ExecutorCompletionService

### 方法解析

`ExecutorCompletionService`实现了`CompletionService`接口，且`CompletionService`只有`ExecutorCompletionService`一个实现类，`CompletionService`中只有5个方法。

```java
public interface CompletionService<V> {
    /**
     * 提交一个Callable类型任务，并返回该任务执行结果关联的Future。
     */
    Future<V> submit(Callable<V> task);
    /**
     * 提交一个Runnable类型任务，并返回指定结果。
     */
    Future<V> submit(Runnable task, V result);
    /**
     * 从内部阻塞队列中获取并移除第一个执行完成的任务，阻塞直到有任务完成。
     * 如果队列为空，那么调用take()方法的线程会被阻塞
     */
    Future<V> take() throws InterruptedException;
    /**
     * 从内部阻塞队列中获取并移除第一个执行完成的任务，获取不到则返回null，不阻塞。
     * 如果队列为空，那么调用poll()方法的线程会返回 null
     */
    Future<V> poll();
    /**
     * 从内部阻塞队列中获取并移除第一个执行完成的任务，阻塞时间为timeout，获取不到则返回null。
     */
    Future<V> poll(long timeout, TimeUnit unit) throws InterruptedException;
}
```

### 源码解析

#### 三个私有属性

<div align=center><img src="../../../../images/2022/1-3/ecs.png" algin="center"/></div>

#### 两个构造方法

可通过`ExecutorCompletionService`的构造方法指定已完成队列的类型，默认为`LinkedBlockingQueue`。

<div align=center><img src="../../../../images/2022/1-3/ecs2.png" algin="center"/></div>

#### 任务提交

`QueueingFuture`继承了`FutureTask` ，`FutureTask`重写了`Runnable`的`run()`方法，无论是`set()`正常结果，还是`setException()`结果，都会调用 `finishCompletion()`方法。

<div align=center><img src="../../../../images/2022/1-3/ecs3.png" algin="center"/></div>

#### 任务执行流程

<div align=center><img src="../../../../images/2022/1-3/c1.png" algin="center"/></div>

<div align=center><img src="../../../../images/2022/1-3/c2.png" algin="center"/></div>

<div align=center><img src="../../../../images/2022/1-3/c3.png" algin="center"/></div>

<div align=center><img src="../../../../images/2022/1-3/c4.png" algin="center"/></div>

<div align=center><img src="../../../../images/2022/1-3/c5.png" algin="center"/></div>

<div align=center><img src="../../../../images/2022/1-3/c6.png" algin="center"/></div>

<div align=center><img src="../../../../images/2022/1-3/c7.png" algin="center"/></div>

这里执行的`done`方法，实际执行的是`QueueingFuture`的`done`方法。至此，当一个任务执行完成或异常的时候，都会被添加到已完成阻塞队列中，进而被取出处理。

<div align=center><img src="../../../../images/2022/1-3/c8.png" algin="center"/></div>

#### 获取结果

`FutureTask`的任务完成后执行`QueueingFuture.done`将已完成的结果存储到队列中，可通过`take`、`poll`方法直接从已完成队列中获取结果。

<div align=center><img src="../../../../images/2022/1-3/r1.png" algin="center"/></div>

## 使用场景

1. 多线程执行有返回值的任务。
2. 同类服务调用，优先获取先返回任务的结果(如调用不同厂商的定位服务，使用耗时最短、最先返回的结果)。
3. 获取任务集合的第一个结果后取消其他任务(如多中心文件下载，下载完成后终止其他下载线程)。

`ExecutorCompletionService` doc中也给出了两个例子：

>  假设您有一组针对某个问题的求解器，每个求解器都返回某种Result类型的值，并希望同时运行它们，处理它们中每个返回非空值的结果，在某些方法中use(Result r) 。

```java
 void solve(Executor e,
            Collection<Callable<Result>> solvers)
     throws InterruptedException, ExecutionException {
     CompletionService<Result> ecs
         = new ExecutorCompletionService<Result>(e);
     for (Callable<Result> s : solvers)
         ecs.submit(s);
     int n = solvers.size();
     for (int i = 0; i < n; ++i) {
         Result r = ecs.take().get();
         if (r != null)
             use(r);
     }
 }
```

> 假设您想使用任务集的第一个非空结果，忽略任何遇到异常的结果，并在第一个任务准备好时取消所有其他任务。

```java
void solve(Executor e,
            Collection<Callable<Result>> solvers)
     throws InterruptedException {
     CompletionService<Result> ecs
         = new ExecutorCompletionService<Result>(e);
     int n = solvers.size();
     List<Future<Result>> futures
         = new ArrayList<Future<Result>>(n);
     Result result = null;
     try {
         for (Callable<Result> s : solvers)
             futures.add(ecs.submit(s));
         for (int i = 0; i < n; ++i) {
             try {
                 Result r = ecs.take().get();
                 if (r != null) {
                     result = r;
                     break;
                 }
             } catch (ExecutionException ignore) {}
         }
     }
     finally {
         for (Future<Result> f : futures)
             f.cancel(true);
     }

     if (result != null)
         use(result);
 }
```
