---
title: JAVA并发之锁
date: 2018-05-06 15:45:39
tags: [java]
categories: 后端
cover: ../../../../images/2018-5/JAVA%E2%80%94Lock/index.jpg
---

# 引言

锁作为并发共享数据，保证一致性的工具，数据库中有悲观锁、乐观锁等实现。在JAVA平台同样有多种实现(如 `synchronized`和`Lock`)。这些已经写好提供的锁为开发提供了便利，让我们有了更多的选择。<div align=center><img src="../../../../images/2018-5/JAVA%E2%80%94Lock/index.jpg"/></div><!-- more -->

# JAVA中锁分类

## 乐观/悲观锁

**乐观锁**：乐观锁则认为对于同一个数据的并发操作，是不会发生修改的。在更新数据的时候，会采用尝试更新，不断重新的方式更新数据，乐观的认为不加锁的并发操作是没有事情的。**适合读操作多的场景**。

乐观锁在JAVA中的使用，是无锁编程，Java中*java.util.concurrent.atomic*包下面的原子变量类就是使用了乐观锁的一种实现方式CAS(*CompareAndSwap*)实现的。

> CAS是乐观锁技术，当多个线程尝试使用CAS同时更新同一个变量时，只有其中一个线程能更新变量的值，而其它线程都失败，失败的线程并不会被挂起，而是被告知这次竞争中失败，并可以再次尝试。　　　
>
> CAS操作中包含三个操作数 —— **内存值(V)**、**旧的的预期原值(A)**和**拟写入的新值(B)**。如果内存值*V*的值与预期原值*A*相匹配，那么处理器会自动将该位置值更新为新值*B*，否则处理器不做任何操作。无论哪种情况，它都会在CAS指令之前返回该位置的值。(在CAS的一些特殊情况下将仅返回CAS是否成功，而不提取当前值)。CAS有效地说明了“我认为位置*V*应该包含值*A*；如果包含该值，则将*B*放到这个位置；否则，不要更改该值，只告诉我这个位置现在的值即可“。
>
> CAS缺点：ABA问题。

**悲观锁**：悲观锁认为对于同一个数据的并发操作，一定是会发生修改的，哪怕没有修改，也会认为修改。因此对于同一个数据的并发操作，悲观锁采取加锁的形式。悲观的认为，不加锁的并发操作一定会出问题。**适合写操作多的场景**。Java里面的同步语义`synchronized关键字的实现是悲观锁`。

## 可重入锁

可重入锁又名递归锁，是指在同一个线程在外层方法获取锁的时候，在进入内层方法会自动获取锁。JAVA中的**synchronized与ReentrantLock都是可重入锁**。可重入锁的一个好处是可一定程度避免死锁。

- 对于Java `ReentrantLock`而言, 他的名字就可以看出是一个可重入锁，其名字是`ReentrantLock`重新进入锁。
- 对于`synchronized`而言，也是一个可重入锁。

```java
synchronized void methodA() throws Exception{
    Thread.sleep(1000);
    methodB();
}

synchronized void methodB() throws Exception{
    Thread.sleep(1000);
}
```

上面的代码就是一个可重入锁的一个特点，如果不是可重入锁的话，*methodB*可能不会被当前线程执行，可能造成死锁。

## 独占/共享锁

**独占锁**：是指该锁一次只能被一个线程所持有。
**共享锁**：是指该锁可被多个线程所持有。

- 对于Java `ReentrantLock`而言，其是独占锁(互斥锁)。但是对于Lock的另一个实现类`ReadWriteLock`，其读锁是共享锁(读写锁)，其写锁是独占锁。
- 读锁的共享锁可保证并发读是非常高效的，读写，写读 ，写写的过程是互斥的。
- 独占锁与共享锁也是通过AQS(*AbstractQueuedSynchronizer*[*队列同步器*])来实现的，通过实现不同的方法，来实现独占或者共享。
- 对于`synchronized`而言，是独占锁。

## 分段锁

分段锁其实是一种锁的设计，并不是具体的一种锁，对于`ConcurrentHashMap`而言，其并发的实现就是通过分段锁的形式来实现高效的并发操作。

以`ConcurrentHashMap`来说一下分段锁的含义以及设计思想，`ConcurrentHashMap`中的分段锁称为*Segment*，它即类似于HashMap(JDK7与JDK8中HashMap的实现)的结构，即内部拥有一个Entry数组，数组中的每个元素又是一个链表；同时又是一个`ReentrantLock`(*Segment*继承了`ReentrantLock`)。
当需要*put*元素的时候，并不是对整个hashmap进行加锁，而是先通过hashcode来知道他要放在哪一个分段中，然后对这个分段进行加锁，所以当多线程*put*的时候，只要不是放在同一个分段中，就实现了真正的并行插入。
但是，在统计size的时候，就是获取hashmap全局信息的时候，就需要获取所有的分段锁才能统计。
**分段锁的设计目的是细化锁的粒度，当操作不需要更新整个数组的时候，就仅仅针对数组中的一项进行加锁操作**。

