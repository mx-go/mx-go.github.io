---
title: 从 MVC 到 DDD：COLA 分层逻辑与事务边界
date: 2026-10-21 10:32:00
tags: [Java, DDD, 架构]
categories:
- [架构, 设计]
img: /images/2026/10-21/cola/cola-layered-architecture.svg
cover: /images/2026/10-21/cola/cola-layered-architecture.svg
---

# 引言

在 Spring Boot 项目里，Controller、Service、Mapper 是熟悉的组合。随着业务规则变多，Service 可能同时承担流程编排、状态校验、数据转换和消息发布等职责，修改一个用例也会牵动多个功能。此时常见的问题是：要不要从 MVC 改成 DDD？`@Transactional` 应该放在哪层？

这几个概念解决的不是同一类问题：MVC组织请求入口，DDD帮助团队理解和表达业务，COLA则把面向对象、分层和工程结构落实为一种应用架构实践。理解分层不需要先套入某个业务用例，先看每层拥有什么职责、依赖朝向哪里即可。<!-- more -->

# MVC 与 DDD 关注点不同

MVC用于组织表现层的输入、模型和输出。在 Spring Boot Web 应用中，Spring MVC负责处理HTTP请求、参数绑定和响应；Controller把请求交给应用层，是一种常见实现方式。

DDD（Domain-Driven Design，领域驱动设计）是一套围绕业务领域进行分析和建模的方法。它帮助团队统一业务语言、识别模型边界，并把重要规则放在明确的领域模型中。DDD不是一个Web框架，也不要求项目采用某种固定包名。

因此，问题不是“MVC还是DDD”，而是“入口如何组织，业务复杂度如何表达”。一个项目完全可以用Spring MVC接入请求，同时用DDD风格的模型承载关键业务规则。

| 关注点 | MVC / Spring MVC | DDD |
| --- | --- | --- |
| 主要解决 | 请求、模型与响应如何组织 | 业务概念、规则与模型边界如何表达 |
| 常见对象 | Controller、请求对象、视图或响应模型 | Entity、Value Object、Aggregate、Domain Service |
| 能否共存 | 可以作为Web入口 | 可以指导入口之后的业务设计 |
| 是否规定固定目录 | 不规定DDD的领域模型 | 不规定必须使用某种Web技术或包结构 |

把DDD理解成“在MVC项目里多建几个包”不会自动改善设计。只有当代码边界对应真实职责、规则有清晰归属时，分层才有价值。

# COLA 的分层逻辑

