---
title: Java String intern方法
date: 2017-11-31 10:27:19
tags: [java,tips]
categories: technology
---

# 引言

String类我们经常使用，但是它的intern()方法之前还真的不太了解，通过谷歌百度一番之后终于搞明白了。

intern()方法设计的初衷，就是重用String对象，以节省内存消耗。

<div align=center><img width="700" height="200" src="http://on937g0jc.bkt.clouddn.com/2017-12-7/String_intern/creating-java-strings.jpg" algin="center"/>

</div>

<!-- more -->

# 案例

```java
String str1 = new String("rainbow") + new String("horse");
System.out.println(str1.intern() == str1);
System.out.println(str1 == "rainbowhorse");
```

在**JDK1.7**下输出结果为：

```java
true
true
```

再将上面的例子加上一行代码：

```java
String str2 = "rainbowhorse";	//新加的一行代码，其余不变  
String str1 = new String("rainbow") + new String("horse");
System.out.println(str1.intern() == str1);
System.out.println(str1 == "rainbowhorse");
```

再运行，结果为：

```java
false
false
```

在JVM运行时数据区中的方法区有一个常量池，但是发现在JDK1.6以后常量池被放置在了堆空间，因此常量池位置的不同影响到了String的intern()方法的表现。

# 为什么使用intern()方法

就如引言所说的，**intern()方法设计的初衷，就是重用String对象，以节省内存消耗**。下面通过例子来说明：

```java
public class Test {
	static final int MAX = 100000;
	static final String[] arr = new String[MAX];

	public static void main(String[] args) throws Exception {
		// 为长度为10的Integer数组随机赋值
		Integer[] sample = new Integer[10];
		Random random = new Random(1000);
		for (int i = 0; i < sample.length; i++) {
			sample[i] = random.nextInt();
		}
		// 记录程序开始时间
		long t = System.currentTimeMillis();
		// 使用/不使用intern方法为10万个String赋值，值来自于Integer数组的10个数
		for (int i = 0; i < MAX; i++) {
			arr[i] = new String(String.valueOf(sample[i % sample.length]));
			// arr[i] = new String(String.valueOf(sample[i % sample.length])).intern();
		}
		System.out.println((System.currentTimeMillis() - t) + "ms");
		System.gc();
	}
}
```

这个主要是为了证明`使用intern()比不使用intern()消耗的内存更少`。