# synchronized锁

`synchronized`是Java的一个**关键字**，它能够将**代码块(方法)锁起来**，它是在软件层面依赖`JVM`实现同步。

- 它使用起来是非常简单的，只要在代码块(方法)添加关键字`synchronized`，即可以实现同步的功能。

```java
public synchronized void test() {
     // doSomething
}
```

`synchronized`是一种**互斥锁**。

- **一次只能允许一个线程进入被锁住的代码块**

`synchronized`是一种**内置锁/监视器锁**。

- Java中**每个对象**都有一个**内置锁(监视器,也可以理解成锁标记)**，而`synchronized`就是使用**对象的内置锁(监视器)**来将代码块(方法)锁定的。

## 用处

1. `synchronized`保证了线程的**原子性**。(被保护的代码块是一次被执行的，没有任何线程会同时访问)。
2. `synchronized`保证了**可见性**。(当执行完`synchronized`之后，修改后的变量对其他的线程是可见的)。

Java中的`synchronized`，通过使用内置锁，来实现对变量的同步操作，进而实现了**对变量操作的原子性和其他线程对变量的可见性**，从而确保了并发情况下的线程安全。

## 原理

下面是`synchronized`修饰方法和代码块的代码实例：

```java
public class Main {
	//修饰方法
    public synchronized void test1(){

    }

    public void test2(){
		// 修饰代码块
        synchronized (this){
		// dosomething
        }
    }
}
```

反编译结果如下图：

<div align=center><img src="../../../../images/2018-5/JAVA%E2%80%94Lock/sync.png"/></div>

- **同步代码块**：*monitorenter*和*monitorexit*指令实现的。
- **同步方法**（在这看不出来需要看JVM底层实现）：方法修饰符上的*ACC_SYNCHRONIZED*实现。

`synchronized`底层是是**通过monitor对象，对象有自己的对象头，存储了很多信息，其中一个信息标示是被哪个线程持有**。

## synchronized的使用

`synchronized`一般用来修饰三种东西：

- 修饰普通方法
- 修饰代码块
- 修饰静态方法

### 修饰普通方法

用的锁是**SyncTest对象(内置锁)**

```java
public class SyncTest {

    // 修饰普通方法，此时用的锁是SyncTest对象(内置锁)
    public synchronized void test() {
        // doSomething
    }
}
```

### 修饰代码块

用的锁是**SyncTest对象(内置锁) ** ---> this

```java
public class SyncTest {
    
    public void test() {
        // 修饰代码块，此时用的锁是SyncTest对象(内置锁)--->this
        synchronized (this){
            // doSomething
        }
    }
}
```

### 修饰静态方法

用的锁是**类锁**，锁的是SyncTest类。

```java
public class SyncTest {
    
    // 1.修饰代码块，此时用的锁是SyncTest类锁
    public static synchronized void test() {
        // doSomething
    }
  
  	// 2.修饰类的class
  	synchronized(SyncTest.class) {
        // doSomething
    }
}
```
## 类锁与对象锁

`synchronized`修饰静态方法获取的是**类锁**(类的字节码文件对象)，`synchronized`修饰普通方法或代码块获取的是**对象锁**。

一个锁的是类对象，一个锁的是实例对象。
若类对象被lock，则类对象的所有同步方法全被lock；
若实例对象被lock，则该实例对象的所有同步方法全被lock。

- *synchronized static*是某个类的范围，防止**多个线程中多个实例**同时访问这个类中的*synchronized static*方法。它可以对类的所有对象实例起作用。
- *synchronized*是某实例的范围，*synchronized*防止**多个线程中同一个实例**同时访问这个类的*synchronized* 方法。

它们互不冲突，也就是说：**获取了类锁的线程和获取了对象锁的线程是不冲突的。**

```java
public class SynchoronizedDemo {

	// synchronized修饰非静态方法
	public synchronized void function() throws InterruptedException {
		for (int i = 0; i < 3; i++) {
			Thread.sleep(1000);
			System.out.println("function running...");
		}
	}

	// synchronized修饰静态方法
	public static synchronized void staticFunction() throws InterruptedException {
		for (int i = 0; i < 3; i++) {
			Thread.sleep(1000);
			System.out.println("Static function running...");
		}
	}

	public static void main(String[] args) {
		final SynchoronizedDemo demo = new SynchoronizedDemo();

		// 创建线程执行静态方法
		Thread t1 = new Thread(() -> {
			try {
				staticFunction();
			} catch (InterruptedException e) {
				e.printStackTrace();
			}
		});

		// 创建线程执行实例方法
		Thread t2 = new Thread(() -> {
			try {
				demo.function();
			} catch (InterruptedException e) {
				e.printStackTrace();
			}
		});
		// 启动
		t1.start();
		t2.start();
	}
}
```

