---
title: Spring下MySQL读写分离
date: 2018-05-02 15:46:51
tags: [mysql,spring]
categories: technology
---

# 引言

之前的文章已经说明MySQL主从/主主同步环境的搭建，接下来就是要实现在业务代码里面实现读写分离。在当前流行的SSM的框架开发的web项目下，数据库模式为主从同步的环境下编写业务代码。

<div align=center><img width="700" height="300" src="http://on937g0jc.bkt.clouddn.com/2018-5/MySQL_spring/index.png" algin="center"/>

</div><!-- more -->

# 编写jdbc.propreties

在这里指定了两个数据库，主从数据库都在本地，只是端口不一致。

```properties
#数据库连接池的配置
jdbc.pool.init=1
jdbc.pool.minIdle=3
jdbc.pool.maxActive=20

#mysql驱动
jdbc.driver=com.mysql.jdbc.Driver
#主数据库地址
jdbc.master.url=jdbc:mysql://127.0.0.1:3306/test?useUnicode=true&characterEncoding=utf-8&autoReconnect=true
#从数据库地址
jdbc.slave.url=jdbc:mysql://127.0.0.1:3308/test?useUnicode=true&characterEncoding=utf-8&autoReconnect=true
#数据库账号、密码
jdbc.username=mysqluser
jdbc.password=mysqlpassword
```

注意：

> 在此之前，项目中一般会使用一个数据库用户远程操作数据库（避免直接使用root用户），因此需要在主从数据库里面都创建一个用户mysqluser，赋予其增删改查的权限：
>
> ```
> GRANT select,insert,update,delete ON *.* TO 'mysqluser'@'%' IDENTIFIED BY 'mysqlpassword' WITH GRANT OPTION;
> ```

# 配置数据源

在spring-dao.xml中配置数据源，部分配置如下：

