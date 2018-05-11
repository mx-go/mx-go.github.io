---
title: 说说Spring中的事务
date: 2018-05-09 21:24:58
tags: [java,spring]
categories: technology
---

# 引言

在开发过程中，合理的使用事务是非常重要的。使用事务常常是为了维护高度的数据完整性和一致性。如果不关心数据的质量，就不必使用事务。毕竟，Java平台中的事务支持会降低性能，引发锁定问题和数据库并发性问题，而且会增加应用程序的复杂性。最近在面试中也是频频出现，在这里回顾加深一下。<div align=center><img width="800" height="200" src="http://on937g0jc.bkt.clouddn.com/2018-5/transaction/spring.jpg" algin="center"/></div><!-- more -->

# 四大特性

数据库中事务有四大特性，简称为 **ACID** 特性。

## 原子性(Atomicity)

事务的原子性是指事务是一个不可分割的工作单位，这组操作要么全部发生，否则全部不发生。

## 一致性(Consistency)

一致性是指事务必须使数据库从一个一致性状态变换到另一个一致性状态，也就是说一个事务执行之前和执行之后都必须处于一致性状态。

## 隔离性(Isolation)

隔离性是当多个用户并发访问数据库时，比如操作同一张表时，数据库为每一个用户开启的事务，不能被其他事务的操作所干扰，多个并发事务之间要相互隔离。

## 持久性(Durability)

持久性是指一个事务一旦被提交了，那么对数据库中的数据的改变就是永久性的，即便是在数据库系统遇到故障的情况下也不会丢失提交事务的操作。

# 隔离级别

## 事务并发带来的问题

### 脏读(Dirty Reads)

脏读是指在一个事务处理过程里读取了另一个未提交的事务中的数据。

当一个事务正在多次修改某个数据，而在这个事务中这多次的修改都还未提交，这时一个并发的事务来访问该数据，就会造成两个事务得到的数据不一致。

例如：用户A向用户B转账100元，对应SQL命令如下：

```sql
update account set money = money + 100 where name='B';  (此时A通知B)

update account set money = money - 100 where name='A';
```

当只执行第一条SQL时，A通知B查看账户，B发现确实钱已到账（*此时即发生了脏读*），而之后无论第二条SQL是否执行，只要该事务不提交，则所有操作都将回滚，那么当B以后再次查看账户时就会发现钱其实并没有转。

### 不可重复读(Non-Repeatable Reads)

不可重复读是指在对于数据库中的某个数据，一个事务范围内多次查询却返回了不同的数据值，这是由于在查询间隔，被另一个事务修改并提交了。

例如事务T1在读取某一数据，而事务T2立马修改了这个数据并且提交事务给数据库，事务T1再次读取该数据就得到了不同的结果，发生了不可重复读。

> 不可重复读和脏读的区别是，脏读是某一事务读取了另一个事务未提交的脏数据，而不可重复读则是读取了前一事务提交的数据。

### 幻读(虚读)(Phantom Reads)

幻读是事务非独立执行时发生的一种现象。

例如事务T1对一个表中所有的行的某个数据项做了从“1”修改为“2”的操作，这时事务T2又对这个表中插入了一行数据项，而这个数据项的数值还是为“1”并且提交给数据库。而操作事务T1的用户如果再查看刚刚修改的数据，会发现还有一行没有修改，其实这行是从事务T2中添加的，就好像产生幻觉一样，这就是发生了幻读。

> 不可重复读是指同一查询在同一事务中多次进行，由于其他提交事务所做的**修改或删除**，每次返回不同的结果集，此时发生非重复读。
>
> 幻像读是指同一查询在同一事务中多次进行，由于其他提交事务所做的**插入**操作，每次返回不同的结果集，此时发生幻像读。

## 四种隔离级别(Isolation Level)

- **Serializable** (串行化)：可避免脏读、不可重复读、幻读的发生。
- **Repeatable read** (可重复读)：可避免脏读、不可重复读的发生。
- **Read committed** (读已提交)：可避免脏读的发生。
- **Read uncommitted** (读未提交)：最低级别，任何情况都无法保证。

