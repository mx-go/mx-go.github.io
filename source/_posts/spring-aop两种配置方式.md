---
title: Spring-AOP两种配置方式
date: 2017-09-09 19:44:46
tags: [java,spring]
categories: technology
---

# 前言

## AOP

AOP（Aspect Oriented Programming），即面向切面编程，可以说是OOP（Object Oriented Programming，面向对象编程）的补充和完善。OOP引入封装、继承、多态等概念来建立一种对象层次结构，用于模拟公共行为的一个集合。不过OOP允许开发者定义纵向的关系，但并不适合定义横向的关系，例如日志功能。日志代码往往横向地散布在所有对象层次中，而与它对应的对象的核心功能毫无关系对于其他类型的代码，如安全性、异常处理和透明的持续性也都是如此，这种散布在各处的无关的代码被称为横切（cross cutting），在OOP设计中，它导致了大量代码的重复，而不利于各个模块的重用。

<div align=center><img width="600" height="200" src="http://on937g0jc.bkt.clouddn.com/2017-9-12/SpringAOP/spring.png" algin="center"/>

</div>

<!-- more -->

AOP技术恰恰相反，它利用一种称为"横切"的技术，剖解开封装的对象内部，并将那些影响了多个类的公共行为封装到一个可重用模块，并将其命名为"Aspect"，即切面。所谓"切面"，简单说就是那些与业务无关，却为业务模块所共同调用的逻辑或责任封装起来，便于减少系统的重复代码，降低模块之间的耦合度，并有利于未来的可操作性和可维护性。

使用"横切"技术，AOP把软件系统分为两个部分：**核心关注点**和**横切关注点**。业务处理的主要流程是核心关注点，与之关系不大的部分是横切关注点。横切关注点的一个特点是，他们经常发生在核心关注点的多处，而各处基本相似，比如`权限认证`、`日志`、`事务`。AOP的作用在于分离系统中的各种关注点，将核心关注点和横切关注点分离开来。

## AOP核心概念

1、横切关注点

对哪些方法进行拦截，拦截后怎么处理，这些关注点称之为横切关注点

2、切面（Aspect）

类是对物体特征的抽象，切面就是对横切关注点的抽象

3、连接点（Joinpoint）

被拦截到的点，因为Spring只支持方法类型的连接点，所以在Spring中连接点指的就是被拦截到的方法，实际上连接点还可以是字段或者构造器

4、切入点（Pointcut）

对连接点进行拦截的定义

5、通知（Advice）

所谓通知指的就是指拦截到连接点之后要执行的代码，通知分为前置、后置、异常、最终、环绕通知五类

6、目标对象

代理的目标对象

7、织入（Weave）

将切面应用到目标对象并导致代理对象创建的过程

8、引入（Introduction）

在不修改代码的前提下，引入可以在**运行期**为类动态地添加一些方法或字段

## Spring对AOP的支持

**Spring中AOP代理由Spring的IOC容器负责生成、管理，其依赖关系也由IOC容器负责管理**。因此，AOP代理可以直接使用容器中的其它bean实例作为目标，这种关系可由IOC容器的依赖注入提供。Spring创建代理的规则为：

1、**默认使用Java动态代理来创建AOP代理**，这样就可以为任何接口实例创建代理了

2、**当需要代理的类不是代理接口的时候，Spring会切换为使用CGLIB代理**，也可强制使用CGLIB

AOP编程其实是很简单的事情，纵观AOP编程，程序员只需要参与三个部分：

1、定义普通业务组件

2、定义切入点，一个切入点可能横切多个业务组件

3、定义增强处理，增强处理就是在AOP框架为普通业务组件织入的处理动作

所以进行AOP编程的关键就是定义切入点和定义增强处理，一旦定义了合适的切入点和增强处理，AOP框架将自动生成AOP代理，即：**代理对象的方法=增强处理+被代理对象**的方法。

<div align=center><img width="700" height="300" src="http://on937g0jc.bkt.clouddn.com/2017-9-12/SpringAOP/Aop.png" algin="center"/>

