---
title: Mybatis之缓存
date: 2018-03-20 10:43:53
tags: [java,mybatis]
categories: technology
---

# 引言

Mybatis中有一级缓存和二级缓存，默认情况下一级缓存是开启的，而且是不能关闭的。一级缓存是指SqlSession级别的缓存，当在同一个SqlSession中进行相同的SQL语句查询时，第二次以后的查询不会从数据库查询，而是直接从缓存中获取，一级缓存最多缓存1024条SQL。二级缓存是指可以跨SqlSession的缓存。<div align=center><img width="700" height="300" src="http://on937g0jc.bkt.clouddn.com/2018-3/Mybatis/cache.png" algin="center"/></div><!-- more -->

# Mybatis缓存

缓存的意义：将用户经常**查询的数据放在缓存（内存）中**，用户去查询数据就不用从磁盘上(关系型数据库数据文件)查询，从缓存中查询，从而提高查询效率，解决了高并发系统的性能问题。

**Mybatis提供一级缓存和二级缓存**

- mybatis一级缓存是一个SqlSession级别，sqlsession只能访问自己的一级缓存的数据。
- 二级缓存是跨sqlSession，是mapper级别的缓存，对于mapper级别的缓存不同的sqlsession是可以共享的。

<div align=center><img width="600" height="200" src="http://on937g0jc.bkt.clouddn.com/2018-3/Mybatis/cache-index.png" algin="center"/></div>

## Mybatis一级缓存

Mybatis的一级缓存原理：

<div align=center><img width="600" height="200" src="http://on937g0jc.bkt.clouddn.com/2018-3/Mybatis/cache-first.png" algin="center"/></div>

第一次发出一个查询sql，sql查询结果写入sqlsession的一级缓存中，缓存使用的数据结构是一个map`<key,value>`

> key：hashcode + sql + sql输入参数 + 输出参数（sql的唯一标识）
>
> value：用户信息

同一个sqlsession再次发出相同的sql，就从缓存中取，不走数据库。如果两次中间出现commit操作（修改、添加、删除），本sqlsession中的一级缓存区域全部清空，下次再去缓存中查询不到所以要从数据库查询，从数据库查询到再写入缓存。

Mybatis一级缓存值得注意的地方：

1. *Mybatis默认就是支持一级缓存的，并不需要我们配置。*
2. **mybatis和spring整合后进行mapper代理开发，不支持一级缓存，mybatis和spring整合，spring按照mapper的模板去生成mapper代理对象，模板中在最后统一关闭sqlsession**。

## Mybatis二级缓存

二级缓存原理：

<div align=center><img width="600" height="200" src="http://on937g0jc.bkt.clouddn.com/2018-3/Mybatis/cache-2.png" algin="center"/></div>

**二级缓存的范围是mapper级别（mapper同一个命名空间）**，mapper以命名空间为单位创建缓存数据结构，结构是map`<key、value>`。

### 二级缓存配置

Mybatis二级缓存需要手动开启，需要在Mybatis的配置文件中配置二级缓存

```xml
<!-- 全局配置参数 -->
<settings>
	<!-- 开启二级缓存 -->
	<setting name="cacheEnabled" value="true"/>
</settings>
```

上面已经说了，二级缓存的范围是mapper级别的，因此Mapper如果要使用二级缓存，还需要在对应的映射文件中配置。

```xml
<mapper namespace="com.rainbowhorse.test.dao.TestDataDao">
<!-- 在mapper中开启二级缓存 -->
<cache/>
```

查询结果映射的pojo序列化

mybatis二级缓存需要将查询结果映射的pojo实现 java.io.serializable接口，如果不实现则抛出异常：

```java
org.apache.ibatis.cache.CacheException: Error serializing object.  Cause: java.io.NotSerializableException: com.rainbowhorse.test.po.User
```

二级缓存可以将内存的数据写到磁盘，存在对象的序列化和反序列化，所以要实现java.io.serializable接口。 如果结果映射的pojo中还包括了pojo，都要实现java.io.serializable接口。

### 禁用二级缓存

对于变化频率较高的sql，需要禁用二级缓存：

在statement中设置useCache=false可以禁用当前select语句的二级缓存，即每次查询都会发出sql去查询，默认情况是true，即该sql使用二级缓存。

```xml
<select id="findOrderListResultMap" resultMap="ordersUserMap" useCache="false">
```

### 刷新缓存

我们的缓存都是在查询语句中配置，而使用增删改的时候，缓存默认就会被清空【刷新了】。缓存其实就是为我们的查询服务的，对于增删改而言，如果我们的缓存保存了增删改后的数据，那么再次读取时就会读到脏数据了！

我们在特定的情况下，还可以单独配置刷新缓存【但不建议使用】flushCache，默认是的true。

```xml
<update id="updateUser" parameterType="cn.itcast.mybatis.po.User" flushCache="false">
		update user set username=#{username},birthday=#{birthday},sex=#{sex},address=#{address} where id=#{id}
	</update>
```

### 缓存参数

**mybatis的cache参数只适用于mybatis维护缓存。**

