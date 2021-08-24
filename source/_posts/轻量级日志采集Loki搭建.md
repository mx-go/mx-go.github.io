---
title: 轻量级日志采集Loki搭建
date: 2020-09-20 09:44:59
tags: [grafana, tips]
categories: 
- [Linux, 安装]
- [工具]
cover: ../../../../images/2020/9-12/loki-logo.jpg
---

`Loki`是受`Prometheus`启发由Grafana Labs团队开源的水平可扩展，高度可用的多租户日志聚合系统。它的设计具有很高的成本效益，并且易于操作。使用标签来作为索引，而不是对全文进行检索，也就是说，通过这些标签既可以查询日志的内容也可以查询到监控的数据签，极大地降低了日志索引的存储。<div align=center><img src="../../../../images/2020/9-12/loki.png" algin="center"/></div>

# 简介

只要在应用程序服务器上安装`Promtail`来收集日志然后发送给`Loki`存储，就可以在Grafana UI界面通过添加`Loki`为数据源进行日志查询(如果`Loki`服务器性能不够，可以部署多个`Loki`进行存储及查询）。作为一个日志系统不光只有查询分析日志的能力，还能对日志进行监控和报警。

- `Loki`是主服务器，负责存储日志和处理查询 。
- `Promtail`是客户端代理，负责收集日志并将其发送给`Loki`。
- `Grafana`用于UI展示。

<div align=center><img src="../../../../images/2020/9-12/grafana-loki.png" algin="center"/></div>

## Loki架构

1. `Promtail`收集并将日志发送给`Loki`的`Distributor`组件；

2. `Distributor`会对接收到的日志流进行正确性校验，并将验证后的日志分批并行发送到`Ingester`；

3. `Ingester`接受日志流并构建数据块，压缩后存放到所连接的存储后端；

4. `Querier`收到HTTP查询请求，并将请求发送至`Ingester`用以获取内存数据 ，`Ingester`收到请求后返回符合条件的数据 ；

如果Ingester没有返回数据，`Querier`会从后端存储加载数据并遍历去重执行查询 ，通过HTTP返回查询结果。

<div align=center><img src="../../../../images/2020/9-12/loki-architecture.jpg" algin="center"/></div>



# 安装包下载

`Loki`安装包下载地址【**loki-linux-amd64.zip**】：https://github.com/grafana/loki/releases

`Promtail`安装包下载地址【**promtail-linux-amd64.zip**】：https://github.com/grafana/loki/releases

# Loki

## 配置

### config.yaml配置

```yaml
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    address: 127.0.0.1
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
    final_sleep: 0s
  chunk_idle_period: 5m
  chunk_retain_period: 30s

schema_config:
  configs:
    - from: 2021-03-01
      store: boltdb
      object_store: filesystem
      schema: v9
      index:
        prefix: index_
        period: 672h

storage_config:
  boltdb:
    directory: /tmp/loki/index

  filesystem:
    directory: /tmp/loki/chunks

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 672h

chunk_store_config:
  max_look_back_period: 0

table_manager:
  chunk_tables_provisioning:
    inactive_read_throughput: 0
    inactive_write_throughput: 0
    provisioned_read_throughput: 0
    provisioned_write_throughput: 0
  index_tables_provisioning:
    inactive_read_throughput: 0
    inactive_write_throughput: 0
    provisioned_read_throughput: 0
    provisioned_write_throughput: 0
  retention_deletes_enabled: true
  retention_period: 672h
```

### start.sh配置

```shell
#!/bin/bash
./loki --config.file=config.yaml &
```

## 启动Loki

```shell
mkdir -p /app/loki
mv loki-linux-amd64.zip promtail-linux-amd64.zip /app/loki

# 启动Loki
cd /app/loki
unzip loki-linux-amd64.zip -d loki
sh start.sh

# 验证Loki是否正常启动
ps -ef | grep loki
```

> 日志及索引存储路径：/tmp/loki

# promtail

## 配置

### promtail-config.yaml配置

**注意：需要修改 clients.url为Loki服务的IP和端口**

```shell
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki.host/loki/api/v1/push

scrape_configs:
- job_name: system
  static_configs:
  - targets:
      - localhost
    labels:
      systemcode: ${SYSTEM_CODE}
      servicename: ${SERVICE_DLE_NAME}
      instance: ${HOSTNAME}
      __path__: /app/deploy/logs/*-warn.log
```

## 启动脚本

```shell
#!/bin/bash
PROMTAIL_VERSION=promtail-1.0.1-warn
cd /app/
wget http://maven.com/artifactory/maven-releases-local/promtail/$PROMTAIL_VERSION.zip
unzip $PROMTAIL_VERSION.zip -d promtail
rm $PROMTAIL_VERSION.zip
cd promtail
chmod 755 promtail
nohup ./promtail -config.expand-env=true -config.file=promtail-config.yaml &
```

{% label 其中-config.expand-env=true标识可从环境变量中取值。 red %}

脚本自动从`Maven`拉取`zip`包并解压，`zip`包中需包含 **promtail**、**promtail-config.yaml**文件

# 验证

启动后进入实例的app目录下查看是否存在`Promtail`目录。

```shell
# 验证promtail 是否已经正常启动
ps -ef | grep promtail
```

<div align=center><img src="../../../../images/2020/9-12/loki_result.jpg" algin="center"/></div>