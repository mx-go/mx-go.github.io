---
title: 增强式SnowFlake(雪花算法)
date: 2022-06-02 10:34:16
categories: 
- [设计]
img: ../../../../images/2022/7-9/snowflake_0.jpeg
cover: ../../../../images/2022/7-9/snowflake_0.jpeg
---

# 引言

在众多分布式ID中，雪花算法是比较简单且常用的算法，分布式ID一般具有的特性有：

1. **唯一性**：生成的ID全局唯一，在特定范围内冲突极小。
2. **有序性**：生成的ID全局或按规则有序，便于数据库插入及排序。
3. **可用性**：可保证高并发下的可用性，确保任何时候都能正确的生成ID。
4. **自主性**：分布式情况下不依赖中心认证即可自行生成ID。
5. **安全性**：不暴露系统和业务的信息，如：订单数、用户数....

# 常见的分布式ID生成方式比较

|   比较点   |            SnowFlake            | [Leaf](https://github.com/Meituan-Dianping/Leaf) | [UidGenerator](https://github.com/baidu/uid-generator) | [Redis](https://redis.io/) |
| :--------: | :-----------------------------: | :----------------------------------------------: | :----------------------------------------------------: | :------------------------: |
| 依赖数据库 |               否                |                        是                        |                          可选                          |             是             |
| 支持分布式 |               是                |                        是                        |                           是                           |             是             |
|   可预测   |                -                |                        -                         |                           -                            |             -              |
|   依赖性   | 毫秒级时间戳 + 标识 位 + 序列号 |           时间戳 + node + pid + 序列号           |               秒级时间戳 + workId + 序列               |      Redis单线程自增       |
|   维护中   |            多个变种             |                        是                        |                           否                           |             -              |

# 雪花算法

`SnowFlake`是Twitter开源的分布式ID生成算法，生成的一个`64bit`的`long`类型数值，组成部分使用了时间戳，保证了粗略自增。

## 优缺点

### 优点

1. **高性能高可用**：完全在内存中生成，不依赖数据库。
2. **高吞吐**：每秒能生成数百万的自增ID。
3. **ID自增**：生成的ID粗略自增，存入数据库索引效率高，减少内存碎片。

### 缺点

**时钟回拨**：强依赖系统时间，如果系统时间被回拨或者改变，可能会造成ID冲突或者重复。

## 组成

总体结构如下，包含四个部分：

<div align=center><img src="../../../../images/2022/7-9/snowflake_1.png" algin="center"/></div>

**符号位**：`1bit`。最高位是符号位，固定为0。0表示正，1表示负。

**时间戳**：`41bit`。毫秒级时间戳（41位的长度可以使用69年）。

**标识位**：`5bit`数据中心ID（DataCenterId），`5bit`工作机器ID（WorkId），两个标识位组合最多可支持部署1024个节点。

**序列号**：`12bit`。递增序列号，毫秒内生成的ID通过序列号表示唯一，`12bit`每毫秒可产生4096个ID。

> 默认的雪花算法是64bit，具体长度也可以自行配置。
>
> - 如果并发很高，增加序列号位数。
>
> - 如果希望运行的更久，增加时间戳的位数。
>
> - 如果需要支持更多节点部署，增加标识位长度。

## 分配标识位

`DataCenterId`和`WorkId`都只有`5bit`，最大值为`31`。在Mybatis-Plus中标识位的获取依赖Mac地址和进程PID，虽然能够做到尽量不重复，但是仍有小几率重复。可通过**预分配**和**动态分配**来避免标识位重复。

### 预分配

通过人工申请每个服务的实例节点标识位。

此方案没有代码开发量，在服务固定节点或者项目少时可以用，但是无法解决服务动态扩容的问题。

### 动态分配

通过将标识位存放在 `Redis`、`Zookeeper`、`MySQL` 等中间件，在服务启动的时候去请求标识位，请求后标识位更新为下一个可用的标识位。通过存放标识位，延伸出另一个问题：雪花算法的 ID 是 **服务内唯一还是全局唯一**。

以`Redis`为例，如果要做服务内唯一，存放标识位的Redis节点使用自己项目内的就可以；如果是全局唯一，所有使用雪花算法的应用，要用同一个`Redis`节点。

两者的区别仅是**不同的服务间是否公用Redis**。如果没有全局唯一的需求，最好使服务内唯一，因为这样可以避免单点问题。

> 服务的节点数超过1024，则需要做额外的扩展；可以扩展10bit 标识位，或者选择开源分布式ID框架

**动态分配实现方案**

Redis存储一个`Hash`结构Key，包含两个键值对：`DataCenterId` 和 `WorkerId`。



<div align=center><img src="../../../../images/2022/7-9/snowflake_2.png" algin="center"/></div>

在应用启动时，通过**Lua脚本**去Redis获取标识位。`DataCenterId`和`WorkerId`的获取与自增在**Lua脚本**中完成，调用返回后就是可用的标识位。

<div align=center><img src="../../../../images/2022/7-9/snowflake_3.png" algin="center"/></div>

具体**Lua脚本**逻辑如下：

1. 第一个服务节点在获取时，`Redis`可能是没有 `cache:id:generator` Hash key的，先判断Hash是否存在，不存在初始化Hash，`DataCenterId`、`WorkerId` 初始化为**0**；
2. 如果Hash已存在，判断 `DataCenterId`、`WorkerId`是否等于最大值**31**，满足条件初始化`DataCenterId`、`WorkerId` 设置为**0**返回；
3. `DataCenterId`和`WorkerId` 的排列组合一共是**1024**，在进行分配时，先分配`WorkerId`；
4. 判断`WorkerId`是否 **!= 31**，条件成立对`WorkerId`自增，并返回；如果**WorkerId = 31**，自增`DataCenterId`并将`WorkerId`设置为**0**；

`DataCenterId`、`WorkerId`是一直向下推进的，总体形成一个环状。通过**Lua脚本的原子性**，保证**1024**节点下的雪花算法生成不重复。如果标识位等于**1024**，则从头开始继续循环推进。

<div align=center><img src="../../../../images/2022/7-9/snowflake_4.png" algin="center"/></div>

### Lua脚本

- `KEY`：为Redis的HashKey。
- `ARGV`：一个或两个参数。系统编码、模块编码。
- `RETURN`：返回值为英文冒号分隔的字符串。`DataCenterId:WorkerId`

```lua
-- Hash Key
local key = KEYS[1]
-- 分隔符
local SPLITTER = ':'
local SYSTEM_CODE = ARGV[1] .. SPLITTER
local SERVICE_NAME = ARGV[2] and ARGV[2] .. SPLITTER or ''
local MAX_ID = 31
local FIELD_DATA_CENTER = SYSTEM_CODE .. SERVICE_NAME .. 'dataCenterId'
local FIELD_WORKER = SYSTEM_CODE .. SERVICE_NAME .. 'workerId'
-- 看能不能获取到
local datacenterId = redis.call('HGET', key, FIELD_DATA_CENTER)
local workerId = redis.call('HGET', key, FIELD_WORKER)
-- dataCenterId或workId为空 or daCenterId或workId有一个达到最大值。此时需要重置dataCenterId和workId为0
if (not datacenterId or not workerId) or (tonumber(datacenterId) == MAX_ID and tonumber(workerId) == MAX_ID) then
    datacenterId = 0
    workerId = 0
    redis.call('HSET', key, FIELD_DATA_CENTER, datacenterId)
    redis.call('HSET', key, FIELD_WORKER, workerId)
    return datacenterId .. SPLITTER .. workerId
end
-- 当workId达到最大值且dataCenterId未达到最大值时，需要将dataCenterId自增、workId重置为0
-- 否则直接自增workId
if (tonumber(workerId) == MAX_ID and tonumber(datacenterId) ~= MAX_ID) then
    workerId = 0
    datacenterId = redis.call('HINCRBY', key, FIELD_DATA_CENTER, 1)
    redis.call('HSET', key, FIELD_WORKER, workerId)
else
    workerId = redis.call('HINCRBY', key, FIELD_WORKER, 1)
end
-- 返回包含workId和dataCenterId的固定格式字符串
return datacenterId .. SPLITTER .. workerId
```

### SpringBoot中使用

可以将上面**Lua脚本**保存为`IdGen.lua`，在开发中编码、调试会更加方便。

```java
@Resource
private StringRedisTemplate redisTemplate;

public Pair<Integer, Integer> getIdentifier() throws IOException {
    DefaultRedisScript<String> redisScript = new DefaultRedisScript<>();
        String script = FileUtils.readFileToString(new File(this.getClass().getResource("/scripts/IdGen.lua").getPath()), Charset.defaultCharset());
        redisScript.setScriptText(script);
        redisScript.setResultType(String.class);
        // KEY可自定义，ARGV可传一个或两个
        String result = redisTemplate.execute(redisScript, Lists.newArrayList("cache:snowflake:id"), "SYSTEM_CODE", "MODULE_NAME");
        int dataCenterId = Integer.parseInt(result.split(":")[0]);
        int workId = Integer.parseInt(result.split(":")[1]);
        return Pair.of(dataCenterId, workId);
}
```

## 总结

雪花算法可满足大部分场景，如无必要，**不建议引入开源方案增加系统复杂度**。
