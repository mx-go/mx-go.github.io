---
title: macOS 使用 Colima 运行 Docker：安装、Compose 与环境切换
date: 2023-06-12 10:00:00
updated: 2026-10-22 10:00:00
tags: [Docker, macOS]
categories:
  - 运维与工程
  - Docker
img: /images/2026/10-22/colima/docker-colima-architecture.svg
cover: /images/2026/10-22/colima/docker-colima-architecture.svg
---

# 引言

在 macOS 上运行 Docker，常见选择是安装 Docker Desktop。对于主要通过终端管理容器的开发者，也可以使用 Docker CLI 配合 Colima，按需启动容器环境。

两种方式都可以服务本地开发，但提供的使用体验不同。Docker Desktop 集成了图形界面和多项管理能力；Colima 更适合希望直接控制虚拟机生命周期、通过命令行完成容器操作的场景。选择应围绕实际工作流，而不是简单认定某一种工具一定更快或更省资源。<!-- more -->

# 先分清 Docker CLI、Engine 和 Colima

安装完成后，终端能够执行 `docker --version`，只能说明 Docker 客户端可用，不能证明容器引擎已经运行。

| 组件 | 主要职责 | 所在位置 |
| --- | --- | --- |
| Docker CLI | 解析 `docker` 命令，向目标 Engine 发送请求 | macOS |
| Docker Compose | 读取 Compose 配置，通过 Engine 管理一组服务 | macOS 上的 CLI 插件 |
| Colima | 创建、配置和启停容器开发环境 | macOS |
| Lima | 为 Colima 提供 Linux 虚拟机相关能力 | macOS 与虚拟化层 |
| Docker Engine | 管理镜像、容器、网络和数据卷 | Linux 虚拟机内 |

