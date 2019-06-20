---
title: RocketMQ(一)—角色与术语
date: 2019-06-15 23:00:16
tags: [RocketMQ]
categories: 中间件
img: ../../../../images/2019/4-6/cover.jpg
---

# 引言

我们通过缓存和消息队列来化解海量的读请求和写请求对后端数据库服务造成的压力。RocketMQ作为阿里巴巴开源的消息队列中间件，得到不少企业的青睐。在RocketMQ中有四大角色 **NameServer**、**Broker**、**Producer**和**Consumer**。<div align=center><img width="700" height="300" src="../../../../images/2019/4-6/overview.png" algin="center"/></div>

# RocketMQ 特点

## 灵活可扩展性

RocketMQ天然支持集群，其核心四组件（**NameServer**、**Broker**、**Producer**、**Consumer**）每一个都可以在没有单点故障的情况下进行水平扩展。

## 海量消息堆积能力

RocketMQ采用零拷贝原理实现超大的消息的堆积能力，据说单机已可以支持亿级消息堆积，而且在堆积了这么多消息后依然保持写入低延迟。

## 支持顺序消息

可以保证消息消费者按照消息发送的顺序对消息进行消费。顺序消息分为全局有序和局部有序，一般推荐使用局部有序，即生产者通过将某一类消息按顺序发送至同一个队列来实现。

## 多种消息过滤方式

消息过滤分为在服务器端过滤和在消费端过滤。服务器端过滤时可以按照消息消费者的要求做过滤，优点是减少不必要消息传输，缺点是增加了消息服务器的负担，实现相对复杂。消费端过滤则完全由具体应用自定义实现，这种方式更加灵活，缺点是很多无用的消息会传输给消息消费者。

## 支持事务消息

RocketMQ除了支持普通消息，顺序消息之外还支持事务消息，这个特性对于分布式事务来说提供了又一种解决思路。

## 回溯消费

回溯消费是指消费者已经消费成功的消息，由于业务上需求需要重新消费，RocketMQ支持按照时间回溯消费，时间维度精确到毫秒，可以向前回溯，也可以向后回溯。

# Name Server

`NameServer`用来保存`Broker`相关元信息并提供给`Producer`和`Consumer`查找`Broker`信息。`NameServer`被设计成无状态的，可以横向扩展，节点之间相互之间无通信，通过部署多台机器来标记自己是一个伪集群。每个`Broker`在启动的时候会到`NameServer`注册，`Producer`在发送消息前会根据`Topic`到`NameServer`获取到`Broker`的路由信息，`Consumer`也会定时获取`Topic`的路由信息。

- Name Server是一个无状态的结点，Name Server之间采取share-nothing的设计，互不通信。
- Name Server所有状态都从Broker上报而来，本身不存储任何状态，所有数据均在内存。
- Name Server不会有频繁的读写，所以性能开销非常小，稳定性很高。
- 如果所有Name Server全都挂了，只会影响到Topic到Broker路由信息的更新，不会影响Topic和Broker的通信。

# Broker

`Broker`是消息存储中心，主要作用是接收来自`Producer`的消息并存储，`Consumer`从这里取得消息。它还存储与消息相关的元数据，包括用户组、消费进度偏移量、队列信息等。

- Broker向所有的NameServer结点建立长连接，注册Topic信息。
- Broker分为master和slave。只有master才能进行写入操作，slave不允许。
- slave从master中同步数据。同步策略取决于master的配置，可以采用同步刷盘，异步刷盘两种。
- 客户端消费可以从master和slave消费。在默认情况下，Consumer都从master消费，在master挂后，客户端由于从Name Server中感知到Broker挂机，就会从slave消费。

## 与Name Server关系

- **连接。**单个Broker和所有NameServer保持长连接。
- **心跳。**每隔30秒（此时间无法更改）向所有NameServer发送心跳，心跳包含了自身的Topic配置信息。
- **断开。**当Broker挂掉时，心跳超时导致NameServer主动关闭连接。一旦连接断开，NameServer会立即感知，更新Topic与队列的对应关系，但不会通知生产者和消费者。

## 负载均衡

- 一个Topic分布在多个Broker上，一个Broker可以配置多个Topic，它们是多对多的关系。
- 如果某个Topic消息量很大，应该多配置几个队列，并尽量分布在不同Broker上，减轻某个Broker的压力。
- Topic消息量比较均匀的情况下，如果某个Broker上的队列越多，则该Broker压力越大。

## 可用性

由于消息分布在各个Broker上，一旦某个Broker宕机，则该Broker上的消息读写都会受到影响。所以RocketMQ提供了master/slave的结构，salve定时从master同步数据。如果master宕机，则slave提供消费服务，但是不能写入消息，此过程对应用透明，由RocketMQ内部解决。

