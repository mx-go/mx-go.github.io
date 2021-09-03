---
title: Docker常用命令总结
date: 2021-07-20 20:28:49
tags: [docker]
categories: 
- [工具]
img: ../../../../images/2021/7-9/docker-cover.png
cover: ../../../../images/2021/7-9/docker-cover.png
---

<div align=center><img src="../../../../images/2021/7-9/docker-r.png" algin="center"/></div><!-- more -->

# 图示命令

<div align=center><img src="../../../../images/2021/7-9/docker-command.png" algin="center"/></div><!-- more -->

# docker服务

| COMMAND                 | DESC                                       |
| ----------------------- | ------------------------------------------ |
| docker info             | 系统级别docker信息。包含镜像和容器数量等。 |
| docker version          | 查看docker版本信息                         |
| docker -v               | 查看docker简要信息                         |
| systemctl enable docker | 设置开机自启                               |
| systemctl start docker  | 启动docker                                 |
| systemctl stop docker   | 关闭docker                                 |
| service docker restart  | 重启docker服务                             |
| service docker stop     | 停止docker服务                             |

# docker镜像

docker官方镜像地址：[https://hub.docker.com](https://hub.docker.com/)

| COMMAND                      | DESC             |
| ---------------------------- | ---------------- |
| docker search <镜像名称>     | 搜索docker镜像   |
| docker pull <镜像名称>       | 拉取镜像         |
| docker images                | 列出所有镜像信息 |
| docker images -qa            | 列出所有镜像ID   |
| docker rmi <镜像ID>          | 单个删除镜像     |
| docker rmi $(docker rmi -qa) | 删除所有镜像     |

# docker容器

| COMMAND                            | DESC                 |
| ---------------------------------- | -------------------- |
| docker inspect <容器ID>            | 查看容器元信息       |
| docker ps                          | 查看所有运行中的容器 |
| docker ps -a                       | 查看所有容器         |
| docker run <容器ID>                | 新建并启动容器       |
| docker start <容器ID \|容器名称>   | 启动已终止容器       |
| docker stop <容器ID \|容器名称>    | 停止运行中容器       |
| docker restart <容器ID \|容器名称> | 重启容器             |
| docker kill <容器ID \|容器名称>    | 强制杀死容器         |
| docker rm <容器ID \|容器名称>      | 删除单个容器         |
| docker rm $(docker ps -qa)         | 删除所有容器         |
| docker exec -it <容器ID> /bin/bash | 交互式进入容器       |
| docker top <容器ID>                | 查看容器中的进程信息 |

# docker网络

| COMMAND                                                      | DESC                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| docker network ls                                            | 查看docker网络                                               |
| docker network inspect <网络ID>                              | 查看网络详情                                                 |
| docker network create --driver bridge --subnet <subnet> --gateway <gateway> <网络名称> | 创建docker自定义网络。例：<br />docker network create --driver bridge --subnet 192.168.0.0/16 --gateway 192.168.0.1 mynet |

# 其他命令

| COMMAND                                      | DESC                 |
| -------------------------------------------- | -------------------- |
| docker logs <容器ID>                         | 查看容器日志         |
| docker cp <本机文件> <容器ID>:<容器文件路径> | 拷贝宿主机文件到容器 |
| docker cp <容器ID>:<容器文件> <本机路径>     | 拷贝容器文件到宿主机 |

# 常用镜像

- {% label -d red %}：表示以后台方式运行
- {% label -p red %}：端口映射。<宿主机端口>:<容器暴露端口>
- {% label -P red %}：随机指定端口
- {% label -v red %}：挂载卷。<宿主机目录>:<容器目录>
- {% label --name red %}：容器名称
- {% label --net red %}：自定义网络

## Portainer

```shell
# windows环境安装。使用手册见 https://hub.docker.com/r/portainer/portainer-ce
# 访问端口为9000
docker run -d -p 9000:9000 --restart=always -v /var/run/docker.sock:/var/run/docker.sock -v portainer_data:/data -v \\.\pipe\docker_engine:\\.\pipe\docker_engine --name prtainer --net mynet portainer/portainer-ce
```

## MySQL

```shell
# 数据库密码为123456
docker run -d -p 3306:3306 -v G:\volumes\mysql\conf:/etc/mysql/conf.d -v G:\volumes\mysql\data:/var/lib/mysql -e MYSQL_ROOT_PASSWORD=123456 --name mysql --net mynet mysql:8.0.26
```

## Grafana

```shell
# 访问端口为3000
docker run -d -p 3000:3000 --name grafana --net mynet grafana/grafana
```

## Nacos

```shell
# 访问端口为8848
docker run -dp 8848:8848 -e MODE=standalone --name nacos --net mynet nacos/nacos-server:latest
```

## xxl-job

1. 需要在本地新建挂载文件 application.properties。 路径为[https://github.com/xuxueli/xxl-job/blob/master/xxl-job-admin/src/main/resources/application.properties](https://github.com/xuxueli/xxl-job/blob/master/xxl-job-admin/src/main/resources/application.properties)
1. 修改MySQL的用户名和密码

```groovy
// 访问端口为9090。挂载配置路径为G:\volumes\xxl-job\application.properties
docker run -dp 9090:9090 -v G:\volumes\xxl-job\application.properties:/application.properties -e PARAMS='--spring.config.location=/application.properties' --name xxl-job-admin --net mynet xuxueli/xxl-job-admin:2.3.0
```

## ElasticSearch相关

`docker-compose.yaml` 如下所示

```yaml
version: '3.8'
services:
  cerebro:
    image: lmenezes/cerebro:0.9.3
    container_name: cerebro
    ports:
      - "9300:9000"
    command:
      - -Dhosts.0.host=http://elasticsearch:9200
    networks:
      - es7net
  elasticsearch-head:
    image: mobz/elasticsearch-head:5-alpine
    container_name: es-head
    ports:
      - "9100:9100"
    networks:
      - es7net      
  kibana:
    image: kibana:7.9.3
    container_name: kibana
    environment:
      - I18N_LOCALE=zh-CN
      - XPACK_GRAPH_ENABLED=true
      - TIMELION_ENABLED=true
      - XPACK_MONITORING_COLLECTION_ENABLED="true"
    ports:
      - "5601:5601"
    networks:
      - es7net
  elasticsearch:
    image: elasticsearch:7.9.3
    container_name: elasticsearch
    environment:
      - cluster.name=maxTest
      - node.name=es7_01
      - bootstrap.memory_lock=true
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - discovery.seed_hosts=es7_01
      - cluster.initial_master_nodes=es7_01
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - es7data1:/usr/share/elasticsearch/data
    ports:
      - 9200:9200
    networks:
      - es7net

volumes:
  es7data1:
    driver: local

networks:
  es7net:
    driver: bridge
```

> 1. cerebro访问端口为9300
> 1. elasticsearch-head访问端口为9100
> 1. kibana访问端口为6501
> 1. elasticsearch访问端口为9200

若想要**elasticsearch-head**连接**es**，需要在**es**容器**config**路径**elasticsearch.yml**配置文件中添加

```yaml
http.cors.enabled: true
http.cors.allow-origin: "*"
```

## Apollo

官方文档：https://www.apolloconfig.com/#/zh/deployment/quick-start-docker