</div>

# Spring配置AOP的两种方式

## 注解配置AOP

注解配置AOP（使用 AspectJ 类库实现的），大致分为三步： 

1. 使用注解@Aspect来定义一个切面，在切面中定义切入点(@Pointcut),通知类型(@Before, @AfterReturning,@After,@AfterThrowing,@Around). 
2. 开发需要被拦截的类。 
3. 将切面配置到xml中，当然，我们也可以使用自动扫描Bean的方式。这样的话，那就交由Spring AOP容器管理。 


applicationContext的配置

```xml
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
	xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
	xmlns:context="http://www.springframework.org/schema/context"
	xmlns:aop="http://www.springframework.org/schema/aop"
	xsi:schemaLocation="http://www.springframework.org/schema/aop http://www.springframework.org/schema/aop/spring-aop-3.1.xsd
		http://www.springframework.org/schema/beans http://www.springframework.org/schema/beans/spring-beans.xsd
		http://www.springframework.org/schema/context http://www.springframework.org/schema/context/spring-context-3.0.xsd">
  
  	<!-- proxy-target-class等于true是强制使用cglib代理，proxy-target-class默认是false，如果你的类实现了接口 就走JDK代理，如果没有，走cglib代理  -->
     <!-- 对于单例模式建议使用cglib代理，虽然JDK动态代理比cglib代理速度快，但性能不如cglib -->
	<!-- 激活自动代理功能 打开aop对@Aspectj的注解支持 ,相当于为注解提供解析功能-->
	<aop:aspectj-autoproxy proxy-target-class="true"/>
	
  	<!-- 激活组件扫描功能,在包com.spring.aop及其子包下面自动扫描通过注解配置的组件 -->
	<context:component-scan base-package="com.spring.aop"/>
  
	<!-- 切面 -->
	<bean id="serviceAspect" class="com.spring.aop.aspect.ServiceAspect" />

</beans>
```

为Aspect`切面`类添加注解

```java
package com.spring.aop.aspect;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.After;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.AfterThrowing;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.annotation.Pointcut;
import org.springframework.stereotype.Component;

/**
 * 系统服务组件Aspect切面Bean
 */

//声明这是一个组件
@Component
//声明这是一个切面Bean
@Aspect
public class ServiceAspect {

	private final static Log log = LogFactory.getLog(ServiceAspect.class);
	
	//配置切入点,该方法无方法体,主要为方便同类中其他方法使用此处配置的切入点
	@Pointcut("execution(* com.spring.aop.service..*(..))")
	public void aspect(){	}
	
	/*
	 * 配置前置通知,使用在方法aspect()上注册的切入点
	 * 同时接受JoinPoint切入点对象,可以没有该参数
	 */
	@Before("aspect()")
	public void before(JoinPoint joinPoint){
		if(log.isInfoEnabled()){
			log.info("before " + joinPoint);
		}
	}
	
	//配置后置通知,使用在方法aspect()上注册的切入点
	@After("aspect()")
	public void after(JoinPoint joinPoint){
		if(log.isInfoEnabled()){
			log.info("after " + joinPoint);
		}
	}
	
	//配置环绕通知,使用在方法aspect()上注册的切入点
	@Around("aspect()")
	public void around(JoinPoint joinPoint){
		long start = System.currentTimeMillis();
		try {
			((ProceedingJoinPoint) joinPoint).proceed();
			long end = System.currentTimeMillis();
			if(log.isInfoEnabled()){
				log.info("around " + joinPoint + "\tUse time : " + (end - start) + " ms!");
			}
		} catch (Throwable e) {
			long end = System.currentTimeMillis();
			if(log.isInfoEnabled()){
				log.info("around " + joinPoint + "\tUse time : " + (end - start) + " ms with exception : " + e.getMessage());
			}
		}
	}
	
	//配置后置返回通知,使用在方法aspect()上注册的切入点
	@AfterReturning("aspect()")
	public void afterReturn(JoinPoint joinPoint){
		if(log.isInfoEnabled()){
			log.info("afterReturn " + joinPoint);
		}
	}
	
	//配置抛出异常后通知,使用在方法aspect()上注册的切入点
	@AfterThrowing(pointcut="aspect()", throwing="ex")
	public void afterThrow(JoinPoint joinPoint, Exception ex){
		if(log.isInfoEnabled()){
			log.info("afterThrow " + joinPoint + "\t" + ex.getMessage());
		}
	}
	
}
```

