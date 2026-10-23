---
title: AgentScope中的MCP Tool管理：发现、暴露与版本治理
date: 2025-01-12 10:00:00
tags: [AI, AgentScope, MCP]
categories:
  - AI与智能体
  - 智能体工程
img: /images/2026/10-21/agentscope-mcp-tool/cover-optimized.webp
cover: /images/2026/10-21/agentscope-mcp-tool/cover-optimized.webp
cover_thumbnail: /images/2026/10-21/agentscope-mcp-tool/cover-optimized-thumb.webp
---

# 引言

大模型应用从“回答问题”走向“完成任务”后，需要查询业务数据、调用内部 API、检索知识库或执行操作。若每个 Agent 都单独适配一种后端，连接方式、工具描述、参数格式和权限控制很快会变得重复而难以维护。

Model Context Protocol（MCP）为模型应用与外部能力之间提供一套通用协议。AgentScope 则在 Agent 运行时中管理工具、MCP 客户端和工具组。理解两者的边界，才能回答工具如何发现、如何暴露给模型、同类工具如何区分，以及升级如何控制风险。本文按 MCP 基础、Tool 设计和 AgentScope 接入逐步展开。<!-- more -->

# MCP 是什么

MCP 是连接 AI 应用与外部数据源、工具服务的一种开放协议。它约定 Client 与 Server 如何初始化、协商能力、交换请求和返回结果，让应用可以用相对一致的方式连接不同能力提供方。MCP 本身不是大模型，也不负责替业务系统实现权限、事务或模型决策。

一个常见部署由三类角色组成：

| 角色 | 职责 |
| --- | --- |
| Host | 承载 Agent 和用户交互的应用，例如 IDE、桌面助手或业务 Agent 服务 |
| Client | Host 内负责与一个 MCP Server 建立协议连接、发现能力并转发调用的组件 |
| Server | 对外提供工具、资源或提示模板的服务，可运行在本机进程或远端服务中 |

一个 Host 可以连接多个 Server。MCP 规范定义了几类 Server 能力，其中最常见的是：

- **Tools**：可执行操作，例如查询订单、创建工单、运行计算。模型可根据请求选择工具，但 Host 仍负责授权、确认和调用控制。
- **Resources**：可读取的数据或上下文，例如文件、文档、数据库记录。它们提供内容，不等同于一次操作。
- **Prompts**：由 Server 提供的可复用提示模板，用于组织特定任务的输入和上下文。

三者可以组合使用：先通过 Resource 读取资料，再调用 Tool 执行业务操作，最终由 Host 将结果交还给模型。MCP 的价值在于统一连接和能力描述，而不是把所有业务逻辑都塞进协议层。[MCP 规范概览](https://modelcontextprotocol.io/specification/2024-11-05/basic) · [MCP 生命周期](https://modelcontextprotocol.io/specification/2024-11-05/basic/lifecycle)

# Tool 是什么

Tool 是一项可被调用的能力定义。MCP Server 会发布 Tool 名称、用途描述和输入参数 Schema；Client 获取这些定义后，Host 可以将适用的工具描述提供给模型。模型返回工具名称和参数，Host 校验并调用相应 Server，最后把调用结果放回对话流程。

简化后的 Tool 定义如下：

```json
{
  "name": "order_query",
  "description": "按订单编号查询订单状态",
  "inputSchema": {
    "type": "object",
    "properties": {
      "orderNo": { "type": "string", "description": "订单编号" }
    },
    "required": ["orderNo"]
  }
}
```

`name` 是调用标识；`description` 告诉模型何时使用它；`inputSchema` 约束参数的结构和类型。协议的不同版本还支持可选输出 Schema、行为注解等字段。描述应写清业务范围、参数含义和限制，避免只写“查询数据”一类无法区分能力的文本。

一次调用大致经过以下步骤：

```text
Client 初始化并协商协议能力
        ↓
Client 请求 tools/list，读取工具定义
        ↓
Host 将当前可用的 Tool Schema 提供给模型
        ↓
模型选择工具并生成参数
        ↓
Host / Client 校验并通过 tools/call 执行
        ↓
调用结果返回模型，继续回答或执行后续步骤
```

模型做的是“根据当前上下文提出工具调用”；真正的执行发生在 Host/Client 与 Server 之间。不能把模型生成了参数视为参数已经可信，也不能把 Tool Schema 当作访问控制。服务端仍需校验输入、执行身份授权、控制副作用，并对敏感操作提供确认或审批。[MCP Tools 规范](https://modelcontextprotocol.io/specification/2024-11-05/server/tools)

# MCP 与 Tool 的 JSON-RPC 请求和响应结构

MCP 的消息使用 JSON-RPC 2.0。`initialize`、`tools/list`、`tools/call` 都是 MCP 定义的方法；具体业务 Tool 的名称放在 `tools/call` 的参数中。以查询订单为例，JSON-RPC 的 `method` 是 `tools/call`，`params.name` 才是 `order_query`。本节基础示例采用 MCP `2024-11-05` 的消息结构；后续协议版本增加的字段应按实际协商版本处理。

## 外层消息：请求、响应和通知

| 字段 | 所在消息 | 含义 |
| --- | --- | --- |
| `jsonrpc` | 所有消息 | 固定为字符串 `"2.0"` |
| `id` | 请求与对应响应 | 请求标识；响应沿用相同值，用于关联并发调用。MCP 请求使用字符串或整数，不使用 `null` |
| `method` | 请求或通知 | 方法名，例如 `initialize`、`tools/list`、`tools/call` |
| `params` | 请求或通知 | 方法参数；是否需要由具体方法决定 |
| `result` | 成功的 JSON-RPC 响应 | 方法返回的数据，具体结构取决于方法 |
| `error` | 失败的 JSON-RPC 响应 | 包含整数 `code`、字符串 `message`，以及可选的 `data` |

正常响应的顶层只能有 `result` 或 `error` 之一，不能同时包含两者。`result` 表示 JSON-RPC 方法返回了结果，**不保证其中的业务操作成功**；工具执行状态还要检查 `result.isError`。[MCP 消息规范](https://modelcontextprotocol.io/specification/2024-11-05/basic/messages)

## initialize：协商协议和能力

Client 在初始化时提交支持的协议版本和自身能力。下面是简化后的请求：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "order-agent",
      "version": "1.0.0"
    }
  }
}
```

Server 的响应包含协商到的协议版本、能力声明和实现信息：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": { "listChanged": true }
    },
    "serverInfo": {
      "name": "order-mcp",
      "version": "1.0.0"
    }
  }
}
```

