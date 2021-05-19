---
title: 线程池之ThreadPoolExecutor
date: 2018-03-17 14:09:10
tags: [java, tips]
categories: 后端
cover: ../../../../images//2018-3/threadpoolexcetor/threadpoolexecutor.png
---

# 引言

JAVA对于多线程的封装非常丰富，提供了多种适用于不同场景的多并发实现。但如果并发的线程数量很多，并且每个线程都是执行一个时间很短的任务就结束了，这样频繁创建线程就会大大降低系统的效率，因为频繁创建线程和销毁线程需要时间。这里就引入了线程池来管理线程，其中最基础、最核心的线程池要属ThreadPoolExecutor类了。<div align=center><img src="../../../../images//2018-3/threadpoolexcetor/threadpoolexecutor.png" algin="center"/></div>

# Java中的ThreadPoolExecutor类

java.uitl.concurrent.ThreadPoolExecutor类是线程池中最核心的一个类，因此如果要透彻地了解Java中的线程池，必须先了解这个类。下面我们来看一下ThreadPoolExecutor类的具体实现源码。

在ThreadPoolExecutor类中提供了四个构造方法：

```java
public class ThreadPoolExecutor extends AbstractExecutorService {
   .....
   public ThreadPoolExecutor(int corePoolSize,int maximumPoolSize,long keepAliveTime,TimeUnit unit,
           BlockingQueue<Runnable> workQueue);

   public ThreadPoolExecutor(int corePoolSize,int maximumPoolSize,long keepAliveTime,TimeUnit unit,
           BlockingQueue<Runnable> workQueue,ThreadFactory threadFactory);

   public ThreadPoolExecutor(int corePoolSize,int maximumPoolSize,long keepAliveTime,TimeUnit unit,
           BlockingQueue<Runnable> workQueue,RejectedExecutionHandler handler);

   public ThreadPoolExecutor(int corePoolSize,int maximumPoolSize,long keepAliveTime,TimeUnit unit,
       BlockingQueue<Runnable> workQueue,ThreadFactory threadFactory,RejectedExecutionHandler handler);
   ...
}
//corePoolSize： 线程池维护线程的最少数量  
//maximumPoolSize：线程池维护线程的最大数量  
//keepAliveTime： 线程池维护线程所允许的空闲时间  
//unit： 线程池维护线程所允许的空闲时间的单位  
//workQueue： 线程池所使用的缓冲队列  
//handler： 线程池对拒绝任务的处理策略 
```

从上面的代码可以得知，ThreadPoolExecutor继承了AbstractExecutorService类，并提供了四个构造器，事实上，通过观察每个构造器的源码具体实现，发现前面三个构造器都是调用的第四个构造器进行的初始化工作。

- **corePoolSize**：核心池的大小。在创建了线程池后，默认情况下，线程池中并没有任何线程，而是等待有任务到来才创建线程去执行任务，除非调用了prestartAllCoreThreads()或者prestartCoreThread()方法，从这2个方法的名字就可以看出，是预创建线程的意思，即在没有任务到来之前就创建corePoolSize个线程或者一个线程。默认情况下，在创建了线程池后，线程池中的线程数为0，当有任务来之后，就会创建一个线程去执行任务，当线程池中的线程数目达到corePoolSize后，就会把到达的任务放到缓存队列当中；

- **maximumPoolSize**：线程池最大线程数，它表示在线程池中最多能创建多少个线程；

- **keepAliveTime**：表示线程没有任务执行时最多保持多久时间会终止。默认情况下，只有当线程池中的线程数大于corePoolSize时，keepAliveTime才会起作用，直到线程池中的线程数不大于corePoolSize，即当线程池中的线程数大于corePoolSize时，如果一个线程空闲的时间达到keepAliveTime，则会终止，直到线程池中的线程数不超过corePoolSize。但是如果调用了allowCoreThreadTimeOut(boolean)方法，在线程池中的线程数不大于corePoolSize时，keepAliveTime参数也会起作用，直到线程池中的线程数为0；

