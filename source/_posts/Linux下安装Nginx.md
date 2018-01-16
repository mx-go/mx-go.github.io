---
title: Linux下安装Nginx
date: 2018-01-11 15:16:49
tags: [nginx, linux]
categories: technology
---

<div align=center><img width="400" height="200" src="http://on937g0jc.bkt.clouddn.com/2018-01/linux_nginx/index.jpg" algin="center"/>

</div>

<!-- more -->

# Nginx安装环境

Nginx是C语言开发，建议在Linxu上运行，下面操作实在Centos6.5上的安装环境。

1. **gcc**

安装nginx需要先将官网下载的源码进行编译，编译依赖gcc环境，如果没有gcc环境，需要安装gcc。

安装命令：**yum install gcc-c++** 

2. **PCRE**

PCRE(Perl Compatible Regular Expressions)是一个Perl库，包括 perl 兼容的正则表达式库。nginx的http模块使用pcre来解析正则表达式，所以需要在linux上安装pcre库。

安装命令：**yum install -y pcre pcre-devel**

3. zlib

zlib库提供了很多种压缩和解压缩的方式，nginx使用zlib对http包的内容进行gzip，所以需要在linux上安装zlib库。

安装命令：**yum install -y zlib zlib-devel**

4. openssl

OpenSSL 是一个强大的安全套接字层密码库，囊括主要的密码算法、常用的密钥和证书封装管理功能及SSL协议，并提供丰富的应用程序供测试或其它目的使用。nginx不仅支持http协议，还支持https（即在ssl协议上传输http），所以需要在linux安装openssl库。

安装命令：**yum install -y openssl openssl-devel**

# 编译安装

将nginx-1.8.0.tar.gz拷贝至Linux服务器后解压。

```java
tar -zxvf nginx-1.8.0.tar.gz
cd nginx-1.8.0
```

1. configure

./configure --help查询详细参数。参数设置如下：

**注意：下边将临时文件目录指定为/var/temp/nginx，需要在/var下创建temp及nginx目录**

```java
./configure \
--prefix=/usr/local/nginx \
--pid-path=/var/run/nginx/nginx.pid \
--lock-path=/var/lock/nginx.lock \
--error-log-path=/var/log/nginx/error.log \
--http-log-path=/var/log/nginx/access.log \
--with-http_gzip_static_module \
--http-client-body-temp-path=/var/temp/nginx/client \
--http-proxy-temp-path=/var/temp/nginx/proxy \
--http-fastcgi-temp-path=/var/temp/nginx/fastcgi \
--http-uwsgi-temp-path=/var/temp/nginx/uwsgi \
--http-scgi-temp-path=/var/temp/nginx/scgi
```

2. 编译安装

```
make
make  install
```

<div align=center><img width="700" height="200" src="http://on937g0jc.bkt.clouddn.com/2018-01/linux_nginx/install.png" algin="center"/>

</div>

# 启动Nginx

```java
cd /usr/local/nginx/sbin/
./nginx
// 查询nginx进程命令
ps aux|grep nginx
```

**注意：执行./nginx启动nginx，这里可以-c指定加载的nginx配置文件，如下：**

```
./nginx -c /usr/soft/nginx-1.8.0/conf/nginx.conf
```

**如果不指定-c，nginx在启动时默认加载/usr/local/nginx/conf/nginx.conf文件，此文件的地址也可以在编译安装nginx时指定./configure的参数（--conf-path= 指向配置文件（nginx.conf））**

<div align=center><img width="700" height="200" src="http://on937g0jc.bkt.clouddn.com/2018-01/linux_nginx/start.png" algin="center"/>

</div>

# 重启Nginx

1. 先停止再启动（建议使用）

   对nginx进行重启相当于先停止nginx再启动nginx，即先执行停止命令再执行启动命令。

```
./nginx -s quit
./nginx
```

2. 重新加载配置文件

   当nginx的配置文件nginx.conf修改后，要想让配置生效需要重启nginx，使用-s reload不用先停止nginx再启动nginx即可将配置信息在nginx中生效。

```
./nginx -s reload
```

# 测试

nginx安装成功，启动nginx，即可访问虚拟机上的nginx

<div align=center><img width="700" height="200" src="http://on937g0jc.bkt.clouddn.com/2018-01/linux_nginx/ok.png" algin="center"/>

</div>

到这说明nginx上安装成功。