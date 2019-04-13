---
title: 自定义rest代理(二)
date: 2019-04-13 14:45:22
tags: [tips]
categories: 工具
img: ../../../../images/2019/1-3/restful.png
---

之前用`HttpClient`实现了rest代理([自定义rest代理(一)](<http://rainbowhorse.site/%E8%87%AA%E5%AE%9A%E4%B9%89rest%E4%BB%A3%E7%90%86/>))，从网上看了下资料，同时针对公司已有的框架做了一些封装和改造。用`Retrofit2`另外实现了一套rest代理工具包。其中基本都是都是基于`Retrofit2`，自己又做了一层简单的封装。<div align=center><img width="220" height="220" src="../../../../images/2019/1-3/restful.png" algin="center"/></div>

# Spring配置

在*applicationContext.xml*文件中加入配置。

```xml
<bean id="retrofitFactory" class="com.github.max.proxy.core.ConfigRetrofitSpringFactory"
          p:configLocation="classpath*:rest-proxy.json,classpath*:rest-proxy1.json" init-method="init"/>

// 可针对不同接口配置多个
<bean id="sendHttp" class="com.github.max.proxy.RetrofitSpringFactoryBean"
          p:type="com.max.open.SendHttp" p:factory-ref="retrofitFactory"/>

<bean id="xxx" class="com.github.max.proxy.RetrofitSpringFactoryBean"
          p:type="com.max.open.xxx" p:factory-ref="retrofitFactory"/>
```

其中参数：

- **configLocation**：配置文件所在路径。支持多个配置文件路径，以英文**,**隔开。
- **type**：接口所在的路径。

# 基础配置

针对Spring配置中的*configLocation*。**有配置中心可修改源码从配置中心获取。**以下举个例子：

*rest-proxy.json*

```json
{
    "sendHttp": {
        "domain": "http://localhost:8081",
        "desc": "测试使用",
        "readTimeout": "10000",
        "connectTimeout": "10000"
    },
    "test1": {
        "domain": "127.0.0.1:8080"
    }
}
```

配置中可以存在多个KV。

- **domain**：HTTP请求的基础域名，同时可指定为IP地址。**必填。**
- **desc**：功能描述，无其他用处。
- **readTimeout**：读取超时时间(ms)。对应`Retrofit2`中的readTimeout。**缺省5000ms。**
- **connectTimeout**：连接超时时间(ms)，对应`Retrofit2`中的connectTimeout。**缺省5000ms。**

# 接口

示例中用的是SendHttp测试接口：

```java
@RetrofitConfig(value = "sendHttp", desc = "测试")
public interface SendHttp {

    @POST("/callback")
    Student getResult(@Body Student student);
}
```

重点说一下**@RetrofitConfig**注解。此注解为自定义注解，其中：

- **value**：对应的是基础配置中的Key。
- **desc**：描述。

其他使用和注解与`retrofit2`一致，使用`retrofit2`中注解。

# 使用

在*service*层或*manager*层直接注入配置完成的所需接口：

```java
@Autowired
private SendHttp sendHttp;
```

