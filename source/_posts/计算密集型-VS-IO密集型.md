---
title: 计算密集型 VS IO密集型
date: 2018-05-17 18:56:06
tags: [java]
categories: technology
---

# 引言

　　在开发过程中，经常会遇到多线程的问题，解决多线程的其中一种方式就是利用线程池，其中需要开启线程的数量便成为了我们关注的焦点。JAVA中有两种并发类型：**计算密集型（CUP-bound）**和**IO密集型（I/O-bound）**。

<!-- more -->

# 计算密集型（CPU-bound）

　　计算密集型，顾名思义就是应用需要非常多的CPU计算资源，CPU大部份时间用来做计算、逻辑判断等CPU动作的程序称之CPU bound。在多核CPU时代，我们要让每一个CPU核心都参与计算，将CPU的性能充分利用起来，这样才算是没有浪费服务器配置，如果在非常好的服务器配置上还运行着单线程程序，那将是非常大的浪费。对于计算密集型的应用，完全是靠CPU的核数来工作，所以为了让它的优势完全发挥出来，避免过多的上下文切换，比较理性的方案是：

```java
线程数 = CPU核数 + 1
```

为什么是 +1？**因为即使当计算密集型的线程偶尔由于缺失故障或者其他原因而暂停时，这个额外的线程也能确保CPU的时钟周期不会被浪费。**

> 也可以设置成CPU核数 x 2，这还是要看JDK的使用版本，以及CPU配置(服务器的CPU有超线程)。对于JDK1.8来说，里面增加了一个并行计算，计算密集型的较理想线程数 = CPU内核线程数 x 2

以下是一个计算文件夹大小的例子：

```java
/**
 * 计算文件夹大小
 * ClassName: FileSizeCalc
 */
public class FileSizeCalc {

	static class SubDirsAndSize {
		public final long size;
		public final List<File> subDirs;

		public SubDirsAndSize(long size, List<File> subDirs) {
			this.size = size;
			this.subDirs = Collections.unmodifiableList(subDirs);
		}
	}

	private SubDirsAndSize getSubDirsAndSize(File file) {
		long total = 0;
		List<File> subDirs = new ArrayList<File>();
		if (file.isDirectory()) {
			File[] children = file.listFiles();
			if (children != null) {
				for (File child : children) {
					if (child.isFile())
						total += child.length();
					else
						subDirs.add(child);
				}
			}
		}
		return new SubDirsAndSize(total, subDirs);
	}

	private long getFileSize(File file) throws Exception {
		final int cpuCore = Runtime.getRuntime().availableProcessors();
		final int poolSize = cpuCore + 1;
		ExecutorService service = Executors.newFixedThreadPool(poolSize);
		long total = 0;
		List<File> directories = new ArrayList<File>();
		directories.add(file);
		SubDirsAndSize subDirsAndSize = null;
		try {
			while (!directories.isEmpty()) {
				List<Future<SubDirsAndSize>> partialResults = new ArrayList<Future<SubDirsAndSize>>();
				for (final File directory : directories) {
					partialResults.add(service.submit(new Callable<SubDirsAndSize>() {
						@Override
						public SubDirsAndSize call() throws Exception {
							return getSubDirsAndSize(directory);
						}
					}));
				}
				directories.clear();
				for (Future<SubDirsAndSize> partialResultFuture : partialResults) {
					subDirsAndSize = partialResultFuture.get(100, TimeUnit.SECONDS);
					total += subDirsAndSize.size;
					directories.addAll(subDirsAndSize.subDirs);
				}
			}
			return total;
		} finally {
			service.shutdown();
		}
	}

	public static void main(String[] args) throws Exception {
		for (int i = 0; i < 10; i++) {
			final long start = System.currentTimeMillis();
			long total = new FileSizeCalc().getFileSize(new File("D:/DevTools"));
			final long end = System.currentTimeMillis();
			System.out.format("文件夹大小: %dMB%n", total / (1024 * 1024));
			System.out.format("所用时间: %.3fs%n", (end - start) / 1.0e3);
		}
	}
}
```

执行结果如下：

```java
文件夹大小: 15987MB
所用时间: 2.005s
文件夹大小: 15987MB
所用时间: 1.879s
文件夹大小: 15987MB
所用时间: 2.142s
文件夹大小: 15987MB
所用时间: 2.089s
文件夹大小: 15987MB
所用时间: 1.996s
文件夹大小: 15987MB
所用时间: 2.258s
文件夹大小: 15987MB
所用时间: 2.198s
文件夹大小: 15987MB
所用时间: 1.968s
文件夹大小: 15987MB
所用时间: 2.105s
文件夹大小: 15987MB
所用时间: 2.071s
```

　　在上面的例子中，线程池设置为***CPU核心数  + 1***个，结果如上图。如果在这里把线程池加大，比如调到100，会发现所用的时间变多了。虽然增加的时间不是太多，但是对于CPU来说可是相当长的，因为CPU里面是以纳秒为计算单位，1毫秒=1000000纳秒。所以加大线程池会增加CPU上下文的切换成本，有时程序的优化就是从这些微小的地方积累起来的。

# I/O密集型（I/O-bound）

　　对于IO密集型的应用，就很好理解了，现在做的开发大部分都是WEB应用，涉及到大量的网络传输，不仅如此，**与数据库、缓存（网络、磁盘）间的交互也涉及到IO，这类任务的特点是CPU消耗很少，任务的大部分时间都在等待IO操作完成（因为IO的速度远远低于CPU和内存的速度）。一旦发生IO，线程就会处于等待状态，当IO结束，数据准备好后，线程才会继续执行。因此从这里可以发现，对于IO密集型的应用，可以多设置一些线程池中线程的数量，这样就能让在等待IO的这段时间内，线程可以去做其它事，提高并发处理效率。**
　　那么这个线程池的数据量是不是可以随便设置呢？当然不是的，一定要记得，线程上下文切换是有代价的。目前总结了一套公式，对于IO密集型应用：

```java
线程数 = CPU核心数/(1-阻塞系数)
```

　　这个阻塞系数一般为*0.8~0.9*之间，也可以取*0.8*或者*0.9*。套用公式，对于双核CPU来说，它比较理想的线程数就是20，当然这都不是绝对的，需要根据实际情况以及实际业务来调整。

```java
final int poolSize = (int) (cpuCore / (1 - 0.9));
```

[*浅谈Java两种并发类型——计算密集型与IO密集型*](http://www.blogjava.net/bolo/archive/2015/01/20/422296.html)