---
title: Spring+webSocket
date: 2018-03-16 14:00:11
tags: [java,tips,spring]
categories: 后端
---

# 引言

websocket 是 HTML5新增加特性之一，目的是浏览器与服务端建立全双工的通信方式，解决 HTTP请求-响应带来过多的资源消耗，同时对特殊场景应用提供了全新的实现方式，比如聊天、股票交易、游戏等对对实时性要求较高的行业领域。<div align=center><img width="600" height="200" src="../../../../images//2018-3/websocket/websocket-java.jpg" algin="center"/></div><!-- more -->

# STOMP

STOMP(Simple Text-Orientated Messaging Protocol) 面向消息的简单文本协议。

WebSocket是一个消息架构，不强制使用任何特定的消息协议，它依赖于应用层解释消息的含义；

与处在应用层的HTTP不同，WebSocket处在TCP上非常薄的一层，会将字节流转换为文本/二进制消息，因此，对于实际应用来说，WebSocket的通信形式层级过低，因此，可以在 WebSocket 之上使用 STOMP协议，来为浏览器 和 server间的 通信增加适当的消息语义。

如何理解 STOMP 与 WebSocket 的关系： 
1) HTTP协议解决了 web 浏览器发起请求以及 web 服务器响应请求的细节，假设 HTTP 协议 并不存在，只能使用 TCP 套接字来 编写 web 应用，你可能认为这是一件疯狂的事情； 
2) 直接使用 WebSocket（SockJS） 就很类似于 使用 TCP 套接字来编写 web 应用，因为没有高层协议，就需要我们定义应用间所发送消息的语义，还需要确保连接的两端都能遵循这些语义； 
3) 同 HTTP 在 TCP 套接字上添加请求-响应模型层一样，STOMP 在 WebSocket 之上提供了一个基于帧的线路格式层，用来定义消息语义；

<div align=center><img width="600" height="200" src="../../../../images//2018-3/websocket/stomp.jpg" algin="center"/></div>

# Spring+websocket

## 添加依赖

需要添加spring-websocket和spring-messaging依赖，注意和spring-core的版本保持一致。

```xml
<!-- spring-websocket -->
<dependency>
    <groupId>org.springframework</groupId>
    <artifactId>spring-websocket</artifactId>
    <version>4.1.9.RELEASE</version>
</dependency>
<dependency>
    <groupId>org.springframework</groupId>
    <artifactId>spring-messaging</artifactId>
    <version>4.1.9.RELEASE</version>
</dependency>
```

## 服务端代码

服务端的初始化，只需要两个类：**WebsocketConfig**（stomp节点配置）和**WebSocketController**。

```java
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.AbstractWebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;

/**
 * 通过EnableWebSocketMessageBroker 开启使用STOMP协议来传输基于代理(message broker)的消息,此时浏览器支持使用@MessageMapping 就像支持@RequestMapping一样。
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig extends AbstractWebSocketMessageBrokerConfigurer {
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) { 
        //endPoint 注册协议节点,并映射指定的URl
        //注册一个名字为"endpointChat" 的endpoint,并指定 SockJS协议，客户端就可以通过这个端点来进行连接；withSockJS作用是添加SockJS支持。
        registry.addEndpoint("/endpointChat").withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        //配置消息代理(message broker)，定义了两个客户端订阅地址的前缀信息，也就是客户端接收服务端发送消息的前缀信息
        //点对点式增加一个/queue 消息代理
        registry.enableSimpleBroker("/queue", "/topic");
        //定义了服务端接收地址的前缀，也即客户端给服务端发消息的地址前缀
        //registry.setApplicationDestinationPrefixes(“/user”);	
    }
}
```

**对以上代码分析：**

- EnableWebSocketMessageBroker 注解表明： 这个配置类不仅配置了 WebSocket，还配置了基于代理的 STOMP 消息；
- 它复写了 registerStompEndpoints() 方法：添加一个服务端点，来接收客户端的连接。将 “/endpointChat” 路径注册为 STOMP 端点。这个路径与之前发送和接收消息的目的路径有所不同， 这是一个端点，客户端在订阅或发布消息到目的地址前，要连接该端点，即用户发送请求 ：*URL=’/127.0.0.1:8080/endpointChat’* 与 STOMP server 进行连接，之后再转发到订阅URL；
- 它复写了 configureMessageBroker() 方法：配置了一个 简单的消息代理，通俗一点讲就是设置消息连接请求的各种规范信息。

