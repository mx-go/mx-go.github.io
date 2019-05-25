---
title: 自定义rest代理(一)
date: 2019-03-24 09:44:49
tags: [tips]
categories: 工具
---

# 引言

在项目中可能我们会调用其他的rest接口，我们会写一个`HttpClientSender`工具类，返回后然后一大堆的条件判断，既繁琐又不直观。我们可以运用所学的`FactoryBean`手写一个**rest代理**，使用时可以像Mybatis那样注入接口就可以，方便又简洁。<div align=center><img width="220" height="220" src="../../../../images/2019/1-3/restful.png" algin="center"/></div>

此工具类是依据`HttpClient`编写的。灵活性比较高，代码量也是比较多，还是有一些局限性，比如请求方法只支持GET、POST、PUT、DELETE等。

# FactoryBean

使用`FactoryBean`来动态获取代理对象，这里我们定义一个`RestServiceProxyFactoryBean<T>`实现`FactoryBean`接口。

```java
/**
 * @param <T>
 * @author max
 */
@Data
public class RestServiceProxyFactoryBean<T> implements FactoryBean<T> {

    /**
     * RestServiceProxyFactory路径
     */
    private RestServiceProxyFactory factory;
    /**
     * 接口路径
     */
    private Class<T> type;

    @Override
    public T getObject() throws Exception {
        return factory.newRestServiceProxy(type);
    }

    @Override
    public Class<?> getObjectType() {
        return type;
    }

    @Override
    public boolean isSingleton() {
        return true;
    }
}
```

`RestServiceProxyFactoryBean`有两个参数：

1. **RestServiceProxyFactory**：创建代理对象的factory，下面会说到。
2. **type**：接口所在路径。

# 代理工厂RestServiceProxyFactory

当程序调用rest接口时，会由代理工厂根据各种配置生成代理对象并填充返回结果。

```java
/**
 * @author max
 */
@Slf4j
@Data
public class RestServiceProxyFactory {

    private final static RestClient restClient = new RestClient();

    private ServiceConfigManager configManager;

    /**
     * 配置文件路径
     */
    private String location;

    public RestServiceProxyFactory() {

    }

    public void init() {
        configManager = ServiceConfigManager.build(location);
    }


    public <T> T newRestServiceProxy(Class<T> clazz) {
        return Reflection.newProxy(clazz, new InvocationHandler() {
            @Override
            public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {

                if (method.getDeclaringClass() == Object.class) {
                    return method.invoke(this, args);
                }

                if (method.isDefault()) {
                    MethodHandle methodHandler = RestServiceProxyFactory.this.getMethodHandler(method);
                    return methodHandler.bindTo(proxy).invokeWithArguments(args);
                }

                InvokeParams invokeParams = InvokeParams.getInstance(configManager, method, args);

                Object ret = null;
                try {
                    ret = restClient.invoke(invokeParams);
                } catch (Throwable e) {
                    e.printStackTrace();
                }
                return ret;
            }
        });
    }

    private MethodHandle getMethodHandler(Method method)
            throws NoSuchMethodException, IllegalAccessException, InstantiationException, java.lang.reflect.InvocationTargetException {

        Constructor<MethodHandles.Lookup> constructor = MethodHandles.Lookup.class
                .getDeclaredConstructor(Class.class, int.class);
        constructor.setAccessible(true);

        Class<?> declaringClass = method.getDeclaringClass();
        int allModes = (MethodHandles.Lookup.PUBLIC | MethodHandles.Lookup.PRIVATE | MethodHandles.Lookup.PROTECTED | MethodHandles.Lookup.PACKAGE);
        return constructor.newInstance(declaringClass, allModes)
                .unreflectSpecial(method, declaringClass);
    }
}
```

# 开源地址

由代理对象根据配置可以调用HTTP请求反序列化并封装返回结果，这样就不需要自己做其他的工作。项目已经更新到我的GitHub：<https://github.com/mx-go/rest-proxy>，**READM**中有使用方法。打成jar放到自己的项目中即可使用。