```xml
 <!-- 1.配置数据库相关参数properties的属性：${url} -->
    <context:property-placeholder ignore-unresolvable="true" location="classpath:jdbc.properties" />
<!-- 数据源配置, 使用 Druid 数据库连接池 -->
	<bean id="dataSourceMaster" class="com.alibaba.druid.pool.DruidDataSource" init-method="init" destroy-method="close"> 
	    <!-- 数据源驱动类可不写，Druid默认会自动根据URL识别DriverClass -->
	    <property name="driverClassName" value="${jdbc.driver}" />
	    
		<!-- 基本属性 url、user、password -->
		<property name="url" value="${jdbc.master.url}" />
		<property name="username" value="${jdbc.username}" />
		<property name="password" value="${jdbc.password}" />
		
		<!-- 配置初始化大小、最小、最大连接池 -->
		<property name="initialSize" value="${jdbc.pool.init}" />
		<property name="minIdle" value="${jdbc.pool.minIdle}" /> 
		<property name="maxActive" value="${jdbc.pool.maxActive}" />
		
		<!-- 配置获取连接等待超时的时间 -->
		<property name="maxWait" value="60000" />
		
		<!-- 配置间隔多久才进行一次检测，检测需要关闭的空闲连接，单位是毫秒 -->
		<property name="timeBetweenEvictionRunsMillis" value="60000" />
		
		<!-- 配置一个连接在池中最小生存的时间，单位是毫秒 -->
		<property name="minEvictableIdleTimeMillis" value="300000" />
		
		<property name="validationQuery" value="${jdbc.testSql}" />
		<property name="testWhileIdle" value="true" />
		<property name="testOnBorrow" value="false" />
		<property name="testOnReturn" value="false" />
		<!-- 打开removeAbandoned功能 -->
         <property name="removeAbandoned" value="true" />
         <!-- 1800秒，也就是30分钟 -->
         <property name="removeAbandonedTimeout" value="1800" />
		<!-- 配置监控统计拦截的filters -->
	    <property name="filters" value="stat" />
	    <property name="connectionProperties" value="druid.stat.slowSqlMillis=5000" />
	</bean>
	
	<!-- 数据源配置, 使用 Druid 数据库连接池 -->
	<bean id="dataSourceSlave" class="com.alibaba.druid.pool.DruidDataSource" init-method="init" destroy-method="close"> 
	    <!-- 数据源驱动类可不写，Druid默认会自动根据URL识别DriverClass -->
	    <property name="driverClassName" value="${jdbc.driver}" />
	    
		<!-- 基本属性 url、user、password -->
		<property name="url" value="${jdbc.slave.url}" />
		<property name="username" value="${jdbc.username}" />
		<property name="password" value="${jdbc.password}" />
		
		<!-- 配置初始化大小、最小、最大 -->
		<property name="initialSize" value="${jdbc.pool.init}" />
		<property name="minIdle" value="${jdbc.pool.minIdle}" /> 
		<property name="maxActive" value="${jdbc.pool.maxActive}" />
		
		<!-- 配置获取连接等待超时的时间 -->
		<property name="maxWait" value="60000" />
		
		<!-- 配置间隔多久才进行一次检测，检测需要关闭的空闲连接，单位是毫秒 -->
		<property name="timeBetweenEvictionRunsMillis" value="60000" />
		
		<!-- 配置一个连接在池中最小生存的时间，单位是毫秒 -->
		<property name="minEvictableIdleTimeMillis" value="300000" />
		
		<property name="validationQuery" value="${jdbc.testSql}" />
		<property name="testWhileIdle" value="true" />
		<property name="testOnBorrow" value="false" />
		<property name="testOnReturn" value="false" />
		<!-- 打开removeAbandoned功能 -->
         <property name="removeAbandoned" value="true" />
         <!-- 1800秒，也就是30分钟 -->
         <property name="removeAbandonedTimeout" value="1800" />
         
		<!-- 配置监控统计拦截的filters -->
	    <property name="filters" value="stat" />
	    <property name="connectionProperties" value="druid.stat.slowSqlMillis=5000" />
	</bean>
	
	<!--配置动态数据源，这里的targetDataSource就是路由数据源所对应的名称-->
    <bean id="dataSourceSelector" class="com.rainbowhorse.common.dynamicDataSource.DataSourceSelector">
        <property name="targetDataSources">
            <map>
                <entry value-ref="dataSourceMaster" key="master"></entry>
                <entry value-ref="dataSourceSlave" key="slave"></entry>
            </map>
        </property>
    </bean>
    <!--配置数据源懒加载-->
    <bean id="dataSource" class="org.springframework.jdbc.datasource.LazyConnectionDataSourceProxy">
        <property name="targetDataSource">
            <ref bean="dataSourceSelector"></ref>
        </property>
    </bean>
```

说明：首先`读取配置文件jdbc.properties`，然后配置了两个具体的数据源dataSourceMaster、dataSourceSlave。里面配置了数据库连接的具体属性，然后配置了动态数据源，他将决定使用哪个具体的数据源，**这里面的关键就是DataSourceSelector，接下来会实现这个bean**。下一步设置了数据源的懒加载，保证在数据源加载的时候其他依赖的bean已经加载好了。接着就是常规的配置了，mybatis全局配置文件如下。