结果证明：**类锁和对象锁是不会冲突的**！

<div align=center><img width="900" height="200" src="../../../../images/2018-5/JAVA%E2%80%94Lock/console.png"/>

</div>

## 重入锁

```java
public class Widget {
	// 加锁
	public synchronized void doSomething() {
		...
	}
}

public class LoggingWidget extends Widget {

	// 加锁
	public synchronized void doSomething() {
		System.out.println(toString() + ": calling doSomething");
		super.doSomething();
	}
}
```

1. 当线程A进入到*LoggingWidget*的`doSomething()`方法时，**此时拿到了LoggingWidget实例对象的锁**。
2. 随后在方法上又调用了父类*Widget*的`doSomething()`方法，它**又是被synchronized修饰**。
3. 那现在我们*LoggingWidget*实例对象的锁还没有释放，进入父类Widget的`doSomething()`方法**还需要一把锁吗？**

**不需要的！**

因为**锁的持有者是“线程”，而不是“调用”**。线程A已经是有了*LoggingWidget*实例对象的锁了，当再需要的时候可以继续**“开锁”**进去的！

这就是内置锁的**可重入性**。

## 释放锁的时机

1. 当方法(代码块)执行完毕后会**自动释放锁**，不需要做任何的操作。
2. **当一个线程执行的代码出现异常时，其所持有的锁会自动释放**。

不会由于异常导致出现死锁现象。

# Lock显式锁

## 简单介绍

Lock显式锁是JDK1.5之后才有的，之前都是使用`synchronized`锁来使线程安全的。

Lock显式锁是一个接口

<div align=center><img width="600" height="200" src="../../../../images/2018-5/JAVA%E2%80%94Lock/lock_1.png"/>

</div>

<div align=center><img width="900" height="1500" src="../../../../images/2018-5/JAVA%E2%80%94Lock/lock_2.png"/></div>

- Lock方式来获取锁**支持中断、超时不获取、是非阻塞的。**
- **提高了语义化**，哪里加锁，哪里解锁都得写出来。
- **Lock显式锁可以给我们带来很好的灵活性，但同时必须手动释放锁**。
- 支持Condition条件对象。
- **允许多个读线程同时访问共享资源**。

## 常用方式

Lock接口，它提供了比`synchronized`更加广泛的锁定操作。Lock接口有3个实现它的类：*ReentrantLock*、*ReetrantReadWriteLock.ReadLock*和*ReetrantReadWriteLock.WriteLock*，即重入锁、读锁和写锁。

lock必须被显式地创建、锁定和释放，为了可以使用更多的功能，一般用`ReentrantLock`为其实例化。**为了保证锁最终一定会被释放(可能会有异常发生)，要把互斥区放在try语句块内，并在finally语句块中释放锁，尤其当有return语句时，return语句必须放在try字句中，以确保unlock()不会过早发生，从而将数据暴露给第二个任务。**因此，采用lock加锁和释放锁的一般形式如下：

```java
// 默认使用非公平锁，如果要使用公平锁，需要传入参数true  
Lock lock = new ReentrantLock();
........  
lock.lock();  
try {  
     // 更新对象的状态  
     // 捕获异常，必要时恢复到原来的不变约束  
     // 如果有return语句，放在这里  
}finally {
     // 锁必须在finally块中释放
     lock.unlock();
}
```

## 实现策略

Lock基于冲突检测的**乐观并发策略**，如果没有其他线程争用共享数据，那操作就成功了，如果共享数据被争用，产生了冲突，那就再进行其他的补偿措施(最常见的补偿措施就是不断地重试，直到试成功为止)，这种乐观并发策略的许多实现都不需要把线程挂起，因此这种同步被称为`非阻塞同步`。**ReetrantLock采用的便是这种并发策略。**

在乐观的并发策略中，需要操作和冲突检测这两个步骤具备原子性，它靠**硬件指令来保证**，这里用的是CAS操作(*Compare and Swap*)。JDK1.5之后，Java程序才可以使用CAS操作。进一步研究`ReentrantLock`的源代码，会发现其中比较重要的获得锁的一个方法是*compareAndSetState*，这里其实就是调用的CPU提供的特殊指令。现代的CPU提供了指令，可以自动更新共享数据，而且能够检测到其他线程的干扰，而`compareAndSet()`就用这些代替了锁定。这个算法称作非阻塞算法，意思是一个线程的失败或者挂起不应该影响其他线程的失败或挂起。

