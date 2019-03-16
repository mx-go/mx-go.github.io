---
title: logback推荐配置
date: 2018-08-18 15:51:53
tags: [tips]
categories: 工具
---

# 引言

大约从16年，不管是我参与别人已搭建好的项目还是自己单独搭建的项目，日志框架基本都换成了logback。

<div align=center><img src="../../../../images/2018-8/logback.jpg" algin="center"/></div><!-- more -->

# logback优点

- 内核重写、测试充分、初始化内存加载更小，这一切让logback性能和log4j相比有诸多倍的提升
- logback非常自然地直接实现了slf4j，这个严格来说算不上优点，只是这样，再理解slf4j的前提下会很容易理解logback，也同时很容易用其他日志框架替换logback
- logback有比较齐全的文档
- logback当配置文件修改了，支持自动重新加载配置文件，扫描过程快且安全，它并不需要另外创建一个扫描线程
- 支持自动去除旧的日志文件，可以控制已经产生日志文件的最大数量

# 配置的正确姿势

我们大部分Java后台都是Maven工程，标准目录如下：

|      包路径       |                     说明                      |
| :---------------: | :-------------------------------------------: |
|   src/main/java   |     java源代码文件，编译到target/classes      |
| src/main/resource |  正式包资源库，编译时会复制到target/classes   |
|   src/test/java   | 测试java源代码文件，编译到target/test-classes |
| src/test/resource | 测试时资源库，编译时复制到target/test-classes |

建议配置2个logback配置文件：

|                路径                 |                             说明                             |
| :---------------------------------: | :----------------------------------------------------------: |
|   src/main/resources/logback.xml    | 异步打印到按天轮转的日志文件中。jar包不要配置，避免污染业务配置。 |
| src/test/resources/logback-test.xml |                  测试时候使用，打印到stdout                  |

1. 线上和开发环境的配置要分离，对于java项目：
   1. src/main/resources 目录下的东西都是正式环境使用的
   2. src/test/resources 目录下的东西才是本机开发环境使用的

如果发现自己本机开发启动程序的时候，经常要修改 src/main/resources 目录下的东东，那就说明用错了。
这样做的一个后果就是，当提交代码的时候，忘记修改回来，结果发布到线上去了。轻则日志量暴增，重则引起运营事故。所以一定千万注意！

# 推荐的配置内容

## logback.xml 推荐配置1

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration scan="false" scanPeriod="60 seconds" debug="false">
    <appender name="RollingFile" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <!-- 可让每天产生一个日志文件，最多 7 个，自动回滚 -->
        <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
            <fileNamePattern>${catalina.home}/logs/fs-app-%d{yyyyMMdd}.log.zip</fileNamePattern>
            <maxHistory>7</maxHistory>
        </rollingPolicy>
        <encoder>
            <!-- 异常栈中去掉包含如下字符的行避免打印很多无用的信息-->
            <pattern>%d{HH:mm:ss.SSS} [%thread] %-5level %logger{12} %msg%rEx{full,
                java.lang.Thread,
                javassist,
                sun.reflect,
                org.springframework,
                org.apache,
                org.eclipse.jetty,
                $Proxy,
                java.net,
                java.io,
                javax.servlet,
                org.junit,
                com.mysql,
                com.sun,
                org.mybatis.spring,
                cglib,
                CGLIB,
                java.util.concurrent,
                okhttp,
                org.jboss,
                }%n
            </pattern>
        </encoder>
    </appender>
 
    <!-- 异步输出日志避免阻塞服务 -->
    <appender name="ASYNC" class="ch.qos.logback.classic.AsyncAppender">
        <queueSize>512</queueSize>
        <appender-ref ref="RollingFile"/>
    </appender>
 
    <!-- 配置基础组件为WARN级别，避免打印过多影响服务自己日志 -->
    <logger name="druid.sql" level="INFO"/>
    <logger name="org.hibernate" level="WARN"/>
    <logger name="org.springframework" level="WARN"/>
    <logger name="org.apache" level="WARN"/>
 
    <root level="info">
        <appender-ref ref="ASYNC"/>
    </root>
</configuration>
```

## logback.xml 推荐配置2

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <appender name="WARN" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <File>${catalina.base}/logs/warn.log</File>
        <filter class="ch.qos.logback.classic.filter.ThresholdFilter">
            <level>WARN</level>
        </filter>
        <encoder>
            <pattern>[%d{yyyy/MM/dd-HH:mm:ss.SSS}]-[%level]-[%thread]-[%class:%line]- %msg%n</pattern>
        </encoder>
        <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
            <FileNamePattern>${catalina.base}/logs/warn.%d{yyyy-MM-dd}.log.zip</FileNamePattern>
            <maxHistory>15</maxHistory>
        </rollingPolicy>
    </appender>


    <appender name="ALL" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <File>${catalina.base}/logs/all.log</File>
        <encoder>
            <pattern>[%d{yyyy/MM/dd-HH:mm:ss.SSS}]-[%level]-[%thread]-[%class:%line]- %msg%n</pattern>
        </encoder>
        <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
            <FileNamePattern>${catalina.base}/logs/all.%d{yyyy-MM-dd}.log.zip</FileNamePattern>
            <maxHistory>7</maxHistory>
        </rollingPolicy>
    </appender>

    <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <pattern>[%d{yyyy/MM/dd-HH:mm:ss.SSS}]-[%level]-[%thread]-[%class:%line]- %msg%n</pattern>
        </encoder>
    </appender>

    <logger name="com.facishare.open" level="INFO" additivity="false">
        <appender-ref ref="WARN"/>
        <appender-ref ref="ALL"/>
    </logger>

    <root level="info">
        <appender-ref ref="WARN"/>
        <appender-ref ref="ALL"/>
    </root>
</configuration>
```

## logback-test.xml 推荐配置

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration scan="false" scanPeriod="60 seconds" debug="false">
    <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <pattern>%d{HH:mm:ss.SSS} [%thread] %-5level %logger{12} %msg%n</pattern>
        </encoder>
    </appender>
 
    <logger name="org.hibernate" level="WARN"/>
    <logger name="org.springframework" level="WARN"/>
    <logger name="org.apache" level="WARN"/>
 
    <root level="DEBUG">
        <appender-ref ref="STDOUT"/>
    </root>
</configuration>
```

# 推荐日志级别

极为严格的做法是：只要*log.error()*记录的内容，都需要人及时响应的，有些公司会针对error进行字符串告警。
那么，针对一些如：没有权限、参数错误、非法请求等，由于不合理的请求进来的，就建议打印warn而不是error，否则狼来了喊多了就没有用了。也会淹没真正的错误。
简单来讲，真正影响到正常用户的正常请求而且需要及时响应的错误，就打印ERROR，否则打印WARN。
一般信息打印info，针对调试操作，打印debug。

# 推荐使用日志占位符

> log.info("this is a={}, b={}", a, b)

使用占位符，是真正需要打印的时候，才进行字符串拼接；如果不打印就不会拼接字符串。

> log.error("cannot open url={}", url, e)

针对error，务必把异常栈打印出来，这里有一个exception对象，不需要使用占位符，如果多一个占位符，则只会打印e.getMessage()的内容，就不方便查问题了。 