# mybatis全局配置文件

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE configuration PUBLIC "-//mybatis.org//DTD Config 3.0//EN" "http://mybatis.org/dtd/mybatis-3-config.dtd">
<configuration>
	<!-- 全局参数 -->
	<settings>
		<!-- 使全局的映射器启用或禁用缓存。 -->
		<setting name="cacheEnabled" value="true"/>
		<!-- 全局启用或禁用延迟加载。当禁用时，所有关联对象都会即时加载。 -->
		<setting name="lazyLoadingEnabled" value="true"/>
		<!-- 当启用时，有延迟加载属性的对象在被调用时将会完全加载任意属性。否则，每种属性将会按需要加载。 -->
		<setting name="aggressiveLazyLoading" value="true"/>
		<!-- 是否允许单条sql 返回多个数据集  (取决于驱动的兼容性) default:true -->
		<setting name="multipleResultSetsEnabled" value="true"/>
		<!-- 是否可以使用列的别名 (取决于驱动的兼容性) default:true -->
		<setting name="useColumnLabel" value="true"/>
		<!-- 允许JDBC 生成主键。需要驱动器支持。如果设为了true，这个设置将强制使用被生成的主键，有一些驱动器不兼容不过仍然可以执行。  default:false  -->
		<setting name="useGeneratedKeys" value="false"/>
		<!-- 指定 MyBatis 如何自动映射 数据基表的列 NONE：不隐射　PARTIAL:部分  FULL:全部  -->  
		<setting name="autoMappingBehavior" value="PARTIAL"/>
		<!-- 这是默认的执行类型  （SIMPLE: 简单； REUSE: 执行器可能重复使用prepared statements语句；BATCH: 执行器可以重复执行语句和批量更新）  -->
		<setting name="defaultExecutorType" value="SIMPLE"/>
		<!-- 使用驼峰命名法转换字段。 -->
		<setting name="mapUnderscoreToCamelCase" value="true"/>
		<!-- 设置本地缓存范围 session:就会有数据的共享  statement:语句范围 (这样就不会有数据的共享 ) defalut:session -->
        <setting name="localCacheScope" value="SESSION"/>
        <!-- 设置但JDBC类型为空时,某些驱动程序 要指定值,default:OTHER，插入空值时不需要指定类型 -->
        <setting name="jdbcTypeForNull" value="NULL"/>
	</settings>
	
	<!-- 插件配置 -->
	<plugins>
        <plugin interceptor="com.raninbowhorse.common.dynamicDataSource.DateSourceSelectInterceptor" />
    </plugins>
    
</configuration>
```

**这里面的关键就是DateSourceSelectInterceptor这个拦截器，它会拦截所有的数据库操作，然后分析sql语句判断是“读”操作还是“写”操作**，接下来就来实现上述的DataSourceSelector和DateSourceSelectInterceptor。

# 编写DataSourceSelector

DataSourceSelector就是在spring-dao.xml配置的，用于动态配置数据源。代码如下：

```java
/**
 * 继承了AbstractRoutingDataSource，动态选择数据源
 * ClassName: DataSourceSelector 
 * @Description: TODO
 * @author rainbowhorse
 */
public class DataSourceSelector extends AbstractRoutingDataSource {
	@Override
	protected Object determineCurrentLookupKey() {
		return DynamicDataSourceHolder.getDataSourceType();
	}
}
```

只要继承AbstractRoutingDataSource并且重写determineCurrentLookupKey()方法就可以动态配置数据源。 

# 编写DynamicDataSourceHolder

```java
/**
 * 配置数据源
 * ClassName: DynamicDataSourceHolder
 * @Description: TODO
 * @author rainbowhorse
 */
public class DynamicDataSourceHolder {
	/** 用来存取key，ThreadLocal保证了线程安全 */
	private static ThreadLocal<String> CONTEXTHOLDER = new ThreadLocal<String>();
	/** 主库 */
	public static final String DB_MASTER = "master";
	/** 从库 */
	public static final String DB_SLAVE = "slave";

	/**
	 * 获取线程的数据源
	 * @return
	 */
	public static String getDataSourceType() {
		String db = CONTEXTHOLDER.get();
		if (db == null) {
			// 如果db为空则默认使用主库（因为主库支持读和写）
			db = DB_MASTER;
		}
		return db;
	}

	/**
	 * 设置线程的数据源
	 * @param s
	 */
	public static void setDataSourceType(String s) {
		CONTEXTHOLDER.set(s);
	}

	/**
	 * 清理连接类型
	 */
	public static void clearDataSource() {
		CONTEXTHOLDER.remove();
	}
}
```

这个类决定返回的数据源是master还是slave，这个类的初始化需要借助DateSourceSelectInterceptor，拦截所有的数据库操作请求，通过分析SQL语句来判断是读还是写操作，读操作就给DynamicDataSourceHolder设置slave源，写操作就给其设置master源。

# 编写DateSourceSelectInterceptor

```java
/**
 * 拦截数据库操作，根据sql判断是读还是写，选择不同的数据源 
 * ClassName: DateSourceSelectInterceptor
 * @Description: TODO
 * @author rainbowhorse
 */
