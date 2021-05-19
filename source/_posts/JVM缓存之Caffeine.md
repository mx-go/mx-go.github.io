---
title: JVM缓存之Caffeine
date: 2020-05-17 09:48:52
tags: [java,cache]
categories: 后端
img: ../../../../images/2020/5-8/caffeine.png
cover: ../../../../images/2020/5-8/caffeine.png
---

# 引言

[Caffeine](https://www.baeldung.com/java-caching-caffeine)是一个高性能、高命中率、低内存占用的的本地缓存。它是Guava的加强版，Caffeine使用*Window TinyLfu* (最近最少频率使用)算法，提供了**近乎最佳的命中率**。<div align=center><img width="400" height="200" src="../../../../images/2020/5-8/caffeine.png" algin="center"/></div><!-- more -->

# Caffeine VS Guava Cache

Spring5中将放弃Guava Cache作为默认的缓存机制，而改用Caffeine作为本地缓存组件，Spring作出如此大的改变不是没有原因的。在Caffeine的[Benchmarks](https://github.com/ben-manes/caffeine/wiki/Benchmarks)给出了亮眼的数据，对比其他的缓存组件，Caffeine的读写性能都很优异。<div align=center><img src="../../../../images/2020/5-8/caffeine-1.png" algin="center"/></div>

# Caffeine的使用

Caffeine和Guava Cache的api有很多相似之处，熟悉Guava Cache的话上手Caffeine就很简单了。

## 引入Maven坐标

```xml
<dependency>
    <groupId>com.github.ben-manes.caffeine</groupId>
    <artifactId>caffeine</artifactId>
    <version>${lasted-version}</version>
</dependency>
```

## 缓存填充策略

Caffeine提供了三种缓存填充策略：**手动**、**同步**和**异步**加载。

### 手动加载

每次通过get key的时候可以指定一个同步的函数，当key不存在时调用函数生成value同时将KV存入Cache中。

```java
Cache<String, Object> cache = Caffeine.newBuilder()
                .expireAfterWrite(1, TimeUnit.MINUTES)
                .maximumSize(100)
                .build();

        String key = "hello";
        // 使用getIfPresent方法，如果缓存中不存在该值，则此方法将返回null
        Object o = cache.getIfPresent(key);

        // 使用put方法手动填充缓存
        cache.put(key, "world");

        // 通过get方法获取值，如果键在缓存中不存在，则此函数将用于提供备用值，该键将在计算后插入到缓存中
        cache.get(key, value -> "world");

        // 手动使某些缓存的值无效
        cache.invalidate(key);
```

get方法优于getIfPresent，因为get方法是原子操作，即使多个线程同时要求该值，计算也只进行一次。

### 同步加载

构造Cache的时候，build方法中传入CacheLoader的实现类，重写load方法，通过key可以加载value。

```java
 /**
     * 方式一
     */
    public Object syncLoad(String key) {
        LoadingCache<String, Object> cache = Caffeine.newBuilder()
                .expireAfterWrite(1, TimeUnit.MINUTES)
                .maximumSize(100)
                .build(new CacheLoader<String, Object>() {
                    @Nullable
                    @Override
                    public Object load(@NonNull String key) throws Exception {
                        return key + " world";
                    }
                });
        return cache.get(key);
    }

    /**
     * 方式二
     */
    public Object syncLoad1(String key) {
        LoadingCache<String, Object> cache = Caffeine.newBuilder()
                .expireAfterWrite(1, TimeUnit.MINUTES)
                .maximumSize(100)
                .build(k -> setValue(key).get());
        return cache.get(key);
    }

    public Supplier<Object> setValue(String key) {
        return () -> key + " world";
    }
```

### 异步加载

该策略与同步加载策略相同，但是异步执行操作，并返回保存实际值的**CompletableFuture**。可以调用**get**或**getAll**方法调用获取返回值。

```java
/**
     * 方式一
     */
    public Object asyncLoad(String key) {
        AsyncLoadingCache<String, Object> cache = Caffeine.newBuilder()
                .expireAfterWrite(1, TimeUnit.MINUTES)
                .maximumSize(100)
                .buildAsync(new AsyncCacheLoader<String, Object>() {
                    @Override
                    public @NonNull CompletableFuture<Object> asyncLoad(@NonNull String key, @NonNull Executor executor) {
                        return CompletableFuture.supplyAsync(() -> key + " world", executor);
                    }
                });
        return cache.get(key);
    }

    /**
     * 方式二
     */
    public Object asyncLoad1(String key) {
        AsyncLoadingCache<String, Object> cache = Caffeine.newBuilder()
                .expireAfterWrite(1, TimeUnit.MINUTES)
                .maximumSize(100)
                .buildAsync(k -> setValue(key).get());
        return cache.get(key);
    }

    public CompletableFuture<Object> setValue(String key) {
        return CompletableFuture.supplyAsync(() -> key + " world");
    }
```

## 驱逐策略

Caffeine提供三种数据驱逐策略：**基于大小驱逐、基于时间驱逐、基于引用驱逐**。

### 基于大小(Size-Based)的驱逐策略

基于大小的驱逐策略有两种方式：一种是基于缓存数量，一种是基于权重。**maximumSize**与**maximumWeight**不可同时使用。

```java
public void sizeBasedEviction() {
        // 根据缓存的数量进行驱逐
        LoadingCache<String, Object> cache = Caffeine.newBuilder()
                .maximumSize(10000)
                .build(key -> function(key));

        // 根据缓存的权重来进行驱逐（权重只是用于确定缓存大小，不会用于决定该缓存是否被驱逐）
        LoadingCache<String, Object> cache1 = Caffeine.newBuilder()
                .maximumWeight(10000)
                .weigher(key -> function1(key))
                .build(key -> function(key));
    }
```

### 基于时间(Time-Based)的驱逐策略

基于时间的驱逐策略有三种类型：

1. **expireAfterAccess(long, TimeUnit)**：在最后一次访问或者写入后开始计时，在指定的时间后过期。假如一直有请求访问该key，那么这个缓存将一直不会过期。
2. **expireAfterWrite(long, TimeUnit)**: 在最后一次写入缓存后开始计时，在指定的时间后过期。
3. **expireAfter(Expiry)**: 自定义策略，过期时间由Expiry实现独自计算。

缓存的删除策略使用的是惰性删除和定时删除。

```java
public void timeBasedEviction() {
        // 基于固定的到期策略进行退出
        LoadingCache<String, Object> cache = Caffeine.newBuilder()
                .expireAfterAccess(5, TimeUnit.MINUTES)
                .build(key -> function(key));
        LoadingCache<String, Object> cache1 = Caffeine.newBuilder()
                .expireAfterWrite(10, TimeUnit.MINUTES)
                .build(key -> function(key));

        // 基于不同的到期策略进行退出
        LoadingCache<String, Object> cache2 = Caffeine.newBuilder()
                .expireAfter(new Expiry<String, Object>() {
                    @Override
                    public long expireAfterCreate(String key, Object value, long currentTime) {
                        return TimeUnit.SECONDS.toNanos(seconds);
                    }

                    @Override
                    public long expireAfterUpdate(@Nonnull String s, @Nonnull Object o, long l, long l1) {
                        return 0;
                    }

                    @Override
                    public long expireAfterRead(@Nonnull String s, @Nonnull Object o, long l, long l1) {
                        return 0;
                    }
                }).build(key -> function(key));
    }
```

### 基于引用(Reference-Based)的驱逐

Java中四种引用类型：

| 引用类型                 | 被垃圾回收时间 | 用途                                                         | 生存时间          |
| ------------------------ | -------------- | ------------------------------------------------------------ | ----------------- |
| 强引用 Strong Reference  | 从来不会       | 对象的一般状态                                               | JVM停止运行时终止 |
| 软引用 Soft Reference    | 在内存不足时   | 对象缓存                                                     | 内存不足时终止    |
| 弱引用 Weak Reference    | 在垃圾回收时   | 对象缓存                                                     | gc运行后终止      |
| 虚引用 Phantom Reference | 从来不会       | 可以用虚引用来跟踪对象被垃圾回收器回收的活动，当一个虚引用关联的对象被垃圾收集器回收之前会收到一条系统通知 | JVM停止运行时终止 |

```java
public void referenceBasedEviction() {
        // 当key和value都没有弱引用时驱逐缓存
        LoadingCache<String, Object> cache = Caffeine.newBuilder()
                .weakKeys()
                .weakValues()
                .build(key -> function(key));

        // 当垃圾收集器需要释放内存时驱逐
        LoadingCache<String, Object> cache1 = Caffeine.newBuilder()
                .softValues()
                .build(key -> function(key));
    }
```

**注意：**

1. **AsyncLoadingCache不支持弱引用和软引用。**

2. **Caffeine.weakValues()和Caffeine.softValues()不可以一起使用。**

## 移除事件监听

```java
public void removalListener() {
        Cache<String, Object> cache = Caffeine.newBuilder()
                .removalListener((String key, Object value, RemovalCause cause) ->
                        System.out.printf("Key %s was removed (%s)%n", key, cause))
                .build();
    }
```

## 刷新

可以将缓存配置为在自定义的时间段后自动刷新数据：

```java
public void refresh() {
        Cache<String, Object> cache = Caffeine.newBuilder()
                .maximumSize(10000)
                .refreshAfterWrite(1, TimeUnit.MINUTES)
                .build();
    }
```

**expireAfter**和**refreshAfter**之间的区别：

- **expireAfter**：当请求过期的数据时，请求将会被阻塞，直到build *Function*将计算出新值为止。
- **refreshAfter**：当数据符合刷新条件，则缓存将返回一个旧值，并**异步重新加载该值**。

## 统计

```java
public void stats() {
        Cache<String, Object> cache = Caffeine.newBuilder()
                .maximumSize(10000)
                .recordStats()
                .build();
        // 缓存命中率
        cache.stats().hitRate();
        // 回收数量
        cache.stats().evictionCount();
        // 加载新值的平均时间
        cache.stats().averageLoadPenalty();
    }
```

通过使用**Caffeine.recordStats()**可以转化成一个统计的集合. 通过**Cache.stats()**返回一个CacheStats。CacheStats提供以下统计方法：

- **hitRate**: 返回缓存命中率
- **evictionCount**: 缓存回收数量
- **averageLoadPenalty**: 加载新值的平均时间



