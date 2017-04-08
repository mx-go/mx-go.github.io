---
title: Markdown语法指南
date: 2017-03-21 22:51:10
tags: [tips]
---
花了一段时间把自己的个人博客搭建好了，但是博客必须是要用Markdown书写，所以查了一下Markdown编辑器的语法，在这里做个记录。

<div align=center><img width="700" height="300" src="http://on937g0jc.bkt.clouddn.com/2017-3-23/markdown.png" algin="center"/></div>

<!-- more -->

> **Markdown**是一种可以使用普通文本编辑器编写的标记语言，通过简单的标记语法，它可以使普通文本内容具有一定的格式。Markdown的语法简洁明了、学习容易，而且功能比纯文本更强，因此有很多人用它写博客。世界上最流行的博客平台[WordPress](http://baike.baidu.com/item/WordPress)和大型CMS如[Joomla](http://baike.baidu.com/item/Joomla)、[Drupal](http://baike.baidu.com/item/Drupal)都能很好的支持Markdown。完全采用Markdown编辑器的博客平台有[Ghost](http://baike.baidu.com/item/Ghost/17013737)和[Typecho](http://baike.baidu.com/item/Typecho)。

## 基本技巧

### 1  代码

如果你只想高亮语句中的某个函数名或关键字，可以使用 \``function_name()`\` 实现

通常编辑器根据代码片段适配合适的高亮方法，但你也可以用 \`\`\` 包裹一段代码，并指定一种语言

```javascript
​```javascript
$(document).ready(function () {
    alert('hello world');
});
​``` 
```
支持的语言：actionscript, apache, bash, clojure, cmake, coffeescript, cpp, cs, css, d, delphi, django, erlang, go, haskell, html, http, ini, java, javascript, json, lisp, lua, markdown, matlab, nginx, objectivec, perl, php, python, r, ruby, scala, smalltalk, sql, tex, vbscript, xml

也可以使用 4 空格缩进，再贴上代码，实现相同的的效果

```javascript
    　　def g(x):
        　　yield from range(x, 0, -1)
    　　yield from range(x)
```

### 2  标题

文章内容较多时，可以用标题分段：

```
标题1
======

标题2
-----

## 大标题 ##
### 小标题 ###
```

### 3  粗斜体

```
*斜体文本*    _斜体文本_
**粗体文本**    __粗体文本__
***粗斜体文本***    ___粗斜体文本___
```

### 4  链接

4.1 常用链接方法

```
文字链接 ![链接名称](http://链接网址)
网址链接 <http://链接网址>
```

4.2 高级链接技巧

```
这个链接用 1 作为网址变量 [Google][1].
这个链接用 yahoo 作为网址变量 [Yahoo!][yahoo].
然后在文档的结尾为变量赋值（网址）

  [1]: http://www.google.com/
  [yahoo]: http://www.yahoo.com/
```

### 5  列表

5.1 普通无序列表

```
- 列表文本前使用 [减号+空格]
+ 列表文本前使用 [加号+空格]
* 列表文本前使用 [星号+空格]
```

5.2 普通有序列表

```
1. 列表前使用 [数字+空格]
2. 我们会自动帮你添加数字
7. 不用担心数字不对，显示的时候我们会自动把这行的 7 纠正为 3
```

5.3 列表嵌套

```
1. 列出所有元素：
    - 无序列表元素 A
        1. 元素 A 的有序子列表
    - 前面加四个空格
2. 列表里的多段换行：
    前面必须加四个空格，
    这样换行，整体的格式不会乱
3. 列表里引用：

    > 前面空一行
    > 仍然需要在 >  前面加四个空格

4. 列表里代码段：
前面四个空格，之后按代码语法 ``` 书写
​``` 

    或者直接空八个，引入代码块
```
### 6  引用

6.1 普通引用

```
> 引用文本前使用 [大于号+空格]
> 折行可以不加，新起一行都要加上哦
```

6.2 引用里嵌套引用

```
> 最外层引用
> > 多一个 > 嵌套一层引用
> > > 可以嵌套很多层
```

6.3 引用里嵌套列表

```
> - 这是引用里嵌套的一个列表
> - 还可以有子列表
>     * 子列表需要从 - 之后延后四个空格开始
```

6.4 引用里嵌套代码块

```
>     同样的，在前面加四个空格形成代码块
>  
> 
> 或者使用 ``` 形成代码块
> ``
```

### 7 图片

7.1 跟链接的方法区别在于前面加了个感叹号 `!`，这样是不是觉得好记多了呢？

```
![图片名称](http://图片网址)
```

7.2 当然，你也可以像网址那样对图片网址使用变量

```javascript
这个链接用 1 作为网址变量 [Google][1].
然后在文档的结尾位变量赋值（网址）

 [1]: http://www.google.com/logo.png
```

也可以使用 HTML 的图片语法来自定义图片的宽高大小

```javascript
<img src="htt://example.com/sample.png" width="400" height="100">
```

### 8  换行

如果另起一行，只需在当前行结尾加 2 个空格

```java
在当前行的结尾加 2 个空格  
这行就会新起一行
```

如果是要起一个新段落，只需要空出一行即可。

### 9  分隔符

如果你有写分割线的习惯，可以新起一行输入三个减号`-`。当前后都有段落时，请空出一行：

```java
前面的段落

---

后面的段落
```

## 高级技巧

### 1 行内 HTML 元素

目前只支持部分段内 HTML 元素效果，包括 `      ` ，如

键位显示

```javascript
使用 <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Del</kbd> 重启电脑
```

代码块

```javascript
使用 <pre></pre> 元素同样可以形成代码块
```

粗斜体

```javascript
<b> Markdown 在此处同样适用，如 *加粗* </b>
```

### 2  符号转义

如果你的描述中需要用到 markdown 的符号，比如 `_` `#` `*` 等，但又不想它被转义，这时候可以在这些符号前加反斜杠，如 `\_` `\#``\*` 进行避免。

```javascript
\_不想这里的文本变斜体\_
\*\*不想这里的文本被加粗\*\*
```

### 3  扩展

支持** jsfiddle、gist、runjs、优酷视频**，直接填写 url，在其之后会自动添加预览点击会展开相关内容。

```javascript
http://{url_of_the_fiddle}/embedded/[{tabs}/[{style}]]/
https://gist.github.com/{gist_id}
http://runjs.cn/detail/{id}
http://v.youku.com/v_show/id_{video_id}.html
```

### 4  公式

当你需要在编辑器中插入数学公式时，可以使用两个美元符 $$ 包裹 TeX 或 LaTeX 格式的数学公式来实现。提交后，问答和文章页会根据需要加载 Mathjax 对数学公式进行渲染。如：

```java
$$ x = {-b \pm \sqrt{b^2-4ac} \over 2a}. $$

$$
x \href{why-equal.html}{=} y^2 + 1
$$
```

同时也支持 HTML 属性，如：

```java
$$ (x+1)^2 = \class{hidden}{(x+1)(x+1)} $$

$$
(x+1)^2 = \cssId{step1}{\style{visibility:hidden}{(x+1)(x+1)}}
$$
```
## 总结

markdown语法写多了自然就会了，网上有很多markdown语法编辑器，比如有道云、马克飞象、Typora等。我目前使用的是`Typora`编辑器，使用起来比其他的更简单、舒适，方便。