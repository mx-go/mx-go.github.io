---
title: 基于Redis的分布式锁
date: 2018-9-20 13:08:57
tags: [redis, java]
categories: 数据库
---

# 引言

目前几乎很多大型网站及应用都是分布式部署的，分布式场景中的数据一致性问题一直是一个比较重要的话题。分布式服务下各个服务同时访问共享资源时，分布式锁就派上用场了。redis用来做缓存很常见，它还有一个非常重要的功能就是做分布式锁。

# 采坑记录

Redis分布式锁大部分人都会想到：`setnx+lua`，或者`set key value px milliseconds nx`，自己也是吃了这方面的亏。

事情的发展是，我们的服务是分布式服务，其中有个功能是调用第三方接口进行外呼，外呼接口中有个参数*accessToken*是需要另外两个参数通过HTTP请求换取。每个租户所有员工共用这一个*accessToken*，*accessToken*的有效期为*120min*。刚开始写的伪代码如下：

```java
String redisKey = REDIS_KEY_PREFIX + "_" + accountId + "_" + appId + "_" + secret;            
String accessToken = jedis.get(redisKey);
if (StringUtils.isBlank(accessToken)) {
     accessToken = this.getAccessToken(accountId, appId, secret);
     jedis.set(redisKey, accessToken, "nx", "ex", 5400);
}
```

*getAccessToken*是获取*accessToken*的动作。自己还是太年轻，以为一个*setnx*就可以解决问题(实际等于没加锁)。在高并发的情况下多个请求会同时进入*getAccessToken*方法获取多个*accessToken*，但是第三方系统里面存储的是最后一次请求的那个*accessToken*，由于*getAccessToken*是HTTP请求且每个请求时间都是不确定的，导致我们这边根本就不知道第三方系统存储的是哪个，结果就是客户反馈外呼电话一直提示“请检查accessToken是否正确”，赶紧排查问题 。

# 封装redis分布式锁

自己当时也是那个着急，就搞了个不太完善的redis分布式锁。

首先有个**RedisDistributeLock**类，里面提供了分布式加锁和释放锁的方法。

```java
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;

/**
 * redis实现的分布式锁。会阻塞当前线程。
 * 只处理了 多个服务访问同一个redis实例， 且该redis实例正常工作的情况。
 * 没有处理 redis故障切换的情况。
 * 时间漂移的问题也没有很好的解决办法。
 */
@Service
public class RedisDistributeLock {

    @Autowired
    public JedisPool jedisPool;

    public Jedis getRedisClient() {
        return jedisPool.getResource();
    }

    /**
     * mini second.
     * 考虑到时间漂移，这个值应该设置大一些。
     * 但是如果设置的过大，当获得lock的线程挂掉以后，别的服务就长时间获取不到该lock, 必须等到该lock过期。
     */
    private static final int lockTimeOut = 5000;

    public void requireLock(String lock) {
        int ret;
        Jedis jedis = this.getRedisClient();

        while (true) {
            long now = System.currentTimeMillis();
            ret = jedis.setnx(lock, String.valueOf(now + RedisDistributeLock.lockTimeOut)).intValue();
            if (1 == ret) {
                /**lock不存在，可以获得锁*/
                break;
            } else {
                String curLockValue = jedis.get(lock);
                /**这个时刻有可能lock又被删除了，所以重新做一次检查*/
                if (null == curLockValue) {
                    continue;
                }
                /**lock过期了*/
                if (now > Long.parseLong(curLockValue)) {
                    String oldLockValue = jedis.getSet(lock, String.valueOf(now + RedisDistributeLock.lockTimeOut));
                    if (null == oldLockValue) {
                        /**要么getset之前lock不存在, 要么getset之前lock存在但没有值，
                         * 我不确定会不会出现第二种情况，所以重新去请求锁。*/
                        continue;
                    }
                    if (now > Long.parseLong(oldLockValue)) {
                        /**抢到了这个过期的lock, 并且已经已经设置成功*/
                        break;
                    }
                }
                try {
                    Thread.sleep(20);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }
        jedis.close();
    }

    public void releaseLock(String lock) {
        long now = System.currentTimeMillis();
        Jedis jedis = this.getRedisClient();
        //jedis.eva
        if (now < Long.valueOf(jedis.get(lock))) {
            jedis.del(lock);
        }
        jedis.close();
    }
}
```

在分布式下只需将需要同步的代码块放在`distributeLock.requireLock`和`distributeLock.releaseLock`中即可。

```java
String lock_key = REDIS_KEY_PREFIX + "_" + accountId + "_" + appId + "_" + secret;
String accessToken;
try{
    distributeLock.requireLock(lock_key);
    {
        accessToken = client.get(redis_key);
        if (StringUtils.isEmpty(accessToken)) {
            accessToken = this.getAccessToken();
            client.set(redis_key, accessToken);
            client.expire(redis_key, 3);
            log.info(Thread.currentThread().getName() + " " + accessToken);
        }
        distributeLock.releaseLock(lock_key);
    }
}catch(Excetion e){
    // do something
}finally{
    distributeLock.releaseLock(lock_key);
}
```

虽然解决了同步获取*accessToken*的问题，但是对于异常情况的考虑还是欠缺，请求线程同时还是阻塞的，自己测试在TPS为700时还可以扛住，高于单个服务负载或是redis故障时请求被阻塞会导致服务受到影响。

# Redisson

Redisson是基于Redlock实现同时也是redis官方推荐的分布式JAVA客户端，和Jedis相比它实现了分布式和可扩展的JAVA数据结构。在Redisson中提供了现成的分布式锁的方法。

![Redisson](../../../../images/2018-8/Redisson.jpg)

## Maven引入Redisson

```xml
<dependency>
	<groupId>org.redisson</groupId>
	<artifactId>redisson</artifactId>
	<version>3.9.1</version>
</dependency>
```

## 分布式锁用法

在分布式下加锁*lock*和释放锁*unlock*的伪代码如下

```java
String lock_key = REDIS_KEY_PREFIX + accountId + "_" + appId + "_" + secret;
String accessToken = client.get(redis_key);

if (StringUtils.isEmpty(accessToken)) {
    // 1.获得锁对象实例
    RLock lock = redisson.getLock(lock_key);
    // 2.获取分布式锁
    lock.lock(); 
    accessToken = client.get(redis_key);
    if (StringUtils.isEmpty(accessToken)) {
        try {
            accessToken = this.getAccessToken();
            client.set(redis_key, accessToken);
            client.expire(redis_key, 2);
        } finally {
            // 3.释放锁
            lock.unlock(); 
        }
    }
}
```

# 总结

当然，分布式锁不止基于redis和redisson这两种方案，还有数据库乐观锁、基于ZooKeeper的分布式锁等。但是在基于redis方面，通过自己的分析及测试，**Redisson在分布式锁方面是还是首选**，同时Redisson不光是针对锁，同时提供了很多客户端操作redis的方法，也需要自己去摸索。