UserService.java

```java
package com.spring.aop.service;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import com.spring.mvc.bean.User;

/**
 * 用户服务模型
 */
public class UserService {

	private final static Log log = LogFactory.getLog(UserService.class);
	
	public User get(long id){
		if(log.isInfoEnabled()){
			log.info("getUser method . . .");
		}
		return new User();
	}
	
	public void save(User user){
		if(log.isInfoEnabled()){
			log.info("saveUser method . . .");
		}
	}
	
	public boolean delete(long id) throws Exception{
		if(log.isInfoEnabled()){
			log.info("delete method . . .");
			throw new Exception("spring aop ThrowAdvice演示");
		}
		return false;
	}
	
}
```

测试代码

```java
package com.spring.aop;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.context.ApplicationContext;
import org.springframework.context.support.ClassPathXmlApplicationContext;

import com.spring.aop.service.UserService;
import com.spring.mvc.bean.User;

/**
 * Spring AOP测试
 */
public class Tester {

	private final static Log log = LogFactory.getLog(Tester.class);
	
	public static void main(String[] args) {
		//启动Spring容器
		ApplicationContext context = new ClassPathXmlApplicationContext("applicationContext.xml");
		//获取service组件
		UserService service = (UserService) context.getBean("userService");
		//以普通的方式调用UserService对象的三个方法
		User user = service.get(1L);
		service.save(user);
		try {
			service.delete(1L);
		} catch (Exception e) {
			if(log.isWarnEnabled()){
				log.warn("Delete user : " + e.getMessage());
			}
		}
	}
}
```

控制台输出如下：

```java
 INFO [spring.aop.aspect.ServiceAspect:40] before execution(User com.spring.aop.service.UserService.get(long))
 INFO [spring.aop.service.UserService:19] getUser method . . .
 INFO [spring.aop.aspect.ServiceAspect:60] around execution(User com.spring.aop.service.UserService.get(long))	Use time : 42 ms!
 INFO [spring.aop.aspect.ServiceAspect:48] after execution(User com.spring.aop.service.UserService.get(long))
 INFO [spring.aop.aspect.ServiceAspect:74] afterReturn execution(User com.spring.aop.service.UserService.get(long))
 INFO [spring.aop.aspect.ServiceAspect:40] before execution(void com.spring.aop.service.UserService.save(User))
 INFO [spring.aop.service.UserService:26] saveUser method . . .
 INFO [spring.aop.aspect.ServiceAspect:60] around execution(void com.spring.aop.service.UserService.save(User))	Use time : 2 ms!
 INFO [spring.aop.aspect.ServiceAspect:48] after execution(void com.spring.aop.service.UserService.save(User))
 INFO [spring.aop.aspect.ServiceAspect:74] afterReturn execution(void com.spring.aop.service.UserService.save(User))
 INFO [spring.aop.aspect.ServiceAspect:40] before execution(boolean com.spring.aop.service.UserService.delete(long))
 INFO [spring.aop.service.UserService:32] delete method . . .
 INFO [spring.aop.aspect.ServiceAspect:65] around execution(boolean com.spring.aop.service.UserService.delete(long))	Use time : 5 ms with exception : spring aop ThrowAdvice演示
 INFO [spring.aop.aspect.ServiceAspect:48] after execution(boolean com.spring.aop.service.UserService.delete(long))
 INFO [spring.aop.aspect.ServiceAspect:74] afterReturn execution(boolean com.spring.aop.service.UserService.delete(long))
 WARN [studio.spring.aop.Tester:32] Delete user : Null return value from advice does not match primitive return type for: public boolean com.spring.aop.service.UserService.delete(long) throws java.lang.Exception
```

