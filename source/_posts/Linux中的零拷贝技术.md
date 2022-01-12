---
title: Linux中的零拷贝技术
date: 2020-02-10 12:02:58
tags: [tips]
categories: 
- [Linux, 基础]
img: ../../../../images/2020/1-4/Zero-Copy.png
cover: ../../../../images/2020/1-4/Zero-Copy.png
---

# 引言

`零拷贝(Zero-Copy`)技术指在计算机执行操作时，CPU不需要先将数据从一个内存区域复制到另一个内存区域，从而可以减少上下文切换以及CPU的拷贝时间。作用是在数据从网络设备到用户程序空间传递的过程中，减少数据拷贝次数，减少系统调用，实现CPU的零参与，消除CPU在这方面的负载。<div align=center><img src="../../../../images/2020/1-4/Zero-Copy.png" algin="center"/></div><!-- more -->

# 零拷贝思想

零拷贝是一个通过尽量避免拷贝操作来缓解CPU压力的解决方案。Linux下常见的零拷贝技术可以分为两大类：一是针对特定场景，去掉不必要的拷贝；二是去优化整个拷贝的过程。零拷贝并没有真正做到“0”拷贝，它更多是一种思想，很多的零拷贝技术都是基于这个思想去做的优化。

# 原始数据拷贝

<div align=center><img src="../../../../images/2020/1-4/Traditional-copy.jpg" algin="center"/></div>

传统数据拷贝产生了四次数据拷贝，即使使用了`DMA(Direct Memory Access)`处理了硬件的通讯，CPU仍然需要处理两次数据拷贝。同时，CPU在用户态和内核态也发生了多次上下文切换，增加了CPU的负担。在此过程中，如果没有对数据做任何修改，那么在内核态和用户态间来回拷贝数据就是一种浪费。

# 零拷贝的几种方法

## 用户态直接IO

<div align=center><img src="../../../../images/2020/1-4/Direct-IO.jpg" algin="center"/></div>

对于这种数据传输方式来说，应用程序可以直接访问硬件存储，操作系统内核只是辅助数据传输。这种方式依旧存在用户空间和内核空间的上下文切换，但是硬件上的数据不会拷贝一份到内核空间，而是直接拷贝至了用户空间，因此直接I/O不存在内核空间缓冲区和用户空间缓冲区之间的数据拷贝。

### 缺陷

- 只能适用于那些不需要内核缓冲区处理的应用程序，这些应用程序通常在进程地址空间有自己的数据缓存机制，称为自缓存应用程序，如数据库管理系统。
- 这种方法直接操作磁盘I/O，由于CPU和磁盘I/O之间的执行时间差距，会造成资源的浪费，解决这个问题需要和异步I/O结合使用。

## mmap

这种方法，使用mmap来代替 read，可以减少一次拷贝操作。

```shell
buf = mmap(diskfd, len);
write(sockfd, buf, len);
```

<div align=center><img src="../../../../images/2020/1-4/mmap.jpg" algin="center"/></div>

### **过程**

1. 应用进程调用了mmap()之后，数据会先通过DMA拷贝到操作系统内核缓冲区中。接着应用进程跟操作系统**共享这个缓冲区**。这样，操作系统内核和应用进程空间就不需要再进行任何的数据拷贝操作。
2. 应用进程调用write()，操作系统直接将内核缓冲区的数据拷贝到Socket缓冲区中，这一切都发生在内核态。
3. Socket缓冲区把数据发到网卡。

### 缺陷

mmap隐藏着一个陷阱，当mmap一个文件时，如果这个文件被另一个进程所截获，那么write系统调用会因为访问非法地址被SIGBUS信号终止，SIGBUS 默认会杀死进程并产生一个coredump，如果服务器被这样终止了，那损失就可能不小了。

> 解决这个问题通常使用文件的租借锁：首先为文件申请一个租借锁，当其他进程想要截断这个文件时，内核会发送一个实时的RT_SIGNAL_LEASE信号，告诉当前进程有进程在试图破坏文件，这样write在被SIGBUS 杀死之前，会被中断，返回已经写入的字节数，并设置errno为success。
>
> 通常的做法是在 mmap 之前加锁，操作完之后解锁。

