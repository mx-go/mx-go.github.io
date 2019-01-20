---
title: bug简记
date: 2018-10-01 22:39:56
tags: [java]
categories: bug
---

# 前言

在开发过程中会遇到这种各样的bug，也是自己吃过的亏。以后在这里会把自己遇到的bug记录下来，吸取教训，避免犯同样的错误。



<div align=center><img width="220" height="160" src="../../../../images/2018-8/bug.jpg" algin="center"/></div><!-- more -->

# 采坑记录

在与第三方对接的接口中，对方推送消息接口定义如果接收成功返回*success*，反之返回其他字符串，如果不是*success*字符串就会再重复推送三次。自己在代码中为：

```java
@RequestMapping(value = "", method = RequestMethod.POST)
@ResponseBody
public String callBack() {
    //...something
    return "success";
}
```

这段代码自我感觉没问题，但是线上发现即使返回的是*success*字符串也会重复推送。让对方排查了下，对方说我们推送的不是*success*字符串。WTF？看了日志*result[success]*没问题啊，直到自己亲自调试了下接口：

```java
// 请求自己接口获取返回值
String result = getResult();
// 返回true
System.out.println(""\success\"".equals(result));
```

发现接口返回值*success*被加上了双引号。

# 原因

**在SpringMVC中使用@ResponseBody注解时会强制返回json格式，在返回字符串时会默认加上双引号**。这才导致返回的字符串多了双引号。

# 解决方法

解决方法也很简单。只需要添加字符串解析器，避免String类型直接解析成JSON。

方法一：jackson

```xml
<mvc:annotation-driven>
        <mvc:message-converters>
            <!-- 避免string类型直接解析成json-->
            <bean class="org.springframework.http.converter.StringHttpMessageConverter">
                <constructor-arg ref="utf8charset"/>
                <property name="writeAcceptCharset" value="false"/>
            </bean>
            <bean class="org.springframework.http.converter.json.MappingJackson2HttpMessageConverter">
                <property name="objectMapper">
                    <bean class="com.fasterxml.jackson.databind.ObjectMapper">
                        <property name="serializationInclusion">
                            <value type="com.fasterxml.jackson.annotation.JsonInclude.Include">NON_NULL</value>
                        </property>
                    </bean>
                </property>
            </bean>
        </mvc:message-converters>
</mvc:annotation-driven>
```

方法二：fastjson

```xml
<mvc:annotation-driven>
        <mvc:message-converters register-defaults="false">
        <!-- 避免String类型直接解析成json-->
        <bean class="org.springframework.http.converter.StringHttpMessageConverter"/>
            <!-- 避免IE执行AJAX时,返回JSON出现下载文件 -->
            <bean id="fastJsonHttpMessageConverter" class="com.alibaba.fastjson.support.spring.FastJsonHttpMessageConverter">
                <property name="supportedMediaTypes">
                    <list>
                        <!-- 这里顺序不能反，一定先写text/html,不然ie下出现下载提示 -->
                        <value>text/html;charset=UTF-8</value>
                        <value>application/json;charset=UTF-8</value>
                    </list>
                </property>
            </bean>
        </mvc:message-converters>
</mvc:annotation-driven>
```