- **unit**：参数keepAliveTime的时间单位，有7种取值，在TimeUnit类中有7种静态属性：

  ```java
  TimeUnit.DAYS;              //天
  TimeUnit.HOURS;             //小时
  TimeUnit.MINUTES;           //分钟
  TimeUnit.SECONDS;           //秒
  TimeUnit.MILLISECONDS;      //毫秒
  TimeUnit.MICROSECONDS;      //微妙
  TimeUnit.NANOSECONDS;       //纳秒
  ```

- **workQueue**：一个阻塞队列，用来存储等待执行的任务，这个参数的选择也很重要，会对线程池的运行过程产生重大影响，一般来说，这里的阻塞队列有以下几种选择：

  ```java
  ArrayBlockingQueue;
  LinkedBlockingQueue;
  SynchronousQueue;
  ```

  ArrayBlockingQueue和PriorityBlockingQueue使用较少，一般使用LinkedBlockingQueue和Synchronous。线程池的排队策略与BlockingQueue有关。

- **threadFactory**：线程工厂，主要用来创建线程；

- **handler**：表示当拒绝处理任务时的策略，有以下四种取值：

  ```java
  ThreadPoolExecutor.AbortPolicy: 缺省。丢弃任务并抛出RejectedExecutionException异常。 
  ThreadPoolExecutor.DiscardPolicy：丢弃任务，但是不抛出异常。 
  ThreadPoolExecutor.DiscardOldestPolicy：丢弃任务队列中最旧任务，然后重新尝试执行任务（重复此过程）
  ThreadPoolExecutor.CallerRunsPolicy：由调用线程处理该任务 
  ```

<div align=center><img src="../../../../images//2018-3/threadpoolexcetor/inherit.png" algin="center"/></div>

由图中我们可得知ThreadPoolExecutor继承了AbstractExecutorService，AbstractExecutorService是一个抽象类，它实现了ExecutorService接口，而ExecutorService又是继承了Executor接口。

# 线程池实现原理

## 线程池状态

在ThreadPoolExecutor中定义了几个static final变量表示线程池的各个状态：

```java
private final AtomicInteger ctl = new AtomicInteger(ctlOf(RUNNING, 0));
private static final int COUNT_BITS = Integer.SIZE - 3;
private static final int CAPACITY   = (1 << COUNT_BITS) - 1;

 * RUNNING -> SHUTDOWN
     *    On invocation of shutdown(), perhaps implicitly in finalize()
     * (RUNNING or SHUTDOWN) -> STOP
     *    On invocation of shutdownNow()
     * SHUTDOWN -> TIDYING
     *    When both queue and pool are empty
     * STOP -> TIDYING
     *    When pool is empty
     * TIDYING -> TERMINATED
     *    When the terminated() hook method has completed
     **/
private static final int RUNNING    = -1 << COUNT_BITS;
private static final int SHUTDOWN   =  0 << COUNT_BITS;
private static final int STOP       =  1 << COUNT_BITS;
private static final int TIDYING    =  2 << COUNT_BITS;
private static final int TERMINATED =  3 << COUNT_BITS;
```

下面的几个static final变量表示runState可能的几个取值。

1. **RUNNING**：允许接收新任务并且处理队列中的任务。
2. **SHUTDOWN**：不再接收新的任务，仅消化完队列中的任务。
3. **STOP**：不仅不再接收新的任务，连队列中的任务都不再消化处理了，并且尝试中断正在执行任务的线程。
4. **TIDYING**：所有任务被终止了，工作线程数`workCount`也被设为0，线程的状态也被设为**TIDYING**，并开始调用钩子函数terminated()。
5. **TERMINATED**：钩子函数`terminated()`执行完毕。

<div align=center><img src="../../../../images/2018-3/threadpoolexcetor/status.png" algin="center"/></div>

## 任务的执行

