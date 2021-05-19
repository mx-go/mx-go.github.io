---
title: RocketMQ(二)—消息重试
date: 2019-08-13 20:37:29
tags: [RocketMQ]
categories: 中间件
img: ../../../../images/2020/1-4/reconsumerTimes.png
cover: ../../../../images/2020/1-4/reconsumerTimes.png
---

# 引言

由于MQ经常处于复杂的分布式系统中，考虑网络波动、服务宕机、程序异常因素，很有可能出现消息发送或者消费失败的问题。因此，消息的重试就是所有MQ中间件必须考虑到的一个关键点。如果没有消息重试，就可能产生消息丢失的问题，可能对系统产生很大的影响。

# Consumer重试

## 重试条件

在RocketMQ中，**只有当消费模式为MessageModel.CLUSTERING(集群模式)时，Broker才会自动进行重试**，对于`MessageModel.BROADCASTING`(广播消息)是不会重试的。集群模式下，当消息消费失败时，RMQ会通过消息重试机制重新投递消息，努力使该消息消费成功。对于一直无法消费成功的消息，RMQ会在达到最大重试次数之后，将该消息投递至死信队列。然后我们可以关注死信队列DLQ(*Dead Letter Queue*)，并对该死信消息业务做人工补偿操作。

> 当消费者消费该重试消息后，需要返回结果给broker，告知broker消费成功(ConsumeConcurrentlyStatus.CONSUME_SUCCESS)或者需要重新消费(ConsumeConcurrentlyStatus.RECONSUME_LATER)

RocketMQ规定，以下三种情况统一按照消费失败处理并会发起重试：

- 业务消费方返回`ConsumeConcurrentlyStatus.RECONSUME_LATER`
- 业务消费方返回null
- 业务消费方主动/被动抛出异常

前两种情况较容易理解，当返回ConsumeConcurrentlyStatus.RECONSUME_LATER或者null时，broker会知道消费失败，后续就会发起消息重试，重新投递该消息。

**注意：**对于抛出异常的情况，只要在业务逻辑中显式抛出异常或者非显式抛出异常，broker也会重新投递消息，如果业务对异常做了捕获，那么该消息将不会发起重试。因此对于需要重试的业务，消费方在捕获异常的时候要注意返回`ConsumeConcurrentlyStatus.RECONSUME_LATER`或`null`并输出异常日志，打印当前重试次数(推荐返回**ConsumeConcurrentlyStatus.RECONSUME_LATER**)。

## 重试时间窗

RocketMQ不支持任意频率的延时调用，当消息需要重试时，会按照broker中指定的重试时间窗进行重试。可以在RMQ的源码`org.apache.rocketmq.store.config.MessageStoreConfig#messageDelayLevel`找到消息重试配置：

```java
// 消息延时级别默认配置
private String messageDelayLevel = "1s 5s 10s 30s 1m 2m 3m 4m 5m 6m 7m 8m 9m 10m 20m 30m 1h 2h";
```

| 重试次数 | **距离第一次发送的时间间隔** |
| :------: | :--------------------------: |
|    1     |             10s              |
|    2     |             30s              |
|    3     |              1m              |
|    4     |              2m              |
|    5     |              3m              |
|    6     |              4m              |
|    7     |              5m              |
|    8     |              6m              |
|    9     |              7m              |
|    10    |              8m              |
|    11    |              9m              |
|    12    |             10m              |
|    13    |             20m              |
|    14    |             30m              |
|    15    |              1h              |
|    16    |              2h              |

RocketMQ采用了“时间衰减策略”进行消息的重复投递，即重试次数越多，消息消费成功的可能性越小。

## 源码分析

在RMQ的客户端源码`DefaultMQPushConsumerImpl.java`中，对重试机制做了说明，源码如下：

```java
private int getMaxReconsumeTimes() {
        // 默认消费次数: 16
        if (this.defaultMQPushConsumer.getMaxReconsumeTimes() == -1) {
            return 16;
        } else {
            return this.defaultMQPushConsumer.getMaxReconsumeTimes();
        }
}
```

首先判断消费端有没有显式设置最大重试次数 `MaxReconsumeTimes`， **如果没有，则设置默认重试次数为16，否则以设置的最大重试次数为准**。

