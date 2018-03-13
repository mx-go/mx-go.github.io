---
title: Linux下Tomcat的安装与优化
date: 2018-01-05 19:04:11
tags: [tomcat, tips, linux]
categories: technology
---

# 引言

Linux系统已经搁置很久了，之前有在Ubuntu系统上开发过，但是Linux已经很久没有用了。现在公司把项目部署在Linux系统上，又要把Linux相关知识温习一下。这篇博客温习一下Linux下Tomcat的部署与优化，大部分的操作与在windows上相同。<div align=center><img width="700" height="300" src="http://on937g0jc.bkt.clouddn.com/2018-01/linux_tomcat/tomcat_linux.png" algin="center"/></div><!-- more -->

# Tomcat的安装

首先下载Tomcat的压缩包（apache-tomcat-7.0.82.tar.gz），下载地址为：*https://tomcat.apache.org/download-70.cgi*

将压缩包放到Linux预定目录下，执行tar的解压缩命令

```xml
cd /usr/soft/
tar -zxvf apache-tomcat-7.0.82.tar.gz
```

进入到apache-tomcat-7.0.82.tar.gz的bin目录下执行**./startup.sh** 命令即可启动Tomcat。

<div align=center><img width="700" height="300" src="http://on937g0jc.bkt.clouddn.com/2018-01/linux_tomcat/1.png" algin="center"/>

</div>

# Tomcat的优化

默认情况下Tomcat的配置适合开发模式或者比较小的系统应用，当访问量稍微多的时候比如1000人同时在线做一些频繁的业务操作的时候，可能性能方面就会存在问题，所以有必要在生产环境下对Tomcat做一些优化。

之前几篇文章也提到了Tomcat相关参数的设置与优化，Windows操作系统与Linux操作系统大同小异。

## APR模式

Tomcat 常用运行模式有3种，分别为 BIO，NIO，APR。生产环境建议用APR，从操作系统级别来解决异步的IO问题，大幅度的提高性能。Linux下需要另安装配置APR。

### 下载

APR模式需要下载**apr-1.6.3.tar.gz**和**apr-util-1.6.1.tar.gz**两个文件，下载地址为：*http://apr.apache.org/download.cgi*

### 安装

将连个文件放到合适的位置然后进行安装操作。

#### apr的安装

依次执行，将安装路径设为`/usr/local/apr`

```
tar -zxvf apr-1.6.3.tar.gz
cd apr-1.6.3.tar.gz
./configure --prefix=/usr/local/apr
make
make install
```

#### apr-util的安装

```
tar -zxvf apr-util-1.6.1.tar.gz
cd apr-util-1.6.1.tar.gz
./configure --with-apr=/usr/local/apr/bin/apr-1-config
make
make install
```

#### 安装tomcat-native

`tomcat-native.tar.gz是Tomcat自带的压缩包`，该文件在tomcat的bin目录下。

系统要先安装好JDK，我的JDK的安装目录为：`/usr/soft/jdk1.8.0_152`

```
cd /usr/soft/apache-tomcat-7.0.82/bin/
tar -zxvf tomcat-native.tar.gz
cd tomcat-native-1.2.14-src/java/org/apache/tomcat/jni/
./configure --with-apr=/usr/local/apr/bin/apr-1-config --with-java-home=/usr/soft/jdk1.8.0_152
make
make install
```

#### 配置

1.  编辑tomcat目录下文件bin/catalina.sh**加载apr**，在任意地方加入下面一行

```xml
CATALINA_OPTS="$CATALINA_OPTS -Djava.library.path=/usr/local/apr/lib"
```

2.  编辑bin/catalina.sh**配置JVM运行参数**，注意引号不要忘记。

```
JAVA_OPTS="-server -Xmx4g -Xms4g -Xmn1g -XX:PermSize=512M -XX:MaxPermSize=521M -XX:+DisableExplicitGC -XX:SurvivorRatio=3 -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/usr/soft/apache-tomcat-7.0.82 -XX:+UseConcMarkSweepGC -XX:+UseParNewGC -XX:CMSInitiatingOccupancyFraction=65 -XX:+UseCMSInitiatingOccupancyOnly -XX:SoftRefLRUPolicyMSPerMB=0 -XX:+UseCMSCompactAtFullCollection -XX:+PrintGCDetails -XX:+PrintGCTimeStamps -XX:+PrintHeapAtGC -Xloggc:/usr/soft/jdk1.8.0_152/log/gc.log -Djava.awt.headless=true"
```

3. 编辑conf/server.xml**使用apr运行模式**

```
<Connector port="8080" protocol="org.apache.coyote.http11.Http11AprProtocol"
               connectionTimeout="20000" maxThreads="1000" minSpareThreads="100"
			   maxSpareThreads="200" acceptCount="900" enableLookups="false"
			   compression="on" compressionMinSize="1024" compressableMimeType="text/html,text/xml,text/css,text/javascript"
               redirectPort="8443" URIEncoding="UTF-8" maxHttpHeaderSize="8192"/>
```

4. 启动Tomcat

启动tomcat，查看tomcat日志文件，若出现如下信息则表明安装配置成功。

```
一月 05, 2018 2:03:09 下午 org.apache.coyote.AbstractProtocol init
信息: Initializing ProtocolHandler ["http-apr-8080"]
一月 05, 2018 2:03:09 下午 org.apache.coyote.AbstractProtocol init
信息:: Initializing ProtocolHandler ["ajp-apr-8009"]
一月 05, 2018 2:03:09 下午 org.apache.catalina.startup.Catalina load
信息:: Initialization processed in 1471 ms
```

# 结语

性能的影响因素是多方面的，互相影响，首先是系统本身没问题，数据库的响应没问题，web容器顺畅，硬件顺畅，网络带宽足够，再使用一些小工具进行检测，只有在大量用户在实际的生产环境中使用系统，才能发现问题，找到问题的根源到底是哪一块引发的性能瓶颈，调整一下自然一切都变得顺畅。