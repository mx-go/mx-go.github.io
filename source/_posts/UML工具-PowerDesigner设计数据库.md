---
title: UML工具-PowerDesigner设计数据库
date: 2017-12-6 15:47:06
tags: [mysql,tool]
categories: technology
---

# 引言

在数据库的开发设计中，PowerDesiger（PD）是一个较为常用的UML工具。PowerDesiger为各类数据模型提供了直观的符号表示，不仅使设计人员能更方便、更快捷地使非计算机专业技术人员展示数据库设计和应用系统设计，使系统设计人员与使用系统的业务人员更易于相互理解和交流，同时也使项目组内的交流更为直观、准确，更便于协调工作，从而加速系统的设计和开发过程。PowerDesiger设计完成后的数据库可直接生成SQL语句。

<div align=center><img width="450" height="300" src="http://on937g0jc.bkt.clouddn.com/2017/12/PowerDesigner/logo-powerdesigner.png" algin="center"/>

</div>

<!-- more -->

# 使用ODBC连接MySQL

## 准备工作

**PowerDesigner本身是32位的程序（特别重要），故不管在32位或者64位操作系统中，都需要安装32位的MySQL Connector /ODBC。**

MySQL Connector /ODBC下载地址：*https://dev.mysql.com/downloads/connector/odbc/*

## 连接数据库

1. 安装完ODBC之后，打开PowerDesigner，新建一个Model，File—>New Model

<div align=center><img width="500" height="300" src="http://on937g0jc.bkt.clouddn.com/2017/12/PowerDesigner/2.png" algin="center"/>

</div>

2. 选择工具栏中的Database—> Update Model from Database，如下图

<div align=center><img width="450" height="300" src="http://on937g0jc.bkt.clouddn.com/2017/12/PowerDesigner/3.png" algin="center"/>

</div>

3. 打开配置对话框，选择[Using a data source]，点击输入框后的图标

<div align=center><img width="450" height="300" src="http://on937g0jc.bkt.clouddn.com/2017/12/PowerDesigner/4.png" algin="center"/>

</div>

4. 配置ODBC数据源

<div align=center><img width="450" height="300" src="http://on937g0jc.bkt.clouddn.com/2017/12/PowerDesigner/5.png" algin="center"/></div>

<div align=center><img width="450" height="300" src="http://on937g0jc.bkt.clouddn.com/2017/12/PowerDesigner/6.png" algin="center"/></div>

<div align=center><img width="450" height="300" src="http://on937g0jc.bkt.clouddn.com/2017/12/PowerDesigner/7.png" algin="center"/></div>

说明：这里提供了ANSI和Unicode两种字符集版本的Driver，**Unicode提供更丰富的字符集，一般推荐使用Unicode**。

<div align=center><img width="450" height="300" src="http://on937g0jc.bkt.clouddn.com/2017/12/PowerDesigner/8.png" algin="center"/></div>

<div align=center><img width="450" height="300" src="http://on937g0jc.bkt.clouddn.com/2017/12/PowerDesigner/9.png" algin="center"/></div>

点击完成，配置连接信息。

<div align=center><img width="450" height="300" src="http://on937g0jc.bkt.clouddn.com/2017/12/PowerDesigner/10.png" algin="center"/></div>

```xml
说明：
Data Source Name：指定当前配置的ODBC数据源名称，可随意填写。
Description：指定ODBC数据源的描述信息，可根据用途随意填写。
TCP/IP Server：采用TCP/IP协议连接服务器，如果是本地填写localhost或者127.0.0.1（根据实际MySQL用户情况选择），如果是远程服务器则填写相应IP地址即可。
Port：默认3306，根据实际MySQL的端口设置填写。
lNamed Pipe：命名管道方式连接，只适用于widows下的本地连接。连接性能比TCP/IP方式更高，更安全。请按照MySQL的配置文件my.ini中的socket参数指定的值填写，如果没有设置则默认为MySQL（但是目前为止这种方式我还没有测试成功）。
User：数据库用户名。
Password：数据库密码。
Database：数据库中的database。
```

信息输入完之后可以选择Test测试配置是否正确，点击OK就结束了配置。

<div align=center><img width="450" height="300" src="http://on937g0jc.bkt.clouddn.com/2017/12/PowerDesigner/12.png" algin="center"/></div>

<div align=center><img width="450" height="300" src="http://on937g0jc.bkt.clouddn.com/2017/12/PowerDesigner/13.png" algin="center"/></div>

