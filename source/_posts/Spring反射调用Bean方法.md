---
title: Spring反射调用Bean方法
date: 2020-12-26 22:49:44
tags: [java,spring]
categories: 后端
---

`Spring`通过`ApplicationContextAware`反射调用服Bean方法，`ApplicationContextAware`常用方法封装。

```java
@Configuration
public class SpringReflectUtils implements ApplicationContextAware {

    /**
     * Spring容器 spring应用上下文对象
     */
    private static ApplicationContext applicationContext;

    @Override
    public void setApplicationContext(ApplicationContext applicationContext) throws BeansException {
        SpringReflectUtils.applicationContext = applicationContext;
    }

    /**
     * bean名称
     *
     * @param name 要查询的bean的名称
     * @return true：包含
     */
    public static boolean containsBean(String name) {
        return applicationContext.containsBean(name);
    }

    /**
     * 通过对象名称获取spring bean对象
     *
     * @param name bean的名称
     * @return 对象
     */
    public static Object getBean(String name) throws BeansException {
        return applicationContext.getBean(name);
    }

    /**
     * 返回与给定对象类型唯一匹配的bean实例(如果有)
     *
     * @param requiredType bean 必须匹配的类型； 可以是接口或超
     * @return 匹配所需类型的单个 bean 的实例
     */
    public static <T> T getBean(Class<T> requiredType) throws BeansException {
        return applicationContext.getBean(requiredType);
    }

    /**
     * 返回与给定对象类型（包括子类）匹配的 bean 实例
     *
     * @param type 要匹配的类或接口
     * @return Map<bean名称, bean实例>
     */
    public static <T> Map<String, T> getBeansOfType(Class<T> type) throws BeansException {
        return applicationContext.getBeansOfType(type);
    }

    /**
     * 根据bean名称、方法名反射调用spring bean中的方法
     *
     * @param serviceName 服务名
     * @param methodName  方法名
     * @param params      参数
     * @return 对象
     */
    public static Object springInvokeMethod(String serviceName, String methodName, Object[] params) throws Exception {
        Object service = getBean(serviceName);
        Class<? extends Object>[] paramClass = null;
        if (params != null) {
            int paramsLength = params.length;
            paramClass = new Class[paramsLength];
            for (int i = 0; i < paramsLength; i++) {
                paramClass[i] = params[i].getClass();
            }
        }
        // 找到方法
        Method method = ReflectionUtils.findMethod(service.getClass(), methodName, paramClass);
        // 执行方法
        return ReflectionUtils.invokeMethod(method, service, params);
    }
}
```