COLA是Clean Object-Oriented and Layered Architecture的缩写。它强调围绕业务核心组织应用结构、隔离外部技术细节，并提供可落地的工程实践。层次名称用于划分职责，不代表每个项目都必须采用一模一样的模块名和POM依赖。COLA官方仓库提供不同应用原型；具体目录会随原型和版本变化。[COLA 官方仓库](https://github.com/alibaba/COLA)

下面用常见的六个逻辑模块说明职责。`start`、`adapter`、`application`、`infrastructure`、`domain`、`client`是示意名称，不是要求项目必须使用的字面目录名。

```text
应用启动与装配
└── start
    ├── adapter          入站适配
    ├── application      用例编排
    ├── infrastructure   技术实现
    ├── domain           领域模型
    └── client           对外契约
```

这里的树只是表达一个应用的逻辑组成。若使用Maven多模块工程，通常可以由独立的聚合POM管理模块，再由`start`作为可执行启动模块；聚合POM和启动模块是不同职责，不必合并。

| 模块 | 职责 | 典型内容 |
| --- | --- | --- |
| `start` | 启动应用并装配运行所需组件，不承载业务规则 | Spring Boot入口、配置、组件扫描、环境集成 |
| `adapter` | 把外部协议转换为应用可处理的输入，并把结果映射回协议响应 | HTTP Controller、RPC或消息入口、请求响应转换 |
| `application` | 表达并编排应用用例，协调领域模型和所需端口 | Application Service、用例输入输出、事务边界、流程协调 |
| `domain` | 表达业务概念、规则和领域不变量 | Entity、Value Object、Aggregate、Domain Service、领域端口 |
| `infrastructure` | 提供外部技术能力并实现内层定义的端口 | Repository实现、数据库访问、远程服务适配、消息与Outbox组件 |
| `client` | 定义供其他模块或外部调用方使用的稳定契约 | API、DTO、Command、Query、事件契约 |

## 依赖关系：源码依赖指向稳定抽象

一种常见的模块编译依赖可以表示为：

```text
start          → adapter, infrastructure
adapter        → application, client
application    → domain, client
infrastructure → domain（以及实现端口所需的契约）
domain         → 不依赖 adapter、application、infrastructure
client         → 不依赖应用内部实现
```

这不是所有COLA原型的固定POM清单。模块是否直接依赖`client`，取决于具体契约放置和工程结构；端口由`domain`还是`application`拥有，也会影响Infrastructure的依赖声明。判断原则是：依赖指向稳定的业务抽象，领域核心不反向依赖Web、数据库或消息中间件实现。

从运行时看，请求通常沿`adapter → application → domain`进入业务核心。Application通过端口访问持久化或外部能力，Infrastructure提供这些端口的实现，启动配置负责把实现装配进应用。**运行时调用方向与源码编译依赖方向并不总相同**：Application面向抽象编程，而不是直接依赖某个数据库或消息客户端。

<div align="center"><img src="/images/2026/10-21/cola/cola-layered-architecture.svg" alt="COLA六层逻辑职责、编译依赖与运行时请求方向"/></div>

## Adapter：处理外部协议

Adapter是应用与外部世界之间的入站边界。它负责接收HTTP、RPC或消息请求，完成协议相关的解析、校验和转换，然后调用应用层提供的用例入口。响应也由Adapter转换成外部协议需要的格式。

Adapter可以做格式、必填项、长度等输入校验；涉及业务状态和业务不变量的判断应由领域模型负责。这样，同一条业务规则不会因为HTTP、消息和批处理入口不同而被重复实现。

## Application：编排用例

Application层表达系统提供哪些操作，以及完成一次操作需要协调哪些对象和能力。它组织用例步骤、调用领域行为、读写所需数据，并协调端口；它不应成为存放全部业务规则的万能Service。

应用服务通常是事务声明和用例编排的清晰位置，因为它能界定一次本地应用操作。但事务策略属于工程设计，COLA或DDD并没有规定注解必须放在哪个具体类上。跨服务调用也不因处于同一个应用服务方法，就自动加入本地数据库事务。

## Domain：保护业务不变量

Domain层表达核心业务概念及其规则。Entity通过标识维持身份，Value Object以属性定义相等性，Aggregate划定一组需要保持一致的领域状态，Domain Service用于表达不自然属于单个对象的领域行为。

领域对象应通过业务行为维护自身不变量，而不是暴露任意状态修改给上层。领域层可以声明需要的Repository或Gateway等抽象；抽象应描述业务所需的能力，而不是MyBatis、Feign或Kafka等技术实现。

## Infrastructure：实现外部能力

Infrastructure把内层定义的端口连接到具体技术，例如数据库、远程服务、文件系统和消息中间件。它处理ORM映射、协议客户端、消息序列化和重试等实现细节，并通过依赖注入或其他装配机制在运行时提供实现。

依赖关系向内、运行时控制流可以回到外层实现：应用代码调用端口，实际执行由Infrastructure适配器完成。这种依赖倒置让替换技术实现时，领域规则不必跟着改写。

## Client：稳定对外契约

Client层用于发布稳定的调用契约，让消费者通过约定的API和数据结构与应用交互。它应避免泄漏内部持久化模型、框架对象和实现细节。对外契约的兼容性需要单独治理；内部领域模型变化不应自动变成对外接口变化。

## Start：组装可运行应用

Start层提供可执行入口，并装配配置、Adapter、应用服务和Infrastructure实现。它决定应用怎样启动和运行，不应承担业务决策。将启动配置放在单独模块，可以使应用结构的装配边界清晰，也让其他适配器或部署方式有机会复用核心模块。

# 贫血模型与充血模型：关键是规则归属

贫血领域模型通常只有数据，业务行为集中在外部Service；充血领域模型则把对象状态与相关行为放在一起。所谓“充血”是Rich Domain Model的形象译法，不意味着对象里应该堆满方法。

当规则自然属于某个Entity或Value Object时，由对象行为维护规则，通常比在多个Service里分别读取状态、判断条件、修改字段更容易保持一致。保存数据、发送消息、访问远程服务则属于技术协作，不应仅为了“充血”而塞进领域对象。

并非所有系统都需要复杂领域模型。以简单数据录入和查询为主、规则较少且稳定的功能，采用清晰的事务脚本或CRUD服务可能更直接。是否使用DDD应由业务复杂度和变化成本决定，而不是由项目规模或目录结构决定。

# `@Transactional` 放在哪里

在Spring应用中，把事务声明在Application层的用例方法上，是一种常见的工程选择：该方法界定一次应用操作，并协调其本地数据读写。这不是DDD规定的强制规则；若事务由其他机制管理，也可以采用相应的边界设计。

需要区分两个边界：

- **应用用例边界**说明一次操作如何被编排，通常是事务声明的入口。
- **Aggregate一致性边界**说明哪些领域状态需要作为整体维护不变量。

Aggregate是领域一致性边界，不意味着每个应用服务方法只能修改一个Aggregate，也不意味着事务注解会自动识别Aggregate。多个Aggregate是否放进同一个数据库事务，应依据一致性要求、并发冲突和锁范围决定；跨服务一致性通常需要显式的消息、补偿或Saga设计。[DDD Aggregate与一致性边界](https://learn.microsoft.com/en-us/azure/architecture/microservices/model/tactical-ddd)

Spring声明式事务通常通过AOP代理执行。默认代理模式下，只有经代理进入的方法调用才会被拦截；同一对象内部的自调用不会因为目标方法标注了`@Transactional`就自动开启预期事务。因此需要结合Bean调用路径、事务管理器和实际回滚行为验证配置。[Spring `@Transactional` 文档](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html)

# 数据库更新与 Kafka 发布不是天然原子操作

在一个方法里先写数据库、再调用Kafka发送消息，并不等于数据库和Kafka组成了一个原子事务。Spring Kafka支持Kafka事务，也支持与其他Spring事务管理器同步提交；但同步提交不等于XA分布式事务，提交顺序和失败窗口仍需考虑。[Spring Kafka事务说明](https://docs.spring.io/spring-kafka/reference/kafka/transactions.html)

需要可靠发布事件时，可以考虑Transactional Outbox：在同一个本地数据库事务中保存业务数据变化和待发布的集成事件记录，再由独立Relay读取Outbox并投递到消息系统。领域事件描述领域内部发生的事实；是否将它转换为对外集成事件，由应用边界和对外契约决定，不必把每个领域事件都直接广播出去。

```text
同一数据库事务：
  更新业务数据
  插入 Outbox 事件

事务提交后：
  Outbox Relay → 消息系统
```

Outbox避免“数据库已提交但事件没有持久记录”这类双写缺口，但Relay可能重试，消费者仍应支持幂等处理；还需规划失败重试、积压监控和已发送记录清理。[AWS Transactional Outbox 模式](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)

# 落地检查

开始调整代码前，可以先确认：

1. 哪些规则属于领域不变量，哪些只是协议校验或技术流程？
2. 每条业务规则是否有清晰归属，是否在多个Service重复实现？
3. 一次用例涉及哪些领域状态和数据源，哪些读写必须处于同一事务？
4. 是否把远程调用或消息发送误认为受本地数据库事务保护？
5. 应用服务、领域模型和端口实现是否能分别测试？重试和重复消息如何处理？

如果这些边界尚不明确，应先梳理职责和依赖，再决定是否调整模块结构。迁移目录本身不会带来领域建模收益。

# 总结

**MVC组织请求入口，DDD表达业务模型，COLA提供一种围绕业务核心划分职责和依赖的应用架构实践；事务与跨系统消息一致性则需要按各自边界单独设计。**