- 一旦某个Broker master宕机，受限于RocketMQ的网络连接机制，默认情况下，生产者和消费者最多需要30秒会发现，但这个时间可由应用设定参数来缩短时间。这个时间段内，发往该Broker的消息都是失败的，而且该Broker的消息无法消费，因为此时消费者不知道该Broker已经挂掉。
- 消费者得到master宕机通知后，转向slave消费，但是slave不能保证master的消息100%都同步过来了，因此会有少量的消息丢失。但是消息最终不会丢的，一旦master恢复，未同步过去的消息会被消费掉。

# Producer

`Producer`负责产生消息，生产者向消息服务器发送由业务应用程序系统生成的消息。

## 与Name Server关系

- **连接。**单个生产者者和一台NameServer保持长连接，定时查询Topic配置信息，如果该NameServer挂掉，Producer会自动连接下一个NameServer，直到有可用连接为止，并能自动重连。
- **轮询时间。**生产者每30秒从NameServer获取Topic跟Broker的映射关系，更新到本地内存中。再跟Topic涉及的所有Broker建立长连接，每隔30秒发一次心跳。在Broker端也会每10秒扫描一次当前注册的Producer，如果发现某个Producer超过2分钟都没有发心跳，则断开连接。

## 与broker关系

- **连接。**单个生产者和该生产者关联的所有Broker保持长连接。
- **心跳。**默认情况下，生产者每隔30秒向所有Broker发送心跳，该时间由DefaultMQProducer的`heartbeatBrokerInterval`参数决定，可手动配置。Broker每隔10秒钟（此时间无法更改），扫描所有还存活的连接，若某个连接2分钟内（当前时间与最后更新时间差值超过2分钟，此时间无法更改）没有发送心跳数据，则关闭连接。
- **连接断开。**移除Broker上的生产者信息。

> 假如某个Broker宕机，意味生产者最长需要30秒才能感知到。在这期间会向宕机的Broker发送消息。当一条消息发送到某个Broker失败后，会往该Broker自动再重发2次，假如还是发送失败，则抛出发送失败异常。业务捕获异常，重新发送即可。客户端里会自动轮询另外一个Broker重新发送，这个对于用户是透明的。

## 负载均衡

生产者发送时，会自动轮询当前所有可发送的Broker，一条消息发送成功，下次换另外一个Broker发送，以达到消息平均落到所有的Broker上。

# Consumer

消费消息的客户端角色。通常是后台处理异步消费的系统。 

> RocketMQ中Consumer有两种实现：PushConsumer和PullConsumer。
>
> 消费者有两种模式消费：集群消费(clustering)，广播消费(broadcast)。

## 与NameServer关系

- **连接。**单个消费者和一台NameServer保持长连接，定时查询Topic配置信息，如果该NameServer挂掉，消费者会自动连接下一个NameServer，直到有可用连接为止，并能自动重连。
- **轮询时间。**消费者每隔30秒从NameServer获取所有Topic的最新队列情况，这意味着某个Broker如果宕机，客户端最多要30秒才能感知。连接建立后，从NameServer中获取当前消费Topic所涉及的Broker，直连Broker。

## 与broker关系

- **连接。**单个消费者和该消费者关联的所有Broker保持长连接。
- **心跳。**Consumer跟Broker是长连接，会每隔30秒发心跳信息到Broker。Broker端每10秒检查一次当前存活的Consumer，若发现某个Consumer 2分钟内没有心跳，就断开与该Consumer的连接，并且向该消费组的其他实例发送通知，触发该消费者集群的负载均衡。
- **断开。**一旦连接断开，Broker会立即感知到，并向该消费者分组的所有消费者发出通知，分组内消费者重新分配队列继续消费。

## 负载均衡

集群消费模式下，一个消费者集群多台机器共同消费一个Topic的多个队列，一个队列只会被一个消费者消费。如果某个消费者挂掉，分组内其它消费者会接替挂掉的消费者继续消费。

# 参数详解

- 客户端的公共配置类：**ClientConfig**

| 参数名                        | 默认值  | 说明                                                         |
| :---------------------------- | :------ | :----------------------------------------------------------- |
| NamesrvAddr                   | 无      | NameServer地址列表，多个nameServer地址用分号隔开             |
| clientIP                      | 本机IP  | 客户端本机IP地址，某些机器会发生无法识别客户端IP地址情况，需要应用在代码中强制指定 |
| instanceName                  | DEFAULT | 客户端实例名称，客户端创建的多个Producer，Consumer实际是共用一个内部实例（这个实例包含网络连接，线程资源等） |
| clientCallbackExecutorThreads | 4       | 通信层异步回调线程数                                         |
| pollNameServerInteval         | 30000   | 轮询Name Server 间隔时间，单位毫秒                           |
| heartbeatBrokerInterval       | 30000   | 向Broker发送心跳间隔时间，单位毫秒                           |
| persistConsumerOffsetInterval | 5000    | 持久化Consumer消费进度间隔时间，单位毫秒                     |

