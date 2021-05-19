---
title: Grafana搭建
date: 2020-08-04 10:07:30
tags: [grafana, tips]
categories: 
- [Linux, 安装]
- [工具]
img: ../../../../images/2020/5-8/grafana.jpg
cover: ../../../../images/2020/5-8/grafana.png
---

# 引言

Grafana是一款可视化工具，有着非常漂亮的图表和布局展示，功能齐全的度量仪表盘和图形编辑器，大多使用在时序数据的监控方面。同时提供监控告警功能。<div align=center><img width="400" height="200" src="../../../../images/2020/5-8/grafana.png" algin="center"/></div><!-- more -->

# 简介

`Grafana`是一个跨平台的开源的度量分析和可视化工具，可以通过将采集的数据查询然后可视化的展示，并及时通知。它主要有以下特点：

1、展示方式：快速灵活的客户端图表，面板插件有许多不同方式的可视化指标和日志，官方库中具有丰富的仪表盘插件，比如热图、折线图、图表等多种展示方式；

2、通知提醒：以可视方式定义最重要指标的警报规则，Grafana将不断计算并发送通知，在数据达到阈值时通过Slack、PagerDuty等获得通知；

3、混合展示：在同一图表中混合使用不同的数据源，可以基于每个查询指定数据源，甚至自定义数据源；支持白天和夜间模式；

4、注释：使用来自不同数据源的丰富事件注释图表，将鼠标悬停在事件上会显示完整的事件元数据和标记；

5、过滤器：Ad-hoc过滤器允许动态创建新的键/值过滤器，这些过滤器会自动应用于使用该数据源的所有查询。

# 准备工作

## 安装包

`grafana`下载地址：https://grafana.com/grafana/download/7.5.3

`piechart`(图表)下载地址：https://grafana.com/grafana/plugins/grafana-piechart-panel/

将 **grafana.rpm**、**grafana.ini**、**grafana-piechart-panel.zip** 复制到 **Linux** 中

## 移动

将所有文件移动至指定目录，便于管理。

```shell
mkdir -p /app/grafana
mv grafana-v7.4.2.rpm grafana.ini grafana-piechart-panel-1.6.1.zip /app/grafana
```

# 安装grafana

## 安装

```shell
cd /app/grafana
rpm -Uvh grafana-v7.4.2.rpm
```

## 配置

```shell
cp grafana.ini /etc/grafana
```

> grafana.ini文件主要需要关注的配置为
>
> domain = 当前IP地址
>
> http_port = 80
>
> enable_gzip = true

## 服务操作命令

```shell
# 刚安装完需要重载systemd配置
systemctl daemon-reload
# 启动服务
systemctl start grafana-server
# 查看状态
systemctl status grafana-server
#设置开机启动
systemctl enable grafana-server.service
```

```shell
# 重载systemd配置
systemctl daemon-reload
# 开启
systemctl start grafana-server
# 停止
systemctl stop grafana-server
# 重启
systemctl restart grafana-server
# 查看状态
systemctl status grafana-server
```

## 相关文件位置

1. 访问地址
   IP:3000
2. 默认账号密码
   admin/admin
3. 环境文件
   /etc/sysconfig/grafana-server
4. 日志文件
   /var/log/grafana
5. 数据库
   /var/lib/grafana/grafana.db
6. 配置文件
   /etc/grafana/grafana.ini

# Pie插件

安装Pie插件，可使用饼图展示数据。

```shell
# 解压
unzip -q grafana-piechart-panel-1.6.1.zip
# 移动到grafana插件目录下
mv grafana-piechart-panel /var/lib/grafana/plugins/
# 重启grafana
systemctl restart grafana-server
```

# 检查服务

启动服务，打开浏览器，输入IP+端口，3000为Grafana的默认侦听端口。

<div align=center><img src="../../../../images/2020/5-8/grafana_result.png" algin="center"/></div>