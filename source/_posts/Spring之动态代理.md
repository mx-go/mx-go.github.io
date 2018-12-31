---
title: Spring之动态代理
date: 2018-04-02 09:55:03
tags: [java,spring]
categories: 后端
---

# 引言

Spring主要有两大思想，一个是AOP，一个是IOC。对于Spring的核心AOP来说，动态代理机制是其核心，想要明白AOP原理，一定要了解动态代理机制。

<div align=center><img width="600" height="200" src="../../../../images/2018-4/DynamicProxy/proxy-index.jpg" algin="center"/></div>

<!-- more -->

# 代理模式

> 给某个对象提供一个代理对象，并由代理对象控制对于原对象的访问，即操作者不直接操控原对象，而是通过代理对象简介地操控原对象。

## 实现

代理模式分为静态代理和动态代理：

- 静态代理：代理类是在编译时就实现好。也就是说 Java 编译完成后代理类是一个实际的 class 文件。
- 动态代理：动态代理类的字节码是在程序运行时由Java反射机制动态生成。也就是说 Java 编译完之后并没有实际的 class 文件，而是在运行时动态生成的类字节码，并加载到JVM中。

# Spring静态代理

> 由程序员创建或工具生成代理类的源码，再编译代理类。所谓静态也就是在程序运行前就已经存在代理类的字节码文件，代理类和委托类的关系在运行前就确定了。