当消息消费失败，服务端会发起消费重试，具体逻辑在broker的源码`org.apache.rocketmq.broker.processor.SendMessageProcessor#consumerSendMsgBack`中涉及，源码如下：

```java
// 当前重试次数大于等于最大重试次数或者配置的重试级别小于0，则获取死信队列的Topic。后续将超时的消息send到死信队列中
if (msgExt.getReconsumeTimes() >= maxReconsumeTimes || delayLevel < 0) {
            newTopic = MixAll.getDLQTopic(requestHeader.getGroup());
            queueIdInt = Math.abs(this.random.nextInt() % 99999999) % DLQ_NUMS_PER_GROUP;

            topicConfig = this.brokerController.getTopicConfigManager().createTopicInSendMessageBackMethod(newTopic,
                DLQ_NUMS_PER_GROUP,
                PermName.PERM_WRITE, 0
            );
            if (null == topicConfig) {
                response.setCode(ResponseCode.SYSTEM_ERROR);
                response.setRemark("topic[" + newTopic + "] not exist");
                return response;
            }
        } else {
            // 如果delayLevel为0，则默认加3个级别
            if (0 == delayLevel) {
                delayLevel = 3 + msgExt.getReconsumeTimes();
            }

            msgExt.setDelayTimeLevel(delayLevel);
}
```

正常情况会进入else分支，对于首次重试的消息，默认的delayLevel是0，RMQ会将给该level + 3，也就是加到3，这就是说，如果没有显示的配置延时级别，消息消费重试首次，是延迟了第三个级别发起的重试，从表格中看也就是距离首次发送10s后重试。

当延时级别设置完成，刷新消息的重试次数为当前次数加1，broker将该消息刷盘，逻辑如下：

```java
MessageExtBrokerInner msgInner = new MessageExtBrokerInner();
        msgInner.setTopic(newTopic);
        msgInner.setBody(msgExt.getBody());
        msgInner.setFlag(msgExt.getFlag());
        MessageAccessor.setProperties(msgInner, msgExt.getProperties());
        msgInner.setPropertiesString(MessageDecoder.messageProperties2String(msgExt.getProperties()));
        msgInner.setTagsCode(MessageExtBrokerInner.tagsString2tagsCode(null, msgExt.getTags()));

        msgInner.setQueueId(queueIdInt);
        msgInner.setSysFlag(msgExt.getSysFlag());
        msgInner.setBornTimestamp(msgExt.getBornTimestamp());
        msgInner.setBornHost(msgExt.getBornHost());
        msgInner.setStoreHost(this.getStoreHost());
        msgInner.setReconsumeTimes(msgExt.getReconsumeTimes() + 1);

        String originMsgId = MessageAccessor.getOriginMessageId(msgExt);
        MessageAccessor.setOriginMessageId(msgInner, UtilAll.isBlank(originMsgId) ? msgExt.getMsgId() : originMsgId);

        PutMessageResult putMessageResult = this.brokerController.getMessageStore().putMessage(msgInner);
```

对于重试消息，RMQ会创建新的`MessageExtBrokerInner`对象，继承自`MessageExt`。继续进入消息刷盘逻辑，即：`putMessage(msgInner)`方法，实现类为`DefaultMessageStore.java`，核心代码如下：

```java
long beginTime = this.getSystemClock().now();
PutMessageResult result = this.commitLog.putMessage(msg);
```

主要关注 `this.commitLog.putMessage(msg);` 这句代码，通过commitLog可以认为这里是真实刷盘操作，也就是消息被持久化了。继续进入`commitLog`的`putMessage`方法，核心代码段：

```java
if (tranType == MessageSysFlag.TRANSACTION_NOT_TYPE
    || tranType == MessageSysFlag.TRANSACTION_COMMIT_TYPE) {
    // 处理延时级别
    if (msg.getDelayTimeLevel() > 0) {
        if (msg.getDelayTimeLevel() > this.defaultMessageStore.getScheduleMessageService().getMaxDelayLevel()) {
            msg.setDelayTimeLevel(this.defaultMessageStore.getScheduleMessageService().getMaxDelayLevel());
        }
        // 更换Topic
        topic = ScheduleMessageService.SCHEDULE_TOPIC;
        // 队列ID为延迟级别-1
        queueId = ScheduleMessageService.delayLevel2QueueId(msg.getDelayTimeLevel());

        // 备份真实的topic, queueId
        MessageAccessor.putProperty(msg, MessageConst.PROPERTY_REAL_TOPIC, msg.getTopic());
        MessageAccessor.putProperty(msg, MessageConst.PROPERTY_REAL_QUEUE_ID, String.valueOf(msg.getQueueId()));
        msg.setPropertiesString(MessageDecoder.messageProperties2String(msg.getProperties()));

        // 重置topic及queueId
        msg.setTopic(topic);
        msg.setQueueId(queueId);
    }
}
```