`capabilities.tools` 声明 Server 支持工具，`listChanged: true` 表示支持发送工具列表变更通知。它不代表 Client 已经发现所有工具，也不保证 Agent 自动刷新工具列表。Client 接受初始化结果后，还要发送不含 `id` 的 `notifications/initialized` 通知，再进入正常交互阶段。

## tools/list：返回工具定义

发现工具的请求如下：

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list",
  "params": {}
}
```

响应的 `result.tools` 是工具定义列表，包含名称、描述和输入 Schema：

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "order_query",
        "description": "按订单编号查询订单状态",
        "inputSchema": {
          "type": "object",
          "properties": {
            "orderNo": { "type": "string" }
          },
          "required": ["orderNo"]
        }
      }
    ]
  }
}
```

工具列表较大时，Server 可以返回 `result.nextCursor`；Client 将其放入下一次请求的 `params.cursor` 中继续读取，直到没有下一页。这里返回的是**能力定义**，没有执行订单查询；模型是否看到这些定义，还取决于 Host 的工具过滤与暴露策略。

## tools/call：返回工具执行结果

执行具体 Tool 时，参数分为两层：`params.name` 指定 Server 内的工具名，`params.arguments` 提供业务参数。

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "order_query",
    "arguments": { "orderNo": "ORD-10001" }
  }
}
```

成功响应使用 `result.content` 承载内容，`isError` 为 `false`：

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"orderNo\":\"ORD-10001\",\"status\":\"PAID\"}"
      }
    ],
    "isError": false
  }
}
```

`content` 是内容块数组，不要求只能返回一个文本块。在本节采用的协议版本中，还可返回图片、嵌入式资源等内容；不同类型有各自的字段，不能假定所有内容块都存在 `text`。

示例中的 `text` 是字符串，其中恰好放了一段序列化后的业务 JSON；它在 JSON-RPC 层仍然是文本。如果应用需要读取 `status`，应按业务契约解析并校验。后续 MCP 版本提供了 `structuredContent`、`outputSchema` 等结构化结果能力；采用这些能力时应核对协商版本及 SDK 支持，不能把文本中的 JSON 与结构化结果字段混为一谈。

## 两层错误：协议错误与 Tool 执行错误

Tool 执行过程中发生的业务或依赖错误，可以通过正常 JSON-RPC 结果中的 `isError: true` 表达。例如后端订单服务超时：

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      { "type": "text", "text": "Order service timed out. Please retry later." }
    ],
    "isError": true
  }
}
```

协议层无法处理调用时，则使用顶层 `error`。例如工具名不存在，下面采用 MCP Tools 规范中的错误形式：

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "error": {
    "code": -32602,
    "message": "Unknown tool: order_query_missing"
  }
}
```

