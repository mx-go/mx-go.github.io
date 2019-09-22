---
title: logback行号输出问号问题
date: 2019-09-22 13:45:40
tags: [java]
categories: 采坑记录
img: ../../../../images/2019/think.jpg
---

# 引言

Logback日志输出使用 AsyncAppender 时，输出的文件行号信息是 **?:?** ，问题产生原因及解决方案。<!-- more -->

# 问题

在 [logback推荐配置](http://rainbowhorse.site/logback推荐配置/) 一文中，列举了logback常用的几种配置，使用的是logback异步输出日志AsyncAppender。但在实际的开发中，遇到了日志没有输出类和行号，而输出的文件行号信息是 **?:?**。

输出的日志类似于这种：

```
framework-server-demo 2017-07-17 14:15:11,876 INFO [main] o.s.j.e.a.AnnotationMBeanExporter [?:?] - Located managed bean 'refreshScope': registering with JMX server as MBean [org.springframework.cloud.context.scope.refresh:name=refreshScope,type=RefreshScope]
framework-server-demo 2017-07-17 14:15:11,881 INFO [main] o.s.j.e.a.AnnotationMBeanExporter [?:?] - Located managed bean 'configurationPropertiesRebinder': registering with JMX server as MBean [org.springframework.cloud.context.properties:name=configurationPropertiesRebinder,context=43f2f92d,type=ConfigurationPropertiesRebinder]
framework-server-demo 2017-07-17 14:15:11,887 INFO [main] o.s.j.e.a.AnnotationMBeanExporter [?:?] - Located managed bean 'refreshEndpoint': registering with JMX server as MBean [org.springframework.cloud.endpoint:name=refreshEndpoint,type=RefreshEndpoint]
framework-server-demo 2017-07-17 14:15:11,888 INFO [main] o.s.b.a.e.j.EndpointMBeanExporter [?:?] - Registering beans for JMX exposure on startup
framework-server-demo 2017-07-17 14:15:12,709 INFO [main] application [?:?] - jolokia: No access restrictor found, access to any MBean is allowed
framework-server-demo 2017-07-17 14:15:12,714 INFO [main] application [?:?] - jolokia: jolokia:type=Config is already registered. Adding it with jolokia:type=Config,uuid=43140813-0dc0-413d-96c0-5de1799eadd3, but you should revise your setup in order to either use a qualifier or ensure, that only a single agent gets registered (otherwise history functionality might not work)
framework-server-demo 2017-07-17 14:15:12,714 INFO [main] application [?:?] - jolokia: Cannot register (legacy) MBean handler for config store with name jmx4perl:type=Config since it already exists. This is the case if another agent has been already started within the same JVM. The registration is skipped.
framework-server-demo 2017-07-17 14:15:12,715 INFO [main] application [?:?] - jolokia: Jolokia Discovery MBean registration is skipped because there is already one registered.
```

# 原因分析

输出文件以及行号信息需要 `stacktrace` 获取 `callerdata`，**因为性能原因 logback 的 AsyncAppender 默认是不记录该信息。即默认为false**。

官方文档： https://logback.qos.ch/manual/appenders.html#AsyncAppender

| Property Name     | Type    | Description                                                  |
| ----------------- | ------- | ------------------------------------------------------------ |
| includeCallerData | boolean | Extracting caller data can be rather expensive. To improve performance, by default, caller data associated with an event is not extracted when the event added to the event queue. By default, only "cheap" data like the thread name and the MDC are copied. You can direct this appender to include caller data by setting the includeCallerData property to true. |

#  解决方案

如文档说明，只需要在 **logback** 配置文件里 **AsyncAppender** 中添加 **includeCallerData** 并设置为 **true** 。

```
<includeCallerData>true</includeCallerData> 
```

