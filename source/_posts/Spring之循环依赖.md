---
title: Spring之循环依赖
date: 2020-03-05 16:21:32
tags: [java,spring]
categories: 后端
img: ../../../../images/2020/5-8/spring-dependency0.jpg
---

# 引言

在Spring框架中，针对Bean之间的循环依赖，Spring通过**三级缓存**的机制已经解决和规避了部分场景Bean的循环依赖。但是仍需了解Spring解决循环依赖的原理和注意Spring无法解决循环依赖的场景，避免出现此类问题。<div align=center><img width="800" height="400" src="../../../../images/2020/5-8/spring-dependency1.jpg" algin="center"/></div><!-- more -->

# 循环依赖示例

```java
@Service
public class AServiceImpl implements AService {

    @Autowired
    private BService bService;
}

@Service
public class BServiceImpl implements BService{

    @Autowired
    private AService aService;
}
```

这个例子是非常经典的Spring Bean循环依赖的场景，在这种循环依赖场景，Spring已经帮我们解决了循环依赖的问题，所以服务可以正常启动和运行。

# Spring循环依赖的场景

## 构造器注入

```java
@Service
public class AServiceImpl implements AService {

    private BService bService;

    public AServiceImpl(BService bService) {
        this.bService = bService;
    }
}

@Service
public class BServiceImpl implements BService {

    private AService aService;

    public BServiceImpl(AService aService) {
        this.aService = aService;
    }
}
```

结果：项目启动失败并抛出`BeanCurrentlyInCreationException`异常。

```java
Caused by: org.springframework.beans.factory.BeanCurrentlyInCreationException: Error creating bean with name 'AServiceImpl': Requested bean is currently in creation: Is there an unresolvable circular reference?
	at org.springframework.beans.factory.support.DefaultSingletonBeanRegistry.beforeSingletonCreation(DefaultSingletonBeanRegistry.java:347)
	at org.springframework.beans.factory.support.DefaultSingletonBeanRegistry.getSingleton(DefaultSingletonBeanRegistry.java:223)
	at org.springframework.beans.factory.support.AbstractBeanFactory.doGetBean(AbstractBeanFactory.java:308)
	at org.springframework.beans.factory.support.AbstractBeanFactory.getBean(AbstractBeanFactory.java:202)
```

**构造器注入无法解决循环依赖问题**，Spring只能抛出`BeanCurrentlyInCreationException`依赖表示循环依赖。

> Spring解决循环依赖是依靠Bean的“中间态“的概念，”中间态“是指Bean已经实例化，但还没有初始化的状态，而构造器注入的是初始化后的对象，所以不能解决循环依赖。

## 注解注入(field属性注入)

这个是最常见的注入方式，通过`@Autowired`或`@Resource`注入。

```java
@Service
public class AServiceImpl implements AService {

    @Autowired
    private BService bService;
}

@Service
public class BServiceImpl implements BService{

    @Autowired
    private AService aService;
}
```

项目可以正常启动，说明循环依赖被解决。

## `prototype` field属性注入

```java
@Scope(ConfigurableBeanFactory.SCOPE_PROTOTYPE)
@Service
public class AServiceImpl implements AService {

    @Autowired
    private BService bService;
}

@Scope(ConfigurableBeanFactory.SCOPE_PROTOTYPE)
@Service
public class BServiceImpl implements BService{

    @Autowired
    private AService aService;
}
```

启动没有报错，因为非单例的Bean默认不会初始化，只有在第一次使用时才会初始化。需要手动调用`getBean()`或者在一个单例Bean内`@Autowired`就可以触发初始化。此时同样会抛出异常：