<div align=center><img width="450" height="300" src="http://on937g0jc.bkt.clouddn.com/2017/12/PowerDesigner/14.png" algin="center"/></div>

<div align=center><img width="450" height="300" src="http://on937g0jc.bkt.clouddn.com/2017/12/PowerDesigner/15.png" algin="center"/></div>

到这里已经可以连接数据库了。

# 设计数据库

如果在已有的数据库上需要设计和修改，先取消所有表，再选择需要设计或修改的数据库，选择表，点击ok。

<div align=center><img width="450" height="300" src="http://on937g0jc.bkt.clouddn.com/2017/12/PowerDesigner/2-1.png" algin="center"/></div>

连接后的UML如下，可以新建和修改表

<div align=center><img width="450" height="300" src="http://on937g0jc.bkt.clouddn.com/2017/12/PowerDesigner/2-2.png" algin="center"/></div>

同时可对表进行主外键设计，现在主外键已经很少用到了。

<div align=center><img width="450" height="300" src="http://on937g0jc.bkt.clouddn.com/2017/12/PowerDesigner/2-3.png" algin="center"/></div>

双击表之间的连接线，点击Joins

<div align=center><img width="450" height="300" src="http://on937g0jc.bkt.clouddn.com/2017/12/PowerDesigner/2-4.png" algin="center"/></div>

点击【确定】按钮，即可如我们所愿： 

<div align=center><img width="450" height="300" src="http://on937g0jc.bkt.clouddn.com/2017/12/PowerDesigner/2-6.png" algin="center"/></div>

# 生成建表语句

点击Database—>Generate Database

<div align=center><img width="450" height="300" src="http://on937g0jc.bkt.clouddn.com/2017/12/PowerDesigner/2-7.png" algin="center"/></div>

<div align=center><img width="450" height="300" src="http://on937g0jc.bkt.clouddn.com/2017/12/PowerDesigner/2-8.png" algin="center"/></div>

点击【确定】按钮之后，可以在桌面上找到shiro.sql这样的一个文件，打开，即可看到建表语句： 

```sql
/*==============================================================*/
/* DBMS name:      MySQL 5.0                                    */
/* Created on:     2017.12.6 17:22:25                          */
/*==============================================================*/


drop table if exists shiro.u_permission;

drop table if exists shiro.u_role;

drop table if exists shiro.u_role_permission;

drop table if exists shiro.u_user;

drop table if exists shiro.u_user_role;

/*==============================================================*/
/* User: shiro                                                  */
/*==============================================================*/
create user shiro;

/*==============================================================*/
/* Table: u_permission                                          */
/*==============================================================*/
create table shiro.u_permission
(
   id                   bigint(20) not null auto_increment,
   url                  national varchar(256) comment 'url地址',
   name                 national varchar(64) comment 'url描述',
   primary key (id)
);

/*==============================================================*/
/* Table: u_role                                                */
/*==============================================================*/
create table shiro.u_role
(
   id                   bigint(20) not null auto_increment,
   name                 national varchar(32) comment '角色名称',
   type                 national varchar(10) comment '角色类型',
   primary key (id)
);

/*==============================================================*/
/* Table: u_role_permission                                     */
/*==============================================================*/
create table shiro.u_role_permission
(
   rid                  bigint(20) comment '角色ID',
   pid                  bigint(20) comment '权限ID'
);

/*==============================================================*/
/* Table: u_user                                                */
/*==============================================================*/
create table shiro.u_user
(
   id                   bigint(20) not null auto_increment,
   nickname             national varchar(20) comment '用户昵称',
   email                national varchar(128) comment '邮箱|登录帐号',
   pswd                 national varchar(32) comment '密码',
   create_time          datetime comment '创建时间',
   last_login_time      datetime comment '最后登录时间',
   status               bigint(1) default 1 comment '1:有效，0:禁止登录',
   primary key (id)
);

/*==============================================================*/
/* Table: u_user_role                                           */
/*==============================================================*/
create table shiro.u_user_role
(
   uid                  bigint(20) comment '用户ID',
   rid                  bigint(20) comment '角色ID'
);

alter table shiro.u_user_role add constraint FK_Reference_1 foreign key (uid)
      references shiro.u_user (id) on delete restrict on update restrict;
```

得到SQL语句后可直接导入到数据库。由此我们设计数据库已经完成。

# 总结

这里只是简单介绍了PowerDesigner进行数据库模型设计，自动生成SQL语句等功能。PowerDesigner还有很多技巧和功能在摸索中。