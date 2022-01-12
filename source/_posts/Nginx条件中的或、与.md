---
title: Nginx条件中的或、与
date: 2021-05-27 23:31:59
tags: [java, nginx]
categories: 
- [中间件]
cover: ../../../../images/2021/4-6/nginx-and-or.jpg
---

在公司的编程马拉松中前端项目部署在`NG`的镜像中，其中有个需求是通过浏览器访问时，若请求是前端资源则返回前端页面，如果请求的是后端接口则返回后端响应。如：浏览器访问  http://abc.com/apis/name 时，有可能是前端页面路径，也有可能为后端接口路径。通过~~NG~~的条件判断可以实现此需求。<div align=center><img width="500" height="300" src="../../../../images/2021/4-6/nginx-and-or.jpg" algin="center"/></div><!-- more -->

## 正则匹配

| 符号 |                            描述                            |
| :--: | :--------------------------------------------------------: |
|  =   |                     字符串比较**相等**                     |
|  !=  |                    字符串比较**不相等**                    |
|  ~   |   符合指定正则表达式时返回`true`（匹配时**区分大小写**）   |
|  ~*  |  符合指定正则表达式时返回`true`（匹配时**不区分大小写**）  |
|  !~  |  不符合指定正则表达式时返回`true`（匹配时**区分大小写**）  |
| !~*  | 不符合指定正则表达式时返回`true`（匹配时**不区分大小写**） |



`NG`中的表达式和大多数语言一样

```nginx
if (<condition1>) {
    # do something1
} 
if (<condition2>) {
    # do something2
    # return;
} 
```

1. 不支持多条件表达式
2. 不支持嵌套
3. 不支持else

在NG的条件表达式中没有表达式没有直接”或“、“与”的语法，需要`存储变量的状态`来实现“或”、“与”的效果。

## 或

### 场景一

```nginx
# 设置flag的初始值
set $flag "";
if (<condition1>) {
    set $flag 1;
}
if (<condition2>) {
    set $flag 1;
}
# 满足 condition1或condition2其中一个条件则会执行
if ($flag = 1) {
    # do something
}
```

上述条件表达式类似`Java`中的

```java
if (<condition1> || <condition2>) {
	// do something
}
```

### 场景二

在判断变量值时，可以直接用`|`判断

```nginx
# 请求方式为GET、POST、PUT、DELETE其中一种
if ($request_method ~ (GET|POST|PUT|DELETE)) {
    # do something
}
```

## 与

```nginx
# 设置flag的初始值
set $flag "";
if (<condition1>) {
    set $flag "${flag}1";
}
if (<condition2>) {
    set $flag "${flag}2";
}

# 同时满足condition1与condition2时执行
if ($flag = "12") {
    # do something
}
```

## 条件组合

```nginx
# 设置flag的初始值
set $flag "";

# 或 的关系
if (<condition0>) {
    set $flag "1";
}
if (<condition1>) {
    set $flag "1";
}

# 与 的关系
if (<condition2>) {
    set $flag "${flag}2";
}
if (<condition3>) {
    set $flag "${flag}3";
}

# 或(condition0、condition1) 与(condition2、condition3)
if ($flag = "123") {
    # do something
}
```

> flag初始值为空值，若想执行*do something*逻辑。
>
> 1. 或：condition0、condition1只需满足一项；
> 2. 与：condition2、condition3需要同时满足；

## 例

回到文章描述的需求，可以做如下配置即可实现：当请求前端域名时，满足一定条件直接负载到后端接口获取响应。

```nginx
location / {
    set $flag "";
    # 限定请求方式
    if ($request_method ~ ^(GET|POST|PUT|DELETE)$) {
       set $flag "${flag}1";
     }
    # 响应码不为400
    if ($status != 400) {
       set $flag "${flag}2";
     }
    # 请求uri不为/（为/表示请求域名，直接跳转主页）
    if ($uri != '/') {
       set $flag "${flag}3";
    }
    # 满足以上条件时将请求代理后后端
    if ($flag = "123") {
       proxy_pass http://bcmls-api.sit.rainbowhorse.com;
    }

    root   html;
    index  index.html index.htm;
}
```
