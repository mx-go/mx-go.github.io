---
title: 命中SpringCloudGateway组件BUG
date: 2021-05-10 10:11:22
tags: [bug]
categories: 
- [组件]
cover: ../../../../images/2020/9-12/bug_springcloudgateway.jpg
---

生产环境网关模块偶发的`OutOfDirectMemoryError`错误排查起来困难且曲折，2021-02-05号也出现过此问题，起初以为是JVM堆内存过小(当时是2g)导致，后调整到8g(2月5号调整)。但是经过上次调整后5月7号又出现此问题，于是猜测可能是由于网关模块存在内存泄露导致。

# 症状

## 报错详情

网关模块偶现`OutOfDirectMemoryError`错误，两次问题出现相隔大概3个月。两次发生的时机都是正在大批量接收数据(大约500w)，TPS 60左右，网关服务波动不大，完全能抗住，按理不应该出现此错误。

详细报错信息如下：

```sh
2021-05-06 13:44:18|WARN |[reactor-http-epoll-5]|[AbstractChannelHandlerContext.java : 311]|An exception 'io.netty.util.internal.OutOfDirectMemoryError: failed to allocate 16384 byte(s) of direct memory (used: 8568993562, max: 8589934592)' [enable DEBUG level for full stacktrace] was thrown by a user handler's exceptionCaught() method while handling the following exception:
io.netty.util.internal.OutOfDirectMemoryError: failed to allocate 16384 byte(s) of direct memory (used: 8568993562, max: 8589934592)
        at io.netty.util.internal.PlatformDependent.incrementMemoryCounter(PlatformDependent.java:754)
        at io.netty.util.internal.PlatformDependent.allocateDirectNoCleaner(PlatformDependent.java:709)
        at io.netty.buffer.UnpooledUnsafeNoCleanerDirectByteBuf.allocateDirect(UnpooledUnsafeNoCleanerDirectByteBuf.java:30)
        at io.netty.buffer.UnpooledDirectByteBuf.<init>(UnpooledDirectByteBuf.java:64)
        at io.netty.buffer.UnpooledUnsafeDirectByteBuf.<init>(UnpooledUnsafeDirectByteBuf.java:41)
        at io.netty.buffer.UnpooledUnsafeNoCleanerDirectByteBuf.<init>(UnpooledUnsafeNoCleanerDirectByteBuf.java:25)
        at io.netty.buffer.UnsafeByteBufUtil.newUnsafeDirectByteBuf(UnsafeByteBufUtil.java:625)
        at io.netty.buffer.PooledByteBufAllocator.newDirectBuffer(PooledByteBufAllocator.java:359)
        at io.netty.buffer.AbstractByteBufAllocator.directBuffer(AbstractByteBufAllocator.java:187)
        at io.netty.buffer.AbstractByteBufAllocator.directBuffer(AbstractByteBufAllocator.java:178)
        at io.netty.channel.unix.PreferredDirectByteBufAllocator.ioBuffer(PreferredDirectByteBufAllocator.java:53)
        at io.netty.channel.DefaultMaxMessagesRecvByteBufAllocator$MaxMessageHandle.allocate(DefaultMaxMessagesRecvByteBufAllocator.java:114)
        at io.netty.channel.epoll.EpollRecvByteAllocatorHandle.allocate(EpollRecvByteAllocatorHandle.java:75)
        at io.netty.channel.epoll.AbstractEpollStreamChannel$EpollStreamUnsafe.epollInReady(AbstractEpollStreamChannel.java:777)
        at io.netty.channel.epoll.EpollEventLoop.processReady(EpollEventLoop.java:475)
        at io.netty.channel.epoll.EpollEventLoop.run(EpollEventLoop.java:378)
        at io.netty.util.concurrent.SingleThreadEventExecutor$4.run(SingleThreadEventExecutor.java:989)
        at io.netty.util.internal.ThreadExecutorMap$2.run(ThreadExecutorMap.java:74)
        at io.netty.util.concurrent.FastThreadLocalRunnable.run(FastThreadLocalRunnable.java:30)
        at java.lang.Thread.run(Thread.java:748)
```