```java
private final BlockingQueue<Runnable> workQueue;              //任务缓存队列，用来存放等待执行的任务
private final ReentrantLock mainLock = new ReentrantLock();   //线程池的主要状态锁，对线程池状态（比如线程池大小/runState等）的改变都要使用这个锁
private final HashSet<Worker> workers = new HashSet<Worker>();  //用来存放工作集

private volatile long keepAliveTime;    //线程存活时间   
private volatile boolean allowCoreThreadTimeOut;   //是否允许为核心线程设置存活时间
private volatile int corePoolSize;     //核心池的大小（即线程池中的线程数目大于这个参数时，提交的任务会被放进任务缓存队列）
private volatile int maximumPoolSize;   //线程池最大能容忍的线程数

private volatile int poolSize;       //线程池中当前的线程数

private volatile RejectedExecutionHandler handler; //任务拒绝策略

private volatile ThreadFactory threadFactory;   //线程工厂，用来创建线程

private int largestPoolSize;   //用来记录线程池中曾经出现过的最大线程数

private long completedTaskCount;   //用来记录已经执行完毕的任务个数
```

每个变量的作用都已经标明出来了，这里要重点解释一下*corePoolSize*、*maximumPoolSize*、*largestPoolSize*三个变量。

1. 如果当前线程池中的线程数目小于corePoolSize，则每来一个任务，就会创建一个线程去执行这个任务；
2. 如果当前线程池中的线程数目>=corePoolSize，则每来一个任务，会尝试将其添加到任务缓存队列当中，若添加成功，则该任务会等待空闲线程将其取出去执行；若添加失败（一般来说是任务缓存队列已满），则会尝试创建新的线程去执行这个任务；
3. 如果当前线程池中的线程数目达到maximumPoolSize，则会采取任务拒绝策略进行处理；
4. 如果线程池中的线程数量大于 corePoolSize时，如果某线程空闲时间超过keepAliveTime，线程将被终止，直至线程池中的线程数目不大于corePoolSize；如果允许为核心池中的线程设置存活时间，那么核心池中的线程空闲时间超过keepAliveTime，线程也会被终止。

## 任务缓存及排队策略

在前面我们多次提到了任务缓存队列，即workQueue，它用来存放等待执行的任务。workQueue的类型为BlockingQueue`<Runnable>`，通常可以取下面三种类型：

1）**ArrayBlockingQueue**：`有界队列`，有助于防止资源耗尽，但是可能较难调整和控制。队列大小和最大池大小可能需要相互折衷：使用大型队列和小型池可以最大限度地降低 CPU 使用率、操作系统资源和上下文切换开销，但是可能导致人工降低吞吐量。如果任务频繁阻塞（例如，如果它们是 I/O 边界），则系统可能为超过许可的更多线程安排时间。使用小型队列通常要求较大的池大小，CPU 使用率较高，但是可能遇到不可接受的调度开销，这样也会降低吞吐量。

2）**LinkedBlockingQueue**：`无界队列`，将导致在所有 corePoolSize 线程都忙时新任务在队列中等待。这样，创建的线程就不会超过 corePoolSize。（因此，maximumPoolSize 的值也就无效了。）当每个任务完全独立于其他任务，即任务执行互不影响时，适合于使用无界队列；例如，在 Web 页服务器中。这种排队可用于处理瞬态突发请求，当命令以超过队列所能处理的平均数连续到达时，此策略允许无界线程具有增长的可能性。

3）**SynchronousQueue**：工作队列的`默认选项是 SynchronousQueue`，它将任务直接提交给线程而不保持它们。在此，如果不存在可用于立即运行任务的线程，则试图把任务加入队列将失败，因此会构造一个新的线程。此策略可以避免在处理可能具有内部依赖性的请求集时出现锁。直接提交通常要求无界 maximumPoolSizes 以避免拒绝新提交的任务。当命令以超过队列所能处理的平均数连续到达时，此策略允许无界线程具有增长的可能性。

## 任务拒绝策略

当线程池的任务缓存队列已满并且线程池中的线程数目达到maximumPoolSize，如果还有任务到来就会采取任务拒绝策略，通常有以下四种策略：

```java
ThreadPoolExecutor.AbortPolicy:			丢弃任务并抛出RejectedExecutionException异常。
ThreadPoolExecutor.DiscardPolicy：   	也是丢弃任务，但是不抛出异常。
ThreadPoolExecutor.DiscardOldestPolicy： 丢弃队列最前面的任务，然后重新尝试执行任务（重复此过程）
ThreadPoolExecutor.CallerRunsPolicy：	由调用线程处理该任务
```

