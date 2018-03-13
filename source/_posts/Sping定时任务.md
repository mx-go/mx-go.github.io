---
title: Sping定时任务
date: 2018-03-07 17:09:22
tags: [java,spring]
categories: technology
---

# 引言

在企业开发中，经常会遇到时间任务调度的需求，比如每天凌晨生成前天报表、数据汇总等动态配置是否开启定时的任务。在Java领域中，定时任务的开源工具也非常多，小到一个Timer类，大到Quartz框架。在Spring中最常见的定时任务方式属**Spring schedule注解的方式**和利用**Quartz动态管理定时任务**。总体来说，个人比较喜欢的还是Quartz，功能强大而且使用方便。<div align=center>

> <img width="800" height="300" src="http://on937g0jc.bkt.clouddn.com/2018-03/quartz/index.png"/>

</div><!-- more -->

# Spring-@scheduled 

对于较简单的任务可以使用Spring内置的定时任务方法@scheduled注解进行配置达到自己的需求。

## spring配置文件

配置spring项目的基础文件spring.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>  
<beans xmlns:task="http://www.springframework.org/schema/task"  
    xmlns="http://www.springframework.org/schema/beans" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"  
    xmlns:context="http://www.springframework.org/schema/context"  
    xsi:schemaLocation="  
http://www.springframework.org/schema/beans  
http://www.springframework.org/schema/beans/spring-beans-3.0.xsd  
http://www.springframework.org/schema/context  
http://www.springframework.org/schema/context/spring-context-3.0.xsd  
http://www.springframework.org/schema/task  
http://www.springframework.org/schema/task/spring-task-3.1.xsd">  
  
  	<!-- 开启定时任务 spring的定时任务默认是单线程，多个任务执行起来时间会有问题，所以这里配置了线程池--> 
    <task:executor id="executor" pool-size="5" />
	<task:scheduler id="scheduler" pool-size="10" />
	<task:annotation-driven executor="executor" scheduler="scheduler" />  
  
</beans>  
```

## Task任务类

定义了一个任务类ATask，里面有两个定时任务aTask和bTask。编写java业务代码，需要在类声明上边添加**@Component注解**，并在需要定时任务执行的方法声明上添加**@Scheduled**注解以及cron表达式和相关的参数。

```java
// 定时器的任务方法不能有返回值
@Component
public class ATask {

	@Scheduled(cron = "0/10 * *  * * ? ") // 每10秒执行一次
	public void aTask() {
		DateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
		System.out.println(sdf.format(DateTime.now().toDate()) + "*********A任务每10秒执行一次进入测试");
	}

	@Scheduled(cron = "0/5 * *  * * ? ") // 每5秒执行一次
	public void bTask() {
		DateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
		System.out.println(sdf.format(DateTime.now().toDate()) + "*********B任务每5秒执行一次进入测试");
	}
}
```

## 运行结果

启动项目会发现定时任务已经开启。

<div align=center><img width="600" height="200" src="http://on937g0jc.bkt.clouddn.com/2018-03/quartz/taskCode.png" algin="center"/>

</div>

# Spring-Quartz

@scheduled固然可以实现定时任务，但是仔细想想并不灵活，任务随着应用的启动而执行，并不能动态的进行管理，很是不方便，然而Quartz很好的解决了这一问题。

## 引入依赖

```xml
<dependency>
    <groupId>org.quartz-scheduler</groupId>
        <artifactId>quartz</artifactId>
    <version>2.2.1</version>
</dependency>
```

## 任务管理类QuartzManager

```java
public class QuartzManager {

	private static SchedulerFactory schedulerFactory = new StdSchedulerFactory();

	/**
	 * @Description: 添加一个定时任务
	 * 
	 * @param jobName
	 *            任务名
	 * @param jobGroupName
	 *            任务组名
	 * @param triggerName
	 *            触发器名
	 * @param triggerGroupName
	 *            触发器组名
	 * @param jobClass
	 *            任务
	 * @param cron
	 *            时间设置，参考quartz说明文档
	 */
	@SuppressWarnings({ "unchecked", "rawtypes" })
	public static void addJob(String jobName, String jobGroupName, String triggerName, String triggerGroupName,
			Class jobClass, String cron) {
		try {
			Scheduler sched = schedulerFactory.getScheduler();
			// 任务名，任务组，任务执行类
			JobDetail jobDetail = JobBuilder.newJob(jobClass).withIdentity(jobName, jobGroupName).build();

			// 触发器
			TriggerBuilder<Trigger> triggerBuilder = TriggerBuilder.newTrigger();
			// 触发器名,触发器组
			triggerBuilder.withIdentity(triggerName, triggerGroupName);
			triggerBuilder.startNow();
			// 触发器时间设定
			triggerBuilder.withSchedule(CronScheduleBuilder.cronSchedule(cron));
			// 创建Trigger对象
			CronTrigger trigger = (CronTrigger) triggerBuilder.build();

			// 调度容器设置JobDetail和Trigger
			sched.scheduleJob(jobDetail, trigger);

			// 启动
			if (!sched.isShutdown()) {
				sched.start();
			}
		} catch (Exception e) {
			throw new RuntimeException(e);
		}
	}

