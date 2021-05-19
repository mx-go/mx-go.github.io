---
title: 自定义StopWatch
date: 2018-12-22 21:34:34
tags: [tips]
categories: 工具
cover: ../../../../images/2019/1-3/StopWatch.jpg
---

# 引言

在平时的开发调试工作或线上中，有时会遇到程序执行效率非常慢，通过一般的经验只能判断出部分逻辑有问题，但判断并不直观且效率较低，不知道方法中哪个阶段比较耗时。<!-- more -->目前spring-framework提供了一个StopWatch类可以做类似任务执行时间控制，于是利用此思想重新实现了一套自己的逻辑。<div align=center><img width="220" height="220" src="../../../../images/2019/1-3/StopWatch.jpg" algin="center"/></div>

# Spring中StopWatch

```java
@Slf4j
public class TestStopWatch {

    private void test() throws InterruptedException {
        StopWatch sw = new StopWatch();

        sw.start("起床");
        Thread.sleep(1000);
        sw.stop();

        sw.start("洗漱");
        Thread.sleep(2000);
        sw.stop();

        sw.start("锁门");
        Thread.sleep(500);
        sw.stop();

        log.warn("prettyPrint = {}", sw.prettyPrint());
        log.info("totalTimeMillis = {}", sw.getTotalTimeMillis());
        log.warn("lastTaskName = {}", sw.getLastTaskName());
        log.info("lastTaskInfo = {}", sw.getLastTaskInfo());
        log.warn("taskCount = {}", sw.getTaskCount());
    }


    public static void main(String[] args) throws InterruptedException {
        TestStopWatch testStopWatch = new TestStopWatch();
        testStopWatch.test();
    }
}
```

输出：

```java
12-22 21:43:49.468 WARN  c.f.o.d.TestStopWatch - prettyPrint = StopWatch '': running time (millis) = 3505
-----------------------------------------
ms     %     Task name
-----------------------------------------
01004  029%  起床
02001  057%  洗漱
00500  014%  锁门

12-22 21:43:49.476 INFO  c.f.o.d.TestStopWatch - totalTimeMillis = 3505
12-22 21:43:49.476 WARN  c.f.o.d.TestStopWatch - lastTaskName = 锁门
12-22 21:43:49.477 INFO  c.f.o.d.TestStopWatch - lastTaskInfo = org.springframework.util.StopWatch$TaskInfo@5bd03f44
12-22 21:43:49.477 WARN  c.f.o.d.TestStopWatch - taskCount = 3
```

可以看到，Spring中的StopWatch可以方便的排查程序执行效率，但是结果并不直观且代码侵入性太大。

# 自定义StopWatch

```
@Slf4j
public class StopWatch {
    private long startTime;

    private long lapStartTime;

    private String tagName;

    private List<String> steps = new ArrayList<>();

    private StopWatch(String tagName) {
        this.tagName = tagName;

        long start = System.nanoTime();

        this.startTime = start;
        this.lapStartTime = start;
    }

    public static StopWatch create(String tagName) {

        return new StopWatch(tagName);
    }

    public void lap(String stepName) {

        long elapsedTime = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - lapStartTime);
        int index = steps.size() + 1;
        String step = String.format("T%d(%s)/%d", index, stepName, elapsedTime);
        steps.add(step);

        //reset
        this.lapStartTime = System.nanoTime();
    }

    public void log() {
        StringBuilder stringBuilder = createLog();

        log.warn(stringBuilder.toString());
    }

    public void logSlow(long slow) {

        long totalElapsedTime = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startTime);
        if (totalElapsedTime > slow) {
            StringBuilder stringBuilder = createLog();
            log.warn(stringBuilder.toString());
        }
    }

    private StringBuilder createLog() {
        long totalElapsedTime = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startTime);

        StringBuilder stringBuilder = new StringBuilder(tagName);
        stringBuilder.append(' ');
        stringBuilder.append(" Total/");
        stringBuilder.append(totalElapsedTime);
        stringBuilder.append(' ');

        for (String step : steps) {
            stringBuilder.append(step);
            stringBuilder.append(' ');
        }
        return stringBuilder;
    }
}
```

测试：

```java
@Slf4j
public class TestStopWatch {

    private void test() throws InterruptedException {
        StopWatch stopWatch = StopWatch.create("test");

        Thread.sleep(1000);
        stopWatch.lap("起床");

        Thread.sleep(2000);
        stopWatch.lap("洗漱");

        Thread.sleep(500);
        stopWatch.lap("锁门");
      
        stopWatch.log();
    }

    public static void main(String[] args) throws InterruptedException {
        TestStopWatch testStopWatch = new TestStopWatch();
        testStopWatch.test();
    }
}
```

结果：

```java
12-22 21:53:32.696 WARN  c.f.o.r.c.StopWatch - test  Total/3509 T1(起床)/1001 T2(洗漱)/2005 T3(锁门)/500 
```

通过对比，可以发现自实现的StopWatch类更为简洁，同时也包含了必要的信息，但是功能不如Spring自带的强大。可针对不同的场景使用。