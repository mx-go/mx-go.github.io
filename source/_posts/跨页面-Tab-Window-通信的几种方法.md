---
title: 跨页面(Tab/Window)通信的几种方法
date: 2017-09-01 10:32:43
tags: [tips]
categories: 前端
cover: ../../../../images/2017-9-13/additional/html%E9%A1%B5%E9%9D%A2%E4%BC%A0%E5%80%BC.png
---

​	今天开发一个功能遇到一个需求，在A页面点击查看详情后打开B页面进行修改或删除，删除后B页面关闭，然后刷新A页面里面的数据。相当于就是两个页面之间进行通讯，作为后端的我第一想法是利用`webSocket` 进行通讯，之后通过谷歌和百度找出了更为简便的方法。

<div align=center><img width="450" height="200" src="../../../../images/2017-9-13/additional/html%E9%A1%B5%E9%9D%A2%E4%BC%A0%E5%80%BC.png" algin="center"/></div><!-- more -->

# 利用webSocket进行通讯

​	第一想法是这个，但是这样的话工作量巨大而且还需要后端支持，太麻烦了，对于我这种懒人直接就放弃了，去寻找有没有更简便的方法。

# 定时器不断检查cookies变化

在[stackoverflow](https://stackoverflow.com/)上看到一个方案，大致思路是：

1. 在页面A设置一个使用 `setInterval` 定时器不断刷新，检查 `Cookies` 的值是否发生变化，如果变化就进行刷新的操作。
2. 由于 `Cookies` 是在同域可读的，所以在页面 B 审核的时候改变 `Cookies` 的值，页面 A 自然是可以拿到的。
   这样做确实可以实现我想要的功能，但是这样的方法相当浪费资源。虽然在这个性能过盛的时代，浪费不浪费也感觉不出来，但是这种实现方案，确实不够优(zhuāng)雅（bī）。

# localStorage的事件

功夫不负有心人，后来发现 window 有一个 [StorageEvent](https://developer.mozilla.org/zh-CN/docs/Web/API/StorageEvent) ，每当 `localStorage` 改变的时候可以触发这个事件。（这个原理就像你给一个`DOM` 绑定了 `click` 事件，当你点击它的时候，就会自动触发。）也就是说，我给 `window` 绑定这个事件后，每当我改变 `localStorage` 的时候，他都会触发这个事件。

```
window.addEventListener('storage', function (event) {
  console.log(event);
});
```

这个回调中的`event`与普通的[EVNET](https://developer.mozilla.org/zh-CN/docs/Web/API/Event#Properties),基本差不多，但是它比其他的`event`多了如下几个属性:

| 属性       | 描述                          |
| -------- | --------------------------- |
| key      | 受影响的 `localStorage` 的 `key` |
| newValue | 新的值                         |
| oldValue | 旧的值                         |
| url      | 触发此事件的url                   |

每当一个页面改变了 `localStorage` 的值，都会触发这个事件。也就是说可以很容易的通过改变 `localStorage` 的值，来实现浏览器中跨页面( tab / window )之间的通讯。记住这个事件只有在 `localStorage` 发生**改变**的时候才会被触发，如果没改变则**不会触发**此事件。

```
localStorage.setItem('delete',1); //触发
localStorage.setItem('delete',1); //不触发
localStorage.setItem('delete',2); //触发
```

在使用的时候务必注意这一点。
最终实现代码:

**页面A：**

```
//页面 A
window.addEventListener('storage', function (event) {
    if(event.key === 'delete_verify_list'){
        //页面操作
    }
});
```

**页面B：**

```
//页面 B
/**
 *  获取一个随机id
 * @return {String} - 返回一个5位的随机字符串
 */
function randomId() {
    return (Math.random() * 1E18).toString(36).slice(0, 5).toUpperCase();
}

//每当需要页面A更新时 执行此方法
if (localStorage) {
	//为保证每次页面A都执行，此处我设置里一个随机字符串
    localStorage.setItem('delete_verify_list', randomId());
}
```

参考：<https://ponyfoo.com/articles/cross-tab-communication>

