---
title: Nginx日志无法轮转
date: 2020-10-02 23:18:39
tags: [java, nginx]
categories: 踩坑记录
cover: ../../../../images/2021/4-6/bug_nginx.jpg
---

# 症状

Nginx刚启动后日志记录正常，一段时间后，Nginx会把已产生的日志压缩为`.gz`文件。但是一旦压缩后，就不再记录新日志到新生成的`access.log`文件，但日志文件存在，里面却没有任何日志。旧的日志压缩后没有问题，自从压缩后，新的文件再也不记录新日志了(发现Nginx会很消耗内存，估计日志都存在内存里，不写文件了)。

<div align=center><img src="../../../../images/2021/4-6/nginx_bug_1.png" algin="center"/></div>

我们的Nginx部署在k8s中，查看Nginx的配置没有发现任何问题

```sh
#user  nobody;
worker_processes  4;

error_log  /app/openresty/nginx/logs/error.log  error;
pid        /app/openresty/nginx/logs/nginx.pid;
#error_log  logs/error.log;
#error_log  logs/error.log  notice;
#error_log  logs/error.log  info;


events {
    worker_connections 65536 ;
}


http {
    include       mime.types;
    include       custom_upstream.conf;
    default_type  application/octet-stream;
    log_format  main  '$remote_addr|$remote_user|[$time_local]|"$request"'
                      '|$status|$request_time|$body_bytes_sent|"$http_referer"'
                '|"$http_user_agent"|"$http_x_forwarded_for"|$upstream_response_time|$upstream_status';    
    access_log  /app/openresty/nginx/logs/access.log  main;
    
    server_tokens   off;
    sendfile        on;
    tcp_nopush      on;
    tcp_nodelay     on;
    client_max_body_size 100m;
    client_header_buffer_size 100m;
    keepalive_timeout  60;
    proxy_buffering off;
    gzip on;

    server {
        listen       80;
        server_name  localhost;

        listen 443 ssl;

        #charset koi8-r;

        include       custom_location.conf;

        location / {
            root   html;
            index  index.html index.htm;
        }

        # redirect server error pages to the static page /50x.html
        #
        error_page   500 502 503 504  /50x.html;
        location = /50x.html {
            root   html;
        }

        location = /nstats {
            check_status;
            access_log      off;
            allow           10.116.0.0/16;
            allow           10.110.0.0/16;
            allow           10.117.0.0/16;
            allow           10.150.0.0/16;
            allow           100.0.0.0/8;
            allow           10.0.0.0/8;
            deny            all;
        }
    }
}
```

# 原因

经查询资料在`stackoverflow`发现了类似的问题，见链接：https://stackoverflow.com/questions/9552930/nginx-cannot-write-into-access-log

原因是当Nginx压缩文件后，需要给master进程发送USR1信号后重新打开文件。

于是查看了Nginx的进程ID为33

```shell
[mwopr@k8s-opc-openapi-nginx-77787494c5-c77s8 logs]$ cat nginx.pid 
33
```

当执行重新打开log文件命令时提示没有权限

```shell
[mwopr@k8s-opc-openapi-nginx-77787494c5-c77s8 logs]$ kill -USR1 33
bash: kill: (33) - Operation not permitted
```

这个时候恍然大悟，登陆shell的默认用户是`mwopr`，没有权限执行`kill`命令，需要用`root`用户执行，当切换为`root`用户后，执行`kill`命令成功且日志可以正常写入。

<div align=center><img src="../../../../images/2021/4-6/nginx_bug_2.png" algin="center"/></div>

# 原理

原文：http://nginx.org/en/docs/control.html

Nginx可以通过信号进行控制。对应Linux系统就是用`kill`命令。

master进程id默认写入到`/nginx/logs/nginx.pid`文件中。文件也可以在`nginx.conf`文件中指定。master进程支持以下信号：

```shell
kill -TERM pid # 快速停止master进程。 
kill -QUIT pid # 优雅的停止。 
kill -HUB pid # 改变配置文件。开启一个新的worker进程处理，优雅的停止老的worker进程。相当于nginx -s reload 
kill -USR1 pid # 重新打开log文件。-s reopen命令 
kill -USR2 pid # 升级可执行文件。热部署 
kill -WINCH pid # 优雅的关闭worker进程。
```

每个worker进程也可以接收信号：

```shell
kill -TERM pid # 快速关闭worker进程 
kill -QUIT pid # 优雅退出 
kill -USR1 pid # 重新打开日志文件,先mv一个，再去执行这个命令。-s reopen命令
```

日志轮转

1. 重命名log文件。
2. 给master进程发送USR1信号。
3. 重新打开文件。

> Rotating Log-files
>
> In order to rotate log files, they need to be renamed first. After that USR1 signal should be sent to the master process. The master process will then re-open all currently open log files and assign them an unprivileged user under which the worker processes are running, as an owner. After successful re-opening, the master process closes all open files and sends the message to worker process to ask them to re-open files. Worker processes also open new files and close old files right away. As a result, old files are almost immediately available for post processing, such as compression.