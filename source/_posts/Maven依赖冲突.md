---
title: Maven依赖冲突
date: 2020-06-10 22:04:30
tags: [工具]
categories: 
- [组件]
cover: ../../../../images/2020/5-8/maven.png
---

在开发中，比较常用的项目构建工具有`Maven`、`Gradle`，自动构建工具可以帮助我们管理项目的外部依赖包、项目编译、打包等。而依赖包冲突又是一个不得不面对的问题，所以了解依赖包的关系传递和构建工具对冲突包的版本选择就很重要了，本文主要介绍下`Maven`依赖冲突的解决方法。

{% label 在Maven中，同一个groupId和artifactId只能使用一个版本。 blue%}

# 直接依赖

若相同类型但版本不同的依赖存在于同一个`pom`文件，靠后引用的`Jar`的版本会覆盖前面的版本，最终会引入最后一个声明的依赖。

```xml
<dependencies>
    <dependency>
        <groupId>com.github.ben-manes.caffeine</groupId>
        <artifactId>caffeine</artifactId>
        <version>3.0.2</version>
    </dependency>

    <dependency>
        <groupId>com.github.ben-manes.caffeine</groupId>
        <artifactId>caffeine</artifactId>
        <version>2.8.8</version>
    </dependency>
</dependencies>
```

如上引入依赖的顺序，项目会使用 **2.8.8** 版本的`caffeine`

# 间接依赖

## 依赖传递

直接依赖的逻辑比较简单，出现冲突也比较好发现。而项目中比较常见的错误 ClassNotFoundException、NoSuchMethodError往往是因为间接依赖导致的。

依赖传递有两种方式：

- 模块之间的继承关系。在继承父模块后继承了父模块中的依赖，可通过`</dependencyManagement>`机制让子模块可选。
- 引入包时附带引入其他的依赖包。这种是依赖冲突的常见方式。

<div align=center><img src="../../../../images/2020/5-8/maven-order.png" algin="center"/></div>

- A → B → D 1.0
- A → D → D 2.0

例如上述依赖关系图，项目A引入了B和C依赖，但是B和C又依赖了不同版本的D。此时`Maven`只能选择D其中一个版本进行解析，但是会选择哪个版本进行解析就需要分析一下了。

## 依赖选择

{% label Maven依赖调解遵循两大原则：最短路径优先、声明顺序优先。 red%}

### 最短路径优先

<div align=center><img style="width: 400px;" src="../../../../images/2020/5-8/maven-dist.jpg" algin="center"/></div>

如图所示，把当前当成顶层模块，直接依赖的包作为次层模块，依次类推。最后形成一颗依赖树，其中需要比较的就是冲突依赖到顶层模块的路径，`Maven`会选择路径短的作为依赖。图中会选择 D 1.0 作为依赖。

### 第一声明顺序优先

如果冲突依赖的层次相同，那么第一原则就不起作用了，如下图所示：

<div align=center><img src="../../../../images/2020/5-8/maven-order.png" algin="center"/></div>

当路径相同时，则需要根据A直接依赖包在`pom.xml`文件中的先后顺序来判定使用哪条依赖路径，如果次级模块相同则向下级模块推，直至可以判断先后位置为止。

```xml
<!-- A pom.xml -->
<dependencies>
    <dependency>
        B
    </dependency>

    <dependency>
        C
    </dependency>
</dependencies>
```

假设在A的`pom.xml`中，B的依赖位置靠前，C在B之后，则`Maven`最终引入依赖的版本为 D 1.0

# 解决依赖冲突

在IDEA中可以使用`Maven Helper`插件查看冲突依赖并进行解决。解决依赖冲突的方法，就是使用`Maven`提供的`<exclusion>`标签，`<exclusion>`标签需要放在`<exclusions>`标签内部。

```xml
<dependencies>
    <dependency>
        <groupId>com.github.ben-manes.caffeine</groupId>
        <artifactId>caffeine</artifactId>
        <version>3.0.2</version>
        <exclusions>
            <exclusion>
                <groupId>net.minidev</groupId>
                <artifactId>accessors-smart</artifactId>
            </exclusion>
        </exclusions>
    </dependency>
</dependencies>
```
