---
title: JAVA实现简单网络爬虫
date: 2017-04-01 14:17:39
tags: [java, tool]
categories: technology
---

<div align=center><img width="700" height="300" src="http://on937g0jc.bkt.clouddn.com/2017-4-1/%E7%88%AC%E8%99%AB.jpg" algin="center"/></div><!-- more -->

## 爬虫基本理解

> 通俗一点，`爬虫`是用来快速、批量获取我们在网络需要的东西，过滤掉不需要的东西，比如我可以爬一个网站的所有图片省的一张一张去保存，也可以爬其他数据来做研究、统计、数据分析，即是：
>
> (1) 对抓取目标的描述或定义；
>
> (2) 对网页或数据的分析与过滤；
>
> (3) 对URL的搜索策略。
>
> 很多语言都可以做爬虫，在这里记录JAVA做一个简单的爬虫，等以后学会其他语言了再用其他语言做爬虫，哈哈...

## 实现爬虫需要

### 知识点

- 简单**HTML、CSS、JS**等前端知识
- [**正则表达式**](http://deerchao.net/tutorials/regex/regex.htm)（很重要，用于过滤不需要的信息）
- JAVA**语言知识**（可换成其他语言）

### 参数

1. 首先你要给它一个种子链接`URL`
2. 在种子链接的页面查找其他的URL，重复1步骤
3. 有链接有页面，然后你可以在页面中查找需要的内容

## 简单爬虫代码

在这里做个示例：把网站`https://www.baidu.com/home/news/data/newspage?nid=7953839918275534&n_type=0&p_from=1`  图片全部down下来并保存到本地磁盘的操作。

### JAVA基本方式

```java
public class Reptile {
	public static String doGet(String urlStr) throws Exception {
		URL url;
		String html = "";
		try {
			url = new URL(urlStr);
			HttpURLConnection connection = (HttpURLConnection) url.openConnection();
			connection.setRequestProperty("Accept", "text/html");
			connection.setRequestProperty("Accept-Charset", "utf-8");
			connection.setRequestProperty("Accept-Language", "en-US,en");
			connection.setRequestProperty("User-Agent",
                    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.22 (KHTML, like Gecko) 					Chrome/25.0.1364.160 Safari/537.22");
			connection.setRequestMethod("GET");
			connection.setConnectTimeout(5000);
			connection.setDoInput(true);
			connection.setDoOutput(true);
			if (connection.getResponseCode() == 200) {
				System.out.println("已连接，正在解析。。。。。。");
				InputStream in = connection.getInputStream();
				html = StreamTool.inToStringByByte(in);
			} else {
				System.out.println(connection.getResponseCode());
			}
		} catch (Exception e) {
			e.printStackTrace();
			throw new Exception("get请求失败");
		}
		return html;
	}

	public static void main(String[] args) throws Exception {
		Reptile reptile = new Reptile()
		String htmlStr = Reptile.doGet("https://www.baidu.com/home/news/data/
                                       newspagenid=7953839918275534&n_type=0&p_from=1");

		File f = new File("E://imgs");
		if (!f.exists()) {
			f.mkdirs();
		}

		Pattern pattern = Pattern.compile("<img.*src=(.*?)[^>]*?>"); //匹配Imag标签
		Matcher matcher = pattern.matcher(htmlStr); // 定义一个matcher用来做匹配
      
		System.out.println("正在下载");
		while (matcher.find()) {
			String imgs = matcher.group();
			Matcher srcMatcher = Pattern.compile("https:\"?(.*?)(\"|>|\\s+)").matcher(imgs);
			while (srcMatcher.find()) {
				String src = srcMatcher.group().substring(0,srcMatcher.group().length() - 1);
				System.out.println(src);
              	 // 获取后缀名
				String imageName = src.substring(src.lastIndexOf("/") + 1,src.length());
				reptile.downLoad(src, imageName);   //下载图片到本地
			}
		}
	}
	//下载图片到本地
	public void downLoad(String src, String imageName) throws Exception {
		URL url = new URL(src);
      
		URLConnection uri = url.openConnection();
		InputStream is = uri.getInputStream(); // 获取数据流
		// 写入数据流
		OutputStream os = new FileOutputStream(new File("E://imgs", imageName));
		byte[] buf = new byte[1024];
		int len = 0;
		while ((len = is.read(buf)) != -1) {
			os.write(buf, 0, len);
		}
		os.close();
		is.close();
	}
}
```

> JAVA基本方法主要是利用JAVA中的正则表达式匹配我们我需要的元素，然后再进行其他操作。简单、粗暴。

### [Jsoup](http://baike.baidu.com/link?url=utl_VUDcVYjjpjXYnY1NKXoTbfToHXosLWBr9qmIjSe0DuYkIUv-zgBbXbJsMPoVjp6YGRMjt_B95v4mRKCdK_)方式

> `Jsoup` 是一个 Java 的开源HTML解析器，可直接解析某个URL地址、HTML文本内容。同时提供了一套非常省力的API，可通过DOM，CSS以及类似于jQuery的操作方法来取出和操作数据。可以直接使用DOM或者JQuery方法和表达式取出数据。
>
> 需要下载JAR包，下载地址：[*点我*](http://on937g0jc.bkt.clouddn.com/2017-4-1/jsoup-1.10.2.jar)
>
> `Jsoup API`：详见：*http://www.open-open.com/jsoup/*

**工具类StreamTool** ：将byte对象转化为String对象

```java
public class StreamTool {
//  将byte对象转化为String对象
	public static String inToStringByByte(InputStream in) throws Exception {
		ByteArrayOutputStream outStr = new ByteArrayOutputStream();
		byte[] buffer = new byte[1024];
		int len = 0;
		StringBuilder content = new StringBuilder();
		while ((len = in.read(buffer)) != -1) {
			content.append(new String(buffer, 0, len, "UTF-8"));
		}
		outStr.close();
		return content.toString();
	}
}
```

**基本实现类Reptile**

```java
public class Reptile {
	public static String doGet(String urlStr) throws Exception {
		URL url;
		String html = "";
		try {
			url = new URL(urlStr);
			HttpURLConnection connection = (HttpURLConnection) url.openConnection();
			//伪装爬虫，不然会报403错误
			connection.setRequestProperty("Accept", "text/html"); 
			connection.setRequestProperty("Accept-Charset", "utf-8");
			connection.setRequestProperty("Accept-Language", "en-US,en");
			connection.setRequestProperty("User-Agent","Mozilla/5.0 (X11; Linux x86_64)
              AppleWebKit/537.22 (KHTML, like Gecko) Chrome/25.0.1364.160 Safari/537.22");
			
			connection.setRequestMethod("GET"); // 定义请求方式
			connection.setConnectTimeout(5000);
			connection.setDoInput(true); //设置是否向httpUrlConnection输出， 默认情况下是false;
			connection.setDoOutput(true); // 设置是否从httpUrlConnection读入，默认情况下是true; 
			if (connection.getResponseCode() == 200) { //连接成功
				System.out.println("已连接，正在解析。。。。。。");
				InputStream in = connection.getInputStream();
				html = StreamTool.inToStringByByte(in);
			} else {
				System.out.println(connection.getResponseCode());
			}
		} catch (Exception e) {
			e.printStackTrace();
			throw new Exception("get请求失败");
		}
		return html;
	}

	public static void main(String[] args) throws Exception {
      	URL url ;
     	InputStream is = null;
		OutputStream os = null;
     	String urlStr = "https://www.baidu.com/home/news/data/newspage?nid=7953839918275534&n_type=0&p_from=1";
      
		String htmlStr = Reptile.doGet(urlStr);
		Document doc = Jsoup.parse(htmlStr); // 将获取的网页 HTML 源代码转化为 Document对象

		File f = new File("E://imgs");  //把文件存在E://imgs
		if (!f.exists()) {
			f.mkdirs();
		}
		Elements pngs = doc.select("img[src]");  //获取所有图片
//		Elements pngs = doc.select("img[src$=.png]");只爬取png图片
		int i = 1;	 //计数
		for (Element e : pngs) {
			String src = e.attr("src");  // 获取img中的src路径
			String imageName = src.substring(src.lastIndexOf("/") + 1,
             		src.length());	// 获取后缀名

			System.out.println("正在下载第" + i + "张图片："+ imageName);
			
			URL url = new URL(src); 	// 连接url
			URLConnection uri = url.openConnection();
			
			is = uri.getInputStream();	 // 获取数据流
			os = new FileOutputStream(new File("E://imgs",imageName));// 写入数据流
			byte[] buf = new byte[1024];
			int len = 0;
			while ((len = is.read(buf)) != -1) {
				os.write(buf, 0, len);
			}
			i++;
		}
      		os.close();
      		is.close();
		System.out.println("共有" + (i-1) + "张图片。");
	}
}
```

## 总结

在这里只做个一个简单的爬虫示例，**通过两种方式的比较后，发现Jsoup更佳。**

`JAVA`基本的方式能用正则表达式来匹配所需要的元素，灵活性不高。

`Jsoup`这个强大的工具提供了DOM和JQuery方法，可以直接操作节点，同时也支持正则表达式，更加的灵活、省力，同时选择性、可玩性和扩展性更高。Jsoup更多的方法可以查看[*Jsoup的API*](http://www.open-open.com/jsoup/)。

现在已经有很多开源的爬虫的框架供我们选择，比如webmagic、Heritrix等，可以适当选择。

## 附

还有一种更为简单强大的方式，在`Linux环境`下，利用`wget命令`只需要一行命令就可以实现以上功能。

```linux
wget -m -H -nd -l 1 -t 1 -A .jpg,.png,.jpeg,.JPEG -e robots=off -P /opt/download --no-check-certificate https://www.baidu.com/home/news/data/newspage?nid=7953839918275534&n_type=0&p_from=1
```

在下篇博客写一下Linux的基本命令。