先定义一个长度为10的Integer数组，并随机为其赋值，在通过for循环为长度为10万的String对象依次赋值，这些值都来自于Integer数组。两种情况分别运行，可通过Window ---> Preferences --> Java --> Installed JREs设置JVM启动参数为-agentlib:hprof=heap=dump,format=b，将程序运行完后的hprof置于工程目录下。再通过[MAT](http://download.eclipse.org/mat/)插件查看该hprof文件。

不使用intern()方法

<div align=center><img width="700" height="200" src="http://on937g0jc.bkt.clouddn.com/2017-12-7/String_intern/no-intern.png" algin="center"/>

</div>

使用intern()方法

<div align=center><img width="700" height="200" src="http://on937g0jc.bkt.clouddn.com/2017-12-7/String_intern/use-intern.png" algin="center"/>

</div>

从运行结果来看，不使用intern()的情况下，程序生成了101762个String对象，而使用了intern()方法时，程序仅生成了1772个String对象。证明了intern()节省内存的结论。

但是会发现使用了intern()方法后程序运行时间有所增加。这是因为程序中每次都是用了new String后又进行intern()操作的耗时时间，但是不使用intern()占用内存空间导致GC的时间是要远远大于这点时间的。 

# 深入理解intern()方法

**JDK1.7后，常量池被放入到堆空间中，这导致intern()函数的功能不同。这点很重要。**

看看下面代码，这个例子是网上流传较广的一个例子，我也是照抄过来的。

```java
String s = new String("1");  
s.intern();  
String s2 = "1";  
System.out.println(s == s2);  
  
String s3 = new String("1") + new String("1");  
s3.intern();  
String s4 = "11";  
System.out.println(s3 == s4);  
```

输出结果为：

```java
JDK1.6以及以下：false false  
JDK1.7以及以上：false true  
```

再分别调整上面代码2、3行，7、8行的顺序：

```java
String s = new String("1");  
String s2 = "1";  
s.intern();  
System.out.println(s == s2);  
  
String s3 = new String("1") + new String("1");  
String s4 = "11";  
s3.intern();  
System.out.println(s3 == s4);  
```

输出结果为：

```java
JDK1.6以及以下：false false  
JDK1.7以及以上：false false  
```

## **JDK1.6**

<div align=center><img width="700" height="200" src="http://on937g0jc.bkt.clouddn.com/2017-12-04/JVM/jdk1.6.png" algin="center"/>

</div>

在JDK1.6中所有的输出结果都是 false，因为JDK1.6以及以前版本中，常量池是放在 Perm 区（属于方法区）中的，Perm区是和堆区完全分开的。

使用**引号声明的字符串都是会直接在字符串常量池中生成**的，而**new 出来的String对象是放在堆空间中**的。所以两者的内存地址肯定是不相同的，即使调用了intern()方法也是不影响的。

intern()方法在JDK1.6中的作用是：比如String s = new String("rainbowhorse")，再调用s.intern()，此时返回值还是字符串"rainbowhorse"，表面上看起来好像这个方法没什么用处。但实际上，在JDK1.6中它做了个小动作：检查字符串池里是否存在"rainbowhorse"这么一个字符串，如果存在，就返回池里的字符串；如果不存在，该方法把"rainbowhorse"添加到字符串池中，然后再返回它的引用。

## JDK1.7

### 例一分析

```java
String s = new String("1");  
s.intern();  
String s2 = "1";  
System.out.println(s == s2);  
  
String s3 = new String("1") + new String("1");  
s3.intern();  
String s4 = "11";  
System.out.println(s3 == s4); 
```

<div align=center><img width="700" height="200" src="http://on937g0jc.bkt.clouddn.com/2017-12-04/JVM/jdk1.7.png" algin="center"/>

</div>

String s = newString("1")，**生成了常量池中的“1” 和堆空间中的字符串对象**。

s.intern()，这一行的作用是s对象去常量池中寻找后发现"1"**已经存在于常量池中了**。

String s2 = "1"，这行代码是生成一个s2的引用**指向常量池中的“1”对象**。

结果就是 s 和 s2 的引用地址明显不同。因此返回了false。



String s3 = new String("1") + newString("1")，这行代码**在字符串常量池中生成“1” ，并在堆空间中生成s3引用指向的对象（内容为"11"）**。注意**此时常量池中是没有 “11”对象**的。

s3.intern()，这一行代码，是将 s3中的**“11”字符串放入 String 常量池中**，此时常量池中不存在“11”字符串，JDK1.6的做法是直接在常量池中生成一个 "11" 的对象。

**但是在JDK1.7中，常量池中不需要再存储一份对象了，可以直接存储堆中的引用**。这份引用直接指向 s3 引用的对象，也就是说s3.intern() ==s3会返回true。

String s4 = "11"， 这一行代码会**直接去常量池中创建**，但是发现已经有这个对象了，此时也就是**指向 s3 引用对象的一个引用**。因此s3 == s4返回了true。

### 例二分析

```java
String s = new String("1");  
String s2 = "1";  
s.intern();  
System.out.println(s == s2);  
  
String s3 = new String("1") + new String("1");  
String s4 = "11";  
s3.intern();  
System.out.println(s3 == s4); 
```

<div align=center><img width="700" height="200" src="http://on937g0jc.bkt.clouddn.com/2017-12-7/String_intern/jdk1.7-2.png" algin="center"/>

</div>

String s = newString("1")，生成了**常量池中的“1” 和堆空间中的字符串对象**。

String s2 = "1"，这行代码是生成一个s2的**引用指向常量池中的“1”对象，但是发现已经存在了，那么就直接指向了它**。

s.intern()，这一行在这里就没什么实际作用了。因为"1"已经存在了。

结果就是 s 和 s2 的引用地址明显不同。因此返回了false。



String s3 = new String("1") + newString("1")，这行代码**在字符串常量池中生成“1” ，并在堆空间中生成s3引用指向的对象（内容为"11"）**。注意此时常量池中是没有 “11”对象的。

String s4 = "11"， 这一行代码会**直接去生成常量池中的"11"**。

s3.intern()，这一行在这里就没什么实际作用了。因为"11"已经存在了。

结果就是 s3 和 s4 的引用地址明显不同。因此返回了false。

# 总结

从JDK 1.7后，HotSpot 将常量池从永久代移到了元空间，正因为如此，JDK 1.7 后的intern方法在实现上发生了比较大的改变，JDK 1.7后，intern方法还是会先去查询常量池中是否有已经存在，如果存在，则返回常量池中的引用，这一点与之前没有区别，区别在于，**如果在常量池找不到对应的字符串，则不会再将字符串拷贝到常量池，而只是在常量池中生成一个对原字符串的引用**。