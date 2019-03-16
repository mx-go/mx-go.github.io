---
title: Spring之FactoryBean
date: 2019-03-16 17:30:37
tags: [java,spring]
categories: 后端
---

# 引言

**FactoryBean** 与 **BeanFactory**名字很像，很容易搞混。但其实它们两个是完全不一样的东东。

<!-- more -->

**BeanFactory**： 以Factory结尾，表示它是一个工厂类，是用于管理Bean的一个工厂。BeanFactory是 IOC 容器的核心接口。它的职责包括：实例化、定位、配置应用程序中的对象及建立这些对象间的依赖。

**FactoryBean**：以Bean结尾，表示它是一个Bean，不同于普通Bean的是：实现了FactoryBean<T>接口的Bean，根据该Bean的Id从BeanFactory中获取的实际上是FactoryBean的getObject()返回的对象，而不是FactoryBean本身， 如果要获取FactoryBean对象，可以在id前面加一个&符号来获取。<div align=center><img width="220" height="220" src="../../../../images/2019/1-3/Spring-FactoryBean.jpg" algin="center"/></div>

# 实例

需要在调用dubbo接口时加一层自己的逻辑，实现不同的功能。例如判断直接调用别人接口还是调用HTTP接口。

原本有两个dubbo接口，通讯录员工、通讯录企业接口，如下所示：

```xml
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xmlns:p="http://www.springframework.org/schema/p"
       xmlns:dubbo="http://code.alibabatech.com/schema/dubbo"
       xsi:schemaLocation="http://www.springframework.org/schema/beans
       http://www.springframework.org/schema/beans/spring-beans.xsd
       http://code.alibabatech.com/schema/dubbo http://code.alibabatech.com/schema/dubbo/dubbo.xsd">

    <dubbo:application name="test"/>

    <!-- ZK配置 -->
    <dubbo:registry id="remote" address="zookeeper://10.113.29.1:2181?backup=10.113.29.2:2181,10.113.29.3:2181" protocol="dubbo"/>

    <!-- 通讯录员工接口 -->
    <dubbo:reference registry="remote" id="employeeService" interface="com.facishare.open.addressbook.api.EmployeeService" version="1.1" protocol="dubbo" timeout="5000" check="false"/>

    <!-- 通讯录企业接口 -->
    <dubbo:reference registry="remote" id="enterpriseService" interface="com.facishare.open.addressbook.api.EnterpriseService" protocol="dubbo" timeout="5000" check="false" version="1.1"/>
</beans>

```

## 代理对象

需要新建一个代理对象，实现上述两个接口：

```java
public interface OrganizationServiceProxy extends EmployeeService, EnterpriseService {
  // 可添加自定义方法
  String getCode(String tenantId);
}

```

## FactoryBean(重点)

> FactoryBean有三个方法，意义非常明确：
>
> **getObject**希望返回需要注册到Spring容器中去的bean实体。
>
> **getObjectType**希望返回注册的这个Object的具体类型。
>
> **isSingleton**方法希望返回这个bean是不是单例的。如果是，那么Spring容器全局将只保持一个该实例对象，否则每次getBean都将获取到一个新的该实例对象。

因为需要动态获取bean，所以同时实现了*InitializingBean*和*ApplicationContextAware*接口

```java
public class OrganizationServiceFactoryBean implements InitializingBean, ApplicationContextAware, FactoryBean<EmployeeServiceProxy> {

    /**
     * 代理对象，可直接注入使用
     */
    private OrganizationServiceProxy organizationServiceProxy;

    /**
     * 被代理对象的bean名称，以逗号隔开
     */
    private String beanNames;

    public void setBeanName(String beanNames) {
        this.beanNames = beanNames;
    }

    private static ApplicationContext applicationContext;

    @Override
    public void setApplicationContext(ApplicationContext applicationContext) throws BeansException {
        OrganizationServiceFactoryBean.applicationContext = applicationContext;
    }

    @Override
    public OrganizationServiceProxy getObject() throws Exception {
        return organizationServiceProxy;
    }

    @Override
    public Class<?> getObjectType() {
        return OrganizationServiceProxy.class;
    }

    @Override
    public boolean isSingleton() {
        return true;
    }

    @Override
    public void afterPropertiesSet() throws Exception {
        List<String> list = Splitter.on(",").splitToList(beanNames);
        List<Object> instances = Lists.newArrayList();
        list.forEach(o -> {
            instances.add(applicationContext.getBean(o));
        });

        OrganizationHandler handler = new OrganizationHandler(instances);
        organizationServiceProxy = Reflection.newProxy(OrganizationServiceProxy.class, handler);
    }
}
```

