---
title: MongoDB索引管理(二)
date: 2019-01-26 15:17:03
tags: [MongoDB]
categories: 数据库
img: ../../../../images/2019/1-3/MongoDB索引.jpg
---

# 引言

在数据量超大的情形下，任何数据库系统在创建索引时都是一个耗时的大工程。MongoDB也不例外。MongoDB索引的创建有两个选择：一个是前台方式，一个是后台方式。<div align=center><img width="220" height="220" src="../../../../images/2019/1-3/MongoDB索引.jpg" algin="center"/></div><!-- more -->

# 创建索引

## 索引创建方式

**前台方式(*缺省*)**

```
缺省情况下，当为一个集合创建索引时，这个操作将阻塞其他的所有操作。
即该集合上的无法正常读写，直到索引创建完毕任意基于所有数据库申请读或写锁都将等待直到前台完成索引创建操作。
```

**后台方式**

```
将索引创建置于到后台，适用于那些需要长时间创建索引的情形
这样在创建索引期间，MongoDB依旧可以正常的提供读写操作服务
等同于关系型数据库在创建索引的时候指定online,而MongoDB则是指定background,其目的都是相同的
即在索引创建期间，尽可能的以一种占用较少的资源方式来实现，同时又可以提供读写服务。
后台创建方式的代价：索引创建时间变长。
```

## 语法结构

MongoDB创建索引使用`ensureIndex()`方法。

```sql
db.COLLECTION_NAME.ensureIndex(keys[,options])
```

**Keys** ： 要创建的索引字段

- **1** 按升序创建索引
- **-1** 按降序来创建索引

### 可选参数

| 参数名             | 类型          | 描述                                                         |
| ------------------ | ------------- | ------------------------------------------------------------ |
| background         | Boolean       | 建索引过程会阻塞其它数据库操作，background可指定以后台方式创建索引，即增加 "background"  可选参数。 "background" 默认值为**false** |
| unique             | Boolean       | 建立的索引是否唯一。指定为true创建唯一索引。默认值为 **false** |
| name               | string        | 索引的名称。如果未指定，MongoDB的通过连接索引的字段名和排序顺序生成一个索引名称 |
| dropDups           | Boolean       | **3.0+版本已废弃。**在建立唯一索引时是否删除重复记录，指定 true 创建唯一索引。默认值为**false** |
| sparse             | Boolean       | 对文档中不存在的字段数据不启用索引；这个参数需要特别注意，如果设置为true的话，在索引字段中不会查询出不包含对应字段的文档。默认值为 **false** |
| expireAfterSeconds | integer       | 指定一个以秒为单位的数值，完成 TTL设定，设定集合的生存时间。 |
| v                  | index version | 索引的版本号。默认的索引版本取决于mongod创建索引时运行的版本。 |
| weights            | document      | 索引权重值，数值在 1 到 99,999 之间，表示该索引相对于其他索引字段的得分权重 |
| default_language   | string        | 对于文本索引，该参数决定了停用词及词干和词器的规则的列表。 默认为英语 |
| language_override  | string        | 对于文本索引，该参数指定了包含在文档中的字段名，语言覆盖默认的 language，默认值为 language |

## 后台创建范例

```sql
db.COLLECTION_NAME.ensureIndex({name: 1, age: 1}, {background: true});
```

通过在创建索引时加 **background:true** 选项，让创建工作在后台执行。

使用索引和不使用差距很大，合理使用索引，一个集合适合做 4-5 个索引。

## 查看索引创建进度

可使用 `db.currentOp()` 命令观察索引创建的完成进度。

```sql
> db.currentOp({
          $or: [
            { op: "command", "query.createIndexes": { $exists: true } },
            { op: "insert", ns: /\.system\.indexes\b/ }
          ]
});
```

## 终止索引的创建

```sql
db.killOp();
```

# 查看索引

MongoDB提供了查看索引信息的方法：

- `getIndexes()`：查看集合的所有索引;

- `totalIndexSize()`：查看集合索引的总大小;

- `db.system.indexes.find()`：查看数据库中所有索引信息。

## 查看集合中的索引getIndexes()

```sql
db.COLLECTION_NAME.getIndexes();
```

## 查看集合中的索引大小totalIndexSize()

```sql
db.COLLECTION_NAME.totalIndexSize();
```

## 查看数据库中所有索引db.system.indexes.find()

```sql
db.system.indexes.find();
```

# 删除索引

不再需要的索引，可以将其删除。删除索引时，可以删除集合中的某一索引，也可以删除全部索引。

## 删除指定的索引dropIndex()

```sql
db.COLLECTION_NAME.dropIndex("INDEX-NAME");
```

## 删除所有索引dropIndexes()

```sql
db.COLLECTION_NAME.dropIndexes();
```

# 重建索引

数据表经多次修改后导致文件产生空洞，索引文件也是如此。因此可通过重建索引来提高索引的查询效率，类似MySQL的optimize表。根据MongoDB文档，通常不需要定期重建索引，且**始终在前台构建索引**。

官网文档可查看：<https://docs.mongodb.com/manual/reference/command/reIndex/>

```sql
// 该方法的调用不接受任何的参数
db.COLLECTION_NAME.reIndex();
```

