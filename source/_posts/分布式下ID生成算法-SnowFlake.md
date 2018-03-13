---
title: 分布式下ID生成算法 SnowFlake
date: 2017-10-30 14:26:21
tags: [java,mysql]
categories: technology
---

# 引言

在做系统开发时，系统唯一ID是我们在设计一个系统的时候经常遇到的问题，也常常为这个问题纠结。生成ID的方法有很多，适应不同的场景、需求及性能要求。所以有些比较复杂的系统会有多个ID生成策略。在这里总结一下常用到的ID生成策略。<div align=center><img width="700" height="300" src="http://on937g0jc.bkt.clouddn.com/2017-9-21/%E8%87%AA%E5%A2%9EID/index.png" algin="center"/></div><!-- more -->

# 数据库自增长序列或字段

最常见的方式，利用数据库，全表中唯一。如MySQL的`AUTO_INCREMENT`。

## 优点

1. 简单，代码方便，性能可以接受。
2. 数字ID天然排序，对分页或者需要排序的结果很有帮助。

## 缺点

1. 不同数据库语法和实现不同，数据库迁移的时候或多数据库版本支持的时候需要处理。
2. 在单个数据库或读写分离或一主多从的情况下，只有一个主库可以生成。有单点故障的风险。
3. 在性能达不到要求的情况下，比较难于扩展。
4. 如果遇见多个系统需要合并或者涉及到数据迁移会相当痛苦。
5. 分表分库的时候会有麻烦。

## 优化方案

针对主库单点，如果有多个Master库，则每个Master库设置的起始数字不一样，步长一样，可以是Master的个数。比如：Master1 生成的是 1, 4, 7, 10，Master2生成的是2, 5, 8, 11，Master3生成的是3, 6, 9, 12。这样就可以有效生成集群中的唯一ID，也可以大大降低ID生成数据库操作的负载。

# UUID

常见的方式。可以利用数据库也可以利用程序生成，一般来说全球唯一。

## 优点

1. 简单，代码方便。
2. 生成ID性能非常好，基本不会有性能问题。
3. 全球唯一，在遇见数据迁移，系统数据合并，或者数据库变更等情况下，可以从容应对。

## 缺点

1. 没有排序，无法保证趋势递增。
2. UUID往往是使用字符串存储，查询的效率比较低。
3. 存储空间比较大，如果是海量数据库，就需要考虑存储量的问题。
4. 传输数据量大。
5. 不可读。

# Twitter-SnowFlake算法

