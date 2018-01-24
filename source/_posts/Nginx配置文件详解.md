---
title: Nginx配置文件详解
date: 2018-01-24 14:12:52
tags: [nginx]
categories: technology
---

# 引言

之前介绍了Linux下安装Nginx，Nginx 专为性能优化而开发，性能是其最重要的考量,实现上非常注重效率 。它支持内核 Poll 模型，能经受高负载的考验,有报告表明能支持高达 50,000 个并发连接数。

<div align=center><img width="700" height="200" src="http://on937g0jc.bkt.clouddn.com/2018-01/nginx/index.png" algin="center"/>

</div>

<!-- more -->

# Nginx特点

Nginx 具有很高的稳定性。其它 HTTP 服务器，当遇到访问的峰值，或者有人恶意发起慢速连接时，也很可能会导致服务器物理内存耗尽频繁交换，失去响应，只能重启服务器。例如当前 apache 一旦上到 200 个以上进程，web响应速度就明显非常缓慢了。而 Nginx 采取了分阶段资源分配技术，使得它的 CPU 与内存占用率非常低。Nginx 官方表示保持 10,000 个没有活动的连接，它只占 2.5M 内存，所以类似 DOS 这样的攻击对 Nginx 来说基本上是毫无用处的。就稳定性而言,Nginx 比 lighthttpd 更胜一筹。

Nginx 支持热部署。它的启动特别容易, 并且几乎可以做到 7*24 不间断运行，即使运行数个月也不需要重新启动。你还能够在不间断服务的情况下，对软件版本进行进行升级。

# Nginx的用处

说了这么多Nginx的优点，Nginx在开发中最常用作反向代理服务器，但是Nginx的用处可不止这一点。

## Nginx配置虚拟主机

虚拟主机是一种特殊的软硬件技术，它可以将网络上的每一台计算机分成多个虚拟主机，每个虚拟主机可以独立对外提供www服务，这样就可以实现一台主机对外提供多个web服务，每个虚拟主机之间是独立的，互不影响的。

<div align=center><img width="600" height="200" src="http://on937g0jc.bkt.clouddn.com/2018-01/nginx/1.png" algin="center"/>

</div>

1、 基于ip的虚拟主机

2、基于端口的虚拟主机

3、基于域名的虚拟主机

## Nginx反向代理

通常的代理服务器，只用于代理内部网络对Internet的连接请求，客户机必须指定代理服务器,并将本来要直接发送到Web服务器上的http请求发送到代理服务器中由代理服务器向Internet上的web服务器发起请求，最终达到客户机上网的目的。

​	而反向代理（Reverse Proxy）方式是指以代理服务器来接受internet上的连接请求，然后将请求转发给内部网络上的服务器，并将从服务器上得到的结果返回给internet上请求连接的客户端，此时代理服务器对外就表现为一个反向代理服务器。

<div align=center><img width="600" height="200" src="http://on937g0jc.bkt.clouddn.com/2018-01/nginx/2.png" algin="center"/>

</div>

# Nginx配置详解

