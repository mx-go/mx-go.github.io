---
title: MySQL主从/主主复制
date: 2018-04-17 13:43:00
tags: [mysql]
categories: 数据库
cover: ../../../../images/2018-4/MySQL_master_slave/index.jpg
---

# 引言

MySQL作为世界上最广泛的数据库之一，免费是原因之一，其本身功能的强大也是获得众多用的青睐的重要原因。在实际的生产环境中，单机版MySQL数据库就不能满足实际的需求了，此时数据库集群就很好的解决了这个问题了。采用MySQL分布式集群，能够搭建一个高并发、负载均衡的集群服务器。在此之前必须要保证每台MySQL服务器里的数据同步。数据同步可以通过MySQL内部配置就可以轻松完成，主要有**主从复制**和**主主复制**。<div align=center><img width="700" height="300" src="../../../../images/2018-4/MySQL_master_slave/index.jpg" algin="center"/></div>

在本案例下使用同一台机器安装两个数据库，只是端口不一致，一个为3306，一个为3308。

# 复制原理

1. Master将数据改变记录到二进制日志(binary log)中，也就是配置文件log-bin指定的文件，这些记录叫做二进制日志事件(binary log events) 。
2. Slave通过I/O线程读取Master中的binary log events并写入到它的中继日志(relay log) 。
3. Slave重做中继日志中的事件，把中继日志中的事件信息一条一条的在本地执行一次，完成数据在本地的存储，从而实现将改变反映到它自己的数据(数据重放)。

# 复制类型

 1、**基于语句的复制(statement)**

> 在Master上执行的SQL语句，在Slave上执行同样的语句。MySQL默认采用基于语句的复制，效率比较高。

<div align=center><img src="../../../../images/2018-4/MySQL_explain/eg.png" algin="center"/></div>根据上图可得到执行计划的列信息，下面分析一下每列所表示的信息。

> 把改变的内容复制到Slave，而不是把命令在Slave上执行一遍。从MySQL5.0开始支持。

 3、**混合类型的复制(mixed)**

> 默认采用基于语句的复制，一旦发现基于语句的无法精确的复制时，就会采用基于行的复制。

# 要求

- 文件${mysql}/data/auto.cnf里server-uuid不能重复。
- 主从服务器操作系统版本和位数一致。
- Master和Slave数据库的版本要一致。
- Master和Slave数据库中的数据要一致。
- Master开启二进制日志，Master和Slave的server_id在局域网内必须唯一。


# 主从复制

主从复制能保证主SQL（Master）和从SQL（Slave）的数据是一致性的，向Master插入数据后，Slave会自动从Master把修改的数据同步过来（有一定的延迟），通过这种方式来保证数据的一致性，主从复制**基于日志(binlog)**。

主从复制可解决：

- **高可用**

因为数据都是相同的，所以当Master挂掉后，可以指定一台Slave充当Master继续保证服务运行，因为数据是一致性的（如果当插入Master就挂掉，可能不一致，因为同步也需要时间）。

- **负载均衡**

因为读写分离也算是负载均衡的一种，一般都是有多台Slave的，所以可以将读操作指定到Slave服务器上（需要代码控制），然后再用负载均衡来选择那台Slave来提供服务，同时也可以吧一些大量计算的查询指定到某台Slave，这样就不会影响Master的写入以及其他查询。

- **数据备份**

一般我们都会做数据备份，可能是写定时任务，一些特殊行业可能还需要手动备份，有些行业要求备份和原数据不能在同一个地方，所以主从就能很好的解决这个问题，不仅备份及时，而且还可以多地备份，保证数据的安全。

- **业务模块化**

可以一个业务模块读取一个Slave，再针对不同的业务场景进行数据库的索引创建和根据业务选择MySQL存储引擎。

## 配置Master

### 配置my.cnf

Linux下MySQL配置文件为my.cnf，windows下为my.ini。在Master添加以下配置：

```sh
[mysqld]
## 设置server_id，一般设置为IP,注意要唯一
server_id=1
## 复制过滤：也就是指定哪个数据库不用同步（mysql库一般不同步）
binlog-ignore-db=mysql
## 开启二进制日志功能，可以随便取，最好有含义（关键就是这里了）
log-bin=mysql-bin
## 为每个session 分配的内存，在事务过程中用来存储二进制日志的缓存
binlog_cache_size=1M
## 主从复制的格式（mixed,statement,row，默认格式是statement）
binlog_format=mixed
## 二进制日志自动删除/过期的天数。默认值为0，表示不自动删除。
expire_logs_days=7
## 跳过主从复制中遇到的所有错误或指定类型的错误，避免slave端复制中断。
## 如：1062错误是指一些主键重复，1032错误是因为主从数据库数据不一致
slave_skip_errors=1062
```

配置完成后重启MySQL。

### 创建数据同步用户

```sql
-- -- 用户名：slave，密码：slave
CREATE USER 'slave'@'%' IDENTIFIED BY 'slave';
-- 授予用户REPLICATION SLAVE权限和REPLICATION CLIENT权限
GRANT REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'slave'@'%';  
```

## 配置Slave

Linux下MySQL配置文件为my.cnf，windows下为my.ini。在Slave添加以下配置：

