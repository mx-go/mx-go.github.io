---
title: Linux基本命令
date: 2017-04-07 15:59:22
tags: [tips]
categories: Linux
---

# 引言

之前的公司有用过Linux，自己也学习了一段时间，但是很久没有用了，最近又在腾讯云租了个空间把系统装成Centos系统了，所以又把Linux系统重新捡起来，重温下Linux的基本知识。<div align=center><img width="700" height="300" src="../../../../images/2017-4-6/Linux.jpg" algin="center"/></div><!-- more -->

# Linux简介

## 简介

**Linux**，免费开源，多用户多任务系统。基于Linux有多个版本的衍生。RedHat、Ubuntu、Debian

安装VMware或VirtualBox虚拟机。Linux的定义和历史右转[*百度百科*](http://baike.baidu.com/link?url=ImcCu-CQii_EX-Tiet8ChTjtjNUpDHYUFagNy65U41CX-jqb7oGTOkfew0hJyLhOBPrhC6yZmwUC8Sy-6COiWK)。具体安装步骤，找百度。

## 常用版本

我常用的Linux版本有两个`Centos`和`Ubuntu`，全都是开源免费的,其中Ubuntu属于桌面版。

```
Centos是免费的企业版Linux操作系统。是RedHat企业版的优化操作系统。具体可以参照百科：http://baike.baidu.com/view/26404.htm。里面有详解。
另附其官网:http://www.centos.org/。
另外，它适合作为服务器用。
```

```
Ubuntu之前有在环境中开发过项目，虽然时间不久，但还是有所体会。免费、无毒、免折腾、比较接近底层。
```

# 基本命令

## 基础命令

> Linux 操作系统位数识别: `uname -a（uname -p）`
>
> Linux 32位操作系统：Linux x86  [i586  i386  i686 i...](http://download.oracle.com/otn-pub/java/jdk/7u45-b18/jdk-7u45-linux-i586.rpm)
>
> Linux 64位操作系统：Linux x64x86_64  X64 ...

1. `man`          命令不会用了，找男人  如：man ls
2. `ifconfig`     显示系统信息
3. `ls 或ll`      查看目录文件
4. `pwd`      查看目前路径
5. `cat 文件名`     从第一个字节开始正向查看文件的内容
6. `head -2 file1`    查看一个文件的前两行 
7. `tail -2 file1` 查看一个文件的最后两行
8. `mv 老名 新名`      重命名/剪切
9. `cp 老文件路径+文件名 新文件路径（+文件名）`    复制 
10. `cd`       进入个人的主目录 
11. `cd 路径名`    进入新路径
12. `cd ..`     后退一步
13. `date`    显示系统日期
14. `shutdown -h now`    关闭系统(1) 
15. `shutdown -r now`    重启(1) 
16. `reboot`    重启(2) 
17. `halt`          关机(推荐)
18. `logout`     注销 
19. `mkdir dir1`    创建一个叫做 'dir1' 的目录' 
20. `rm -f file1`    删除一个叫做 'file1' 的文件'
21. `rmdir dir1`    删除一个叫做 'dir1' 的目录'
22. `rm -rf dir1`    删除一个叫做 'dir1' 的目录并同时删除其内
23. `find / -name file1`     从 '/' 开始进入根文件系统搜索文件和目录 
24. `tar -zxvf archive.tar`     解压一个包
25. `rpm -ivh package.rpm`   安装一个rpm包 



高级一点的命令，也是比较难懂、需要实践和琢磨的命令：

1. `chmod +权限(ugo)`    (u、g、o表示user、group、other)

   > 三种基本权限
   >
   > R           读         数值表示为4
   >
   > W          写         数值表示为2
   >
   > X           可执行  数值表示为1

   ​	例如：chmod 777   表示user、group、other都具有RWX权限。	

2. `grep  [options] `    grep命令是一种强大的文本搜索工具

   > grep 'test' d*
   > 显示所有以d开头的文件中包含 test的行。

3. `ps [options] `      对进程进行监测和控制

   > ps -aux|grep 8080      查看8080端口占用情况

4. `yum yum [options][command] [package ...]`       工具

   > yum list     列出当前系统中安装的所有包

5. `wget wget [OPTION]… [URL]…`      wget是一个从网络上自动下载文件的自由工具

   > wget http://example.com/file.iso    从网上下载单个文件

## crontab定时任务

### 基本使用

通过crontab 命令，可以在固定的间隔时间执行指定的系统指令或 shell script脚本。时间间隔的单位可以是分钟、小时、日、月、周及以上的任意组合。这个命令非常适合周期性的日志分析或数据备份等工作。

1. crontab文件格式

   分 时 日 月 星期 要运行的命令

- 第1列分钟0～59
- 第2列小时0～23（0表示子夜）
- 第3列日1～31
- 第4列月1～12
- 第5列星期0～7（0和7表示星期天）
- 第6列要运行的命令

2. 命令

```shell
#列出crontab文件
$ crontab -l

#编辑crontab文件
$ crontab -e

#删除crontab文件
$ crontab -r
```

3. 使用实例

```shell
# 每1分钟执行一次myCommand
$ * * * * * myCommand

# 每小时的第3和第15分钟执行
$ 3,15 * * * * myCommand

# 每晚的21:30重启smb
$ 30 21 * * * /etc/init.d/smb restart

# 每周六、周日的1 : 10重启smb
$ 10 1 * * 6,0 /etc/init.d/smb restart

# 每一小时重启smb
$ * */1 * * * /etc/init.d/smb restart
```

### 使用实例(定时备份MySQL)

1. 在/usr/soft下新建脚本**mysqlbak.sh**

```shell
#!/bin/bash
#备份路径
BACKUP=/usr/soft/sql
#当前时间
DATETIME=$(date +%Y-%m-%d_%H%M%S)
echo "==备份开始=="
echo "备份文件存放于${BACKUP}/$DATETIME.tar.gz"
#数据库地址
HOST=localhost
#数据库用户名
DB_USER=root
#数据库密码
DB_PW=root
#创建备份目录
[ ! -d "${BACKUP}/$DATETIME" ] && mkdir -p "${BACKUP}/$DATETIME"
#后台系统数据库
DATABASE=test
/usr/bin/mysqldump -u${DB_USER} -p${DB_PW} --host=$HOST -q -R --databases $DATABASE | gzip > ${BACKUP}/$DATETIME/$DATABASE.sql.gz

#压缩成tar.gz包
cd $BACKUP
tar -zcvf $DATETIME.tar.gz $DATETIME
#删除备份目录
rm -rf ${BACKUP}/$DATETIME
#删除10天前备份的数据
find $BACKUP -mtime +10 -name "*.tar.gz" -exec rm -rf {} \;
echo "===备份成功==="
```

2. 赋予权限

```shell
$ chmod 777 mysqlbak.sh
```

3. 添加至定时任务

```shell
// 编辑定时任务列表
$ crontab -e

// 加入以下内容
#每隔一个小时执行一次
00 */1 * * * /usr/soft/mysqlbak.sh
```

### 注意

- 新创建的cron job，不会马上执行，至少要过2分钟才执行。如果重启cron则马上执行。
- 当crontab失效时，可以尝试**service crond restart**解决问题。或者查看日志看某个job有没有执行/报错**tail -f /var/log/cron**。
- 千万别乱运行**crontab -r**。它从Crontab目录（/var/spool/cron）中删除用户的Crontab文件。删除了该用户的所有crontab都没了。
- 在crontab中%是有特殊含义的，表示换行的意思。如果要用的话必须进行转义%，如经常用的date ‘+%Y%m%d’在crontab里是不会执行的，应该换成date ‘+%Y%m%d’。

...............

# 总结

Linux博大精深，有很多的命令自己使用的比较少也没有用到，用到的时候再去查资料。

更多的命令可以查看[***http://www.cnblogs.com/skillup/articles/1877812.html***](http://www.cnblogs.com/skillup/articles/1877812.html)