```java
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Autowired;
import com.thinkgem.jeesite.modules.sys.utils.UserUtils;

@Controller
@RequestMapping("/websocket")
public class WebsocketController {
	@Autowired
	private SimpMessagingTemplate template;

	@MessageMapping("/sendMsg")
	public void roomMessage() {
         // 多线程配置推送消息
		ThreadPoolExecutor executor = new ThreadPoolExecutor(1, 1, 0, TimeUnit.MILLISECONDS,new LinkedBlockingQueue<Runnable>());
		executor.execute(new Runnable() {
			@Override
			public void run() {
			template.convertAndSendToUser(userId, "/queue/notifications","新消息：这是websocked测试消息");// 一对一发送，发送特定的客户端  
                //template.convertAndSend("/topic/getResponse","新消息：这是websocked测试消息");//广播消息
			}
		});
		executor.shutdown();
	}
}
```

*template.convertAndSendToUser(user, dest, message)* 这个方法官方给出的解释是 Convert the given Object to serialized form, possibly using a MessageConverter, wrap it as a message and send it to the given destination. 意思就是“将给定的对象进行序列化，使用 ‘MessageConverter’ 进行包装转化成一条消息，发送到指定的目标”，通俗点讲就是我们使用这个方法进行消息的转发发送。

## 客户端实现

首先引用 *[**sockjs.js**](../../../../images//2018-3/websocket/sockjs.min.js)* 和 *[**stomp.js**](../../../../images//2018-3/websocket/stomp.min.js)*

```javascript
<script src="/js/common/sockjs.min.js">
<script src="/js/common/stomp.min.js">
<script type="text/javascript">
		$(function() {
			connect();
		});
		
		function connect() {
             // TOMP客户端要想接收来自服务器推送的消息，必须先订阅相应的URL，即发送一个SUBSCRIBE帧，然后才能不断接收来自服务器的推送消息； 
			var sock = new SockJS("http://localhost:8080/endpointChat");
			var stomp = Stomp.over(sock);
			stomp.connect('guest', 'guest', function(frame) {
	
				/**订阅了/user/queue/notifications 发送的消息,这里与在控制器convertAndSendToUser 定义的地址保持一致
				 *  这里多用了一个/user,并且这个user 是必须的,使用user才会发送消息到指定的用户。
				 *  */
				stomp.subscribe("/user/queue/notifications", handleNotification);
           		 stomp.subscribe('/topic/getResponse', function(response) { //订阅/topic/getResponse 目标发送的消息。这个是在控制器的@SendTo中定义的。
					console.info(response.body);
				});
                	//向服务端发送消息
    			stomp.send("URL", {}, JSON.stringify(message));
		//订阅服务器发送来的消息
			function handleNotification(message) {
				console.info(message.body);
			}
		}
</script>
```

- 利用 stomp的*connect(login, passcode, connectCallback, errorCallback, vhost)* 方法建立连接，值得注意的是不同版本的 stomp.js 的 connect() 函数的参数会有所不同；
- 利用 stomp的*subscribe(destination, callback, headers)* 方法可以订阅服务器发送来的消息，destination 表示服务器发送消息地址；通过 event 的 body 获取消息内容；
- 利用 stompClient 的*send(destination, headers, body)* 方法可以向服务端发送消息，第一个参数为发送消息地址，最后一个参数是发送消息的 json 串；

## 测试

在客户端请求*/websocket/sendMsg*后会有如下效果：<div align=center><img width="600" height="200" src="../../../../images//2018-3/websocket/result.png" algin="center"/></div>

参考：

[***Spring Framework Reference Documentation***](https://docs.spring.io/spring/docs/4.3.14.RELEASE/spring-framework-reference/htmlsingle/#websocket)

[***websocket+spring***](http://tech.lede.com/2017/03/08/qa/websocket+spring/)

[***spring websocket + stomp 实现广播通信和一对一通信***](http://www.cnblogs.com/winkey4986/p/5622758.html)