`ScheduleMessageService.java`

```java
public static int delayLevel2QueueId(final int delayLevel) {
        return delayLevel - 1;
}
```

如果是重试消息，在进行延时级别判断时候，会进入分支逻辑，通过这段逻辑可以看出对于重试的消息，RMQ并不会从原队列中获取消息，而是创建了一个新的Topic进行消息存储的。也就是代码中的`SCHEDULE_TOPIC`

```java
public static final String SCHEDULE_TOPIC = "SCHEDULE_TOPIC_XXXX";
```

由此可以看出：

> 对于所有消费者消费失败的消息，RMQ都会把重试的消息重新new出来(new MessageExtBrokerInner对象)，然后投递到Topic为**SCHEDULE_TOPIC_XXXX** 下的队列中，然后由定时任务进行调度重试，而重试的周期即是上面的的delayLevel周期。Broker在启动时会创建topic为SCHEDULE_TOPIC_XXXX`，根据延迟level的个数，创建对应数量的队列，也就是说18个level对应了18个队列。注意，这并不是说这个内部主题只会有18个队列，因为Broker通常是集群模式部署的，因此每个节点都有18个队列。

同时为了保证消息可被找到，也会将原先的Topic和队列id存储到properties中做备份：

```java
 // Backup real topic, queueId
MessageAccessor.putProperty(msg, MessageConst.PROPERTY_REAL_TOPIC, msg.getTopic());
MessageAccessor.putProperty(msg, MessageConst.PROPERTY_REAL_QUEUE_ID, String.valueOf(msg.getQueueId()));
msg.setPropertiesString(MessageDecoder.messageProperties2String(msg.getProperties()));
```

## 死信的业务处理方式

默认的处理机制中，如果只对消息做重复消费，达到最大重试次数之后消息就进入死信队列了。可以根据业务的需要，定义消费的最大重试次数，每次消费的时候判断当前消费次数是否等于最大重试次数的阈值。

如：重试三次就认为当前业务存在异常，继续重试下去也没有意义了，那么就可以将当前的这条消息进行提交，返回broker状态**ConsumeConcurrentlyStatus.CONSUME_SUCCES**，让消息不再重发，同时将该消息存入业务自定义的死信消息表，将业务参数入库，相关的运营通过查询死信表来进行对应的业务补偿操作。

RMQ 的处理方式为将达到最大重试次数(16次)的消息标记为死信消息，将该死信消息投递到DLQ死信队列中，业务需要进行人工干预。实现的逻辑在`org.apache.rocketmq.broker.processor.SendMessageProcessor#consumerSendMsgBack`方法中，大致思路为首先判断重试次数是否超过16或消息发送延时级别是否小于0，如果是则将消息设置为新的死信。死信topic 为：**%DLQ% + consumerGroup**。

### 死信源码分析