以上四种隔离级别最高的是*Serializable*级别，最低的是*Read uncommitted*级别，当然级别越高，执行效率就越低。像*Serializable*这样的级别，就是以锁表的方式(类似于Java多线程中的锁) 使得其他的线程只能在锁外等待，所以平时选用何种隔离级别应该根据实际情况。**`MySQL数据库中默认的隔离级别为Repeatable read (可重复读)`**。

在MySQL数据库中查看当前事务的隔离级别：

```sql
SELECT @@tx_isolation;
```

# 传播方式(Propagation)

## **REQUIRED（默认）**

如果存在一个事务，则支持当前事务。如果没有事务则开启一个新的事务(S*upport a current transaction, create a new one if none exists.*)。

被设置成这个级别时，会为每一个被调用的方法创建一个逻辑事务域。如果前面的方法已经创建了事务，那么后面的方法支持当前的事务，如果当前没有事务会重新建立事务。

## **REQUIRES_NEW**

新建事务，如果当前存在事务，把当前事务挂起(*Create a new transaction, suspend the current transaction if one exists.*)。

## **SUPPORTS**

支持当前事务，如果当前没有事务，就以非事务方式执行(*Support a current transaction, execute non-transactionally if none exists.*)。

## **NOT_SUPPORTED**

以非事务方式执行操作，如果当前存在事务，就把当前事务挂起(*Execute non-transactionally, suspend the current transaction if one exists.*)。

## **NEVER**

以非事务方式执行，如果当前存在事务，则抛出异常(*Execute non-transactionally, throw an exception if a transaction exists.*)。

## **NESTED**

支持当前事务，新增Savepoint点，与当前事务同步提交或回滚(*Execute within a nested transaction if a current transaction exists, behave like PROPAGATION_REQUIRED else.*)。

## **MANDATORY**

支持当前事务，如果当前没有事务，就抛出异常(*Support a current transaction, throw an exception if none exists.*)。

## REQUIRES_NEW和NESTED区别

***`REQUIRES_NEW`***启动一个新的，不依赖于环境的 "内部" 事务。这个事务将被完全*commited*或*rolledback*而不依赖于外部事务，它拥有自己的隔离范围，自己的锁等等。当内部事务开始执行时，外部事务将被挂起，内务事务结束时，外部事务将继续执行。*REQUIRES_NEW*常用于日志记录、交易失败仍需留痕等场景。

***`PROPAGATION_NESTED`***开始一个"嵌套"的事务，它是已经存在事务的一个真正的子事务。嵌套事务开始执行时，它将取得一个*savepoint*。 如果这个嵌套事务失败，将回滚到此*savepoint*.。嵌套事务是外部事务的一部分,，只有外部事务结束后它才会被提交。

由此可见，**PROPAGATION_REQUIRES_NEW**和**PROPAGATION_NESTED**的最大区别在于，*PROPAGATION_REQUIRES_NEW*完全是一个新的事务，而*PROPAGATION_NESTED*则是外部事务的子事务，如果外部事务*commit*，嵌套事务也会被*commit*，这个规则同样适用于*rollback*。

# Spring事务陷阱

## 同一方法中执行多次表更新（无事务）

```java
// 例一
public TradeData placeTrade(TradeData trade) throws Exception {
   try {
      insertTrade(trade);
      updateAcct(trade);
      return trade;
   } catch (Exception up) {
      //log the error
      throw up;
   }
}
```

`insertTrade()` 和 `updateAcct()` 方法使用不带事务的标准 JDBC 代码。`insertTrade()` 方法结束后，数据库保存（并提交了）交易订单。如果 `updateAcct()` 方法由于任意原因失败，交易订单仍然会在 `placeTrade()` 方法结束时保存在 `TRADE` 表内，这会导致数据库出现不一致的数据。如果 `placeTrade()` 方法使用了事务，这两个活动都会包含在一个事务中，如果帐户更新失败，交易订单就会回滚。

## 利用@Transaction注解事务

例二：将只读标志与 **`SUPPORTS`** 传播模式结合使用

```java
// 例二
@Transactional(readOnly = true, propagation=Propagation.SUPPORTS)
public long insertTrade(TradeData trade) throws Exception {
   	insert(trade);
}
```