## 线程池的关闭

ThreadPoolExecutor提供了两个方法，用于线程池的关闭，分别是shutdown()和shutdownNow()：

- shutdown()：不会立即终止线程池，而是要等所有任务缓存队列中的任务都执行完后才终止，但再也不会接受新的任务。
- shutdownNow()：立即终止线程池，并尝试打断正在执行的任务，并且清空任务缓存队列，返回尚未执行的任务。

## 线程池容量的动态调整

ThreadPoolExecutor提供了动态调整线程池容量大小的方法：setCorePoolSize()和setMaximumPoolSize()：

- <div align=center><img src="../../../../images/2018-3/Mybatis/ehcachecache.png" algin="center"/></div>
- setMaximumPoolSize：设置线程池最大能创建的线程数目大小。

# 使用Executors创建线程池

Executors提供的工厂方法，可以创建以下四种类型线程池：

- **newFixedThreadPool：**该方法将用于创建一个固定大小的线程池（此时corePoolSize = maxPoolSize），每提交一个任务就创建一个线程池，直到线程池达到最大数量，线程池的规模在此后不会发生任何变化；



- **newCachedThreadPool：**该方法创建了一个可缓存的线程池，（此时corePoolSize = 0，maxPoolSize = Integer.MAX_VALUE），空闲线程超过60秒就会被自动回收，该线程池存在的风险是，如果服务器应用达到请求高峰期时，会不断创建新的线程，直到内存耗尽；



- **newSingleThreadExecutor：**该方法创建了一个单线程的线程池，该线程池按照任务在队列中的顺序串行执行（如：**FIFO**、**LIFO**、优先级）；



- **newScheduledThreadPool：**该方法创建了一个固定长度的线程池，可以以延迟或者定时的方式执行任务；


# 实例

```java
public class Test {
	public static void main(String[] args) {
		ThreadFactory factory = new ThreadFactoryBuilder().setNameFormat("test").build();
		ThreadPoolExecutor executor = new ThreadPoolExecutor(2, 5, 200, TimeUnit.MILLISECONDS,
				new LinkedBlockingQueue<Runnable>(5),factory,new ThreadPoolExecutor.CallerRunsPolicy());

		for (int i = 1; i <= 10; i++) {
			MyTask myTask = new MyTask(i);
			executor.execute(myTask);
			System.out.println("线程池中线程数目：" + executor.getPoolSize() + "，队列中等待执行的任务数目：" + executor.getQueue().size()
					+ "，已执行玩别的任务数目：" + executor.getCompletedTaskCount());
		}
		executor.shutdown();
	}
}

class MyTask implements Runnable {
	private int taskNum;

	public MyTask(int num) {
		this.taskNum = num;
	}

	@Override
	public void run() {
		System.out.println("正在执行task " + taskNum);
		try {
			Thread.currentThread().sleep(2000);
		} catch (InterruptedException e) {
			e.printStackTrace();
		}
		System.out.println("task " + taskNum + "执行完毕");
	}
}
```

执行结果：

<div align=center><img src="../../../../images//2018-3/threadpoolexcetor/result.png" algin="center"/></div>

## 合理配置线程池大小

一般需要根据任务的类型来配置线程池大小：

- 如果是**CPU密集型任务**，就需要尽量压榨CPU，参考值可以设为 ***N*CPU+1**

- 如果是**IO密集型任务**，参考值可以设置为2**N*CPU


这只是一个参考值，具体的设置还需要根据实际情况进行调整，比如可以先将线程池大小设置为参考值，再观察任务运行情况和系统负载、资源利用率来进行适当调整。

## 参考

[***Java并发编程：线程池的使用***](http://mp.weixin.qq.com/s?__biz=MzIwMTY0NDU3Nw==&mid=2651935366&idx=1&sn=ee82f1deb13192c5f1a20721a0c1abbe&chksm=8d0f3dc8ba78b4de93a26cdb6eea3b3804149a7fe88e9e8114757b0aa2cd39a67ad10e6f42ee&mpshare=1&scene=1&srcid=0317Fqotu8V4wTWmJ07lgTbS#rd)