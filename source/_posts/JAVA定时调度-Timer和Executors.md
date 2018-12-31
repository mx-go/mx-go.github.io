---
title: 'JAVA定时调度 Timer和Executors'
date: 2017-03-27 17:42:49
tags: [java, tips]
categories: 后端
---

近期在公司做了一个关于定时执行任务的功能（没有使用框架定时），查了一下资料，有**Thread**、**Timer**和**Executors**三种方法，之前使用的是Timer，但是详细查了资料觉得**Executors更优**，所以在这里比较一下它们的区别。<!-- more -->

## Thread类

这是最基本的，创建一个Thread，然后让它在while循环里一直运行着，通过sleep方法来达到定时任务的效果。这样可以快速简单的实现，代码如下： 

```java
public class Task1 {  
    public static void main(String[] args) {  
        // run in a second  
        final long timeInterval = 1000;  
        Runnable runnable = new Runnable() {  
            public void run() {  
                while (true) {  
                    // ------- code for task to run  
                    System.out.println("Hello !!");  
                    // ------- ends here  
                    try {  
                        Thread.sleep(timeInterval);  
                    } catch (InterruptedException e) {  
                        e.printStackTrace();  
                    }  
                }  
            }  
        };  
        Thread thread = new Thread(runnable);  
        thread.start();  
    }  
}  
```

> Thread的做定时任务的几率不大，因为不可控制启动停止时间、不能指定想要的delay时间。

## Timer类

1. 于第一种方式相比，优势 :

   (1) 当启动和去取消任务时可以控制 ;

   (2) 第一次执行任务时可以指定你想要的delay时间。

2. 在实现时，Timer类可以调度任务，TimerTask则是通过在run()方法里实现具体任务。 Timer实例可以调度多任务，它是线程安全的。 

3. 当Timer的构造器被调用时，它创建了一个线程，这个线程可以用来调度任务。

```java
public class Task2 {  
    public static void main(String[] args) {  
        TimerTask task = new TimerTask() {  
            @Override  
            public void run() {  
                // task to run goes here  
                System.out.println("Hello !!!");  
            }  
        };  
        Timer timer = new Timer();  
        long delay = 0;  
        long intevalPeriod = 1 * 1000;  
        // schedules the task to be run in an interval  
        timer.scheduleAtFixedRate(task, delay, intevalPeriod);  
    } // end of main  
}  
```

> 缺点：如果TimerTask抛出未检查的异常，Timer将会产生无法预料的行为。Timer线程并不捕获异常，所以 TimerTask抛出的未检查的异常会终止timer线程。这种情况下，Timer也不会再重新恢复线程的执行了;它错误的认为整个Timer都被取消了。此时，已经被安排但尚未执行的TimerTask永远不会再执行了，新的任务也不能被调度了。

## Executors

1. `ScheduledExecutorService`是从Java SE5的java.util.concurrent里，做为并发工具类被引进的，这是最理想的定时任务实现方式。  

2. 相比于上两个方法，它有以下好处 : 

   (1) 相比于Timer的单线程，它是通过线程池的方式来执行任务的 ;

   (2) 可以很灵活的去设定第一次执行任务delay时间 ;

   (3) 提供了良好的约定，以便设定执行的时间间隔 。

3. 下面是实现代码，我们通过ScheduledExecutorService展示这个例子，通过代码里参数的控制，首次执行加了delay时间。 

```java
public class Task3 {  
    public static void main(String[] args) {  
        Runnable runnable = new Runnable() {  
            public void run() {  
                // task to run goes here  
                System.out.println("Hello !!");  
            }  
        };  
        ScheduledExecutorService service = Executors  
                .newSingleThreadScheduledExecutor();  
        // 第二个参数为首次执行的延时时间，第三个参数为定时执行的间隔时间  
        service.scheduleAtFixedRate(runnable, 10, 1, TimeUnit.SECONDS);  
    }  
}  
```

> 1. 线程池能按时间计划来执行任务，允许用户设定计划执行任务的时间。
> 2. 当任务较多时，线程池可能会自动创建更多的工作线程来执行任务 。
> 3. 支持多个任务并发执行。

## 总结

`Timer`是单线程的。所以task都是串行执行。假如其中一个task执行需要很长的时间，那其他的task只能干巴巴的等着。

`ScheduledThreadPoolExecutor`是一个可以重复执行任务的`线程池`，并且可以指定任务的间隔和延迟时间。它作为比Timer/TimerTask更加通用的替代品。因为它允许多个服务线程，接受不同的时间单位，且不需要继承TimeTask（仅仅需要实现Runnable接口）。配置ScheduledThreadPoolExecutor为单线程，则与使用Timer等效。

**上述，基本说明了在以后的开发中尽可能使用ScheduledExecutorService(JDK1.5以后)替代Timer。**

下面是自己做的功能，通过短信API定时查询教师回复信息并更新数据库。

```java
 /**
	 * 定时查询教师回复状态
	 * @param a
	 */
	public void getStatusSchedule(final Date replyEnd){
		
		final SendMessage sendMsg = new SendMessage();
		final ScheduledExecutorService service = Executors.newSingleThreadScheduledExecutor();
		
		service.scheduleAtFixedRate(new Runnable() {
			@Override
			public void run() {
				try {
					Date nowDate = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").parse(new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date()));//当前时间
					//若截至时间在当前时间之前执行定时任务 否则不执行
					if (!nowDate.before(replyEnd)) {
						service.shutdown();  //停止任务
						return;
					}else {
						Map<String,Object> map = sendMsg.getReplyMsg();  //获取回复信息
						if(!map.isEmpty()){		 //当map不为空时执行						
							updateMsgStatus(map);   //更新数据库
						}
					}
				} catch (ParseException e) {
					e.printStackTrace();
				}
			}
		}, 1, 1, TimeUnit.MINUTES); //执行后第一次查询在1分钟之后，每隔1分钟查询一次。 
	}
```