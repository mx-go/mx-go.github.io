---
title: Java和Docker限制的那些事儿
date: 2019-06-01 09:01:36
tags: [java]
categories: 踩坑记录
img: ../../../../images/2019/4-6/java_docker.jpg
---

# 引言

Java和Docker不是天然的朋友。 Docker可以设置内存和CPU限制，而Java不能自动检测到。使用Java的`Xmx`标识（繁琐/重复）或新的实验性JVM标识，可以解决这个问题。自己也是在开发配置上踩了个坑。<div align=center><img width="420" height="220" src="../../../../images/2019/4-6/java_docker.jpg" algin="center"/></div>

# 采坑记录

在开发中使用了线程池，根据[计算密集型 VS IO密集型](http://rainbowhorse.site/%E8%AE%A1%E7%AE%97%E5%AF%86%E9%9B%86%E5%9E%8B-VS-IO%E5%AF%86%E9%9B%86%E5%9E%8B/)设置线程数量，代码如下：

```java
ThreadFactory threadFactory = new ThreadFactoryBuilder().setNameFormat("service_record").build();
ExecutorService pool = new ThreadPoolExecutor(4, 2 * Runtime.getRuntime().availableProcessors(),
            60L, TimeUnit.SECONDS, new LinkedBlockingQueue(1024), threadFactory,
            new ThreadPoolExecutor.CallerRunsPolicy());

```

过不久，发现启动时提示这块有异常。我们的服务一部分部署在虚拟机里面，一部分部署在k8s中。Docker中可以设置CPU个数为小数，**当设置CPU个数小于两个时，maximumPoolSize就会小于corePoolSize。会抛出IllegalArgumentException。**

```java
public ThreadPoolExecutor(int corePoolSize,
                              int maximumPoolSize,
                              long keepAliveTime,
                              TimeUnit unit,
                              BlockingQueue<Runnable> workQueue,
                              ThreadFactory threadFactory,
                              RejectedExecutionHandler handler) {
        if (corePoolSize < 0 ||
            maximumPoolSize <= 0 ||
            maximumPoolSize < corePoolSize ||
            keepAliveTime < 0)
            throw new IllegalArgumentException();
        if (workQueue == null || threadFactory == null || handler == null)
            throw new NullPointerException();
        this.acc = System.getSecurityManager() == null ?
                null :
                AccessController.getContext();
        this.corePoolSize = corePoolSize;
        this.maximumPoolSize = maximumPoolSize;
        this.workQueue = workQueue;
        this.keepAliveTime = unit.toNanos(keepAliveTime);
        this.threadFactory = threadFactory;
        this.handler = handler;
    }
```

#  虚拟化中的不匹配

Java和Docker的结合并不是完美匹配的，最初的时候离完美匹配有相当大的距离。Docker可以把你的程序、设置、特定的JDK、Linux设置和应用服务器，还有其他工具打包在一起，当做一个东西。站在DevOps/Cloud的角度来看，这样一个完整的容器有着更高层次的封装。

## 内存

现在很多产品级应用都在用Java8或是更早的版本，Java 8（update 131之前的版本）和Docker无法很好地一起工作。问题是在机器上，**JVM的可用内存和CPU数量并不是Docker允许你使用的可用内存和CPU数量**。

比如，如果我们限制Docker容器只能使用100MB内存，但是旧版本的Java并不能识别这个限制。Java看不到这个限制，JVM会要求更多内存，而且远超这个限制。如果使用太多内存，Docker将采取行动并杀死容器内的进程！JAVA进程被干掉了，很明显，这并不是我们想要的。

为了解决这个问题，需要给Java指定一个最大内存限制。在旧版本的Java(8u131之前)，需要在容器中通过设置`-Xmx`来限制堆大小。这感觉不太对，我们可不想定义这些限制两次，也不太想在容器中来定义。

现在有了更好的方式来解决这个问题。从Java 9之后(8u131+)，JVM增加了如下标志:

```shell
-XX:+UnlockExperimentalVMOptions -XX:+UseCGroupMemoryLimitForHeap
```

这些标志强制JVM检查Linux的`cgroup`配置，Docker是通过`cgroup`来实现最大内存设置的。如果应用到达了Docker设置的限制（比如500MB），JVM是可以看到这个限制的。JVM将会尝试GC操作。如果仍然超过内存限制，JVM就会做它该做的事情，抛出`OutOfMemoryException`。也就是说，JVM能够看到Docker的这些设置。

从Java 10之后这些体验标志位是默认开启的，也可以使用`-XX:+UseContainerSupport`来控制开启或关闭。

## CPU

k8s可对CPU资源进行严格控制：

- `正实数`，代表分配几颗CPU，可以是小数点，比如`0.5`代表0.5颗CPU，意思是一颗CPU的一半时间。`2`代表两颗CPU。
- `正整数m`，也代表`1000m=1`，所以`500m`等价于`0.5`。

JVM将查看硬件并检测CPU的数量。它会优化runtime以使用这些CPUs。但是同样的情况，这里还有另一个不匹配，Docker可能不允许使用所有这些CPUs。这在Java8或Java9中并没有修复，但是在Java10中得到了解决。

从Java 10开始，可用的CPUs的计算将采用以不同的方式（默认情况下）解决此问题（同样是通过`UseContainerSupport`控制）。

# 结论

简言之：注意资源限制的不匹配。测试内存设置和JVM标志，不要假设任何东西。

如果Docker容器中运行Java，确保设置了Docker内存限制和在JVM中也做了限制，或者JVM能够理解这些限制。

如果无法升级Java版本，需要使用`-Xmx`设置限制。

对于Java 8和Java 9，可以更新到最新版本并使用：

```
-XX：+UnlockExperimentalVMOptions -XX：+UseCGroupMemoryLimitForHeap
```

对于OpenJ9(强烈建议使用，可以在生产环境中有效减少内存占用量)。

附上自己生产环境k8s中的配置：

```shell
root          1      0  1 May29 ?        00:12:20 /usr/lib/jvm/zulu-8/bin/java -Djava.util.logging.config.file=/opt/tomcat/co
nf/logging.properties -Djava.util.logging.manager=org.apache.juli.ClassLoaderLogManager -server -XX:+AggressiveOpts -XX:+UseG
1GC -XX:ParallelGCThreads=2 -XX:MaxGCPauseMillis=200 -Djava.security.egd=file:/dev/urandom -XX:+UnlockExperimentalVMOptions -
XX:+UseCGroupMemoryLimitForHeap -XX:MaxRAMFraction=1 -Dfile.encoding=UTF-8 -Dsun.jnu.encoding=UTF-8 -XX:-CICompilerCountPerCP
U -XX:CICompilerCount=4 -Djava.util.concurrent.ForkJoinPool.common.parallelism=8 -javaagent:/opt/tomcat/lib/jmx_prometheus_ja
vaagent-0.11.0.jar=8090:/opt/tomcat/conf/tomcat_jmx_export.yml -Xmx1228m -Djdk.tls.ephemeralDHKeySize=2048 -Djava.protocol.ha
ndler.pkgs=org.apache.catalina.webresources -classpath /opt/tomcat/bin/bootstrap.jar:/opt/tomcat/bin/tomcat-juli.jar -Dcatalina.base=/op
t/tomcat -Dcatalina.home=/opt/tomcat -Djava.io.tmpdir=/opt/tomcat/temp org.apache.catalina.startup.Bootstrap start
```

# 参考

[Java和Docker限制的那些事儿](http://dockone.io/article/5932)

[Improved Docker Container Integration with Java 10](https://blog.docker.com/2018/04/improved-docker-container-integration-with-java-10/)