## JVM配置

```basic
-server -Xmx8g -Xms8g -Xmn1024m -XX:PermSize=512m -Xss256k -XX:+DisableExplicitGC -XX:+UseConcMarkSweepGC -XX:+CMSParallelRemarkEnabled -XX:+UseCMSCompactAtFullCollection -XX:LargePageSizeInBytes=128m -XX:+UseFastAccessorMethods -XX:+UseCMSInitiatingOccupancyOnly -XX:CMSInitiatingOccupancyFraction=70 -Djava.awt.headless=true -Djava.net.preferIPv4Stack=true
```

## 版本信息

```ini
spring cloud : Hoxton.SR5
spring cloud starter gateway : 2.2.3.RELEASE
spring boot starter : 2.3.0.RELEASE
netty : 4.1.54.Final
reactor-netty: 0.9.7.RELEASE
```

# 山重水复疑无路

> JVM参数详解：https://docs.oracle.com/javase/8/docs/technotes/tools/unix/java.html

报错的信息是`OutOfDirectMemoryError`，即堆外内存不足，于是复习了下JVM堆外内存的相关知识。

1. 堆外内存是在NIO中使用的；
2. 堆外内存通过 `-XX:MaxDirectMemorySize` 参数控制大小，注意和 `-XX:+DisableExplicitGC` 参数的搭配使用；
3. JDK8中堆外内存默认和堆内存一样大（-Xmx）；
4. JDK8如果配置 `-XX:MaxDirectMemorySize` 参数，则堆外内存大小以设置的参数为准；

`SpringCloudGateway`是基于`WebFlux`框架实现的，而`WebFlux`框架底层则使用了高性能的`Reactor`模式通信框架`Netty`。

网上查阅相关资料，有些场景是因为堆外内存没有手动`release`导致，于是简单查看了网关模块的相关代码发现并无此问题，关键的地方也都调用了相关方法释放内存。堆外内存通过操作堆的命令无法看到，只能监控实例总内存走势判断。

```java
// 释放内存方法
DataBufferUtils.release(dataBuffer);
```

Dump堆内存下来也没有发现有什么问题

<div align=center><img src="../../../../images/2020/9-12/heapdump.png" algin="center"/></div>

# 柳暗花明又一村

抱着试一试的想法到`SpringCloudGateway`官方仓库issue搜索有没有人遇到相同的问题，果不其然，有人提了类似的issue。https://github.com/spring-cloud/spring-cloud-gateway/issues/1704

在issue中开发人员也给出了回应，{% label 确实是SpringCloudGateway的BUG！此问题已在2.2.6.RELEASE版本中修复。而我们项目中使用版本为2.2.3.RELEASE，所以就会出现这个问题。 pink%}

 {% label 原因是：包装原生的pool后没有释放内存。 red%}

<div align=center><img src="../../../../images/2020/9-12/commit_log.jpg" algin="center"/></div>

<div align=center><img src="../../../../images/2020/9-12/bug_detail.jpg" algin="center"/></div>

提交记录：https://github.com/spring-cloud/spring-cloud-gateway/pull/2019

变更的代码：https://github.com/spring-cloud/spring-cloud-gateway/pull/2019/commits/4e0f3b0beb51c54e3d5850e00540ff3d19a4264d

# 出乎意料

问题原因已经找到，想着在测试环境复现后升级版本再验证即可。可结果却出乎了我的意料。

1. 测试环境将堆内存调小尝试进行复现生产问题，在压测将近1个小时后出现了同样的问题，复现成功。
2. 升级`SpringCloudGateway`的版本至`2.2.6.RELEASE`。
3. {% label 重新压测，问题再次出现。 red %}

你没看错，问题再次出现，且报错信息一模一样。我很快又陷入了沉思。

# 深究原因

排除了组件的问题，剩下的就是代码的问题了，最有可能的就是程序中没有显示调用释放内存导致。