静态代理之前已经说过 [***Spring-AOP两种配置方式***](http://rainbowhorse.site/2017/09/09/Spring-AOP%E4%B8%A4%E7%A7%8D%E9%85%8D%E7%BD%AE%E6%96%B9%E5%BC%8F/)

# Spring动态代理

## JDK动态代理(对有实现接口的对象做代理)

<div align=center><img width="600" height="200" src="../../../../images/2018-4/DynamicProxy/yuanli.png" algin="center"/></div>

### 实现方式说明

JDK动态代理中 需要了解的两个重要的类或接口 [**InvocationHandler** 和 **Proxy**]

1. InvocationHandler接口

```java
public interface InvocationHandler {
    // 参数说明：
    // Object proxy：指被代理的对象
    // Method method：所要调用被代理对象的某个方法的Method对象
    // Object[] args：被代理对象某个方法调用时所需要的参数
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable;   
} 
```

可以将InvocationHandler接口的子类想象成一个代理的最终操作类。

说明：**每一个动态代理对象都必须要实现InvocationHandler这个接口**，并且每个代理类（Proxy）的实例都关联到了一个handle，当我们通过代理对象调用一个方法的时候，这个方法的调用就会被转发为InvocationHandler这个接口的invoke方法来进行调用。同时在invoke的方法里，可以对被代理对象的方法调用做增强处理(如添加事务、日志、权限认证等操作)。

2. Proxy类

Proxy类是专门完成代理的操作类，可以通过此类为一个或多个接口动态地生成实现类，该类常用的调用方法为**newProxyInstance**

<div align=center><img width="600" height="300" src="../../../../images/2018-4/DynamicProxy/interfere.png" algin="center"/></div>

newProxyInstance方法参数说明如下：

- ClassLoader loader：类加载器，定义了由哪个ClassLoader对象来对生成的代理对象进行加载
- Class<?>[] interfaces：得到被代理类全部的接口，如果我提供了一组接口给它，那么这个代理对象就宣称实现了该接口，这样我就能调用这组接口中的方法了
- InvocationHandler h：得到InvocationHandler接口的子类实例

### 实现实例

一、首先定义了一个Subject类型的接口：Subject.java

```java
public interface Subject {
	
	// 学习
	void study();
	
	// 说话
	String say(String words);
}
```

二、接着定义一个接口的实现类，这个类就是我们示例中的被代理对象：RealSubject.java

```java
/**
 * 被代理类
 * ClassName: RealSubject 
 * @author rainbowhorse
 */
public class RealSubject implements Subject {

	@Override
	public void study() {
		System.out.println("I am study now.");
	}

	@Override
	public String say(String words) {
		return "I say " + words;
	}
}
```

三、定义一个动态代理类（必须要实现 InvocationHandler 接口）：DynamicProxy.java

```java
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;

/**
 * JDK动态代理类
 * ClassName: DynamicProxy 
 * @author rainbowhorse
 */
public class DynamicProxy implements InvocationHandler {
	// 这个就是要代理的真实对象
	private Object subject;

	// 构造方法，给要代理的真实对象赋初值
	public DynamicProxy(Object subject) {
		this.subject = subject;
	}

	@Override
	public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
		// 在代理真实对象前可以添加一些自己的操作
		System.out.println("before method");

		System.out.println("Method:" + method);

		// 当代理对象调用真实对象的方法时，其会自动的跳转到代理对象关联的handler对象的invoke方法来进行调用
		Object invoke = method.invoke(subject, args);

		// 在代理真实对象后也可以添加一些自己的操作
		System.out.println("after method");

		return invoke;
	}
}
```

四、代理测试类：Client.java

```java
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;

public class Client {

	public static void main(String[] args) {
		// 要代理的真实对象
		Subject realSubject = new RealSubject();

		// 要代理哪个真实对象，就将该对象传进去，最后是通过该真实对象来调用其方法的
		InvocationHandler handler = new DynamicProxy(realSubject);

		/*
		 * 通过Proxy的newProxyInstance方法来动态创建我们的代理对象
		 * 参数一：这里使用handler这个类的ClassLoader对象来加载代理对象
		 * 参数二：这里为代理对象提供的接口是真实对象所实行的接口，表示我要代理的是该真实对象，这样就能调用这组接口中的方法了
		 * 参数三：这里将这个代理对象关联到了上方的 InvocationHandler 这个对象上
		 */
		Subject subject = (Subject) Proxy.newProxyInstance(handler.getClass().getClassLoader(),
				realSubject.getClass().getInterfaces(), handler);

		System.out.println(subject.getClass().getName());
		subject.study();
		System.out.println();
		
		String string = subject.say("Hello World.");
		System.out.println(string);
	}
}
```

运行->控制台输出结果如下

<div align=center><img width="800" height="300" src="../../../../images/2018-4/DynamicProxy/JDKProxy.png" algin="center"/></div>

## CGLib动态代理[对没有实现接口的普通类做代理]

### 说明

#### 概述

 CGLib（Code Generation Library）是一个优秀的动态代理框架，它的底层使用ASM（JAVA字节码处理框架）在内存中动态的生成被代理类的子类。使用CGLib即使被代理类没有实现任何接口也可以实现动态代理功能。但是不能对final修饰的类进行代理。

#### 原理

  通过字节码技术为一个类创建子类，并在子类中采用方法拦截的技术拦截所有父类方法的调用。**JDK动态代理与CGLib动态代理均是实现Spring AOP的基础。**

### 实现实例

一、定义一个没有实现接口的代理委托类：CGLibRealSubject.java

```java
/**
 * 没有实现接口的代理委托类 
 * ClassName: CGLibRealSubject 
 * @author rainbowhorse
 */
public class CGLibRealSubject {
	
	public void study() {
		System.out.println("I am study now.");
	}

	public String say(String words) {
		return "I say " + words;
	}
}
```

二、定义一个CGLib动态代理类: CGLibDynamicProxy.java

```java
import java.lang.reflect.Method;
import net.sf.cglib.proxy.Enhancer;
import net.sf.cglib.proxy.MethodInterceptor;
import net.sf.cglib.proxy.MethodProxy;

public class CGLibDynamicProxy implements MethodInterceptor {

	private Object target;

	/**
	 * 创建代理对象
	 * 
	 * @param target
	 *            被代理的对象
	 * @return
	 */
	public Object getProxyInstance(Object target) {
		this.target = target;
		// 声明增强类实例
		Enhancer enhancer = new Enhancer();
		// 设置被代理类字节码，CGLIB根据字节码生成被代理类的子类
		enhancer.setSuperclass(this.target.getClass());
		// 设置要代理的拦截器，回调函数，即一个方法拦截 new MethodInterceptor()
		enhancer.setCallback(this);
		// 创建代理对象 实例
		return enhancer.create();
	}

	@Override
	public Object intercept(Object obj, Method method, Object[] args, MethodProxy proxy) throws Throwable {

		// 在代理真实对象操作前 我们可以添加一些自己的操作
		System.out.println("before method");

		Object object = proxy.invokeSuper(obj, args);

		// 在代理真实对象操作后 我们也可以添加一些自己的操作
		System.out.println("after method");

		return object;
	}
}
```

三、创建测试客户端类：CGLibClient.java

```java
/**
 *  CGLib动态代理测试类
 * ClassName: CGLibClient 
 * @author rainbowhorse
 */
public class CGLibClient {
	public static void main(String[] args) {
		
		CGLibDynamicProxy cglib = new CGLibDynamicProxy();
		CGLibRealSubject realSubject = (CGLibRealSubject) cglib.getProxyInstance(new CGLibRealSubject());
		
		realSubject.study();
		System.out.println();
		
		System.out.println(realSubject.say("Hello World."));
	}
}
```

运行->控制台输出结果如下

<div align=center><img width="800" height="300" src="../../../../images/2018-4/DynamicProxy/cglibResult.png" algin="center"/></div>

# 总结

Spirng的AOP的动态代理实现机制有两种，分别是:

**1）JDK动态代理**

**具体实现原理：**

1. 通过实现InvocationHandlet接口创建自己的调用处理器
2. 通过为Proxy类指定ClassLoader对象和一组interface来创建动态代理
3. 通过反射机制获取动态代理类的构造函数，其唯一参数类型就是调用处理器接口类型
4. 通过构造函数创建动态代理类实例，构造时调用处理器对象作为参数参入

**JDK动态代理是面向接口的代理模式，如果被代理目标没有接口那么Spring也无能为力**

**Spring通过java的反射机制生产被代理接口的新的匿名实现类，重写了其中AOP的增强方法。**

**2）CGLib动态代理**

**CGLib是一个强大、高性能的Code生产类库，可以实现运行期动态扩展java类，Spring在运行期间通过CGlib继承要被动态代理的类，重写父类的方法，实现AOP面向切面编程。**

## 对比

- JDK动态代理是面向接口，在创建代理实现类时比CGLib要快，创建代理速度快。


- CGLib动态代理是通过字节码底层继承要代理类来实现（如果被代理类被final关键字所修饰，那么会失败），在创建代理这一块没有JDK动态代理快，但是运行速度比JDK动态代理要快。

## 注意

- 如果要被代理的对象是个**实现类**，那么Spring会使用**JDK动态代理**来完成操作（**Spirng默认采用JDK动态代理实现机制**）


- 如果要被代理的对象**不是个实现类**，那么Spring会**强制使用CGLib来实现动态代理**。

## Spring中配置动态代理方式

通过配置Spring的中**<aop:config>**标签来显示的指定使用动态代理机制 **proxy-target-class=true表示使用CGLib代理，如果为false就是默认使用JDK动态代理**。