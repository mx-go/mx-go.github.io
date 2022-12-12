---
title: ProcessOn模板免费下载
date: 2021-12-18 19:39:15
tags: [tips]
img: ../../../../images/2022/10-12/processon0.png
cover: ../../../../images/2022/10-12/processon0.png
---

# 前言

使用`js`脚本免费获取自己想要的模板。

## 获取目标数据

访问自己想要使用的模板页，通过`F12`得到`def`数据并复制。

<div align=center><img src="../../../../images/2022/10-12/processon1.png" algin="center"/></div>

## 模拟数据

### 思维导图

#### 复制数据

将上述【获取目标数据】的`def`值复制下来填充到以下模板中。

```js
let newO = '复制的def值'
o = JSON.parse(newC);
```

#### 新建空白思维导图

在自己的工作空间新建一个空白的思维导图

#### 填充数据

1. 在自己绘制的思维导图页面打开`F12`进入调试模式，刷新页面。使用`Ctrl + P`命令搜索 `mind.js`。<div align=center><img src="../../../../images/2022/10-12/processon2.png" algin="center"/></div>

2. 格式化数据，通过`Ctrl + F`搜索关键字 `getNewDef`，找到赋值行打上`DEBUG`。<div align=center><img src="../../../../images/2022/10-12/processon3.png" algin="center"/></div>

3. 刷新页面，节点会停留在`DEBUG`的行。此时将【复制数据】中的代码粘贴到`console`中并执行。<div align=center><img src="../../../../images/2022/10-12/processon4.png" algin="center"/></div>

4. `F8`继续执行原脚本，此时，可以发现绘图区域已是想要的模板了。
5. 导出模板。

### 流程图

1. 将上述【获取目标数据】的`def`值复制下来填充到以下代码模板中。

   ```js
   Designer.open('复制的def值')
   ```

2. 在自己新建的流程图绘图页面打开`F12`，在`console`中执行上述脚本。
3. 下载模板。