```java
Caused by: org.springframework.beans.factory.UnsatisfiedDependencyException: Error creating bean with name 'AServiceImpl': Unsatisfied dependency expressed through field 'bService'; nested exception is org.springframework.beans.factory.UnsatisfiedDependencyException: Error creating bean with name 'BServiceImpl': Unsatisfied dependency expressed through field 'aService'; nested exception is org.springframework.beans.factory.BeanCurrentlyInCreationException: Error creating bean with name 'AServiceImpl': Requested bean is currently in creation: Is there an unresolvable circular reference?
	at org.springframework.beans.factory.annotation.AutowiredAnnotationBeanPostProcessor$AutowiredFieldElement.inject(AutowiredAnnotationBeanPostProcessor.java:586)
	at org.springframework.beans.factory.annotation.InjectionMetadata.inject(InjectionMetadata.java:87)
	at org.springframework.beans.factory.annotation.AutowiredAnnotationBeanPostProcessor.postProcessPropertyValues(AutowiredAnnotationBeanPostProcessor.java:364)
	at org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory.populateBean(AbstractAutowireCapableBeanFactory.java:1269)
```

对于`prototype`作用域的bean, Spring容器无法完成依赖注入，因为Spring 容器不进行缓存`prototype`作用域的bean ，因此无法提前暴露一个创建中的bean。

网上有的说法是使用`@Lazy`注解解决。这样做启动确实不报错了，但是实际这样是解决不了问题的，**`@Lazy`只是延迟初始化，当真正使用到的时候还是会报异常。**

```java
@Autowired
@Lazy
private AService aService;
```

## 总结

### 可解决循环依赖场景

1. 注解注入(field属性)注入循环依赖

### 无法解决循环依赖场景

1. 构造器注入循环依赖
2. `prototype` field属性注入循环依赖

# Spring解决循环依赖原理

Spring创建单例Bean流程可以简化如下图：

<div align=center><img width="800" height="200" src="../../../../images/2020/5-8/spring-dependency2.jpg" algin="center"/></div>

其中比较核心的方法为：

- **createBeanInstance**：实例化，其实是调用对象的构造方法实例化对象。
- **populateBean**：填充Bean属性，主要对Bean的依赖属性进行注入(`@Autowired`、`@Resource`)

其中Spring解决循环依赖主要发生在`populateBean`这一步。

## Spring容器的”三级缓存“

在Spring容器中大量使用了缓存来加速访问，其中单例Bean也利用了这种手段。其中Spring采用了”三级缓存“来解决循环依赖问题。

```java
public class DefaultSingletonBeanRegistry extends SimpleAliasRegistry implements SingletonBeanRegistry {
    /** 一级缓存 */
    /**
     * Cache of singleton objects: bean name --> bean instance
     */
    private final Map<String, Object> singletonObjects = new ConcurrentHashMap<String, Object>(256);

    /** 二级缓存 */
    /**
     * Cache of singleton factories: bean name --> ObjectFactory
     */
    private final Map<String, ObjectFactory<?>> singletonFactories = new HashMap<String, ObjectFactory<?>>(16);

    /** 三级缓存 */
    /**
     * Cache of early singleton objects: bean name --> bean instance
     */
    private final Map<String, Object> earlySingletonObjects = new HashMap<String, Object>(16);

    /** 正在创建中的Bean。Bean开始创建时存入,创建完成时移除。 */
    /**
     * Names of beans that are currently in creation
     */
    private final Set<String> singletonsCurrentlyInCreation =
            Collections.newSetFromMap(new ConcurrentHashMap<String, Boolean>(16));

    /** 创建完成的Bean集合 */
    /**
     * Set of registered singletons, containing the bean names in registration order
     */
    private final Set<String> registeredSingletons = new LinkedHashSet<String>(256);
}
```

`AbstractBeanFactory`继承自`DefaultSingletonBeanRegistry`

1. `singletonObjects(一级缓存)`：存放完全初始化好的Bean，从该缓存中取出的bean可以直接使用。
2. `earlySingletonObjects(二级缓存)`：提前曝光的单例对象的cache，存放原始的Bean对象(已实例化，尚未初始化)，用于解决循环依赖。
3. `singletonFactories(三级缓存)`：单例对象工厂的cache，存放Bean工厂对象，用于解决循环依赖。

