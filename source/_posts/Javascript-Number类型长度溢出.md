---
title: Javascript Number类型长度溢出
date: 2019-09-19 10:36:39
tags: [java]
categories: 踩坑记录
cover: ../../../../images/2018-8/bug.jpg
---

# 引言

项目中遇到一个问题，由于后台数据库表ID使用分布式唯一算法生成的`Long`类型(19位数字)，导致转成json传至前端js使用时报错，因为js的数字类型最大只能表示15位数字长度【[*JavaScript Number 对象*](https://www.w3school.com.cn/js/js_obj_number.asp)】。

解决方案：使用Spring自定义Json序列化方式，将过长的Long类型转成String类型。

<div align=center><img src="../../../../images/2018-8/bug.jpg" algin="center"/></div>

# 默认序列化配置

默认序列化方式会将Long类型不做转换，直接传递给前端。

```xml
<mvc:annotation-driven>
        <mvc:message-converters>
            <bean class="org.springframework.http.converter.StringHttpMessageConverter">
                <constructor-arg ref="utf8charset"/>
                <property name="writeAcceptCharset" value="false"/>
            </bean>
            <bean class="org.springframework.http.converter.json.MappingJackson2HttpMessageConverter">
                <property name="objectMapper">
                    <bean class="com.fasterxml.jackson.databind.ObjectMapper">
                        <property name="serializationInclusion">
                            <value type="com.fasterxml.jackson.annotation.JsonInclude.Include">NON_NULL</value>
                        </property>
                    </bean>
                </property>
            </bean>
        </mvc:message-converters>
    </mvc:annotation-driven>
```

# 自定义序列化方式

现在需要将Long类型数字达到一定长度才转为String类型传递给前端。实现方式有两种：

## 局部配置某个字段序列化

实现抽象接口`JsonSerializer`自定义序列化类

```java
public class CustomLongConverter extends JsonSerializer<Long> {

    /**
     * 超过多少位转换为Long类型
     */
    private static final int THRESHOLD_LENGTH = 15;

    @Override
    public void serialize(Long value, JsonGenerator gen, SerializerProvider serializers) throws IOException, JsonProcessingException {
        if (value.toString().length() > THRESHOLD_LENGTH) {
            gen.writeString(value.toString());
        } else {
            gen.writeNumber(value);
        }
    }
}
```

用`@JsonSerialize(using = CustomLongConverter.class)`注解到指定字段上

```java
@JsonSerialize(using = CustomLongConverter.class)
private Long id;
```

## 全局配置序注册自定义的序列化类

### 自定义Long类型序列化

继承自`StdSerializer`类的一个自定义序列化

```java
public class CustomLongConverter extends StdSerializer<Long> {

    /**
     * 超过多少位转换为Long类型
     */
    private static final int THRESHOLD_LENGTH = 15;

    private static final long serialVersionUID = -4532126689403959662L;

    CustomLongConverter() {
        super(Long.class);
    }

    @Override
    public void serialize(Long value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
        if (value.toString().length() >= THRESHOLD_LENGTH) {
            gen.writeString(value.toString());
        } else {
            gen.writeNumber(value);
        }
    }
}
```

需要注册到`ObjectMapper`中

```java
public class ObjectMapperConverter extends ObjectMapper {

    private static final long serialVersionUID = 5383113523976711806L;

    public ObjectMapperConverter() {
        super();
        // 不包含为空的字段
        setSerializationInclusion(JsonInclude.Include.NON_NULL);
        // 不包含空字符串字段
        setSerializationInclusion(JsonInclude.Include.NON_EMPTY);

        SimpleModule simpleModule = new SimpleModule();
        simpleModule.addSerializer(Long.class, new CustomLongConverter());
        simpleModule.addSerializer(Long.TYPE, new CustomLongConverter());
        registerModule(simpleModule);
    }
}
```

### xml中配置注册方式

SpringMVC配置中需要指定为自定义序列化

```xml
<mvc:annotation-driven>
        <mvc:message-converters>
            <bean class="org.springframework.http.converter.StringHttpMessageConverter">
                <constructor-arg ref="utf8charset"/>
                <property name="writeAcceptCharset" value="false"/>
            </bean>
            <bean class="org.springframework.http.converter.json.MappingJackson2HttpMessageConverter">
                <property name="objectMapper">
                    <bean class="com.rainbowhorse.consult.web.util.ObjectMapperConverter"/>
                </property>
            </bean>
        </mvc:message-converters>
</mvc:annotation-driven>
```

