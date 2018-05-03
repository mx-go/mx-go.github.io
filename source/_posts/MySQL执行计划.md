---
title: MySQL执行计划
date: 2018-04-27 09:24:06
tags: [mysql]
categories: technology
---

# 引言

MySQL执行计划，简单的来说，是SQL在数据库中执行时的表现情况，通常用于SQL性能分析，优化等场景。在MySQL使用 **explain** 关键字来查看SQL的执行计划。<div align=center><img width="800" height="300" src="http://on937g0jc.bkt.clouddn.com/2018-4/MySQL_explain/mysql-explain.png" algin="center"/>

</div><!-- more -->

# 适用场景

适用于 ***select***、***update***、***insert***、***replace***、***delete***语句，在需要分析的语句前加*EXPLAIN*，即可。

# EXPLAIN可得到的信息

- SQL如何使用索引
- 关联查询的执行顺序
- 查询扫描的数据行数

# 读懂执行计划

例如以下关联查询：

```sql
EXPLAIN SELECT * FROM tb_item JOIN tb_item_desc ON tb_item.id=tb_item_desc.item_id WHERE id='679533';
```

<div align=center><img width="900" height="300" src="http://on937g0jc.bkt.clouddn.com/2018-4/MySQL_explain/eg.png" algin="center"/>

</div>根据上图可得到执行计划的列信息，下面分析一下每列所表示的信息。

## ID

- ID列中的数据为一组数字，表示执行Select语句的顺序。
- ID值相同时，执行顺序由上至下。
- ID值越大优先级越高，越先被执行。

## SELECT_TYPE

表示查询中每个Select子句的类型（简单 OR 复杂）。

- **SIMPLE**：不包含子查询或是*UNION*操作的查询。
- **PRIMARY**：查询中如果包含任何子查询，那么最外层的查询则被标记为*PRIMARY*。
- **SUBQUERY**：*SELECT* 列表中的子查询。
- **DEPENDENT SUBQUERY**：被别的查询所依赖的子查询。
- **UNION**：*union*操作的第二个或是之后的查询的值为*union*。
- **DEPENDENT UNION**：当*union*作为子查询时，第二或者是第二个后的查询的值。
- **UNION RESULT**：*union*产生的结果集。
- **DERIVED**：出现在*from*子句中的子查询。

## TABLE

输出数据行所在的表的名称或别名。

- **`<unionM,N>`**：由ID为M,N查询*union*产生的结果集。
- **`<derivedN>/<subqueryN>`**：由ID为N的查询产生的结果。

## PARTITIONS

- 对于分区表，显示查询的分区ID。
- 对于非分区表，显示为NULL。

## TYPE（类型性能是依次降低）

该属性表示访问类型,有很多种访问类型。

- **system**：这是const连接类型的一个特例，当查询的表只有一行时使用。
- **const**：表中有且只有一个匹配的行时使用，如对主键或是唯一索引的查询，这是效率最高的联接方式。
- **eq_ref**：唯一索引或者是主键索引查找，对于每个索引键，表中只有一条记录与之匹配
- **ref**：非唯一索引查找，返回匹配某个单独值的所有行。
- **ref_or_null**：类似于ref类型的查询，但是附加了对NULL值列的查询。
- **index_merge**：该联接类型表示使用了索引合并优化方法。
- **range**：索引范围扫描，常见于*between*、>、<、这样的查询条件。
- **index**：*full index scan* 全索引扫描，同ALL的区别是，遍历的是索引树。
- **all**：*full table scan* 全表扫描，这是效率最差的联接方式。

## POSSIBLE_KEYS

指出MySQL能使用那些索引来优化查询，**查询列所涉及到的列上的索引都会被列出，但不一定会被使用**。

## KEY

显示MySQL在查询中实际使用的索引，若没有使用索引，显示为NULL。

> TIPS：查询中若使用了覆盖索引，则该索引仅出现在key列表中。

## KEY_LEN

- 表示索引字段的最大可能长度。


- 此值的长度有字段定义计算而来，并非数据的实际长度。

## REF

表示表的连接匹配条件，即哪些列或常量被用于查找索引列上的值。

## ROWS

表示MySQL通过索引统计的信息，估算出的所需读取的行数。是一个不十分准确的值。

## FILTERED

表示返回结果的行数占需读取行数的百分比，越大越好，也并不十分准确。

## EXTRA

1、**Using index**

该值表示相应的*Select*操作中使用了***覆盖索引(Covering Index)***。

> TIPS：覆盖索引（Covering Index）
>
> MySQL可以利用索引返回select列表中的字段，而不必根据索引再次读取数据文件包含所有满足查询需要的数据的索引称为 **覆盖索引**（Covering Index）

注意：如果要使用覆盖索引，一定要注意*Select*列表中只取出需要的列，不可Select *，因为如果将所有字段一起做索引会导致索引文件过大，查询性能下降。

2、**Using where**

表示MySQL服务器在存储引擎受到记录后进行“后过滤”（Post-filter），如果查询未能使用索引，*Using where*的作用只是提醒我们MySQL将用*where*子句来过滤结果集。

3、**Using temporary**

表示MySQL需要使用临时表来存储结果集，常见于排序和分组查询。

4、**Using filesort**

MySQL中无法利用索引完成的排序操作称为“文件排序”。

5、**distinct**

优化distinct操作，在找到第一匹配的元组后即停止找同样值的动作。

6、**not exists**

使用*not exists*来优化查询。

7、**select tables optimized away**

直接通过索引来获得数据，不用访问表。

# 执行计划的局限性

- EXPLAIN无法展示关于触发器、存储过程的信息或用户自定义函数对查询的影响情况。
- EXPLAIN不考虑各种Cache。
- EXPLAIN不能显示MySQL在执行查询时所作的优化工作。
- 部分统计信息是估算的，并非精确值。
- 早期版本的MySQL只支持对*Select*语句进行分析。