两类失败的处理层次不同：

| 响应形式 | 表达的状态 | Client 应检查什么 |
| --- | --- | --- |
| `result` 且 `isError` 未设置或为 `false` | 方法返回正常工具结果 | 按契约读取内容，判断业务含义 |
| `result.isError: true` | Tool 执行报告失败 | 提取错误内容，按错误类型决定是否重试或修正参数 |
| 顶层 `error` | JSON-RPC/MCP 调用失败 | 检查错误码、方法名、工具名与请求参数 |

例如 `-32601` 表示 JSON-RPC 方法不存在，`tools/call` 的业务工具名不存在则可按上面的 MCP 示例报告为 `-32602`。这两个标识处于不同层级。通过 HTTP 传输时，也不能仅凭 HTTP `200` 判断工具业务成功；还需检查响应中的 `error`、`result.isError` 和业务内容。[MCP Tools 错误处理](https://modelcontextprotocol.io/specification/2024-11-05/server/tools#error-handling)

## 通知没有响应

工具列表变更通知的消息结构如下：

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/tools/list_changed"
}
```

通知没有 `id`，接收方不返回对应的 JSON-RPC 响应。Client 需要刷新目录时，应另外发送带新 `id` 的 `tools/list` 请求，而不是给这条通知补一个 `result`。

# MCP 与 Tool 的架构关系

下面的架构图参照分层示意图，用浅色模块和方向箭头区分“工具发现”“工具暴露”和“实际调用”。Tool Group / Skill 控制任务范围，Toolkit 负责注册与分发，MCP Client 连接具体 Server。业务 Catalog 用于记录发布和契约版本，它属于应用侧治理，不是 MCP 标准对象。

![MCP、AgentScope Toolkit 与 Tool Server 的接入和调用关系](/images/2026/10-21/agentscope-mcp-tool/mcp-tool-architecture.svg)

图中可分为三条路径：

1. **发现路径**：MCP Client 与 Server 初始化、协商能力，然后通过 `tools/list` 读取 Tool 定义。
2. **暴露路径**：Toolkit 将注册的本地工具和 MCP 工具组织起来；Tool Group 或 Skill 决定当前任务向模型开放哪些 Schema。
3. **调用路径**：模型产生 Tool Call 后，Toolkit 根据名称分发到本地实现或 MCP Client；远端调用通过 `tools/call` 到达对应 Server，结果再返回 Agent。

# Tool 适合哪些场景

Tool 应用于需要 Agent 获取外部事实或产生实际动作的地方。常见场景包括：

| 场景 | Tool 示例 | 设计重点 |
| --- | --- | --- |
| 只读查询 | 查询订单、检索内部知识、读取代码仓库信息 | 限定数据范围，返回可追溯结果，避免过量返回 |
| 业务写入 | 创建工单、更新 CRM 字段、提交审批申请 | 身份授权、参数校验、幂等控制和操作确认 |
| 工程操作 | 执行测试、创建 Pull Request、触发部署 | 权限分级、执行环境隔离、超时与审计 |
| 多步骤任务 | 先查询客户，再核对合同，最后生成待审批变更 | 把原子能力拆清楚，由 Agent 或业务流程编排顺序 |

如果只是提供一段稳定背景材料，Resource 或静态上下文可能更合适；如果需要模型根据实时请求决定并触发操作，Tool 更合适。不要仅因 MCP 支持 Tools，就把每个数据接口都包装成模型可调用的操作。

# 在 AgentScope 中接入 MCP

AgentScope Java 通过 `Toolkit` 管理工具，并通过 `McpClientWrapper` 连接 MCP Server。注册 Client 时，框架会执行 MCP 协商、工具发现和结果转换。下面示例使用 Streamable HTTP 传输，地址仅为占位符：

```java
import io.agentscope.core.tool.Toolkit;
import io.agentscope.core.tool.mcp.McpClientBuilder;
import io.agentscope.core.tool.mcp.McpClientWrapper;

McpClientWrapper orderServer =
        McpClientBuilder.create("order")
                .streamableHttpTransport("https://example.com/mcp")
                .buildAsync()
                .block();