```java
private RemotingCommand consumerSendMsgBack(final ChannelHandlerContext ctx, final RemotingCommand request)
        throws RemotingCommandException {
        final RemotingCommand response = RemotingCommand.createResponseCommand(null);
        final ConsumerSendMsgBackRequestHeader requestHeader =
            (ConsumerSendMsgBackRequestHeader)request.decodeCommandCustomHeader(ConsumerSendMsgBackRequestHeader.class);

        ......

        // 0.首先判断重试次数是否大于等于16，或者消息延迟级别是否小于0
        if (msgExt.getReconsumeTimes() >= maxReconsumeTimes
            || delayLevel < 0) {
            // 1. 如果满足判断条件，设置死信队列topic= %DLQ%+consumerGroup
            newTopic = MixAll.getDLQTopic(requestHeader.getGroup());
            queueIdInt = Math.abs(this.random.nextInt() % 99999999) % DLQ_NUMS_PER_GROUP;

            topicConfig = this.brokerController.getTopicConfigManager().createTopicInSendMessageBackMethod(newTopic,
                DLQ_NUMS_PER_GROUP,
                PermName.PERM_WRITE, 0
            );
            if (null == topicConfig) {
                response.setCode(ResponseCode.SYSTEM_ERROR);
                response.setRemark("topic[" + newTopic + "] not exist");
                return response;
            }
        } else {
            // 如果延迟级别为0，则设置下一次延迟级别为3+当前重试消费次数，达到时间衰减效果
            if (0 == delayLevel) {
                delayLevel = 3 + msgExt.getReconsumeTimes();
            }

            msgExt.setDelayTimeLevel(delayLevel);
        }

        MessageExtBrokerInner msgInner = new MessageExtBrokerInner();
        msgInner.setTopic(newTopic);
        msgInner.setBody(msgExt.getBody());
        msgInner.setFlag(msgExt.getFlag());
        MessageAccessor.setProperties(msgInner, msgExt.getProperties());
        msgInner.setPropertiesString(MessageDecoder.messageProperties2String(msgExt.getProperties()));
        msgInner.setTagsCode(MessageExtBrokerInner.tagsString2tagsCode(null, msgExt.getTags()));

        msgInner.setQueueId(queueIdInt);
        msgInner.setSysFlag(msgExt.getSysFlag());
        msgInner.setBornTimestamp(msgExt.getBornTimestamp());
        msgInner.setBornHost(msgExt.getBornHost());
        msgInner.setStoreHost(this.getStoreHost());
        msgInner.setReconsumeTimes(msgExt.getReconsumeTimes() + 1);

        String originMsgId = MessageAccessor.getOriginMessageId(msgExt);
        MessageAccessor.setOriginMessageId(msgInner, UtilAll.isBlank(originMsgId) ? msgExt.getMsgId() : originMsgId);

        // 3.死信消息投递到死信队列中并落盘
        PutMessageResult putMessageResult = this.brokerController.getMessageStore().putMessage(msgInner);
        ......
        return response;
    }
```

死信队列的处理逻辑

1. 判断消息当前重试次数是否大于等于16，或者消息延迟级别是否小于0
2. 只要满足上述的任意一个条件，设置新的topic(死信topic)为：**%DLQ% + consumerGroup**
3. 进行前置属性的添加
4. 将死信消息投递到步骤2建立的死信topic对应的死信队列中并落盘，使消息持久化

# Producer重试

当发生网络抖动等异常情况，`Producer`侧往broker发送消息失败，即：生产者侧没收到broker返回的ACK，导致`Consumer`无法进行消息消费，这时RMQ会进行发送重试。

使用`DefaultMQProducer`进行普通消息发送时，可以设置消息发送失败后最大重试次数，并且能够灵活的配合超时时间进行业务重试逻辑的开发，使用的API如下：

```java
// 默认重试两次
private int retryTimesWhenSendFailed = 2;

// 设置消息发送失败时最大重试次数
public void setRetryTimesWhenSendFailed(int retryTimesWhenSendFailed) {
    this.retryTimesWhenSendFailed = retryTimesWhenSendFailed;
}

// 同步发送消息，并指定超时时间
public SendResult send(Message msg, long timeout) throws MQClientException, RemotingException, MQBrokerException, InterruptedException {
    return this.defaultMQProducerImpl.send(msg, timeout);
}
```

通过API可以看出，生产者侧的重试是比较简单的，例如：设置生产者在3s内没有发送成功则重试3次的代码如下：

```java
// 同步发送消息，如果3秒内没有发送成功，则重试3次
DefaultMQProducer producer = new DefaultMQProducer("DefaultProducerGroup");
producer.setRetryTimesWhenSendFailed(3);
producer.send(msg, 3000L);
```

# 参考

[跟我学RocketMQ之消息重试](http://wuwenliang.net/2019/03/28/%E8%B7%9F%E6%88%91%E5%AD%A6RocketMQ%E4%B9%8B%E6%B6%88%E6%81%AF%E9%87%8D%E8%AF%95/#RocketMQ%E9%87%8D%E8%AF%95%E6%97%B6%E9%97%B4%E7%AA%97)