Java 5中引入了注入*AutomicInteger、AutomicLong、AutomicReference*等特殊的原子性变量类，它们提供的如：`compareAndSet()`、`incrementAndSet()`和`getAndIncrement()`等方法都使用了CAS操作。因此，它们都是由硬件指令来保证的原子方法。

# ReetrankLock与synchronized比较

## 性能比较

在JDK1.5中，`synchronized`是性能低效的。因为这是一个重量级操作，它对性能最大的影响是阻塞的是实现，挂起线程和恢复线程的操作都需要转入内核态中完成，这些操作给系统的并发性带来了很大的压力。相比之下使用Java提供的Lock对象，性能更高一些。

到了JDK1.6，对`synchronize`加入了很多优化措施，有自适应自旋、锁消除、锁粗化、轻量级锁、偏向锁等等。

在JDK1.8以后，对`synchronized`性能进行了优化，使其和`ReentrantLock`的性能相差不多。所以还是提倡在`synchronized`能实现需求的情况下，**优先考虑使用`synchronized`来进行同步**。

## 实现策略

`synchronized`采用的是互斥同步，因而这种同步又称为阻塞同步，它属于一种**悲观的并发策略**，即线程获得的是**独占锁**。独占锁意味着其他线程只能依靠阻塞来等待线程释放锁，`synchronized`是托管给JVM执行的。而在CPU转换线程阻塞时会引起线程上下文切换，当有很多线程竞争锁的时候，会引起CPU频繁的上下文切换导致效率很低。

`Lock`基于乐观的并发策略，是Java写的控制锁的代码，基于CAS硬件指令保证。

## 用途

基本语法上，`ReentrantLock`与`synchronized`很相似，它们都具备一样的线程重入特性，只是代码写法上有点区别而已，一个表现为**API层面的互斥锁**(lock和unlock方法配合try/finally语句块来完成)，一个表现为**原生语法层面的互斥锁(**`synchronized`)。`ReentrantLock`相对`synchronized`而言还是增加了一些高级功能，主要有以下三项：

### 等待可中断

当持有锁的线程长期不释放锁时，正在等待的线程可以选择放弃等待，改为处理其他事情，它对处理执行时间非常长的同步块很有帮助。而在等待由`synchronized`产生的互斥锁时，会一直阻塞，是不能被中断的。

```java
ReentrantLock lock = new ReentrantLock();  
...........  
lock.lockInterruptibly();//获取响应中断锁  
try {  
      // 更新对象的状态  
      // 捕获异常，必要时恢复到原来的不变约束  
      // 如果有return语句，放在这里  
}finally{  
	// 锁必须在finally块中释放
    lock.unlock();  
}  
```

### 可实现公平锁

多个线程在等待同一个锁时，必须按照申请锁的时间顺序排队等待，而非公平锁则不保证这点，在锁释放时，任何一个等待锁的线程都有机会获得锁。`synchronized`中的锁时非公平锁，**ReentrantLock默认情况下也是非公平锁**，但可以通过构造方法`ReentrantLock(ture)`来要求使用公平锁，公平锁会来带一些性能的消耗。

### 锁绑定多个条件

`ReentrantLock`对象可以同时绑定多个*Condition*对象(条件变量或条件队列)，而在`synchronized`中，锁对象的*wait()*和*notify()*或*notifyAll()*方法可以实现一个隐含条件，但如果要和多于一个的条件关联的时候，就不得不额外地添加一个锁，而`ReentrantLock`则无需这么做，只需要多次调用*newCondition()*方法即可。还可以通过绑定*Condition*对象来判断当前线程通知的是哪些线程(即与*Condition*对象绑定在一起的其他线程)。

## 读写锁

`synchronized`获取的互斥锁不仅互斥读写操作、写写操作，还互斥读读操作，而读读操作是不会带来数据竞争的，因此对对读读操作也互斥的话，会降低性能。Java5中提供了读写锁，它将读锁和写锁分离，使得读读操作不互斥，获取读锁和写锁的一般形式如下：

```java
ReadWriteLock rwl = new ReentrantReadWriteLock();      
rwl.writeLock().lock()  //获取写锁  
rwl.readLock().lock()   //获取读锁  
```

用读锁来锁定读操作，用写锁来锁定写操作，这样写操作和写操作之间会互斥，读操作和写操作之间会互斥，但读操作和读操作就不会互斥。

# 最后

介绍了`synchronized`内置锁和`Lock`显式锁，总得来说：

- **synchronized好用，简单，性能不差**
- 没有使用到Lock显式锁的特性就不要使用Lock锁了。

# 参考

[*Java锁机制了解一下*](https://juejin.im/post/5adf14dcf265da0b7b358d58)