执行到例二的 `insertTrade()` 方法时，结果是：**正确插入交易订单并提交数据**。

交易订单会被正确地插入到数据库中，即使只读标志被设置为 `true`，且事务传播模式被设置为 `SUPPORTS`。但这是如何做到的呢？由于传播模式被设置为 `SUPPORTS`，所以不会启动任何事务，因此该方法有效地利用了一个本地（数据库）事务。**只读标志只在事务启动时应用**。在本例中，因为没有启动任何事务，所以只读标志被忽略。

例三：将只读标志与 **`REQUIRED`** 传播模式结合使用

```java
@Transactional(readOnly = true, propagation=Propagation.REQUIRED)
public long insertTrade(TradeData trade) throws Exception {
 	 em.persist(trade);
}
```

执行到例三的 `insertTrade()` 方法时，结果是：**抛出一个只读连接异常**。

表示正在试图对一个只读连接执行更新。因为启动了一个事务（`REQUIRED`），而连接被设置为只读。毫无疑问，在试图执行 SQL 语句时，会得到一个异常，告诉该连接是一个只读连接。

关于只读标志很奇怪的一点是：要使用它，必须启动一个事务。如果只是读取数据，需要事务吗？答案是根本不需要。**启动一个事务来执行只读操作会增加处理线程的开销，并会导致数据库发生共享读取锁定**（具体取决于使用的数据库类型和设置的隔离级别）。

例四：使用只读标志

```java
@Transactional(readOnly = true)
public TradeData getTrade(long tradeId) throws Exception {
   return em.find(tradeId);
}
```

执行到例四的 `getTrade()` 方法时，结果是：**启动一个事务，获取交易订单，然后提交事务**。

`@Transactional` 注释的**默认传播模式是 `REQUIRED`**。这意味着事务会在不必要的情况下启动。根据使用的数据库，这会引起不必要的共享锁，可能会使数据库中出现死锁的情况。此外，启动和停止事务将消耗不必要的处理时间和资源。总的来说，在使用基于ORM的框架时，只读标志基本上毫无用处，在大多数情况下会被忽略。但如果坚持使用它，记得将传播模式设置为 `SUPPORTS`（如下例五所示），这样就不会启动事务：

```java
// 例五
@Transactional(readOnly = true, propagation=Propagation.SUPPORTS)
public TradeData getTrade(long tradeId) throws Exception {
   return em.find(tradeId);
}
```

## `REQUIRES_NEW `事务属性陷阱

`REQUIRES_NEW` 事务属性总是会在启动方法时启动一个新的事务，使用 `REQUIRES_NEW` 事务属性都会得到不好的结果并导致数据损坏和不一致。

例六： 使用 `REQUIRES_NEW` 事务属性

```java
@Transactional(propagation=Propagation.REQUIRES_NEW)
public long insertTrade(TradeData trade) throws Exception {...}
 
@Transactional(propagation=Propagation.REQUIRES_NEW)
public void updateAcct(TradeData trade) throws Exception {...}
```

例六中的两个方法都是公共方法，意味着它们可以单独调用。当使用 `REQUIRES_NEW` 属性的几个方法通过服务间通信或编排在同一逻辑工作单元内调用时，该属性就会出现问题。假设在例六中，可以独立于一些用例中的任何其他方法来调用 `updateAcct()` 方法，但也有在 `insertTrade()` 方法中调用 `updateAcct()` 方法的情况。现在如果调用 `updateAcct()` 方法后抛出异常，交易订单就会回滚，但帐户更新将会提交给数据库，如下例七所示：

例七：使用 `REQUIRES_NEW` 事务属性的多次更新

```java
@Transactional(propagation=Propagation.REQUIRES_NEW)
public long insertTrade(TradeData trade) throws Exception {
   em.persist(trade);
   updateAcct(trade);
   // 这里出现异常! insertTrade回滚但是updateAcct不会回滚!
   // exception occurs here! Trade rolled back but account update is not!
   ...
}
```

