---
title: Bug简记-长轮训Response
date: 2020-01-05 22:29:36
tags: [java]
categories: 踩坑记录
---

客服系统服务中使用Servlet3.0异步长轮训，服务压力大时，导致消息错乱。

<div align=center><img width="220" height="160" src="../../../../images/2018-8/bug.jpg" algin="center"/></div><!-- more -->

# 描述

对Servlet请求应答对象的生命周期理解不够深入，IM服务在服务压力大，并且Nginx断开请求回收资源后，依然将用户消息进行下发，最后导致消息下发到其他请求中。

# 原因分析

## 错误代码伪代码

服务使用异步的Servlet方法进行长轮训

```java
@WebServlet(asyncSupported = true)
public class CometServlet extends HttpServlet {
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {

        //启动异步请求
        AsyncContext context = request.startAsync();
        //设置超时
        context.setTimeout(TIMEOUT);
        //异步执行
        context.start(() -> {

            //这行只是伪代码，具体为业务逻辑
            Thread.sleep(27 * 1000);

            //下发应答。如果接收到消息这返回应答
            response.getWriter().write(...);
            context.complete();
        });
    }
}
```

## 问题描述

1. 如果发生超时或者Nginx因为某些原因频繁断开与Tomcat之间的连接，Request以及Response对象会被Tomcat发现并且执行清理。
2. 如果清理只是销毁对象的话也还不会导致问题，但查看源码发现，Tomcat是把对象回收，交给下一个请求使用。当Tomcat回收Repsonse对象，交给下一个请求使用后，回调函数依然会继续执行，Response虽然是同一个对象，但已经是其他请求正在使用的了，继续往里面下发消息则导致了整个事件的发生。

## 问题分析

而在Tomcat提供的AsyncContext里面会感知到连接异常，并且提供清理操作，以下是AsyncContextImpl源码节选。

```java
public class AsyncContextImpl implements AsyncContext, AsyncContextCallback {
    private volatile ServletRequest servletRequest = null;
    private volatile ServletResponse servletResponse = null;

    //启动异步时，保存request以及response对象
    public void setStarted(Context context, ServletRequest request,
                           ServletResponse response, boolean originalRequestResponse) {
     ...
        this.servletRequest = request;
        this.servletResponse = response;
        ...
    }

    //连接异常、超时等情况，会对这个AsyncContext的资源进行清理
    public void recycle() {
        if (log.isDebugEnabled()) {
            logDebug("recycle    ");
        }
        context = null;
        dispatch = null;
        event = null;
        hasOriginalRequestAndResponse = true;
        instanceManager = null;
        listeners.clear();
        request = null;
        clearServletRequestResponse();
        timeout = -1;
    }

    //清理request以及response对象以免外部调用
    private void clearServletRequestResponse() {
        servletRequest = null;
        servletResponse = null;
    }

    //检查状态机状态，如果不处于正常状态，则抛出异常
    private void check() {
        if (request == null) {
            // AsyncContext has been recycled and should not be being used
            throw new IllegalStateException(sm.getString("asyncContextImpl.requestEnded"));
        }
    }

    @Override
    //每次获取request以及response对象，都检查请求以及应答对象是否已经被回收
    public ServletRequest getRequest() {
        check();
        if (servletRequest == null) {
            throw new IllegalStateException(sm.getString("asyncContextImpl.request.ise"));
        }
        return servletRequest;
    }

    @Override
    //每次获取request以及response对象，都检查请求以及应答对象是否已经被回收
    public ServletResponse getResponse() {
        check();
        if (servletResponse == null) {
            throw new IllegalStateException(sm.getString("asyncContextImpl.response.ise"));
        }
        return servletResponse;
    }
}
```
# 结果及处理

以上源码分析可以看到，Tomcat的AsyncContext针对连接断开、超时等情况是有做特殊保护处理的，而IM服务所用的方式并没有用上Tomcat的保护，直接将应答对象写入了错误的应答。

**正确的使用方式很简单：**

**只需要把response.getWriter().write(…); **

**修改为context.getResponse().getWriter().write(…)即可，就是这么一行代码，导致了整个事件的发生。**

另外，使用Spring提供的DeferredResult已完全封装了异步请求，可避免此问题。

