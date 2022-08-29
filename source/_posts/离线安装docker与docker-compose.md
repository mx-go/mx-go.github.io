---
title: 离线安装docker与docker-compose
date: 2021-07-23 15:20:10
tags: [docker]
categories: 
- [Linux, 安装]
- [工具]
img: ../../../../images/2021/10-12/docker-cover.png
cover: ../../../../images/2021/10-12/docker-cover.png
---

在线安装`docker`官方详细教程：https://docs.docker.com/engine/install/centos/

在线安装`docker-compose`官方详细教程：https://docs.docker.com/compose/install/#install-compose <!-- more -->

# 安装docker

## 下载安装包

官方离线安装包下载地址：https://download.docker.com/linux/static/stable/x86_64/

目前最新版本为：`docker-18.06.3-ce.tgz` 

## 脚本准备

### docker.service

> 作用：安装和卸载docker脚本需要用到此脚本

```apl
[Unit]
Description=Docker Application Container Engine
Documentation=https://docs.docker.com
After=network-online.target firewalld.service
Wants=network-online.target

[Service]
Type=notify
# the default is not to use systemd for cgroups because the delegate issues still
# exists and systemd currently does not support the cgroup feature set required
# for containers run by docker
ExecStart=/usr/bin/dockerd
ExecReload=/bin/kill -s HUP $MAINPID
# Having non-zero Limit*s causes performance problems due to accounting overhead
# in the kernel. We recommend using cgroups to do container-local accounting.
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
# Uncomment TasksMax if your systemd version supports it.
# Only systemd 226 and above support this version.
#TasksMax=infinity
TimeoutStartSec=0
# set delegate yes so that systemd does not reset the cgroups of docker containers
Delegate=yes
# kill only the docker process, not all processes in the cgroup
KillMode=process
# restart the docker process if it exits prematurely
Restart=on-failure
StartLimitBurst=3
StartLimitInterval=60s

[Install]
WantedBy=multi-user.target
```

### 安装脚本 `install.sh`

```shell
#!/bin/sh
echo '解压tar包...'
tar -xvf $1

echo '将docker目录移到/usr/bin目录下...'
cp docker/* /usr/bin/

echo '将docker.service 移到/etc/systemd/system/ 目录...'
cp docker.service /etc/systemd/system/

echo '添加文件权限...'
chmod +x /etc/systemd/system/docker.service

echo '重新加载配置文件...'
systemctl daemon-reload

echo '启动docker...'
systemctl start docker

echo '设置开机自启...'
systemctl enable docker.service

echo 'docker安装成功...'
docker -v
```

### 卸载脚本 `uninstall.sh`

```shell
#!/bin/sh
echo '删除docker.service...'
rm -f /etc/systemd/system/docker.service

echo '删除docker文件...'
rm -rf /usr/bin/docker*

echo '重新加载配置文件'
systemctl daemon-reload

echo '卸载成功...'
```

### 启动

```shell
systemctl start docker
```

### 停止

```shell
systemctl stop docker
```

## 安装

目录中至少包含`docker-18.06.3-ce.tgz`、`docker.service`、`install.sh`、`uninstall.sh`文件

<div align=center><img src="../../../../images/2021/10-12/docker-install_1.png" algin="center"/></div>

### 执行安装脚本

```shell
# 安装docker
sh install.sh docker-18.06.3-ce.tgz
```

<div align=center><img src="../../../../images/2021/10-12/docker-install_2.png" algin="center"/></div>

### 查看docker版本

```shell
# 查看docker版本
docker -v
```

<div align=center><img src="../../../../images/2021/10-12/docker-install_3.png" algin="center"/></div>

## 卸载

```shell
# 卸载docker
sh uninstall.sh
```

<div align=center><img src="../../../../images/2021/10-12/docker-install_4.png" algin="center"/></div>

# 安装docker-compose

## 下载安装包

官方离线安装包下载地址：https://github.com/docker/compose/releases

目前最新版本为`v2.0.1`：`docker-compose-linux-x86_64`

## 脚本

进入到`docker-compose-linux-x86_64`所在文件目录

### 安装脚本 `install-compose.sh`

```shell
#!/bin/sh

echo '拷贝文件到/usr/local/bin目录...'
cp docker-compose-Linux-x86_64 /usr/local/bin/docker-compose

cd /usr/local/bin

echo '授权docker-compose...'
# 执行授权
sudo chmod +x docker-compose

echo '安装成功'
```

```shell
# 安装docker-compose
sh install-compose.sh
```

<div align=center><img src="../../../../images/2021/10-12/docker-compose-install_1.png" algin="center"/></div>

### 查看docker-compose版本

```shell
docker-compose --version
```

<div align=center><img src="../../../../images/2021/10-12/docker-compose-install_2.png" algin="center"/></div>