发生这种情况的原因是 `updateAcct()` 方法中启动了一个新事务，所以在 `updateAcct()` 方法结束后，事务将被提交。使用 `REQUIRES_NEW` 事务属性时，如果存在现有事务上下文，当前的事务会被挂起并启动一个新事务。方法结束后，新的事务被提交，原来的事务继续执行。

**由于这种行为，只有在被调用方法中的数据库操作需要保存到数据库中，而不管覆盖事务的结果如何时，才应该使用 `REQUIRES_NEW` 事务属性**。比如，假设尝试的所有股票交易都必须被记录在一个审计数据库中。出于验证错误、资金不足或其他原因，不管交易是否失败，这条信息都需要被持久化。如果没有对审计方法使用 `REQUIRES_NEW` 属性，审计记录就会连同尝试执行的交易一起回滚。使用 `REQUIRES_NEW` 属性可以确保不管初始事务的结果如何，审计数据都会被保存。这里要注意的一点是，要始终使用 `MANDATORY` 或 `REQUIRED` 属性，而不是 `REQUIRES_NEW`，除非您有足够的理由来使用它，类似审计示例中的那些理由。

## Spring事务REQUIRES_NEW不起作用

原因是A方法（*REQUIRES*）调用B方法（*REQUIRES_NEW*）在同一类中，如果两个方法写在同一个Service类中，Spring并不会重新创建新事务，如果是两不同的Service，就会创建新事务了。 

解决方案1：需要将两个方法分别卸载不同的类中。

解决方案2：方法写在同一个类里，但调用B方法的时候，将service自己注入自己，用这个注入对象来调用B方法。

## 事务回滚陷阱

例八：没有回滚支持

```java
@Transactional(propagation=Propagation.REQUIRED)
public TradeData placeTrade(TradeData trade) throws Exception {
   try {
      insertTrade(trade);
      updateAcct(trade);
      return trade;
   } catch (Exception up) {
      //log the error
      throw up;
   }
}
```

假设帐户中没有足够的资金来购买需要的股票，或者还没有准备购买或出售股票，并抛出了一个受检异常，那么交易订单会保存在数据库中吗？还是整个逻辑工作单元将执行回滚？答案出乎意料：根据受检异常（不管是在 Spring Framework 中还是在 EJB 中），事务会提交它还未提交的所有工作。使用例八，这意味着，如果在执行 `updateAcct()` 方法期间抛出受控异常，就会保存交易订单，但不会更新帐户来反映交易情况。

这可能是在使用事务时出现的主要数据完整性和一致性问题了。**运行时异常（即非受检异常）自动强制执行整个逻辑工作单元的回滚，但受检异常不会。**

例九：添加事务回滚支持 — Spring

```java
@Transactional(propagation=Propagation.REQUIRED, rollbackFor=Exception.class)
public TradeData placeTrade(TradeData trade) throws Exception {
   try {
      insertTrade(trade);
      updateAcct(trade);
      return trade;
   } catch (Exception up) {
      //log the error
      throw up;
   }
}
```

`@Transactional` 注释中使用了 `rollbackFor` 参数。这个参数接受一个单一异常类或一组异常类，也可以使用 `rollbackForClassName` 参数将异常的名称指定为 Java `String` 类型。还可以使用此属性的相反形式（`noRollbackFor`）指定除某些异常以外的所有异常应该强制回滚。通常大多数开发人员指定 `Exception.class` 作为值，表示该方法中的所有异常应该强制回滚。

下面两种方式同样会回滚

```java
// 方式一，手动回滚
@Transactional(propagation=Propagation.REQUIRED)
public TradeData placeTrade1(TradeData trade) throws Exception {
   try {
      insertTrade(trade);
      updateAcct(trade);
      return trade;
   } catch (Exception up) {
   	  TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
   }
}

// 方式二，抛出RuntimeException
@Transactional(propagation=Propagation.REQUIRED)
public TradeData placeTrade2(TradeData trade) throws Exception {
   try {
      insertTrade(trade);
      updateAcct(trade);
      return trade;
   } catch (Exception up) {
   	  throw new RuntimeException(); 
   }
}
```

# 参考

[了解事务陷阱](https://www.ibm.com/developerworks/cn/java/j-ts1.html)