Toolkit toolkit = new Toolkit();
toolkit.registerMcpClient(orderServer).block();
```

在 AgentScope Toolkit 中，MCP Tool 会以 `mcp__{server_name}__{tool_name}` 形式命名。例如 Server 名为 `order`、Tool 名为 `order_query` 时，注册名为 `mcp__order__order_query`。Server 名是 Client 配置的一部分，应保持稳定且在当前 Toolkit 中唯一。

工具注册和工具暴露是两个层次。注册解决“运行时能否找到并调用它”；暴露解决“当前模型请求能否看到它的 Schema”。当工具规模较大时，可以用 Tool Group 将相关能力分组，并结合 Skill 按任务启用工具，避免把所有 Schema 永久放入模型上下文。具体 API 和行为应以项目所使用的 AgentScope Java 版本为准。[AgentScope Java 工具与 MCP 文档](https://github.com/agentscope-ai/agentscope-java/blob/main/docs/v2/en/docs/building-blocks/tool.md)

# 同名工具与版本边界

## 同名 Tool 不会让模型自动选对

单个 MCP Server 内的 Tool 名称应唯一。多个 Server 可以分别提供 `search` 或 `order_query`，但聚合到同一 Host 后，需要通过 Server 命名空间、别名或代理层消除名称冲突。AgentScope 的命名空间能区分来源，例如：

```text
mcp__erp__order_query
mcp__crm__order_query
```

来源不同不代表语义歧义消失。如果两个工具的描述和 Schema 一样，模型没有标准规则判断该调用哪个 Server；选择会受到命名、描述和上下文影响，结果并无确定性保证。对外暴露给模型的名称和描述应体现业务边界；如果它们本应是同一能力，则在业务路由层做确定性选择，再只暴露一个清晰的 Tool。

## MCP 没有标准 Tool 版本字段

MCP 协议版本用于 Client/Server 协商；`serverInfo.version` 描述 Server 软件实现。Tool 定义本身由名称、描述、Schema 等契约组成，MCP 没有标准的独立 Tool 版本字段。Server 升级到 `2.3.0`，不等于每个 Tool 都有自己的 `2.3.0` 契约版本。

若业务需要可复现地发布工具集合，可以在应用侧维护 Tool Catalog：

```yaml
catalogVersion: 2025.01.12
tools:
  - name: order_query
    contractVersion: 1
    compatibility: backward-compatible
  - name: order_query_v2
    contractVersion: 2
    compatibility: breaking
```

`catalogVersion` 标识一次工具集合发布；`contractVersion` 标识单个 Tool 的输入、输出和行为契约。它们是自定义治理字段，不是 MCP 标准。Catalog 还可以记录 Server 来源、Schema 摘要、兼容策略和发布状态，但 Client 是否读取这些字段由应用实现决定。

兼容性扩展通常保留稳定名称并增加可选参数；必填参数、字段语义或输出结构发生不兼容变化时，可在迁移期并行发布新旧 Tool，并让对应 Skill 或路由规则明确绑定目标版本。没有破坏性变化时，不必为了版本号增加 `v2` 工具。

# Server 更新后会不会自动热更新

MCP 支持查询工具列表，也允许声明工具列表变更通知能力。收到通知只表示列表变化，Client 仍需重新执行 `tools/list`；上层框架还要刷新 Toolkit 注册结果，并确保后续模型请求拿到新 Schema。协议通知不等于整条 Agent 热更新链路已经实现。

AgentScope 文档说明了 MCP Client 注册与工具发现，也提供了 Tool Group 的动态激活能力；这些信息不足以证明所有版本都会自动监听 Server 通知并热替换工具定义。上线前应针对正在使用的 AgentScope 版本验证通知、重新发现、Schema 更新和失败恢复。若没有验证动态刷新能力，可通过新实例重新注册、探活后切流的方式发布，并保留上一份 Server 与 Catalog 组合用于回滚。

# 设计与上线检查

设计 MCP Tool 时，至少要确认以下事项：

1. **职责单一**：一个 Tool 完成一个边界清楚的动作；复杂流程由 Agent 或业务流程编排。
2. **名称和描述可判别**：明确业务对象、数据范围与操作类型，避免多个能力看起来完全相同。
3. **Schema 可验证**：参数类型、必填项、枚举范围和格式约束清楚，服务端仍需二次校验。
4. **权限与副作用可控**：按用户或租户授权，敏感操作支持确认、幂等、审计和超时。
5. **暴露范围可控**：通过工具组、Skill 或策略只开放当前任务需要的能力。
6. **发布路径可回滚**：对工具定义做差异检查，记录 Catalog 版本，并验证新旧契约迁移方案。

# 总结

MCP 定义 Host/Client 与 Server 之间如何协商、发现和调用能力；Tool 描述模型可以请求执行的原子操作；AgentScope Toolkit 负责在 Agent 运行时注册、暴露和分发这些工具；业务平台负责权限、Catalog 和契约版本治理。把协议、模型可见范围和业务治理分层处理，才能让工具接入既可复用，也可控、可追踪。