## sendfile

为了简化用户接口，同时减少CPU的拷贝次数，Linux 在版本 2.1 中引入了sendfile()系统调用。

<div align=center><img src="../../../../images/2020/1-4/sendfile-1.jpg" algin="center"/></div>

### 过程

1. sendfile()系统调用利用DMA引擎将文件中的数据拷贝到操作系统内核缓冲区中。
2. 然后数据被拷贝到与Socket相关的内核缓冲区中去。
3. 接下来，DMA引擎将数据从内核Socket缓冲区中拷贝到协议引擎中去。

sendfile() 系统调用不需要将数据拷贝或者映射到应用程序地址空间中去，所以sendfile()只是适用于应用程序地址空间不需要对所访问数据进行处理的情况。相对于mmap()方法来说，因为sendfile传输的数据没有越过用户应用程序/操作系统内核的边界线，所以sendfile()也极大地减少了存储管理的开销。

### 缺陷

- 只能适用于那些不需要用户态处理的应用程序。

## DMA辅助的sendfile

常规sendfile还有一次内核态的拷贝操作，使用DMA辅助的sendfile可以把这次拷贝操作消除。

<div align=center><img src="../../../../images/2020/1-4/sendfile-2.jpg" algin="center"/></div>

### 过程

1. 用户进程通过sendfile()函数向内核(kernel)发起系统调用，上下文从用户态(user space)切换为内核态(kernel space)；
2. CPU利用DMA控制器将数据从主存或硬盘拷贝到内核空间(kernel space)的读缓冲区(read buffer)；
3. CPU把读缓冲区(read buffer)的文件描述符(file descriptor)和数据长度拷贝到网络缓冲区(socket buffer)；
4. 基于已拷贝的文件描述符(file descriptor)和数据长度，CPU利用DMA控制器的gather/scatter操作直接批量地将数据从内核的读缓冲区(read buffer)拷贝到网卡进行数据传输；
5. 上下文从内核态(kernel space)切换回用户态(user space)，Sendfile系统调用执行返回；

这种方法借助硬件的帮助，在数据从内核缓冲区到Socket缓冲区这一步操作上，并不是拷贝数据，而是拷贝缓冲区描述符(fd)和数据长度。完成后，DMA引擎直接将数据从内核缓冲区拷贝到协议引擎中去，避免了最后一次拷贝。

### 缺陷

- 同样适用于那些不需要用户态处理的应用程序。还需要硬件以及驱动程序支持。
- 只适用于将数据从文件拷贝到套接字上。

## splice

splice去掉sendfile的使用范围限制，可以用于任意两个文件描述符中传输数据。

<div align=center><img src="../../../../images/2020/1-4/splice.jpg" algin="center"/></div>

### 过程

1. 用户进程通过splice()函数向内核(kernel)发起系统调用，上下文从用户态(user space)切换为内核态(kernel space)；
2. CPU利用DMA控制器将数据从主存或硬盘拷贝到内核空间(kernel space)的读缓冲区(read buffer)；
3. CPU在内核空间的读缓冲区(read buffer)和网络缓冲区(socket buffer)之间建立管道(pipeline)；
4. CPU利用DMA控制器将数据从网络缓冲区(socket buffer)拷贝到网卡进行数据传输；
5. 上下文从内核态(kernel space)切换回用户态(user space)，splice系统调用执行返回；

但是splice也有局限，它使用了Linux的管道缓冲机制，所以，它的两个文件描述符参数中至少有一个必须是管道设备。

### 缺陷

- 同样只适用于不需要用户态处理的程序。
- 传输描述符至少有一个是管道设备。

# Java应用

Java NIO的**FileChannel.transferFrom()、FileChannel.transferTo()**底层基于**sendfile/splice**，不仅可以进行网络文件传输，还可以对本地文件实现零拷贝操作。

<div align=center><img src="../../../../images/2020/1-4/java-nio.jpg" algin="center"/></div>