## 处理器

```java
@Data
public class OrganizationHandler implements InvocationHandler {

    /**
     * 被代理对象实例的List集合
     */
    private List instances;

    public OrganizationHandler(List instances) {
        this.instances = instances;
    }

    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
      	// OrganizationServiceProxy中的自定义方法可以在这里实现
        switch (method.getName()) {
            case "OrganizationServiceProxy 的toString()方法":
                return "";
            case "getCode":
                System.out.println(args);
            	// dosomething...
                break;
        }
      
      for (Object instance : instances) {
            Method[] methods = instance.getClass().getDeclaredMethods();
            for (Method method1 : methods) {
                if (method.getName().equals(method1.getName())) {
                    return method.invoke(instance, args);
                }
            }
        }
      // something else...
        return null;
    }
}
```

## Spring文件配置

```xml
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xmlns:p="http://www.springframework.org/schema/p"
       xmlns:dubbo="http://code.alibabatech.com/schema/dubbo"
       xsi:schemaLocation="http://www.springframework.org/schema/beans
       http://www.springframework.org/schema/beans/spring-beans.xsd
       http://code.alibabatech.com/schema/dubbo http://code.alibabatech.com/schema/dubbo/dubbo.xsd">

    <dubbo:application name="test"/>

    <!--ceshi112 ZK-->
    <dubbo:registry id="remote"
                    address="zookeeper://10.113.29.1:2181?backup=10.113.29.2:2181,10.113.29.3:2181"
                    protocol="dubbo"/>

    <!-- 通讯录员工  -->
    <dubbo:reference registry="remote" id="employeeService"
                     interface="com.facishare.open.addressbook.api.EmployeeService" version="1.1"
                     protocol="dubbo" timeout="5000" check="false"/>

    <!-- 通讯录企业   -->
    <dubbo:reference registry="remote" id="enterpriseService"
                     interface="com.facishare.open.addressbook.api.EnterpriseService"
                     protocol="dubbo" timeout="5000" check="false" version="1.1"/>
	
	<!-- 通过beanFactory获取organizationServiceProxy代理对象 -->
    <bean id="organizationServiceProxy" class="com.facishare.open.demo.proxy.OrganizationServiceFactoryBean"
          p:beanName="employeeService,enterpriseService"/>
</beans>

```

## 单元测试

```java
@RunWith(SpringJUnit4ClassRunner.class)
@ContextConfiguration(locations = {"classpath:applicationContext.xml","classpath:dubbo-consumer.xml"})
@Slf4j
public class DubboTest {
    @Autowired
    private OrganizationServiceProxy organizationServiceProxy;

    @Test
    public void testProxy() {
        ListResult<Integer> ids = organizationServiceProxy.getAdminIds("61037");
        System.out.println(ids);
        ListResult<EnterpriseSimpleInfo> list = organizationServiceProxy.getEnterpriseSimpleList(Lists.newArrayList(61037));
        System.out.println(list);
    }
}
```

# 总结

FactoryBean的功能更像是一种代理。有一种场景是，我们使用一个通用的类来在xml文件中注册bean，我们希望通过该通用bean产生另外一个我们希望的bean，而这个需求FactoryBean就可以办到，只需要拦你需要代理的bean，然后转换成希望的bean再注册。一个应用场景就是Rpc服务器端的bean注册，以及Rpc客户端的服务调用，都可以通过一个第三方bean来产生我们真正需要的bean。