```nginx
#用户
user nginx ;

#工作进程，根据硬件调整，大于等于cpu核数
worker_processes 8;

#错误日志
error_log logs/nginx_error.log crit;
#pid放置的位置
pid logs/nginx.pid;

#指定进程可以打开的最大描述符
worker_rlimit_nofile 204800;
这个指令是指当一个nginx进程打开的最多文件描述符数目，理论值应该是最多打开文
件数（ulimit -n）与nginx进程数相除，但是nginx分配请求并不是那么均匀，所以最好与ulimit -n 的值保持一致。
现在在linux 2.6内核下开启文件打开数为65535，worker_rlimit_nofile就相应应该填写65535。
这是因为nginx调度时分配请求到进程并不是那么的均衡，所以假如填写10240，总并发量达到3-4万时就有进程可能超过10240了，这时会返回502错误。

events
{
  	#使用epoll的I/O 模型
	use epoll;
    补充说明:
    与apache相类，nginx针对不同的操作系统，有不同的事件模型
    A）标准事件模型
    Select、poll属于标准事件模型，如果当前系统不存在更有效的方法，nginx会选择select或poll
    B）高效事件模型
    Kqueue：使用于FreeBSD 4.1+, OpenBSD 2.9+, NetBSD 2.0 和 MacOS X.使用双处理器的MacOS X系统使用kqueue可能会造成内核崩溃。
    Epoll:使用于Linux内核2.6版本及以后的系统。
    /dev/poll：使用于Solaris 7 11/99+, HP/UX 11.22+ (eventport), IRIX 6.5.15+ 和 Tru64 UNIX 5.1A+。
    Eventport：使用于Solaris 10. 为了防止出现内核崩溃的问题， 有必要安装安全补丁

    #工作进程的最大连接数量，根据硬件调整，和前面工作进程配合起来用，尽量大，但是别把cpu跑到100%就行
	worker_connections 204800;
	每个进程允许的最多连接数， 理论上每台nginx服务器的最大连接数为worker_processes*worker_connections
    
	#keepalive超时时间。
	keepalive_timeout 60;

  	#这个将为打开文件指定缓存，默认是没有启用的，max指定缓存数量，建议和打开文件数一致，inactive是指经过多长时间文件没被请求后删除缓存。
	open_file_cache max=65535 inactive=60s;

  	#这个是指多长时间检查一次缓存的有效信息。
	open_file_cache_valid 80s;
  
	#open_file_cache指令中的inactive参数时间内文件的最少使用次数，如果超过这个数字，文件描述符一直是在缓存中打开的，如上例，如果有一个文件在inactive时间内一次没被使用，它将被移除。
	open_file_cache_min_uses 1;
}

#设定http服务器，利用它的反向代理功能提供负载均衡支持
http
{
  	#设定mime类型,类型由mime.type文件定义
	include mime.types;
	default_type application/octet-stream;


	log_format main '$host $status [$time_local] $remote_addr [$time_local] $request_uri '
'"$http_referer" "$http_user_agent" "$http_x_forwarded_for" ''$bytes_sent $request_time $sent_http_x_cache_hit';
log_format log404 '$status [$time_local] $remote_addr $host$request_uri $sent_http_location';

$remote_addr与$http_x_forwarded_for用以记录客户端的ip地址；
$remote_user：用来记录客户端用户名称；
$time_local： 用来记录访问时间与时区；
$request： 用来记录请求的url与http协议；
$status： 用来记录请求状态；成功是200，
$body_bytes_s ent ：记录发送给客户端文件主体内容大小；
$http_referer：用来记录从那个页面链接访问过来的；
$http_user_agent：记录客户毒啊浏览器的相关信息；
通常web服务器放在反向代理的后面，这样就不能获取到客户的IP地址了，通过$remote_add拿到的IP地址是反向代理服务器的iP地址。反向代理服务器在转发请求的http头信息中，可以增加x_forwarded_for信息，用以记录原有客户端的IP地址和原来客户端的请求的服务器地址；

	#用了log_format指令设置了日志格式之后，需要用access_log指令指定日志文件的存放路径；
    # access_log /usr/local/nginx/logs/access_log main;
	access_log /dev/null;
	
  	#保存服务器名字的hash表是由指令server_names_hash_max_size 和server_names_hash_bucket_size所控制的。参数hash bucket size总是等于hash表的大小，并且是一路处理器缓存大小的倍数。在减少了在内存中的存取次数后，使在处理器中加速查找hash表键值成为可能。如果hash bucket size等于一路处理器缓存的大小，那么在查找键的时候，最坏的情况下在内存中查找的次数为2。第一次是确定存储单元的地址，第二次是在存储单元中查找键 值。因此，如果Nginx给出需要增大hash max size 或 hash bucket size的提示，那么首要的是增大前一个参数的大小.
	server_names_hash_bucket_size 128;

  	#客户端请求头部的缓冲区大小，这个可以根据你的系统分页大小来设置，一般一个请求的头部大小不会超过1k，不过由于一般系统分页都要大于1k，所以这里设置为分页大小。分页大小可以用命令getconf PAGESIZE取得。
	client_header_buffer_size 128k;

  #客户请求头缓冲大小
  n#ginx默认会用client_header_buffer_size这个buffer来读取header值，如果header过大，它会使用large_client_header_buffers来读取如果设置过小HTTP头/Cookie过大 会报400 错误nginx 400 bad request求行如果超过buffer，就会报HTTP 414错误(URI Too Long)nginx接受最长的HTTP头部大小必须比其中一个buffer大，否则就会报400的
	large_client_header_buffers 8 128k;

HTTP错误(Bad Request)。
#使用字段:http, server, location 这个指令指定缓存是否启用,如果启用,将记录文件以下信息: ·打开的文件描述符,大小信息和修改时间. ·存在的目录信息. ·在搜索文件过程中的错误信息 --没有这个文件,无法正确读取,参考open_file_cache_errors指令选项:·max -指定缓存的最大数目,如果缓存溢出,最长使用过的文件(LRU)将被移除
#例: open_file_cache max=1000 inactive=20s; open_file_cache_valid 30s; open_file_cache_min_uses 2; open_file_cache_errors on;
	open_file_cache max 102400

	#语法:open_file_cache_errors on | off 默认值:open_file_cache_errors off 使用字段:http, server, location 这个指令指定是否在搜索一个文件是记录cache错误.
	open_file_cache_errors

	#语法:open_file_cache_min_uses number 默认值:open_file_cache_min_uses 1 使用字段:http, server, location 这个指令指定了在open_file_cache指令无效的参数中一定的时间范围内可以使用的最小文件数,如 果使用更大的值,文件描述符在cache中总是打开状态.
	open_file_cache_min_uses
	
    #语法:open_file_cache_valid time 默认值:open_file_cache_valid 60 使用字段:http, server, location 这个指令指定了何时需要检查open_file_cache中缓存项目的有效信息.
	open_file_cache_valid
    
	#设定通过nginx上传文件的大小
	client_max_body_size 300m;
	
  	#sendfile指令指定 nginx 是否调用sendfile 函数（zero copy 方式）来输出文件，
#对于普通应用，必须设为on。
#如果用来进行下载等应用磁盘IO重负载应用，可设置为off，以平衡磁盘与网络IO处理速度，降低系统uptime。
	sendfile on;
	
  	#此选项允许或禁止使用socke的TCP_CORK的选项，此选项仅在使用sendfile的时候使用
	tcp_nopush on;
  
	tcp_nodelay on;
  	
	#后端服务器连接的超时时间_发起握手等候响应超时时间
	proxy_connect_timeout 90; 
	
  	#连接成功后_等候后端服务器响应时间_其实已经进入后端的排队之中等候处理（也可以说是后端服务器处理请求的时间）
	proxy_read_timeout 180;

	#后端服务器数据回传时间_就是在规定时间之内后端服务器必须传完所有的数据
	proxy_send_timeout 180;

  	#设置从被代理服务器读取的第一部分应答的缓冲区大小，通常情况下这部分应答中包含一个小的应答头，默认情况下这个值的大小为指令proxy_buffers中指定的一个缓冲区的大小，不过可以将其设置为更小
	proxy_buffer_size 256k;
	
  	#设置用于读取应答（来自被代理服务器）的缓冲区数目和大小，默认情况也为分页大小，根据操作系统的不同可能是4k或者8k
	proxy_buffers 8 256k;

	proxy_busy_buffers_size 256k;

	#设置在写入proxy_temp_path时数据的大小，预防一个工作进程在传递文件时阻塞太长
	proxy_temp_file_write_size 256k;
	
  	#proxy_temp_path和proxy_cache_path指定的路径必须在同一分区
	proxy_temp_path /data0/proxy_temp_dir;
	#设置内存缓存空间大小为200MB，1天没有被访问的内容自动清除，硬盘缓存空间大小为30GB。
	proxy_cache_path /data0/proxy_cache_dir levels=1:2 keys_zone=cache_one:200m inactive=1d max_size=30g;
	
    client_header_timeout 5;
    client_body_timeout 5;
    send_timeout 5;
  
	#keepalive超时时间。
	keepalive_timeout 120;

	#如果把它设置为比较大的数值，例如256k，那么，无论使用firefox还是IE浏览器，来提交任意小于256k的图片，都很正常。如果注释该指令，使用默认的client_body_buffer_size设置，也就是操作系统页面大小的两倍，8k或者16k，问题就出现了。
#无论使用firefox4.0还是IE8.0，提交一个比较大，200k左右的图片，都返回500 Internal Server Error错误
	client_body_buffer_size 512k;
  
	#表示使nginx阻止HTTP应答代码为400或者更高的应答。
	proxy_intercept_errors on;

  	 #FastCGI相关参数是为了改善网站的性能：减少资源占用，提高访问速度。下面参数看字面意思都能理解。
    fastcgi_connect_timeout 300;
    fastcgi_send_timeout 300;
    fastcgi_read_timeout 300;
    fastcgi_buffer_size 64k;
    fastcgi_buffers 4 64k;
    fastcgi_busy_buffers_size 128k;
    fastcgi_temp_file_write_size 128k;
  
  	#gzip模块设置
    gzip on; #开启gzip压缩输出
    gzip_min_length 1k;    #最小压缩文件大小
    gzip_buffers 4 16k;    #压缩缓冲区
    gzip_http_version 1.0;    #压缩版本（默认1.1，前端如果是squid2.5请使用1.0）
    gzip_comp_level 2;    #压缩等级
    gzip_types text/plain application/x-javascript text/css application/xml;    #压缩类型，默认就已经包含textml，所以下面就不用再写了，写上去也不会有问题，但是会有一个warn。
    gzip_vary on;
  
  	#开启限制IP连接数的时候需要使用
    #limit_zone crawler $binary_remote_addr 10m;

        upstream img_relay {
        	server 127.0.0.1:8027;
       	 	server 127.0.0.1:8028;
        	server 127.0.0.1:8029;
        	hash $request_uri;
        }

nginx的upstream目前支持4种方式的分配
1、轮询（默认）
每个请求按时间顺序逐一分配到不同的后端服务器，如果后端服务器down掉，能自动剔除。
    
2、weight
指定轮询几率，weight和访问比率成正比，用于后端服务器性能不均的情况。
例如：
upstream bakend {
server 192.168.0.14 weight=10;
server 192.168.0.15 weight=10;
}

3、ip_hash
每个请求按访问ip的hash结果分配，这样每个访客固定访问一个后端服务器，可以解决session的问题。
例如：
upstream bakend {
ip_hash;
server 192.168.0.14:88;
server 192.168.0.15:80;
}

4、fair（第三方）
按后端服务器的响应时间来分配请求，响应时间短的优先分配。
upstream backend {
server server1;
server server2;
fair;
}

5、url_hash（第三方）
按访问url的hash结果来分配请求，使每个url定向到同一个后端服务器，后端服务器为缓存时比较有效。


例：在upstream中加入hash语句，server语句中不能写入weight等其他的参数，hash_method是使用的hash算法
upstream backend {
	server squid1:3128;
	server squid2:3128;
	hash $request_uri;
	hash_method crc32;
}

tips:
upstream bakend{#定义负载均衡设备的Ip及设备状态
    ip_hash;
    server 127.0.0.1:9090 down;
    server 127.0.0.1:8080 weight=2;
    server 127.0.0.1:6060;
    server 127.0.0.1:7070 backup;
}
在需要使用负载均衡的server中增加
proxy_pass http://bakend/;

每个设备的状态设置为:
1.down表示单前的server暂时不参与负载
2.weight默认为1.weight越大，负载的权重就越大。
3.max_fails：允许请求失败的次数默认为1.当超过最大次数时，返回proxy_next_upstream模块定义的错误
4.fail_timeout:max_fails次失败后，暂停的时间。
5.backup： 其它所有的非backup机器down或者忙的时候，请求backup机器。所以这台机器压力会最轻。

nginx支持同时设置多组的负载均衡，用来给不用的server来使用。

client_body_in_file_only设置为On 可以讲client post过来的数据记录到文件中用来做debug
client_body_temp_path设置记录文件的目录 可以设置最多3层目录

location对URL进行匹配.可以进行重定向或者进行新的代理 负载均衡
```