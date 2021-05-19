---
title: Apache-Commons-Email发送邮件
date: 2018-03-28 18:18:13
tags: [java, tips]
categories: 工具
cover: ../../../../images/2018-3/java-email/index.jpg
---

# 引言

使用Apache-Commons-Email发送邮件<div align=center><img src="../../../../images/2018-3/java-email/index.jpg" algin="center"/></div>

# 环境准备

Maven的pom.xml 文件中引入依赖

```xml
<dependency>
    <groupId>org.apache.commons</groupId>
    <artifactId>commons-email</artifactId>
    <version>1.5</version>
</dependency>
```

# 一个简单的纯文本邮件

## HTTP模式下

第一个例子是创建一个简单的email。

```java
import org.apache.commons.mail.EmailException;
import org.apache.commons.mail.SimpleEmail;
/**
* 类名: TestSimpleEmail.java <br/>
* 详细描述: 一个简单的纯文本邮件   <br/>
* 发布版本： V1.0  <br/>
 */
public class TestSimpleEmail {

	public static void main(String[] args) {

		   SimpleEmail email = new SimpleEmail();
	        //设置发送主机的服务器地址(如果不设置，默认是"mail.host")
	        email.setHostName ("smtp.163.com");
        	// 开启debug模式
        	email.setDebug(true);
	        //设置端口号
	        email.setSmtpPort(25);//默认也是25
	        //如果要求身份验证，设置用户名、密码，分别为发件人在邮件服务器上注册的用户名和密码
	        email.setAuthentication ( "from@163.com", "password" );
	        try {
	        	//设置收件人邮箱以及名称
	        	email.addTo ("to@qq.com", "收件人名称");
	        	//发件人邮箱以及名称
		        //email.setFrom ("from@163.com", "发件人名称");
	        	//发件人邮箱以及名称，邮件编码格式
		        email.setFrom("from@163.com", "发件人名称", "UTF-8");
		        //设置邮件的主题
		        email.setSubject ("这是邮件主题内容");
		        //邮件正文消息
		        email.setMsg ("这是邮件内容！");
		        // 发送
		        email.send ();
		        System.out.println ("Send email successful!");
			} catch (EmailException e) {
				e.printStackTrace();
			}       
	}
}
```

如果遇到乱码情况可以通过以下方案解决：

```java
//设置主题的字符集为UTF-8
email.setCharset("UTF-8");
//设置内容的字符集为UTF-8,先buildMimeMessage才能设置内容文本
email.getMimeMessage().setText("测试邮件内容","UTF-8");
```

## 开启了HTTPS

需要添加ssl端口，以及开启SSLOnConnect。

```java
import org.apache.commons.mail.EmailException;
import org.apache.commons.mail.SimpleEmail;
/**
* 类名: TestSimpleSSLEmail.java <br/>
* 详细描述: 一个简单的纯文本邮件 --开启了https的情况下   <br/>
* 发布版本： V1.0  <br/>
 */
public class TestSimpleSSLEmail {
 
	public static void main(String[] args) {
 
		    SimpleEmail email = new SimpleEmail ();
	        // smtp host
	        email.setHostName ("smtp.qq.com");
	        //端口号
	        email.setSslSmtpPort("465");
	        // 登陆邮件服务器的用户名和密码
	        email.setAuthentication ("from@qq.com", "password");//注意qq邮箱需要授权，在设置那里生成一个随机码，然后填写到密码框。
	        // 接收人
	        email.setSSLOnConnect(true);
	        try {
	        	//设置收件人邮箱以及名称
				email.addTo ("to@qq.com", "to");
				// 发送人
		        //email.setFrom ("from@163.com", "from");
		        email.setFrom("from@qq.com", "from", "UTF-8");
		        //设置邮件的主题
		        email.setSubject ("这是邮件主题内容");
		        //邮件正文消息
		        email.setMsg ("这是邮件内容！--一个简单的纯文本邮件 --开启了https的情况下  ");
		        // 发送
		        email.send ();
		        System.out.println ("Send email successful!");
			} catch (EmailException e) {
				e.printStackTrace();
			}
	}
}
```

特别要注意的是qq邮箱进行了加密，所以需要到qq账户设置里面拿到开启stmp发信客户端的密码。

<div align=center><img src="../../../../images/2018-3/java-email/QQ-1.png" algin="center"/></div>

<div align=center><img src="../../../../images/2018-3/java-email/QQ-2.png" algin="center"/></div>