## 获取单例Bean的流程

```java
public class DefaultSingletonBeanRegistry extends SimpleAliasRegistry implements SingletonBeanRegistry {

    // ...

    @Override
    @Nullable
    public Object getSingleton(String beanName) {
        return getSingleton(beanName, true);
    }

    /**
     * 1.从一级缓存singletonObjects中去获取(如果获取到就直接return)
     * <p>
     * 2.如果获取不到或者对象正在创建中(isSingletonCurrentlyInCreation(),
     * 那就再从二级缓存earlySingletonObjects中获取(如果获取到就直接return）
     * <p>
     * 3.如果还是获取不到,且允许singletonFactories(allowEarlyReference=true)通过getObject()获取。
     * 就从三级缓存singletonFactory.getObject()获取。如果获取到了就从singletonFactories中移除，并且放进earlySingletonObjects。
     */
    @Nullable
    protected Object getSingleton(String beanName, boolean allowEarlyReference) {
        Object singletonObject = this.singletonObjects.get(beanName);
        // 检查一级缓存中是否存在实例。isSingletonCurrentlyInCreation判断该实例是否在创建中
        if (singletonObject == null && isSingletonCurrentlyInCreation(beanName)) {
            // 如果缓存中实例为null，则锁定全局变量singletonObjects并进行处理
            synchronized (this.singletonObjects) {
                // 尝试从二级缓存earlySingletonObjects(创建中提早曝光的beanFactory) 获取bean
                singletonObject = this.earlySingletonObjects.get(beanName);
                if (singletonObject == null && allowEarlyReference) {
                    // 尝试从三级缓存singletonFactories获取beanFactory
                    ObjectFactory<?> singletonFactory = this.singletonFactories.get(beanName);
                    if (singletonFactory != null) {
                        // 返回获取到的bean
                        singletonObject = singletonFactory.getObject();
                        // 增加二级缓存
                        this.earlySingletonObjects.put(beanName, singletonObject);
                        // 删除三级缓存
                        this.singletonFactories.remove(beanName);
                    }
                }
            }
        }
        return singletonObject;
    }

    /**
     * Bean是否正在创建中
     */
    public boolean isSingletonCurrentlyInCreation(String beanName) {
        return this.singletonsCurrentlyInCreation.contains(beanName);
    }

    // ...
}
```

Spring利用`singletonFactories`这个三级缓存将创建对象的步骤封装到`ObjectFactory`中，交给自定义的`Scope`来选择是否需要创建对象来灵活的实现`scope`。 **经过`ObjectFactory.getObject()`后，此时放进了二级缓存`earlySingletonObjects`内。这个时候对象已经实例化了，虽然还没有初始化完成，但该对象已经可以被其它对象引用了。**

```java
public class DefaultSingletonBeanRegistry extends SimpleAliasRegistry implements SingletonBeanRegistry {

    // ...

    public Object getSingleton(String beanName, ObjectFactory<?> singletonFactory) {
        // 加锁，全局变量需要同步
        synchronized (this.singletonObjects) {
            // 查看单例bean是否已经创建
            Object singletonObject = this.singletonObjects.get(beanName);
            if (singletonObject == null) {
                // ...

                // 调用getObject方法创建bean实例
                singletonObject = singletonFactory.getObject();
                newSingleton = true;

                // ...

                if (newSingleton) {
                    addSingleton(beanName, singletonObject);
                }
            }
            return singletonObject;
        }
    }

    protected void addSingleton(String beanName, Object singletonObject) {
        synchronized (this.singletonObjects) {
            // 添加一级缓存
            this.singletonObjects.put(beanName, singletonObject);
            // 移除二三级缓存
            this.singletonFactories.remove(beanName);
            this.earlySingletonObjects.remove(beanName);
            this.registeredSingletons.add(beanName);
        }
    }

    // ...
}
```

创建Bean可以简单分为三个流程：