	/**
	 * @Description: 修改一个任务的触发时间
	 * 
	 * @param jobName
	 * @param jobGroupName
	 * @param triggerName
	 *            触发器名
	 * @param triggerGroupName
	 *            触发器组名
	 * @param cron
	 *            时间设置，参考quartz说明文档
	 */
	public static void modifyJobTime(String jobName, String jobGroupName, String triggerName, String triggerGroupName,
			String cron) {
		try {
			Scheduler sched = schedulerFactory.getScheduler();
			TriggerKey triggerKey = TriggerKey.triggerKey(triggerName, triggerGroupName);
			CronTrigger trigger = (CronTrigger) sched.getTrigger(triggerKey);
			if (trigger == null) {
				return;
			}

			String oldTime = trigger.getCronExpression();
			if (!oldTime.equalsIgnoreCase(cron)) {
				/** 方式一 ：调用 rescheduleJob 开始 */
				// 触发器
				TriggerBuilder<Trigger> triggerBuilder = TriggerBuilder.newTrigger();
				// 触发器名,触发器组
				triggerBuilder.withIdentity(triggerName, triggerGroupName);
				triggerBuilder.startNow();
				// 触发器时间设定
				triggerBuilder.withSchedule(CronScheduleBuilder.cronSchedule(cron));
				// 创建Trigger对象
				trigger = (CronTrigger) triggerBuilder.build();
				// 方式一 ：修改一个任务的触发时间
				sched.rescheduleJob(triggerKey, trigger);
				/** 方式一 ：调用 rescheduleJob 结束 */

				/** 方式二：先删除，然后在创建一个新的Job */
				// JobDetail jobDetail =
				// sched.getJobDetail(JobKey.jobKey(jobName, jobGroupName));
				// Class<? extends Job> jobClass = jobDetail.getJobClass();
				// removeJob(jobName, jobGroupName, triggerName,
				// triggerGroupName);
				// addJob(jobName, jobGroupName, triggerName, triggerGroupName,
				// jobClass, cron);
				/** 方式二 ：先删除，然后在创建一个新的Job */
			}
		} catch (Exception e) {
			throw new RuntimeException(e);
		}
	}

	/**
	 * @Description: 移除一个任务
	 * 
	 * @param jobName
	 * @param jobGroupName
	 * @param triggerName
	 * @param triggerGroupName
	 */
	public static void removeJob(String jobName, String jobGroupName, String triggerName, String triggerGroupName) {
		try {
			Scheduler sched = schedulerFactory.getScheduler();

			TriggerKey triggerKey = TriggerKey.triggerKey(triggerName, triggerGroupName);

			sched.pauseTrigger(triggerKey);// 停止触发器
			sched.unscheduleJob(triggerKey);// 移除触发器
			sched.deleteJob(JobKey.jobKey(jobName, jobGroupName));// 删除任务
		} catch (Exception e) {
			throw new RuntimeException(e);
		}
	}

	/**
	 * @Description:启动所有定时任务
	 */
	public static void startJobs() {
		try {
			Scheduler sched = schedulerFactory.getScheduler();
			sched.start();
		} catch (Exception e) {
			throw new RuntimeException(e);
		}
	}

	/**
	 * @Description:关闭所有定时任务
	 */
	public static void shutdownJobs() {
		try {
			Scheduler sched = schedulerFactory.getScheduler();
			if (!sched.isShutdown()) {
				sched.shutdown();
			}
		} catch (Exception e) {
			throw new RuntimeException(e);
		}
	}
}
```

## 任务执行业务

这里做一个简单的演示，只实现Job接口打印当前时间。

```java
public class MyJob implements Job{

    public void execute(JobExecutionContext jobExecutionContext) throws JobExecutionException {
		DateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
		System.out.println(sdf.format(DateTime.now().toDate()));
	}
}
```

## 测试动态定时任务

新建QuartzTest.Java 测试类

```java
public class QuartzTest {
	public static String JOB_NAME = "动态任务调度";
	public static String TRIGGER_NAME = "动态任务触发器";
	public static String JOB_GROUP_NAME = "XLXXCC_JOB_GROUP";
	public static String TRIGGER_GROUP_NAME = "XLXXCC_JOB_GROUP";

	public static void main(String[] args) {
		try {
			System.out.println("【系统启动】开始(每1秒输出一次)...");
			QuartzManager.addJob(JOB_NAME, JOB_GROUP_NAME, TRIGGER_NAME, TRIGGER_GROUP_NAME, MyJob.class,"0/1 * * * * ?");

			Thread.sleep(5000);
			System.out.println("【修改时间】开始(每5秒输出一次)...");
			QuartzManager.modifyJobTime(JOB_NAME, JOB_GROUP_NAME, TRIGGER_NAME, TRIGGER_GROUP_NAME, "0/5 * * * * ?");

			Thread.sleep(15000);
			System.out.println("【移除定时】开始...");
			QuartzManager.removeJob(JOB_NAME, JOB_GROUP_NAME, TRIGGER_NAME, TRIGGER_GROUP_NAME);
			System.out.println("【移除定时】成功");
		} catch (Exception e) {
			e.printStackTrace();
		}
	}
}
```

输出如下：

<div align=center><img width="600" height="200" src="http://on937g0jc.bkt.clouddn.com/2018-03/quartz/quartzResult.png" algin="center"/>

</div>

# 总结

通过以上测试可以明显的看出两者的优劣，Quartz足够灵活强大，单Spring scheduled 在简单任务下也是一个不错的选择。