```sh
[mysqld]
## 设置server_id，一般设置为IP,注意要唯一
server_id 
## 复制过滤：也就是指定哪个数据库不用同步（mysql库一般不同步）
binlog-ignore-db=mysql
## 开启二进制日志功能，以备Slave作为其它Slave的Master时使用
log-bin=mysql-slave1-bin
## 为每个session 分配的内存，在事务过程中用来存储二进制日志的缓存
binlog_cache_size=1M
## 主从复制的格式（mixed,statement,row，默认格式是statement）
binlog_format=mixed
## 二进制日志自动删除/过期的天数。默认值为0，表示不自动删除。
expire_logs_days=7
## 跳过主从复制中遇到的所有错误或指定类型的错误，避免slave端复制中断。
## 如：1062错误是指一些主键重复，1032错误是因为主从数据库数据不一致
slave_skip_errors=1062
## relay_log配置中继日志
relay_log=mysql-relay-bin  
## log_slave_updates表示slave将复制事件写进自己的二进制日志
log_slave_updates=1
## 防止改变数据(除了特殊的线程)
read_only=1
```

**如果Slave为其它Slave的Master时，必须设置bin_log**。配置完成后重启MySQL。

## 连接Master和Slave

### 查询Master状态

在master中执行

```sql
SHOW MASTER STATUS;
```

记录下返回结果的**File列和Position列**的值。

<div align=center><img src="../../../../images/2018-4/MySQL_master_slave/master_status.png" algin="center"/></div>

### 在Slave中设置Master信息

在slave中执行

```sql
CHANGE MASTER TO MASTER_HOST='127.0.0.1', MASTER_USER='slave', MASTER_PASSWORD='slave', MASTER_PORT=3306, MASTER_LOG_FILE='mysql-bin.000014', MASTER_LOG_POS=1122, MASTER_CONNECT_RETRY=30;
-- master_host='127.0.0.1' ## Master的IP地址
-- master_user='slave' ## 用于同步数据的用户（在Master中授权的用户）
-- master_password='slave' ## 同步数据用户的密码
-- master_port=3306 ## Master数据库服务的端口
-- master_log_file='mysql-bin.000014' ##指定Slave从哪个日志文件开始读复制数据（Master上执行命令的结果的File字段）
-- master_log_pos=1122 ## 从哪个POSITION号开始读（Master上执行命令的结果的Position字段）
-- masterconnectretry=30 ##当重新建立主从连接时，如果连接建立失败，间隔多久后重试。单位为秒，默认设置为60秒，同步延迟调优参数。
```

### 查看主从同步状态

```sql
SHOW SLAVE STATUS;
```

<div align=center><img src="../../../../images/2018-4/MySQL_master_slave/master_slave_notok.png" algin="center"/></div>

可看到Slave_IO_State为空， Slave_IO_Running和Slave_SQL_Running是No，表明Slave还没有开始复制过程。相反Slave_IO_Running和Slave_SQL_Running是Yes表明已经开始工作了。

### 开启/关闭主从

在slave中执行

```sql
-- 停止主从
STOP SLAVE;
-- 开启主从
START SLAVE;
```

<div align=center><img src="../../../../images/2018-4/MySQL_master_slave/master_slave_ok.png" algin="center"/></div>

查询查看主从同步状态，会发现**Slave_IO_Running和Slave_SQL_Running是Yes**了，表明开启成功。

# 主主复制

主主复制即在两台MySQL主机内都可以变更数据，而且另外一台主机也会做出相应的变更。其实现就是将两个主从复制有机合并起来就好了。只不过在配置的时候我们需要注意一些问题，例如，主键重复，server-id不能重复等等。

## 配置Master

接上一案例，在上一案例中的Slave中执行

```sql
-- 用户名：slave1，密码：slave1
GRANT REPLICATION SLAVE ON *.* TO 'slave1'@'%' IDENTIFIED BY 'slave1';
FLUSH PRIVILEGES;
SHOW MASTER STATUS;
```

同样记录下返回结果的**File列和Position列**的值。

<div align=center><img src="../../../../images/2018-4/MySQL_master_slave/2-1.png" algin="center"/></div>

## 配置Slave

在上一案例中的Master中执行

```sql
CHANGE MASTER TO MASTER_HOST='127.0.0.1', MASTER_USER='slave1', MASTER_PASSWORD='slave1', MASTER_PORT=3308, MASTER_LOG_FILE='mysql-bin.000017', MASTER_LOG_POS=1860, MASTER_CONNECT_RETRY=30;
```

分别开启 **START SLAVE;**

<div align=center><img src="../../../../images/2018-4/MySQL_master_slave/db_1.jpg" algin="center"/></div>

<div align=center><img src="../../../../images/2018-4/MySQL_master_slave/db_2.png" algin="center"/></div>

**当且仅当两个数据库Slave_IO_Running和Slave_SQL_Running都为 YES才表明状态正常。**

## 注意

- 主主复制只能保证主键不重复，却不能保证主键有序。
- 当配置完成**Slave_IO_Running、Slave_SQL_Running不全为YES**时，show slave status\G信息中有错误提示，可根据错误提示进行更正。
- Slave_IO_Running、Slave_SQL_Running不全为YES时，大多数问题都是数据不统一导致。