- Producer配置

| 参数名                           | 默认值           | 说明                                                         |
| :------------------------------- | :--------------- | :----------------------------------------------------------- |
| producerGroup                    | DEFAULT_PRODUCER | Producer组名，多个Producer如果属于一个应用，发送同样的消息，则应该将它们归为同一组。标识发送同一类消息的Producer，通常发送逻辑一致。发送普通消息的时候，仅标识使用，并无特别用处。若事务消息，如果某条发送某条消息的producer-A宕机，使得事务消息一直处于PREPARED状态并超时，则broker会回查同一个group的其 他producer，确认这条消息应该commit还是rollback。 |
| createTopicKey                   | TBW102           | 在发送消息时，自动创建服务器不存在的topic，需要指定key       |
| defaultTopicQueueNums            | 4                | 在发送消息时，自动创建服务器不存在的topic，默认创建的队列数  |
| sendMsgTimeout                   | 10000            | 发送消息超时时间，单位毫秒                                   |
| compressMsgBodyOverHowmuch       | 4096             | 消息Body超过多大开始压缩（Consumer收到消息会自动解压缩），单位字节 |
| retryAnotherBrokerWhenNotStoreOK | FALSE            | 如果发送消息返回sendResult,但是sendStatus!=SEND_OK,是否重试发送 |
| maxMessageSize                   | 131072           | 客户端限制的消息大小，超过报错，同时服务端也会限制（默认128K） |
| transactionCheckListener         | 无               | 事物消息回查监听器，如果发送事务消息，必须设置               |
| checkThreadPoolMinSize           | 1                | Broker回查Producer事务状态时，线程池大小                     |
| checkThreadPoolMaxSize           | 1                | Broker回查Producer事务状态时，线程池大小                     |
| checkRequestHoldMax              | 2000             | Broker回查Producer事务状态时，Producer本地缓冲请求队列大小   |

- PushConsumer配置

| 参数名                       | 默认值                        | 说明                                                         |
| :--------------------------- | :---------------------------- | :----------------------------------------------------------- |
| consumerGroup                | DEFAULT_CONSUMER              | Consumer组名，多个Consumer如果属于一个应用，订阅同样的消息，且消费逻辑一致，则应将它们归为同一组。消费进度以Consumer Group为粒度管理，不同Consumer Group之间消费进度彼此不受影响，即消息A被Consumer Group1消费过，也会再给Consumer Group2消费 |
| messageModel                 | CLUSTERING                    | 消息模型，支持以下两种1.集群消费2.广播消费                   |
| consumeFromWhere             | CONSUME_FROM_LAST_OFFSET      | Consumer启动后，默认从什么位置开始消费                       |
| allocateMessageQueueStrategy | AllocateMessageQueueAveragely | Rebalance算法实现策略                                        |
| Subscription                 | {}                            | 订阅关系                                                     |
| messageListener              | 无                            | 消息监听器                                                   |
| offsetStore                  | 无                            | 消费进度存储                                                 |
| consumeThreadMin             | 20                            | 消费线程池数量                                               |
| consumeThreadMax             | 64                            | 消费线程池数量                                               |
| consumeConcurrentlyMaxSpan   | 2000                          | 单队列并行消费允许的最大跨度                                 |
| pullThresholdForQueue        | 1000                          | 拉消息本地队列缓存消息最大数                                 |
| Pullinterval                 | 0                             | 拉消息间隔，由于是长轮询，所以为0，但是如果应用了流控，也可以设置大于0的值，单位毫秒 |
| consumeMessageBatchMaxSize   | 1                             | 批量消费，一次消费多少条消息                                 |
| pullBatchSize                | 32                            | 批量拉消息，一次最多拉多少条                                 |

- PullConsumer配置

| 参数名                           | 默认值       | 说明                                                         |
| :------------------------------- | :----------- | :----------------------------------------------------------- |
| consumerGroup                    | 无           | Conusmer组名，多个Consumer如果属于一个应用，订阅同样的消息，且消费逻辑一致，则应该将它们归为同一组 |
| brokerSuspendMaxTimeMillis       | 20000        | 长轮询，Consumer拉消息请求在Broker挂起最长时间，单位毫秒     |
| consumerPullTimeoutMillis        | 10000        | 非长轮询，拉消息超时时间，单位毫秒                           |
| consumerTimeoutMillisWhenSuspend | 30000        | 长轮询，Consumer拉消息请求咋broker挂起超过指定时间，客户端认为超时，单位毫秒 |
| messageModel                     | BROADCASTING | 消息模型，支持以下两种：1集群消费 2广播模式                  |
| messageQueueListener             | 无           | 监听队列变化                                                 |
| offsetStore                      | 无           | 消费进度存储                                                 |
| registerTopics                   | 无           | 注册的topic集合                                              |
| allocateMessageQueueStrategy     | 无           | Rebalance算法实现策略                                        |