本文讨论 Linux 容器。它们依赖 Linux 内核，因此不能仅靠 macOS 上的 Docker CLI 直接运行；本地方案需要一个 Linux 环境承载 Engine。Colima 利用 Lima 管理虚拟机，选择 Docker 运行时后，日常操作仍使用熟悉的 Docker 命令。[Colima 官方项目](https://github.com/abiosoft/colima)

![macOS Docker CLI、Colima、Lima 与 Linux 虚拟机中 Docker Engine 的关系](/images/2026/10-22/colima/docker-colima-architecture.svg)

图中区分了两条路径：Docker CLI 通过选定的 Context 访问 Engine；Colima 负责管理 Linux 环境。Colima 不是每条 Docker 命令必须逐层经过的业务代理。

# 安装最小可用环境

## 准备工作

先确认 Homebrew 可用，并查看主机架构：

```bash
brew --version
uname -m
```

Apple Silicon 与 Intel Mac 都在 Colima 的支持范围内，但可用的安装包、虚拟化选项和镜像架构还取决于系统及工具版本。不要仅因为某篇教程使用 Apple Silicon，就认为 Intel Mac 无法使用。[Colima 入门文档](https://colima.run/docs/getting-started/)

## 安装客户端和环境管理工具

```bash
brew install colima docker docker-compose
```

其中 `docker` formula 提供客户端工具，`colima` 管理虚拟机环境，`docker-compose` 提供 Compose。这个安装步骤本身不等于 Linux 虚拟机已经启动，也不等于已经装好 Docker Desktop。[Colima 安装说明](https://colima.run/docs/installation/)

检查已安装命令：

```bash
colima version
docker --version
docker-compose version
```

此时可以先确认客户端存在，稍后再验证 Engine。若系统里曾安装 Docker Desktop，还应注意 PATH 中可能保留另一份 `docker` 可执行文件；必要时用 `command -v docker` 确认当前调用的位置。

# 启动 Colima 并验证 Engine

启动 Docker 运行时：

```bash
colima start --runtime docker
```

首次启动可能涉及下载虚拟机镜像、创建实例和初始化服务，耗时取决于网络与本机环境。下载失败和 Engine 尚未就绪是不同问题，不应该一开始就通过反复卸载重装处理。

按以下顺序检查：

```bash
colima status
docker context ls
docker version
docker info
docker run --rm hello-world
```

这些命令分别验证不同层次：

| 检查 | 能说明什么 |
| --- | --- |
| `colima status` | Colima 管理的环境是否运行 |
| `docker context ls` | 客户端配置了哪些目标，当前使用哪个 |
| `docker version` | 客户端版本，以及能否取得 Server 信息 |
| `docker info` | 是否能访问 Engine 并读取运行信息 |
| `hello-world` | 镜像获取与一次容器执行是否成功 |

`docker version` 只有 Client 信息、没有正常的 Server 信息时，仍不能认为完整环境已经可用。若 `docker info` 成功，而 `hello-world` 拉取失败，应继续检查镜像仓库访问、DNS 或代理，不应直接归因于客户端安装错误。

日常不再需要容器环境时，可以停止虚拟机：

```bash
colima stop
```

停止环境会影响其中运行的服务。它与删除实例不同；下次继续工作时重新启动即可。容器是否自动恢复运行，还取决于容器状态与重启策略，不能把“虚拟机启动”当作“所有业务服务已就绪”。[Colima 命令说明](https://colima.run/docs/commands/)

# 让 docker compose 找到插件

安装了 `docker-compose`，不一定意味着 `docker compose` 已经可以被 Docker CLI 发现。先执行：

```bash
docker compose version
```

如果出现 `compose` 不是有效命令，但 `docker-compose version` 正常，优先检查插件发现路径。

Homebrew 当前的安装说明建议，在 `~/.docker/config.json` 中配置 `cliPluginsExtraDirs`。先查看本机 Homebrew 前缀：

```bash
brew --prefix
```

例如输出为 `/opt/homebrew` 时，对应的插件目录通常为 `/opt/homebrew/lib/docker/cli-plugins`，配置示意如下：

```json
{
  "cliPluginsExtraDirs": [
    "/opt/homebrew/lib/docker/cli-plugins"
  ]
}
```

该路径只是默认安装位置的示例，应替换为本机实际前缀。已有配置时合并此字段，保留原有认证、Context 等设置，不要直接用示例覆盖整个文件。JSON 字符串不会执行 Shell 变量展开，也不能把 `$(brew --prefix)` 原样填进去期待 Docker 自动计算。[Homebrew docker-compose 说明](https://formulae.brew.sh/formula/docker-compose)

修改后重新运行 `docker compose version`。如果仍失败，再核对插件实际安装位置、文件权限与客户端版本。

使用 Compose 的新旧命令写法应以项目和安装版本为准。本文后续统一使用插件形式 `docker compose`，不把命令名称是否带连字符作为服务端是否正常的判断依据。

# 用一个小服务检查端口和 Compose

在一个独立的示例目录中创建 `compose.yaml`：

```yaml
services:
  web:
    image: nginx:alpine
    ports:
      - "127.0.0.1:8080:80"
```

先解析配置，再启动服务：

```bash
docker compose config
docker compose up -d
docker compose ps
curl -I http://127.0.0.1:8080/
```

这里将容器的 80 端口发布到本机回环地址的 8080 端口，适合本地演示。检查时还需要确认端口没有被其他程序占用。`nginx:alpine` 是便于演示的浮动标签；需要可复现构建时，应按项目策略固定镜像版本或摘要。[Docker 容器运行与端口发布](https://docs.docker.com/reference/cli/docker/container/run/)

容器显示运行，但 HTTP 请求失败时，可以进一步检查服务日志：

```bash
docker compose logs --tail=50 web
```

用完后，在相同目录停止并移除这组示例容器：

```bash
docker compose down
```

然后根据是否还有其他工作负载，决定要不要执行 `colima stop`。应用服务的生命周期和虚拟机的生命周期应分别管理。

# 切换环境时，优先检查 Docker Context

同一台 Mac 可以配置多个 Docker 环境。命令名相同，不代表它们连接同一个 Engine。Context 保存目标端点等连接信息，切换 Context 会改变后续命令的操作对象。

先看当前环境：

```bash
docker context ls
docker context show
```

确认列表中存在目标后，再切换。例如默认 Colima 环境通常对应 `colima`：

```bash
docker context use colima
docker info
```

如果使用多个 Colima profile，或历史安装留下不同名称，应以实际列表为准。只想对一次命令指定目标时，可以使用：

```bash
docker --context colima ps
```

此外还要检查 `DOCKER_HOST`、`DOCKER_CONTEXT` 等环境变量是否影响连接目标。Context、环境变量和命令行参数存在优先级关系，所以排障时不能只看列表中的星号，还要核对当前命令的有效配置。[Docker Context 官方说明](https://docs.docker.com/engine/manage-resources/contexts/)

# 从 Docker Desktop 切换时，数据不会自动搬家

切换到 Colima 后，`docker ps -a` 看不到原来的容器，不一定是数据被删除了，也可能只是客户端连接到了另一台 Engine。

两个独立运行环境中的镜像、容器和命名数据卷，不会仅因为切换 Context 就自动合并。迁移前应先列清楚：哪些资源可以从配置重新创建，哪些包含必须保留的数据。

| 资源 | 迁移时的处理思路 |
| --- | --- |
| 镜像 | 从镜像仓库重新拉取，或按需要导出、导入 |
| 容器 | 优先通过 Compose 等声明式配置重新创建 |
| 命名数据卷 | 单独备份、恢复，并验证目标数据完整性 |
| 宿主机绑定目录 | 检查路径、共享范围、访问权限及文件语义 |
| 数据库 | 使用适合该数据库的备份与恢复方式，保证一致性 |

Docker 管理的数据卷位于 Engine 所在主机的存储中。这里的 Engine 主机是 Linux 虚拟机，而不是 macOS 原生文件系统；不能因为两套工具装在同一台电脑上，就认为命名卷天然共享。[Docker 数据卷](https://docs.docker.com/engine/storage/volumes/)

绑定目录同样需要关注路径从哪里解析、能否被虚拟机访问，以及权限是否一致。客户端本地路径和 Engine 主机上的可用路径不是天然等价，虚拟机方案需要文件共享机制衔接。[Docker Bind Mounts](https://docs.docker.com/engine/storage/bind-mounts/)

迁移验收完成之前，保留旧环境及可恢复的备份。不要把删除 Colima 实例、清理数据卷或卸载旧环境当作普通连接故障的第一步。

# 常见问题的排查顺序

| 现象 | 优先检查 |
| --- | --- |
| `docker` 命令不存在 | CLI 是否安装、PATH 是否正确 |
| 无法连接 Docker daemon | Colima 状态、Context、环境变量和连接端点 |
| `docker compose` 不存在 | Compose 是否安装、插件目录能否被发现 |
| 镜像拉取失败 | 仓库可达性、DNS、代理及仓库认证 |
| 镜像无法执行 | 镜像是否支持目标 CPU 架构，是否涉及跨架构执行 |
| 容器运行但端口不通 | 容器服务监听、端口映射、宿主机端口占用与转发 |
| 目录挂载异常 | 虚拟机共享范围、路径、权限及大小写等文件语义 |

排查应从最靠近故障现象的一层开始。CLI、Engine、镜像仓库、容器进程和宿主机端口分别可能失败，把它们都归成“Docker 没装好”，只会增加重复安装与数据丢失的风险。

# 总结

**Docker CLI 负责发起操作，Colima 借助 Lima 管理 Linux 环境，Docker Engine 在其中运行容器；Compose 组织应用服务，Context 决定命令连接哪一个 Engine。**

对于终端为主的本地开发，Colima 提供了一条清晰的使用路径：安装客户端与环境工具、启动虚拟机、验证 Engine，再按需配置 Compose。真正切换环境时，连接目标和数据迁移应分别验证，不能把“命令能执行”当作“开发环境已经完整迁移”。