@Intercepts({ @Signature(type = Executor.class, method = "update", args = { MappedStatement.class, Object.class }),
		@Signature(type = Executor.class, method = "query", args = { MappedStatement.class, Object.class,
				RowBounds.class, ResultHandler.class }) })
public class DateSourceSelectInterceptor implements Interceptor {
	/** 正则匹配 insert、delete、update操作 */
	private static final String REGEX = ".*insert\\\\u0020.*|.*delete\\\\u0020.*|.*update\\\\u0020.*";

	@Override
	public Object intercept(Invocation invocation) throws Throwable {
		// 判断当前操作是否有事务
		boolean synchonizationActive = TransactionSynchronizationManager.isSynchronizationActive();

		// 当前事务的readOnly状态
		boolean readOnly = TransactionSynchronizationManager.isCurrentTransactionReadOnly();
		
		// 获取执行参数
		Object[] objects = invocation.getArgs();
		MappedStatement ms = (MappedStatement) objects[0];
		// 默认设置使用主库
		String lookupKey = DynamicDataSourceHolder.DB_MASTER;

		// 有事务且为readOnly=true状态
		if (readOnly && synchonizationActive) {
			// 读方法
			if (ms.getSqlCommandType().equals(SqlCommandType.SELECT)) {
				// selectKey为自增主键（SELECT LAST_INSERT_ID()）方法,使用主库
				if (ms.getId().contains(SelectKeyGenerator.SELECT_KEY_SUFFIX)) {
					lookupKey = DynamicDataSourceHolder.DB_MASTER;
				} else {
					BoundSql boundSql = ms.getSqlSource().getBoundSql(objects[1]);
					String sql = boundSql.getSql().toLowerCase(Locale.CHINA).replace("[\\t\\n\\r]", " ");
					// 如果是insert、delete、update操作 使用主库
					if (sql.matches(REGEX)) {
						lookupKey = DynamicDataSourceHolder.DB_MASTER;
					} else {
						// 使用从库
						lookupKey = DynamicDataSourceHolder.DB_SLAVE;
					}
				}
			}
		} else {
			// 一般使用事务的都是写操作，直接使用主库
			lookupKey = DynamicDataSourceHolder.DB_MASTER;
		}
		System.out.println("-----------------" + readOnly + "--------------------");
		// 设置数据源
		DynamicDataSourceHolder.setDataSourceType(lookupKey);
		return invocation.proceed();
	}

	@Override
	public Object plugin(Object target) {
		if (target instanceof Executor) {
			// 如果是Executor（执行增删改查操作），则拦截下来
			return Plugin.wrap(target, this);
		} else {
			return target;
		}
	}

	@Override
	public void setProperties(Properties properties) {

	}
}
```

通过这个拦截器，所有的insert、delete、update操作设置使用master源，select会使用slave源。

# 最后

所有代码都已编写完毕，接下来就是测试了，通过打印的日志可判断是否正确。

> 配置多个slave用于负载均衡时，只需要在spring-dao.xml中添加slave1、slave2、slave3……然后修改dataSourceSelector这个bean，在map标签中添加slave1、slave2、slave3……即可，具体的负载均衡策略在DynamicDataSourceHolder、DateSourceSelectInterceptor中实现即可。
>
> ```xml
> <bean id="dataSourceSelector" class="com.rainbowhorse.common.dynamicDataSource.DataSourceSelector">
>         <property name="targetDataSources">
>             <map>
>                 <entry value-ref="master" key="master"></entry>
>                 <entry value-ref="slave1" key="slave1"></entry>
>                 <entry value-ref="slave2" key="slave2"></entry>
>                 <entry value-ref="slave3" key="slave3"></entry>
>             </map>
>         </property>
> </bean>
> ```

梳理一下整个流程：

  1、项目启动后，在依赖的bean加载完成后，数据源通过LazyConnectionDataSourceProxy开始加载，会引用dataSourceSelector加载数据源。 
  2、DataSourceSelector会选择一个数据源，代码里设置了默认数据源为master，在初始化的时候就默认使用master源。 
  3、在数据库操作执行时，DateSourceSelectInterceptor拦截器拦截了请求，通过分析SQL决定使用哪个数据源。**“读操作”使用slave源，“写操作”使用master源**。