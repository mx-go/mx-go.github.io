---
title: MySQL清除表空间碎片
date: 2018-05-22 11:12:17
tags: [mysql]
categories: 数据库
---

# 引言
MySQL在数据表使用很长时间后，表上的B-Tree索引可能会碎片化，会降低查询的效率。碎片化的索引可能会以很差或者无序的方式存储在磁盘上，这时就需要对表进行碎片化整理。<!-- more -->
# 碎片产生原因
1、表的存储会出现碎片化，每当删除了一行内容，该段空间就会变为空白、被留空，而在一段时间内的大量删除操作，会使这种留空的空间变得比存储列表内容所使用的空间更大；

2、当执行插入操作时，MySQL会尝试使用空白空间，但如果某个空白空间一直没有被大小合适的数据占用，仍然无法将其彻底占用，就形成了碎片；

3、当MySQL对数据进行扫描时，它扫描的对象实际是列表的容量需求上限，也就是数据被写入的区域中处于峰值位置的部分；

> 例：*一个表有1万行，每行10字节，会占用10万字节存储空间，执行删除操作，只留一行，实际内容只剩下10字节，但MySQL在读取时，仍看做是10万字节的表进行处理，所以，碎片越多，就会越来越影响查询性能。*

# 查看表碎片大小

1、查看某个表的碎片大小

```mysql
SHOW TABLE STATUS LIKE '表名';
```

结果中’**Data_free**’列的值就是碎片大小

<div align=center><img src="../../../../images/2018-5/mysql%E7%A2%8E%E7%89%87%E4%BC%98%E5%8C%96/show-status.png" algin="center"/>

</div>

2、列出所有已经产生碎片的表

```mysql
select table_schema db, table_name, data_free, engine     
from information_schema.tables 
where table_schema not in ('information_schema', 'mysql')  and data_free > 0;
```

# 清除表碎片

1、MyISAM表

```mysql
OPTIMIZE TABLE 表名;
```

2、InnoDB表

```mysql
ALTER TABLE 表名 ENGINE INNODB;
```

这其实是一个*NULL*操作，表面上看什么也不做，实际上重新整理碎片了。当执行优化操作时，实际执行的是一个空的 *ALTER* 命令，但是这个命令也会起到优化的作用，它会重建整个表，删掉未使用的空白空间。

Engine不同，*OPTIMIZE* 的操作也不一样。MyISAM 因为索引和数据是分开的，所以 *OPTIMIZE* 可以整理数据文件，并重排索引。如果针对 *INNODB* 的表做 *OPTIMIZE TABLE* 的操作，系统将返回：*Table does not support optimize, doing recreate + analyze instead*。

**OPTIMIZE 操作会暂时锁住表，而且数据量越大，耗费的时间也越长。**它毕竟不是简单查询操作，所以把 OPTIMIZE 命令放在程序中是不妥当的。不管设置的命中率多低，当访问量增大的时候，整体命中率也会上升，这样肯定会对程序的运行效率造成很大影响，比较好的方式就是做个shell，定期检查MySQL中 `information_schema`.`TABLES`字段，查看 *DATA_FREE* 字段，大于0话就表示有碎片。

# 建议

清除碎片操作会暂时锁表，数据量越大，耗费的时间越长，可以做个脚本，定期在访问低谷时间执行，例如每月1号凌晨，检查 *DATA_FREE* 字段，大于自己认为的警戒值的话，就清理一次。

[***MySQL 清除表空间碎片***](https://blog.csdn.net/xlgen157387/article/details/50728737)