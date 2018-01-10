---
title: Linux下安装JDK与MySQL
date: 2018-01-09 19:53:24
tags: [mysql, jdk, linux]
categories: technology
---

# 引言

重温记录下Linux环境下JDK和MySQL的安装。

<div align=center><img width="700" height="200" src="http://on937g0jc.bkt.clouddn.com/2018-01/linux_JDK_MySQL/installing-mysql-on-linux.png" algin="center"/>

</div>

<!-- more -->

# JDK的安装

## 下载解压

下载JDK压缩包，下载目录：*http://www.oracle.com/technetwork/java/javase/downloads/index.html*

解压

```
tar -xvzf jdk-8u152-linux-x64.tar.gz
```

## 配置环境变量

以`root`用户使用以下命令进入配置环境变量的profile文件。

```xml
vim /etc/profile
```

在文件末尾加入以下内容并保存（注意修改JDK路径）。

```
# set java environment 
export JAVA_HOME=/usr/soft/jdk1.8.0_152
export PATH=$PATH:$JAVA_HOME/bin
export CLASSPATH=.:$JAVA_HOME/lib/dt.jar:$JAVA_HOME/lib/tools.jar
```

在命令行使用以下命令使环境变量生效。

```
source /etc/profile
```

## 切换JDK版本

当Linux中安装多个JDK时切换进行版本切换。

查看选择所有JDK。

```
alternatives --config java
```

<div align=center><img width="700" height="300" src="http://on937g0jc.bkt.clouddn.com/2018-01/linux_JDK_MySQL/config-f.png" algin="center"/>

</div>

给jdk1.8.0_152设置序列号，输入以下命令（注意修改JDK目录）。

```
alternatives --install /usr/bin/java java /usr/soft/jdk1.8.0_152 4
```

输入以下命令，选择JDK对应的数字，切换JDK版本。

```
alternatives --config java
```

<div align=center><img width="700" height="300" src="http://on937g0jc.bkt.clouddn.com/2018-01/linux_JDK_MySQL/config-s1.png" algin="center"/>

</div>

# MySQL的安装与卸载

## yum安装

从Oracle官方网站下载Linux系统对应的MySQL的yum源包。地址：*https://dev.mysql.com/downloads/repo/yum/*

<div align=center><img width="700" height="300" src="http://on937g0jc.bkt.clouddn.com/2018-01/linux_JDK_MySQL/1.png" algin="center"/>

</div>

把yum源包上传到linux，依次执行以下命令进行安装。

```
yum localinstall mysql-community-release-el6-5.noarch.rpm
yum install mysql-server
```

<div align=center><img width="700" height="300" src="http://on937g0jc.bkt.clouddn.com/2018-01/linux_JDK_MySQL/2.png" algin="center"/>

</div>

安装完成后启动MySQL

```
service mysqld start
```

<div align=center><img width="700" height="300" src="http://on937g0jc.bkt.clouddn.com/2018-01/linux_JDK_MySQL/3.png" algin="center"/>

</div>

给root用户设置密码

```
/usr/bin/mysqladmin -u root password 'root'
```

进入MySQL后进行远程连接授权

```
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' IDENTIFIED BY 'root' WITH GRANT OPTION;
```

### 卸载

查看MySQL的安装路径

```
whereis mysql
```

查看mysql的安装包

```
rpm -qa|grep mysql
```

卸载

```
yum remove mysql
```

若卸载不完全，则要逐个卸载

```
rpm -qa|grep mysql
yum remove mysql-community-release-el6-5.noarch
yum remove mysql-community-common-5.6.38-2.el6.x86_64
yum remove mysql-community-libs-5.6.38-2.el6.x86_64
```

删除mysql的数据库文件

```
rm -rf /var/lib/mysql/
```

## 安装包离线安装

下载MySQL离线安装包：*https://dev.mysql.com/downloads/mysql/*

<div align=center><img width="700" height="300" src="http://on937g0jc.bkt.clouddn.com/2018-01/linux_JDK_MySQL/download.png" algin="center"/>

</div>

```java
mv mysql-5.6.38-linux-glibc2.12-x86_64.tar.gz /usr/local/
cd /usr/local/
// 解压MySQL安装包
tar -zxvf  mysql-5.6.38-linux-glibc2.12-x86_64.tar.gz
// 重命名
mv mysql-5.6.38-linux-glibc2.12-x86_64 mysql
```

<div align=center><img width="700" height="300" src="http://on937g0jc.bkt.clouddn.com/2018-01/linux_JDK_MySQL/tar.png" algin="center"/>

</div>

检查MySQL组和用户是否存在，如无创建

```java
cat /etc/group | grep mysql
cat /etc/passwd | grep mysql
// 如果没有则创建。useradd -r参数表示mysql用户是系统用户，不可用于登录系统
groupadd mysql
useradd -r -g mysql mysql
```

分配用户和组

```java
cd mysql
// 更改mysql目录所属的用户(用户为mysql)
chown -R mysql ../mysql/
// -R是递归的意思，就是把mysql目录下的全部文件和子目录都设置为mysql用户和mysql组。
chgrp -R mysql ../mysql/
// 上面的做法是为了把mysql降权，以限定只能访问属于mysql用户的文件。
```

 安装及初始化数据库（创建系统数据库的表）

```java
./scripts/mysql_install_db --user=mysql --basedir=/usr/local/mysql/ --datadir=/usr/local/mysql/data/
```

<div align=center><img width="700" height="300" src="http://on937g0jc.bkt.clouddn.com/2018-01/linux_JDK_MySQL/scripts.png" algin="center"/>

</div>

配置MySQL数据库

```java
// 复制配置文件
cp -a ./support-files/my-default.cnf /etc/my.cnf
// 更改配置文件信息
vi /etc/my.cnf
// 加入以下内容
# These are commonly set, remove the # and set as required.
basedir = /usr/local/mysql
datadir = /usr/local/mysql/data
```

修改MySQL密码

```java
// 启动MySQL
./support-files/mysql.server start
// 修改密码
./bin/mysqladmin -u root -h localhost.localdomain password 'root'
// 进入MySQL
./bin/mysql -h127.0.0.1 -uroot -proot
```

<div align=center><img width="700" height="300" src="http://on937g0jc.bkt.clouddn.com/2018-01/linux_JDK_MySQL/start.jpg" algin="center"/>

</div>

增加远程登录权限

```
grant all privileges on *.* to root@'%' identified by 'root';
flush privileges;
```

将MySQL加入Service系统服务

```java
// 先退出MySQL
cp support-files/mysql.server /etc/init.d/mysqld
chkconfig --add mysqld
chkconfig mysqld on
service mysqld restart
service mysqld status  
```

<div align=center><img width="700" height="300" src="http://on937g0jc.bkt.clouddn.com/2018-01/linux_JDK_MySQL/ok.png" algin="center"/>

</div>

到这里MySQL就配置完成了，剩下的就是优化MySQL，配置/etc/my.cnf啦！