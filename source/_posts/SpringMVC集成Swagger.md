---
title: SpringMVC集成Swagger
date: 2019-04-15 22:49:48
tags: [tips]
categories: 工具
img: ../../../../images/2019/4-6/swagger.jpg
---

当前方便管理项目中的API接口，最流行的莫过于Swagger了，功能强大，UI界面漂亮，并且支持在线测试等等。所以仔细研究了下Swagger的使用。在这里记录下SpringMVC集成Swagger。<!-- more -->

# 引入Maven坐标

```xml
<!-- Jackson -->
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-core</artifactId>
            <version>2.5.3</version>
        </dependency>
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-annotations</artifactId>
            <version>2.5.3</version>
        </dependency>
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
            <version>2.5.3</version>
        </dependency>

        <!-- Swagger -->
        <dependency>
            <groupId>io.springfox</groupId>
            <artifactId>springfox-swagger2</artifactId>
            <version>2.6.1</version>
        </dependency>
<!-- Swagger-UI插件 -->
        <dependency>
            <groupId>com.github.xiaoymin</groupId>
            <artifactId>swagger-bootstrap-ui</artifactId>
            <version>1.9.2</version>
        </dependency>
```

# Spring配置

```xml
    <mvc:default-servlet-handler />
```

# Swagger配置

> 对于Swagger的配置，其实是自定义一个与Swagger相关的Config类，可以通过Java编码的实现配置。

```java
/**
 * @author max
 */
@Configuration
@EnableSwagger2
public class SwaggerConfig {
		
  	// 控制是否展示Swagger
    @ReloadableProperty("swagger.show")
    private boolean swaggerShow = false;

    @Bean
    public Docket createRestApi() {

        Predicate<RequestHandler> predicate = input -> {
            Class<?> declaringClass = input.declaringClass();
            if (declaringClass == TestController.class) {
                return false;
            }
            // 被注解的类
            if (declaringClass.isAnnotationPresent(RestController.class)) {
                return true;
            }
            // 被注解的方法
            return input.isAnnotatedWith(ResponseBody.class);
        };

        return new Docket(DocumentationType.SWAGGER_2)
                .enable(swaggerShow)
                .apiInfo(apiInfo())
                .useDefaultResponseMessages(false)
                .select()
                .apis(predicate::test)
                //过滤的接口
                .paths(PathSelectors.any())
                .build();
    }

    private ApiInfo apiInfo() {
        // 大标题
        return new ApiInfoBuilder().title("消息系统接口服务")
                .description("需要提供更多接口请联系 彩虹马")
                .contact(new Contact("max", "", "xxx@xxx.com"))
                .version("1.0")
                .build();
    }
}
```

接口Controller实例如下：

<div align=center><img src="../../../../images/2019/4-6/swagger-1.png" algin="center"/></div>

# Swagger注解

常用注解：

1. **@Api**

   该注解将一个Controller（Class）标注为一个swagger资源（API）。在默认情况下，Swagger-Core只会扫描解析具有@Api注解的类，而会自动忽略其他类别资源（JAX-RS endpoints，Servlets等等）的注解。该注解包含以下几个重要属性：

   - tags：API分组标签。具有相同标签的API将会被归并在一组内展示。
   - value：如果tags没有定义，value将作为Api的tags使用。

2. **@ApiOperation**

   在指定的（路由）路径上，对一个操作或HTTP方法进行描述。具有相同路径的不同操作会被归组为同一个操作对象。不同的HTTP请求方法及路径组合构成一个唯一操作。此注解的属性有：

   - value：对操作的简单说明，长度为120个字母，60个汉字。
   - notes：对操作的详细说明。
   - httpMethod：HTTP请求的动作名，可选值有："GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS" and "PATCH"。
   - code：默认为200，有效值必须符合标准的[HTTP Status Code Definitions](<https://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html>)。

3. **@ApiModelProperty**

   对model属性的注解，主要的属性值有：

   - value：属性简短描述。
   - example：属性的示例值。
   - required：是否为必须值。

更多注解可参考：<https://mp.weixin.qq.com/s/ZD0i1-lcqRHtgYL-HW1Xpg>

# 效果

启动服务后访问*http://{ip}:{port}/doc.html*即可进入Swagger。

前端UI没有采用默认的，找到了一个更漂亮的：<https://github.com/xiaoymin/Swagger-Bootstrap-UI>

<div align=center><img src="../../../../images/2019/4-6/swagger-2.png" algin="center"/></div>

<div align=center><img src="../../../../images/2019/4-6/swagger-3.png" algin="center"/></div>

注解和页面展示对应关系：

<div align=center><img src="../../../../images/2019/4-6/swagger-5.jpg" algin="center"/></div>

<div align=center><img src="../../../../images/2019/4-6/swagger-4.png" algin="center"/></div>

# 环境控制

Swagger提供给内部使用的接口稳定，如果在生产环境不想暴露出去，有以下解决办法：

1. 设置了`spring.profiles.active`

   可以通过**profile**注解来处理。 Swagger的congif类上声明**@Profile({"dev", "test"})**,发布到生产上使用pro的profile时， swagger是无效的。

2. 无`spring.profiles.active`

   ```java
   new Docket(DocumentationType.SWAGGER_2)
     	.enable(false)
   ```