网关模块共定义了三个过滤器，一个全局过滤器`RequestGatewayFilter implements GlobalFilter`。两个自定义过滤器 `RequestDecryptGatewayFilterFactory extends AbstractGatewayFilterFactory`和`ResponseEncryptGatewayFilterFactory extends AbstractGatewayFilterFactory`。

依次仔细排查相关逻辑，在全局过滤器`RequestGatewayFilter`中有一块代码引起了我的注意：

```java
    // 伪代码
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        HttpHeaders headers = request.getHeaders();
        return DataBufferUtils.join(exchange.getRequest().getBody())
                .flatMap(dataBuffer -> {
                    DataBufferUtils.retain(dataBuffer);
                    Flux<DataBuffer> cachedFlux = Flux.defer(() -> Flux.just(dataBuffer.slice(0, dataBuffer.readableByteCount())));
                    
                    ServerHttpRequest mutatedRequest = new ServerHttpRequestDecorator(exchange.getRequest()) {
                        @Override
                        public Flux<DataBuffer> getBody() {
                            return cachedFlux;
                        }

                        @Override
                        public HttpHeaders getHeaders() {
                            return headers;
                        }
                    };
                    return chain.filter(exchange.mutate().request(mutatedRequest).build());
                });
    }
```

我们知道，{% label Request的Body是只能读取一次的，如果直接通过在Filter中读取，而不封装回去回导致后面的服务无法读取数据。 blue%}

> 此全局过滤器的目的就是把原有的request请求中的body内容读出来，并且使用ServerHttpRequestDecorator这个请求装饰器对request进行包装，重写getBody方法，并把包装后的请求放到过滤器链中传递下去。这样后面的过滤器中再使用exchange.getRequest().getBody()来获取body时，实际上就是调用的重载后的getBody方法，获取的最先已经缓存了的body数据。这样就能够实现body的多次读取了。

但是将`DataBuffer`读取出来后并没有手动释内存，会导致堆外内存持续增长。于是添加了一行代码手动释放堆外内存：{% label DataBufferUtils.release(dataBuffer); red%}

```java
    // 伪代码
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        HttpHeaders headers = request.getHeaders();
        return DataBufferUtils.join(exchange.getRequest().getBody())
                    .flatMap(dataBuffer -> {
                        byte[] bytes = new byte[dataBuffer.readableByteCount()];
                        dataBuffer.read(bytes);
                      // 释放堆外内存
                        DataBufferUtils.release(dataBuffer);
                        ServerHttpRequest mutatedRequest = new ServerHttpRequestDecorator(exchange.getRequest()) {
                            @Override
                            public Flux<DataBuffer> getBody() {
                                return Flux.defer(() -> {
                                    DataBuffer buffer = exchange.getResponse().bufferFactory().wrap(bytes);
                                    DataBufferUtils.retain(buffer);
                                    return Mono.just(buffer);
                                });
                            }

                            @Override
                            public HttpHeaders getHeaders() {
                                return headers;
                            }
                        };
                        return chain.filter(exchange.mutate().request(mutatedRequest).build());
                    });
    }
```

再次压测未出现堆外内存溢出问题。终究还是自己大意了。。

> 后在网络上查询到了类似的案例：https://github.com/reactor/reactor-netty/issues/788

# 总结

这个问题排查花费了自己不少的时间，自己也没有想到这么曲折。问题是解决了，但是暴露了自身的很多问题，比如针对不同版本JVM内存分配不够熟悉、对`SpringCloudGateway`不够熟悉及太过相信官方开源版本。在直接内存中排查了很久，浪费了不少时间。同时自己也学到了不少东西：

1. 遇到问题主要先去思考，要全面且细致，慢慢去分析，抽丝剥茧；
2. 一定要细致再细致，耐心再耐心的去还原问题，思考问题；
3. JVM直接内存的使用和配置、场景；
4. 不要对开源组件过分信任，遇到问题时，对开源组件持怀疑态度；