有些时候我们希望能使用简单一些的 ID，并且希望 ID 能够按照时间有序生成，为了解决这个问题，Twitter 发明了 [*SnowFlake*](https://github.com/twitter/snowflake) 算法，不依赖第三方介质例如 Redis、数据库，本地生成程序生成分布式自增 ID，这个 ID 只能保证在工作组中的机器生成的 ID 唯一，不能像 UUID 那样保证时空唯一。

## 算法原理

<div align=center><img width="700" height="300" src="http://on937g0jc.bkt.clouddn.com/2017-9-21/%E8%87%AA%E5%A2%9EID/snowflake.png" algin="center"/>

</div>

除了最高位bit标记为不可用以外，其余三组bit占位均可浮动，看具体的业务需求而定。默认情况下41bit的时间戳可以支持该算法使用到2082年，10bit的工作机器id可以支持1023台机器，序列号支持1毫秒产生4095个自增序列id。

### SnowFlake – 时间戳

这里时间戳的细度是**毫秒级**，建议使用64位linux系统机器，因为有vdso，gettimeofday()在用户态就可以完成操作，减少了进入内核态的损耗。

### SnowFake – 工作机器ID

严格意义上来说这个bit段的使用可以是**进程级**，机器级的话你可以使用MAC地址来唯一标示工作机器，工作进程级可以使用IP+Path来区分工作进程。如果工作机器比较少，可以使用配置文件来设置这个id是一个不错的选择，如果机器过多配置文件的维护是一个灾难性的事情。

### SnowFlake – 序列号

序列号就是一系列的自增id（多线程建议使用atomic），为了处理在同一毫秒内需要给多条消息分配id，若同一毫秒把序列号用完了，则 “等待至下一毫秒”。

## 具体实现

### Sequence类

```java
/**
 * Snowflake 生成的 64 位 long 类型的 ID，结构如下:<br>
 * 0 - 0000000000 0000000000 0000000000 0000000000 0 - 00000 - 00000 - 000000000000 <br>
 * 1) 01 位标识，由于 long 在 Java 中是有符号的，最高位是符号位，正数是 0，负数是 1，ID 一般使用正数，所以最高位是 0<br>
 * 2) 41 位时间截(毫秒级)，注意，41 位时间截不是存储当前时间的时间截，而是存储时间截的差值(当前时间 - 开始时间)得到的值，
 *       开始时间截，一般是业务开始的时间，由我们程序来指定，如 SnowflakeIdWorker 中的 startTimestamp 属性。
 * 41 位的时间截，可以使用 70 年: (2^41)/(1000*60*60*24*365) = 69.7 年<br>
 * 3) 10 位的数据机器位，可以部署在 1024 个节点，包括 5 位 datacenterId 和 5 位 workerId<br>
 * 4) 12 位序列，毫秒内的计数，12 位的计数顺序号支持每个节点每毫秒(同一机器，同一时间截)产生 4096 个 ID 序号<br>
 *
 * SnowFlake 的优点是，整体上按照时间自增排序，并且整个分布式系统内不会产生 ID 碰撞(由数据中心 ID 和机器 ID 作区分)，并且效率较   高，经测试，SnowFlake 每秒能够产生约 26 万个 ID。
 */
public class Sequence {
	
	/** 开始时间截 */
	private final long twepoch = 1288834974657L;
	/** 机器id所占的位数 */
	private final long workerIdBits = 5L;
	/** 数据标识id所占的位数 */
	private final long datacenterIdBits = 5L;
	/** 支持的最大机器id，结果是31 (这个移位算法可以很快的计算出几位二进制数所能表示的最大十进制数) */
	private final long maxWorkerId = -1L ^ (-1L << workerIdBits);
	/** 支持的最大数据标识id，结果是31 */
	private final long maxDatacenterId = -1L ^ (-1L << datacenterIdBits);
	/** 序列在id中占的位数 */
	private final long sequenceBits = 12L;
	/** 机器ID向左移12位 */
	private final long workerIdShift = sequenceBits;
	/** 数据标识id向左移17位(12+5) */
	private final long datacenterIdShift = sequenceBits + workerIdBits;
	/** 时间截向左移22位(5+5+12) */
	private final long timestampLeftShift = sequenceBits + workerIdBits + datacenterIdBits;
	/** 生成序列的掩码，这里为4095 (0b111111111111=0xfff=4095) */
	private final long sequenceMask = -1L ^ (-1L << sequenceBits);

	/** 工作机器ID(0~31) */
	private long workerId;
	/** 数据中心ID(0~31) */
	private long datacenterId;
	/** 毫秒内序列(0~4095) */
	private long sequence = 0L;
	/** 上次生成ID的时间截 */
	private long lastTimestamp = -1L;


	public Sequence() {
		datacenterId = getDatacenterId(maxDatacenterId);
		workerId = getMaxWorkerId(datacenterId, maxWorkerId);
    }
	
	public Sequence(long workerId, long datacenterId) {
		if (workerId > maxWorkerId || workerId < 0) {
			throw new IllegalArgumentException(String.format("worker Id can't be greater than %d or less than 0", maxWorkerId));
		}
		
		if (datacenterId > maxDatacenterId || datacenterId < 0) {
			throw new IllegalArgumentException(String.format("datacenter Id can't be greater than %d or less than 0", maxDatacenterId));
		}
		
		this.workerId = workerId;
		this.datacenterId = datacenterId;
	}
	

	/**
	 * 获取 maxWorkerId
	 * @param datacenterId	 数据中心id
	 * @param maxWorkerId	 机器id
	 * @return	maxWorkerId
	 */
	protected static long getMaxWorkerId(long datacenterId, long maxWorkerId) {
		StringBuilder mpid = new StringBuilder();
		mpid.append(datacenterId);
		String name = ManagementFactory.getRuntimeMXBean().getName();
		if (name != null && !"".equals(name)) {
			// GET jvmPid
			mpid.append(name.split("@")[0]);
		}
		//MAC + PID 的 hashcode 获取16个低位
		return (mpid.toString().hashCode() & 0xffff) % (maxWorkerId + 1);
	}

	/**
	 * <p>
     * 数据标识id部分
     * </p>
	 * @param maxDatacenterId
	 * @return 
	 */
	protected static long getDatacenterId(long maxDatacenterId) {
		long id = 0L;
		try {
			InetAddress ip = InetAddress.getLocalHost();
			NetworkInterface network = NetworkInterface.getByInetAddress(ip);
			if (network == null) {
				id = 1L;
			} else {
				byte[] mac = network.getHardwareAddress();
				if (null != mac) {
					id = ((0x000000FF & (long) mac[mac.length - 1]) | (0x0000FF00 & (((long) mac[mac.length - 2]) << 8))) >> 6;
					id = id % (maxDatacenterId + 1);
				}
			}
		} catch (Exception e) {
			System.err.println(" getDatacenterId: " + e.getMessage());
		}
		return id;
    }
	
	/**
	 * 获得下一个ID (该方法是线程安全的)
	 * 
	 * @return nextId
	 */
	public synchronized long nextId() {
		long timestamp = timeGen();

		// 如果当前时间小于上一次ID生成的时间戳，说明系统时钟回退过这个时候应当抛出异常
		if (timestamp < lastTimestamp) {// 闰秒
			long offset = lastTimestamp - timestamp;
			if (offset <= 5) {
				try {
					wait(offset << 1);
					timestamp = timeGen();
					if (timestamp < lastTimestamp) {
						throw new RuntimeException(String.format("Clock moved backwards.  Refusing to generate id for %d milliseconds", offset));
					}
				} catch (Exception e) {
					throw new RuntimeException(e);
				}
			} else {
				throw new RuntimeException(String.format("Clock moved backwards.  Refusing to generate id for %d milliseconds", offset));
			}
		}
		
		//$NON-NLS-解决跨毫秒生成ID序列号始终为偶数的缺陷$
		// 如果是同一时间生成的，则进行毫秒内序列
		if (lastTimestamp == timestamp) {
			sequence = (sequence + 1) & sequenceMask;
			// 毫秒内序列溢出
			if (sequence == 0) {
				// 阻塞到下一个毫秒,获得新的时间戳
				timestamp = tilNextMillis(lastTimestamp);
			}
		} else {// 时间戳改变，毫秒内序列重置
			sequence = 0L;
		}
		/**
		// 如果是同一时间生成的，则进行毫秒内序列
		if (lastTimestamp == timestamp) {
		    long old = sequence;
		    sequence = (sequence + 1) & sequenceMask;
		    // 毫秒内序列溢出
		    if (sequence == old) {
		        // 阻塞到下一个毫秒,获得新的时间戳
		        timestamp = tilNextMillis(lastTimestamp);
		    }
		} else {// 时间戳改变，毫秒内序列重置
		    sequence = ThreadLocalRandom.current().nextLong(0, 2);
		}
		**/

		// 上次生成ID的时间截
		lastTimestamp = timestamp;

		// 移位并通过或运算拼到一起组成64位的ID
		return ((timestamp - twepoch) << timestampLeftShift) //
				| (datacenterId << datacenterIdShift) //
				| (workerId << workerIdShift) //
				| sequence;
	}

	/**
	 * 阻塞到下一个毫秒，直到获得新的时间戳
	 * 
	 * @param lastTimestamp 上次生成ID的时间截
	 * @return 当前时间戳
	 */
	protected long tilNextMillis(long lastTimestamp) {
		long timestamp = timeGen();
		while (timestamp <= lastTimestamp) {
			timestamp = timeGen();
		}
		
		return timestamp;
	}

	/**
	 * 返回以毫秒为单位的当前时间
	 * 
	 * @return 当前时间(毫秒)
	 */
	protected long timeGen() {
		return SystemClock.now();
	}

}
```

### SystemClock类

```java
/**
 * 高并发场景下System.currentTimeMillis()的性能问题的优化
 * System.currentTimeMillis()的调用比new一个普通对象要耗时的多（具体耗时高出多少我还没测试过，有人说是100倍左右）<p>
 * System.currentTimeMillis()之所以慢是因为去跟系统打了一次交道<p>
 * 后台定时更新时钟，JVM退出时，线程自动回收<p>
 * 10亿：43410,206,210.72815533980582%<p>
 * 1亿：4699,29,162.0344827586207%<p>
 * 1000万：480,12,40.0%<p>
 * 100万：50,10,5.0%<p>
 */
public class SystemClock {

    private final long period;
    private final AtomicLong now;

    private SystemClock(long period) {
        this.period = period;
        this.now = new AtomicLong(System.currentTimeMillis());
        scheduleClockUpdating();
    }

    private static class InstanceHolder {
        public static final SystemClock INSTANCE = new SystemClock(1);
    }

    private static SystemClock instance() {
        return InstanceHolder.INSTANCE;
    }

    private void scheduleClockUpdating() {
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(new ThreadFactory() {
            public Thread newThread(Runnable runnable) {
                Thread thread = new Thread(runnable, "System Clock");
                thread.setDaemon(true);
                return thread;
            }
        });
        scheduler.scheduleAtFixedRate(new Runnable() {
            public void run() {
                now.set(System.currentTimeMillis());
            }
        }, period, period, TimeUnit.MILLISECONDS);
    }

    private long currentTimeMillis() {
        return now.get();
    }

    public static long now() {
        return instance().currentTimeMillis();
    }
    
	public static String nowDate() {
		return new Timestamp(instance().currentTimeMillis()).toString();
	}

}
```

### 测试

```java
public class IdGen {
    private static Sequence sequence = new Sequence();
  	/**
	 * 使用Sequence生成主键，利用Snowflake算法
	 */
  	public static String sequenceId() {
            long nextId = sequence.nextId();
            return String.valueOf(nextId);
    }
  
  	//测试代码
	public static void main(String[] args) {
        
        for (int i = 0; i < 1000; i++) {
            long id = sequenceId();
            //System.out.println(Long.toBinaryString(id));
            System.out.println(id);
        }
}
```

SnowFlake算法可以根据自身项目的需要进行一定的修改。比如估算未来的数据中心个数，每个数据中心的机器数以及统一毫秒可以能的并发数来调整在算法中所需要的bit数。

#### 优点

1. 不依赖于数据库，灵活方便，且性能优于数据库。
2. ID按照时间在单机上是递增的。

#### 缺点

在单机上是递增的，但是由于涉及到分布式环境，每台机器上的时钟不可能完全同步，也许有时候也会出现不是全局递增的情况。

# 总结

在项目中SnowFlake算法生成ID是第一选择，兼具性能和灵活性。