> flushInterval（刷新间隔）可以被设置为任意的正整数，而且它们代表一个合理的毫秒形式的时间段。默认情况是不设置，也就是没有刷新间隔，缓存仅仅调用语句时刷新。
> size（引用数目）可以被设置为任意正整数，要记住你缓存的对象数目和你运行环境的可用内存资源数目。默认值是1024。
> readOnly（只读）属性可以被设置为true或false。只读的缓存会给所有调用者返回缓存对象的相同实例。因此这些对象不能被修改。这提供了很重要的性能优势。可读写的缓存会返回缓存对象的拷贝（通过序列化）。这会慢一些，但是安全，因此默认是false。

如下例子：
`<cache  eviction="FIFO"  flushInterval="60000"  size="512"  readOnly="true"/>`
这个更高级的配置创建了一个 FIFO 缓存,并每隔 60 秒刷新,存数结果对象或列表的 512 个引用,而且返回的对象被认为是只读的,因此在不同线程中的调用者之间修改它们会导致冲突。可用的收回策略有, 默认的是 LRU:

1. LRU – 最近最少使用的:移除最长时间不被使用的对象。
2. FIFO – 先进先出:按对象进入缓存的顺序来移除它们。
3. SOFT – 软引用:移除基于垃圾回收器状态和软引用规则的对象。
4. WEAK – 弱引用:更积极地移除基于垃圾收集器状态和弱引用规则的对象。

# Mybatis和Ehcache整合

**Ehcache是专门用于管理缓存的，Mybatis的缓存交由ehcache管理会更加得当。在mybatis中提供一个cache接口，只要实现cache接口就可以把缓存数据灵活的管理起来**。

<div align=center><img width="600" height="200" src="http://on937g0jc.bkt.clouddn.com/2018-3/Mybatis/ehcache.png" algin="center"/></div>

## 整合jar包

- mybatis-ehcache-1.0.2.jar
- ehcache-core-2.6.5.jar

Ehcache对cache接口的实现类：

<div align=center><img width="600" height="200" src="http://on937g0jc.bkt.clouddn.com/2018-3/Mybatis/ehcachecache.png" algin="center"/></div>

## ehcache.xml配置信息

这个xml配置文件是配置**全局的缓存管理方案**

```xml
<ehcache xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
	xsi:noNamespaceSchemaLocation="../config/ehcache.xsd">
	<!--diskStore：缓存数据持久化的目录 地址  -->
	<diskStore path="F:\develop\ehcache" />
	<defaultCache 
		maxElementsInMemory="1000" 
		maxElementsOnDisk="10000000"
		eternal="false" 
		overflowToDisk="false" 
		diskPersistent="true"
		timeToIdleSeconds="120"
		timeToLiveSeconds="120" 
		diskExpiryThreadIntervalSeconds="120"
		memoryStoreEvictionPolicy="LRU">
	</defaultCache>
</ehcache>
```

如果我们Mapper想单独拥有一些特性，需要在mapper.xml中单独配置

```xml
<!-- 单位：毫秒 -->
<cache type="org.mybatis.caches.ehcache.EhcacheCache">
	<property name="timeToIdleSeconds" value="12000"/>
	<property name="timeToLiveSeconds" value="3600"/>
	<!-- 同ehcache参数maxElementsInMemory -->
	<property name="maxEntriesLocalHeap" value="1000"/>
	<!-- 同ehcache参数maxElementsOnDisk -->
	<property name="maxEntriesLocalDisk" value="10000000"/>
	<property name="memoryStoreEvictionPolicy" value="LRU"/>
</cache>
```

## 应用场景与局限性

### 应用场景

- **对查询频率高，变化频率低的数据建议使用二级缓存。**


- 对于**访问多的查询请求且用户对查询结果实时性要求不高**，此时可采用mybatis二级缓存技术降低数据库访问量，提高访问速度。

业务场景比如：

- 耗时较高的统计分析sql
- 电话账单查询sql等。

实现方法如下：**通过设置刷新间隔时间，由mybatis每隔一段时间自动清空缓存，根据数据变化频率设置缓存刷新间隔flushInterval**，比如设置为30分钟、60分钟、24小时等，根据需求而定。

### 局限性

mybatis二级缓存对细粒度的数据级别的缓存实现不好，比如如下需求：对商品信息进行缓存，由于商品信息查询访问量大，但是要求用户每次都能查询最新的商品信息，此时如果使用mybatis的二级缓存就无法实现当一个商品变化时只刷新该商品的缓存信息而不刷新其它商品的信息，**因为mybaits的二级缓存区域以mapper为单位划分，当一个商品信息变化会将所有商品信息的缓存数据全部清空**。解决此类问题需要在业务层根据需求对数据有针对性缓存。

# 总结

- Mybatis的一级缓存是SqlSession级别的。只能访问自己的sqlSession内的缓存。如果Mybatis与Spring整合了，Spring会自动关闭sqlSession的。所以一级缓存会失效。
- 一级缓存的原理是map集合，Mybatis默认就支持一级缓存。
- **二级缓存是Mapper级别的。只要在Mapper namespace下都可以使用二级缓存。需要自己手动去配置二级缓存。**
- Mybatis的缓存我们可以使用Ehcache框架来进行管理，Ehcache实现Cache接口就代表使用Ehcache来环境Mybatis缓存。

## 参考

[***Mybatis【逆向工程，缓存，代理】知识要点***](https://juejin.im/post/5aa655d6518825556020924e#comment)