1. 创建原始`bean`实例 → `createBeanInstance(beanName, mbd, args)`
2. 添加原始对象工厂对象到 `singletonFactories` 缓存中 → `addSingletonFactory(beanName, new ObjectFactory<Object>{...})`
3.  填充属性，解析依赖 → `populateBean(beanName, mbd, instanceWrapper)`

```java
public abstract class AbstractAutowireCapableBeanFactory extends AbstractBeanFactory implements AutowireCapableBeanFactory {

    // ...

    protected Object doCreateBean(final String beanName, final RootBeanDefinition mbd, final @Nullable Object[] args)
            throws BeanCreationException {

        // Instantiate the bean.
        BeanWrapper instanceWrapper = null;
        // 创建bean对象，并将bean对象包裹在 eanWrapper对象中返回
        instanceWrapper = createBeanInstance(beanName, mbd, args);

        // 是否需要提前暴露。单例&允许循环依赖&当前bean正在创建中。
        boolean earlySingletonExposure = (mbd.isSingleton() && this.allowCircularReferences &&
                isSingletonCurrentlyInCreation(beanName));
        if (earlySingletonExposure) {
            // 在bean未实例化之前加入到三级缓存singletonFactories中
            addSingletonFactory(beanName, () -> getEarlyBeanReference(beanName, mbd, bean));
        }

        Object exposedObject = bean;
        // 对bean进行填充，属性注入，bean依赖
        populateBean(beanName, mbd, instanceWrapper);
        // 调用相关初始化方法
        exposedObject = initializeBean(beanName, exposedObject, mbd);

        // ...

        return exposedObject;
    }

    protected void addSingletonFactory(String beanName, ObjectFactory<?> singletonFactory) {
        synchronized (this.singletonObjects) {
            // 将singletonFactory添加到singletonFactories缓存中
            if (!this.singletonObjects.containsKey(beanName)) {
                this.singletonFactories.put(beanName, singletonFactory);
                this.earlySingletonObjects.remove(beanName);
                this.registeredSingletons.add(beanName);
            }
        }
    }

    // ...
}
```

# 总结

Spring通过三级缓存可以解决部分场景下Bean循环依赖的问题，但是不能解决 1)构造器注入; 2)非单例Bean的循环依赖的问题。

Spring解决循环依赖的流程可以简化如下图所示：

<div align=center><img width="800" height="200" src="../../../../images/2020/5-8/spring-dependency3.jpg" algin="center"/></div>

以A、B类使用注解注入为例，对整个流程描述如下：

1. 获取A：调用`getBean(beanA)`，获取容器内的单例A对象，但此时容器内不存在A的实例，即走创建A的流程。
2. 实例化A(`createBeanInstance`)：此处仅仅是实例化，并将A放入三级缓存`singletonFactories`中(此时A已实例化完成，可以被引用)。
3. 初始化A(`populateBean`)：`@Autowired`依赖注入B(需要到容器内获取B)。
4. 获取B：为了完成依赖注入B，会通过`getBean(B)`去容器内寻找B。但此时B在容器内不存在，即走B的创建流程。
5. 实例化B(`createBeanInstance`)：并将其放入三级缓存`singletonFactories`中(此时B也能够被引用)。
6. 初始化B(`populateBean`)：`@Autowired`依赖注入A(此时需要去容器内获取A)
7. **重要流程**：初始化B时会调用`getBean(A)`去容器内寻找A，而此时候A已经实例化完成了并且在三级缓存中，此时可以通过A的`ObjectFactory` Bean工厂创建A对象，所以`getBean(A)`能够正常返回。
8. B初始化成功：此时B已经注入A成功，已成功持有A的引用了。return(此处return相当于返回最上面的`getBean(B)`这句代码，回到了初始化A的流程中)。
9. A初始化成功：因为B实例已经成功返回了，因此最终A也初始化成功。
10. 结束：此时，B持有的已经是初始化完成的A，A持有的也是初始化完成的B。