可以看到，正如我们预期的那样，虽然我们并没有对UserSerivce类包括其调用方式做任何改变，但是Spring仍然拦截到了其中方法的调用，或许这正是AOP的魔力所在。

## XML配置AOP

XML配置

```xml
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
	xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
	xmlns:context="http://www.springframework.org/schema/context"
	xmlns:aop="http://www.springframework.org/schema/aop"
	xsi:schemaLocation="http://www.springframework.org/schema/aop http://www.springframework.org/schema/aop/spring-aop-3.1.xsd
		http://www.springframework.org/schema/beans http://www.springframework.org/schema/beans/spring-beans.xsd
		http://www.springframework.org/schema/context http://www.springframework.org/schema/context/spring-context-3.0.xsd">

	<!-- 系统服务组件的切面Bean -->
	<bean id="serviceAspect" class="com.spring.aop.aspect.ServiceAspect"/>
	<!-- AOP配置 -->
	<aop:config>
		<!-- 声明一个切面,并注入切面Bean,相当于@Aspect -->
		<aop:aspect id="simpleAspect" ref="serviceAspect">
			<!-- 配置一个切入点,相当于@Pointcut -->
			<aop:pointcut expression="execution(* com.spring.aop.service..*(..))" id="simplePointcut"/>
			<!-- 配置通知,相当于@Before、@After、@AfterReturn、@Around、@AfterThrowing -->
			<aop:before pointcut-ref="simplePointcut" method="before"/>
			<aop:after pointcut-ref="simplePointcut" method="after"/>
			<aop:after-returning pointcut-ref="simplePointcut" method="afterReturn"/>
			<aop:after-throwing pointcut-ref="simplePointcut" method="afterThrow" throwing="ex"/>
		</aop:aspect>
	</aop:config>
</beans>
```

ServiceAspect.java

```java
//配置前置通知,拦截返回值为com.spring.mvc.bean.User的方法
@Before("execution(com.spring.mvc.bean.User com.spring.aop.service..*(..))")
public void beforeReturnUser(JoinPoint joinPoint){
	if(log.isInfoEnabled()){
		log.info("beforeReturnUser " + joinPoint);
	}
}

//配置前置通知,拦截参数为com.spring.mvc.bean.User的方法
@Before("execution(* com.spring.aop.service..*(com.spring.mvc.bean.User))")
public void beforeArgUser(JoinPoint joinPoint){
	if(log.isInfoEnabled()){
		log.info("beforeArgUser " + joinPoint);
	}
}

//配置前置通知,拦截含有long类型参数的方法,并将参数值注入到当前方法的形参id中
@Before("aspect()&&args(id)")
public void beforeArgId(JoinPoint joinPoint, long id){
	if(log.isInfoEnabled()){
		log.info("beforeArgId " + joinPoint + "\tID:" + id);
	}
}
```

UserService.java

```java
package com.spring.aop.service;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import com.spring.mvc.bean.User;

/**
 * 用户服务模型
 */
public class UserService {

	private final static Log log = LogFactory.getLog(UserService.class);
	
	public User get(long id){
		if(log.isInfoEnabled()){
			log.info("getUser method . . .");
		}
		return new User();
	}
	
	public void save(User user){
		if(log.isInfoEnabled()){
			log.info("saveUser method . . .");
		}
	}
	
	public boolean delete(long id) throws Exception{
		if(log.isInfoEnabled()){
			log.info("delete method . . .");
			throw new Exception("spring aop ThrowAdvice演示");
		}
		return false;
	}
	
}
```

# 总结

SpringAop可以用来：

1. Spring声明式事务管理配置。
2. 在执行方法前,判断是否具有权限。
3. 对部分函数的调用进行日志记录。监控部分重要函数，若抛出指定的异常，可以以短信或邮件方式通知相关人员。
4. 使用Spring AOP实现MySQL数据库读写分离。
5. 信息过滤
6. ......