取到一串字符串，然后填写到密码处。不然会报以下的错误。而不是填写QQ账号密码到密码认证处。详细也可以参照[***QQ客户端说明文档***](http://service.mail.qq.com/cgi-bin/help?subtype=1&&id=28&&no=331)。

<div align=center><img src="../../../../images/2018-3/java-email/QQ-Exception.png" algin="center"/></div>

# 发送带附件的邮件

发送带附件的邮件得用MultiPartEmail 类来给邮件添加附件。除过覆盖attach()方法来给邮件添加附件外，这个类就和SimpleEmail类差不多。对于内联或是加入附件的个数是没有限制的。但附件必须是MIME编码。最简单的添加附件的方式是用 EmailAttachment类。

## 本地附件

```java
import org.apache.commons.mail.EmailAttachment;
import org.apache.commons.mail.EmailException;
import org.apache.commons.mail.MultiPartEmail;
/**
* 类名: TestEmailAttachment.java <br/>
* 详细描述:发送带附件的邮件--读取本地路径的文件  <br/>
* 发布版本： V1.0  <br/>
 */
public class TestEmailAttachment {

	public static void main(String[] args) {
		
		  // 创建一个Email附件
		  EmailAttachment attachment = new EmailAttachment();
           // 本地资源需要存在
		  attachment.setPath("E:\\qrcode.jpg");
		  attachment.setDisposition(EmailAttachment.ATTACHMENT);
		  attachment.setDescription("图片");
           // 自定义文件名，并且格式要一致，不然附近收到的话，有可能读不出来。
		  attachment.setName("qrcode.jpg");
		 
		  // Create the email message
		  MultiPartEmail email = new MultiPartEmail();
		  // smtp host
	      email.setHostName ("smtp.163.com");
	      //设置端口号
	      email.setSmtpPort(25);//默认也是25
	      // 登陆邮件服务器的用户名和密码
	      email.setAuthentication ("from@163.com","password");
		  try {
                //设置收件人邮箱以及名称
                email.addTo ("to@qq.com", "收件人名称");
                //发件人邮箱以及名称
                //email.setFrom ("from@163.com", "发件人名称");
                //发件人邮箱以及名称，邮件编码格式
                email.setFrom("from@163.com", "发件人名称", "UTF-8");
                //设置邮件的主题
                email.setSubject ("这是邮件主题内容");
                //邮件正文消息
                email.setMsg ("这是邮件内容！");

                // add the attachment
                email.attach(attachment);
                // send the email
                email.send();
                System.out.println ("Send email successful!");
		} catch (EmailException e) {
			e.printStackTrace();
		}	  
	}
}
```

## 远程附件

如果没有本地文件，可以用 EmailAttachment 添加任何可用的URL。当邮件发送后，文件会自动加载并加入到邮件内容。

```java
import java.net.MalformedURLException;
import java.net.URL;
 
import org.apache.commons.mail.EmailAttachment;
import org.apache.commons.mail.EmailException;
import org.apache.commons.mail.MultiPartEmail;
/**
* 类名: TestEmailAttachment.java <br/>
* 详细描述:发送带附件的邮件--读取本地路径的文件  <br/>
* 发布版本： V1.0  <br/>
 */
public class TestEmailAttachment2 {
 
	public static void main(String[] args) throws MalformedURLException {
		
		  // 创建一个Email附件
		  EmailAttachment attachment = new EmailAttachment();
		  attachment.setURL(new URL("http://www.apache.org/images/asf_logo_wide.gif"));
		  attachment.setDisposition(EmailAttachment.ATTACHMENT);
		  attachment.setDescription("Apache logo");
           // 自定义文件名，并且格式要一致，不然附近收到的话，有可能读不出来
		  attachment.setName("asf_logo_wide.gif");
		 
		  // Create the email message
		  MultiPartEmail email = new MultiPartEmail();
		  // smtp host
	      email.setHostName ("smtp.163.com");
	      //设置端口号(默认25)
	      email.setSmtpPort(25);
	      // 登陆邮件服务器的用户名和密码
	      email.setAuthentication ("from@163.com","password");
		  
		  try {
                // 设置收件人邮箱以及名称
                email.addTo ("to@qq.com", "收件人名称");
                // 发件人邮箱以及名称
                // email.setFrom ("from@163.com", "发件人名称");
                // 发件人邮箱以及名称，邮件编码格式
                email.setFrom("from@163.com", "发件人名称", "UTF-8");
                // 设置邮件的主题
                email.setSubject ("这是邮件主题内容");
                // 邮件正文消息
                email.setMsg ("这是邮件内容！");

                // 添加附件
                email.attach(attachment);
                // 发送邮件
                email.send();
                System.out.println ("Send email successful!");
		} catch (EmailException e) {
			e.printStackTrace();
		}	  
	}
}
```

# 发送带HTML格式的邮件

```java
import java.net.MalformedURLException;
import java.net.URL;
 
import org.apache.commons.mail.EmailException;
import org.apache.commons.mail.HtmlEmail;
/**
* 类名: TestHtmlEmail.java <br/>
* 详细描述: 发送带HTML格式的邮件<br/>
* 发布版本： V1.0  <br/>
 */
public class TestHtmlEmail {
 
	public static void main(String[] args) {
		// 创建HTML邮件
		HtmlEmail email = new HtmlEmail();
	    // 设置发送主机的服务器地址
        email.setHostName ("smtp.163.com");
        // 设置端口号(默认25)
        email.setSmtpPort(25);
        // 如果要求身份验证，设置用户名、密码，分别为发件人在邮件服务器上注册的用户名和密码
        email.setAuthentication ("from@163.com", "password" );
		  try {
			  URL url = new URL("http://www.apache.org/images/asf_logo_wide.gif");
			  String cid = email.embed(url, "Apache logo");
			  
			  //设置收件人邮箱以及名称
	          email.addTo ("to@qq.com", "收件人名称");
	          //发件人邮箱以及名称
		      //email.setFrom ("from@163.com", "发件人名称");
	          //发件人邮箱以及名称，邮件编码格式
		      email.setFrom("from@163.com", "发件人名称", "UTF-8");
		      //设置邮件的主题
		      email.setSubject ("这是邮件主题内容-发送带HTML格式的邮件");
			 
		      // HTML信息
			  email.setHtmlMsg("<html>The apache logo - <img src=\"cid:" + cid + "\"></html>");
			  // set the alternative message
			  email.setTextMsg("Your email client does not support HTML messages");
			  // 发送邮件
			  email.send();
			  System.out.println ("Send email successful!");
		} catch (EmailException | MalformedURLException e) {
			e.printStackTrace();
		}
	}
}
```

注意：

- embed()方法返回一个字符串。该字符串是一个随机生成的标识符，必须在图像标记中引用图像的图像。
- 没有调用setmsg()这个例子。因为如果HTML内容里有内联图片的话，这个方法是不能用的。这样我们可以用setHtmlMsg和setTextMsg方法。

# 发送带嵌入图片的HTML文本

前面说的是创建带嵌入图片的HTML邮件，但是用HTML邮件模板来处理图片是很麻烦的。ImageHtmlEmail类能解决这个问题，它能很方便的将所有外部图片转化为内联图片。

```java
import java.net.MalformedURLException;
import java.net.URL;
import org.apache.commons.mail.EmailException;
import org.apache.commons.mail.ImageHtmlEmail;
import org.apache.commons.mail.resolver.DataSourceUrlResolver;
 
/**
* 类名: TestHtmlEmail.java <br/>
* 详细描述: 发送带HTML格式的邮件--嵌入图片的HTML文本 <br/>
* 发布版本： V1.0  <br/>
 */
public class TestHtmlEmail2 {
 
	public static void main(String[] args) {
 
		// create the email message
	    ImageHtmlEmail email = new ImageHtmlEmail();
		// 设置发送主机的服务器地址
	    email.setHostName ("smtp.163.com");
	    // 设置端口号(默认25)
        email.setSmtpPort(25);
        // 如果要求身份验证，设置用户名、密码，分别为发件人在邮件服务器上注册的用户名和密码
        email.setAuthentication ( "from@163.com", "password" );
		// load your HTML email template
		 String htmlEmailTemplate = "嵌入图片的HTML文本:<img src=\"http://www.apache.org/images/feather.gif\"> ....";
 
		try {
			URL url = new URL("http://www.apache.org");
			email.setDataSourceResolver(new DataSourceUrlResolver(url));
			// 设置收件人邮箱以及名称
			email.addTo("to@sina.com", "收件人名称");
			// 发件人邮箱以及名称
			// 发件人邮箱以及名称，邮件编码格式
			email.setFrom("from@qq.com", "发件人名称", "UTF-8");
			// 设置邮件的主题
			email.setSubject("这是邮件主题内容");

			// set the html message
			email.setHtmlMsg(htmlEmailTemplate);
			email.setCharset("UTF-8");

			// set the alternative message
			email.setTextMsg("Your email client does not support HTML messages");

			// 发送邮件
			email.send();
			System.out.println("Send email successful!");
		} catch (MalformedURLException | EmailException e) {
			e.printStackTrace();
		}
	}
}
```

# 调试

JavaMail API支持调试选项，通过调用setDebug(true)来开启调试。调试信息会通过System.out打印出来。

commons-email的安全设置的特性。可以用EmailLiveTest和EmailConfiguration类在真正的SMTP服务器上测试commons-email。

# 认证

如果要对SMTP服务器进行认证，可以在发邮件前调用setAuthentication(userName,password)方法测试。这将会在JavaMail API发送邮件时创建DefaultAuthenticator实例，要支持此方法得让你的服务器支持RFC255协议。

可以用javax.mail.Authenticator的子类来完成更加复杂的认证，如弹出个对话框等。当想收集并处理用户信息时，必须覆盖getPasswordAuthentication()方法。用Email.setAuthenticator方法可以创建新的Authenticator类。

# 参考文章

***http://commons.apache.org/proper/commons-email/userguide.html***

[***Apache Commons Email 发送邮件的用法介绍以及实战练习*** ](http://www.souvc.com/?p=499)