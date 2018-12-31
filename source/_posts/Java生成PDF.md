---
title: Java生成PDF
date: 2017-11-13 15:51:53
tags: [java, tips]
categories: 后端
---

# 引言

在某些业务场景中，需要提供相关的电子凭证，比如网银/支付宝中转账的电子回单，签约的电子合同、证书等。方便用户查看，下载，打印。目前常用的解决方案是，把相关数据信息，生成对应的PDF文件返回给用户。之前有写过一篇博客关于**JAVA实现HTML转PDF**，不同场景下的业务不同，现在需要使用PDF生成证书，这篇博客主要介绍iText的使用。

本博客项目地址：https://github.com/Sunny0715/java_pdf_demo<div align=center><img width="600" height="200" src="../../../../images/2017-11-13/iText/0.png"/>

</div><!-- more -->

# iText介绍

iText是著名的开放源码的站点sourceforge一个项目，是用于生成PDF文档的一个JAVA类库。通过iText不仅可以生成PDF或rtf的文档，而且可以将XML、HTML文件转化为PDF文件。

iText 官网：http://itextpdf.com/

iText 开发文档： http://developers.itextpdf.com/developers-home

iText目前有两套版本iText5和iText7。iText5应该是网上用的比较多的一个版本。iText5因为是很多开发者参与贡献代码，因此在一些规范和设计上存在不合理的地方。iText7是后来官方针对iText5的重构，两个版本差别还是挺大的。不过在实际使用中，一般用到的都比较简单，所以不用特别拘泥于使用哪个版本。比如我们在http://mvnrepository.com/中搜索iText，出来的都是iText5的依赖。

# iText简单使用

添加依赖

```xml
<!-- https://mvnrepository.com/artifact/com.itextpdf/itextpdf -->
<dependency>
    <groupId>com.itextpdf</groupId>
    <artifactId>itextpdf</artifactId>
    <version>5.5.11</version>
</dependency>
```

测试代码：JavaToPdf

```java
package com.rainbowhorse.test;

import com.itextpdf.text.Document;
import com.itextpdf.text.DocumentException;
import com.itextpdf.text.Paragraph;
import com.itextpdf.text.pdf.PdfWriter;

import java.io.FileNotFoundException;
import java.io.FileOutputStream;

/**
 * 不支持中文
 * ClassName: JavaToPdf 
 * @Description: TODO
 * @author max
 * @date 2017年11月13日
 */
public class JavaToPdf {

	// 生成PDF路径
	private static final String DEST = "target/HelloWorld.pdf";

	public static void main(String[] args) throws FileNotFoundException, DocumentException {
		Document document = new Document();
		PdfWriter writer = PdfWriter.getInstance(document, new FileOutputStream(DEST));
		document.open();
		document.add(new Paragraph("hello world"));
		document.close();
		writer.close();
	}
}
```

运行结果

<div align=center><img width="800" height="200" src="../../../../images/2017-11-13/iText/1.png" algin="center"/>

</div>

# iText中文支持

iText默认是不支持中文的，因此需要添加对应的中文字体,比如黑体simhei.ttf

可参考文档：http://developers.itextpdf.com/examples/font-examples/using-fonts#1227-tengwarquenya1.java

测试代码：JavaToPdfCN

```java
package com.rainbowhorse.test;

import com.itextpdf.text.Document;
import com.itextpdf.text.DocumentException;
import com.itextpdf.text.Font;
import com.itextpdf.text.FontFactory;
import com.itextpdf.text.Paragraph;
import com.itextpdf.text.pdf.BaseFont;
import com.itextpdf.text.pdf.PdfWriter;

import java.io.FileNotFoundException;
import java.io.FileOutputStream;

/**
 * 支持中文
 * ClassName: JavaToPdfCN 
 * @Description: TODO
 * @author max
 * @date 2017年11月13日
 */
public class JavaToPdfCN {

	// 生成PDF路径
	private static final String DEST = "target/HelloWorld_CN.pdf";
	// 中文字体（黑体）
	private static final String FONT = "simhei.ttf";

	public static void main(String[] args) throws FileNotFoundException, DocumentException {
		Document document = new Document();
		PdfWriter writer = PdfWriter.getInstance(document, new FileOutputStream(DEST));
		document.open();
		Font font = FontFactory.getFont(FONT, BaseFont.IDENTITY_H, BaseFont.NOT_EMBEDDED);
		document.add(new Paragraph("hello world，我是rainbowhorse。", font));
		document.close();
		writer.close();
	}
}
```

运行结果

<div align=center><img width="800" height="200" src="../../../../images/2017-11-13/iText/2.png" algin="center"/>

</div>

# iText-HTML渲染

在一些比较复杂的PDF布局中，我们可以通过HTML去生成PDF

可参考文档：http://developers.itextpdf.com/examples/xml-worker-itext5/xml-worker-examples

添加依赖

```xml
<!-- https://mvnrepository.com/artifact/com.itextpdf.tool/xmlworker -->
<dependency>
    <groupId>com.itextpdf.tool</groupId>
    <artifactId>xmlworker</artifactId>
    <version>5.5.11</version>
</dependency>
```

添加模板：template.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Title</title>
<style>
body {
	font-family: SimHei;
}

.red {
	color: red;
}
</style>
</head>
<body>
	<div class="red">你好，rainbowhorse</div>
</body>
</html>
```

测试代码：JavaToPdfHtml

```java
package com.rainbowhorse.test;

import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.Charset;

import com.itextpdf.text.Document;
import com.itextpdf.text.DocumentException;
import com.itextpdf.text.pdf.PdfWriter;
import com.itextpdf.tool.xml.XMLWorkerFontProvider;
import com.itextpdf.tool.xml.XMLWorkerHelper;
import com.rainbowhorse.test.util.PathUtil;

/**
 * HTML转PDF
 * ClassName: JavaToPdfHtml 
 * @Description: TODO
 * @author max
 * @date 2017年11月13日
 */
public class JavaToPdfHtml {

	// 生成PDF路径
	private static final String DEST = "target/HelloWorld_CN_HTML.pdf";
	// 模板路径
	private static final String HTML = PathUtil.getCurrentPath() + "/template.html";
	// 中文字体（黑体）
	private static final String FONT = "simhei.ttf";

	public static void main(String[] args) throws IOException, DocumentException {

		Document document = new Document();
		PdfWriter writer = PdfWriter.getInstance(document, new FileOutputStream(DEST));
		document.open();
		XMLWorkerFontProvider fontImp = new XMLWorkerFontProvider(XMLWorkerFontProvider.DONTLOOKFORFONTS);
		fontImp.register(FONT);
		XMLWorkerHelper.getInstance().parseXHtml(writer, document, new FileInputStream(HTML), null,
				Charset.forName("UTF-8"), fontImp);
		document.close();
	}
}
```

运行结果

<div align=center><img width="800" height="200" src="../../../../images/2017-11-13/iText/3.png" algin="center"/>

</div>

**注意：**

1. HTML中必须使用标准的语法，标签一定需要闭合。
2. HTML中如果有中文，需要在样式中添加对应字体的样式。

# iText-HTML-Freemarker渲染

在实际使用中，HTML内容都是动态渲染的，因此我们需要加入模板引擎支持，可以使用FreeMarker/Velocity，这里使用FreeMarker举例。

添加FreeMarke依赖

```xml
<!-- https://mvnrepository.com/artifact/org.freemarker/freemarker -->
<dependency>
    <groupId>org.freemarker</groupId>
    <artifactId>freemarker</artifactId>
    <version>2.3.19</version>
</dependency>
```

添加模板：template_freemarker.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Title</title>
<style>
body {
	font-family: SimHei;
}

.blue {
	color: blue;
}

.pos {
	position: absolute;
	left: 100px;
	top: 150px
}
</style>
</head>
<body>
	<div class="blue pos">你好，${name}</div>
</body>
</html>
```

测试代码：JavaToPdfHtmlFreeMarker

```java
package com.rainbowhorse.test;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.StringWriter;
import java.io.Writer;
import java.nio.charset.Charset;
import java.util.HashMap;
import java.util.Map;

import com.itextpdf.text.Document;
import com.itextpdf.text.DocumentException;
import com.itextpdf.text.pdf.PdfWriter;
import com.itextpdf.tool.xml.XMLWorkerFontProvider;
import com.itextpdf.tool.xml.XMLWorkerHelper;
import com.rainbowhorse.test.util.PathUtil;

import freemarker.template.Configuration;
import freemarker.template.Template;

/**
 * FreeMarker模板的HTML转PDF
 * ClassName: JavaToPdfHtmlFreeMarker 
 * @Description: TODO
 * @author max
 * @date 2017年11月13日
 */
public class JavaToPdfHtmlFreeMarker {

	// 生成PDF路径
	private static final String DEST = "target/HelloWorld_CN_HTML_FREEMARKER.pdf";
	// 模板路径
	private static final String HTML = "template_freemarker.html";
	// 中文字体（黑体）
	private static final String FONT = "simhei.ttf";
	private static Configuration freemarkerCfg = null;

	static {
		freemarkerCfg = new Configuration();
		// freemarker的模板目录
		try {
			freemarkerCfg.setDirectoryForTemplateLoading(new File(PathUtil.getCurrentPath()));
		} catch (IOException e) {
			e.printStackTrace();
		}
	}

	public static void main(String[] args) throws IOException, DocumentException {
		Map<String, Object> data = new HashMap<String, Object>(16);
		data.put("name", "rainbowhorse");
		String content = JavaToPdfHtmlFreeMarker.freeMarkerRender(data, HTML);
		JavaToPdfHtmlFreeMarker.createPdf(content, DEST);
	}

	public static void createPdf(String content, String dest) throws IOException, DocumentException {

		Document document = new Document();
		PdfWriter writer = PdfWriter.getInstance(document, new FileOutputStream(dest));
		document.open();
		XMLWorkerFontProvider fontImp = new XMLWorkerFontProvider(XMLWorkerFontProvider.DONTLOOKFORFONTS);
		fontImp.register(FONT);
		XMLWorkerHelper.getInstance().parseXHtml(writer, document, new ByteArrayInputStream(content.getBytes()), null,
				Charset.forName("UTF-8"), fontImp);
		document.close();

	}

	/**
	 * freemarker渲染html
	 */
	public static String freeMarkerRender(Map<String, Object> data, String htmlTmp) {
		Writer out = new StringWriter();
		try {
			// 获取模板,并设置编码方式
			Template template = freemarkerCfg.getTemplate(htmlTmp);
			template.setEncoding("UTF-8");
			// 合并数据模型与模板
			template.process(data, out);
			// 将合并后的数据和模板写入到流中，这里使用的字符流
			out.flush();
			return out.toString();
		} catch (Exception e) {
			e.printStackTrace();
		} finally {
			try {
				out.close();
			} catch (IOException ex) {
				ex.printStackTrace();
			}
		}
		return null;
	}
}
```

运行结果

<div align=center><img width="800" height="200" src="../../../../images/2017-11-13/iText/4.png" algin="center"/>

</div>

目前为止，我们已经实现了iText通过HTML模板生成PDF的功能，但是实际应用中，我们发现iText并不能对高级的CSS样式进行解析，比如CSS中的position属性等，因此我们要引入新的组件。

# Flying Saucer-CSS高级特性支持

Flying Saucer is a pure-Java library for rendering arbitrary well-formed XML (or XHTML) using CSS 2.1 for layout and formatting, output to Swing panels, PDF, and images.

Flying Saucer是基于iText的，支持对CSS高级特性的解析。

添加依赖

```xml
<!-- https://mvnrepository.com/artifact/org.xhtmlrenderer/flying-saucer-pdf -->
<dependency>
    <groupId>org.xhtmlrenderer</groupId>
    <artifactId>flying-saucer-pdf</artifactId>
    <version>9.1.5</version>
</dependency>
  
<!-- https://mvnrepository.com/artifact/org.xhtmlrenderer/flying-saucer-pdf-itext5 -->
<dependency>
    <groupId>org.xhtmlrenderer</groupId>
    <artifactId>flying-saucer-pdf-itext5</artifactId>
    <version>9.1.5</version>
</dependency>
```

添加模板：template_freemarker_fs.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Title</title>
<style>
 @page {
 	size:297mm 230mm;
        @top-left{
            content:element(header-left);
        };
        @top-right {
            content: element(header-right)
        };
        @bottom-left {
            content: element(footer-left)
        };
        @bottom-right {
            content: element(footer-right)
        };
    }

body {
	font-family: SimHei;
}

.color {
	color: green;
}

.pos {
	position: absolute;
	left: 200px;
	top: 200px;
	width: 200px;
	font-size: 20px;
}
</style>
</head>
<body>
	<img src="logo.jpg" />
	<div class="color pos">你好，${name}</div>
</body>
</html>
```

测试代码：JavaToPdfHtmlFreeMarker：

```java
package com.rainbowhorse.test.flyingsaucer;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.StringWriter;
import java.io.Writer;
import java.util.HashMap;
import java.util.Map;

import org.xhtmlrenderer.pdf.ITextFontResolver;
import org.xhtmlrenderer.pdf.ITextRenderer;

import com.itextpdf.text.DocumentException;
import com.itextpdf.text.pdf.BaseFont;
import com.rainbowhorse.test.util.PathUtil;

import freemarker.template.Configuration;
import freemarker.template.Template;

/**
 * FreeMarker模板的HTML转PDF Flying Saucer
 * ClassName: JavaToPdfHtmlFreeMarker 
 * @Description: TODO
 * @author max
 * @date 2017年11月13日
 */
public class JavaToPdfHtmlFreeMarker {

	// 生成PDF路径
	private static final String DEST = "target/HelloWorld_CN_HTML_FREEMARKER_FS.pdf";
	// 模板路径
	private static final String HTML = "template_freemarker_fs.html";
	// 中文字体（黑体）
	private static final String FONT = "simhei.ttf";
	// 图片路径
	private static final String LOGO_PATH = "file:/" + PathUtil.getCurrentPath() + "/";

	private static Configuration freemarkerCfg = null;

	static {
		freemarkerCfg = new Configuration();
		// freemarker的模板目录
		try {
			freemarkerCfg.setDirectoryForTemplateLoading(new File(PathUtil.getCurrentPath()));
		} catch (IOException e) {
			e.printStackTrace();
		}
	}

	public static void main(String[] args) throws IOException, DocumentException, com.lowagie.text.DocumentException {
		Map<String, Object> data = new HashMap<String, Object>(16);
		data.put("name", "rainbowhorse");
		String content = JavaToPdfHtmlFreeMarker.freeMarkerRender(data, HTML);
		JavaToPdfHtmlFreeMarker.createPdf(content, DEST);
	}

	/**
	 * freemarker渲染html
	 */
	public static String freeMarkerRender(Map<String, Object> data, String htmlTmp) {
		Writer out = new StringWriter();
		try {
			// 获取模板,并设置编码方式
			Template template = freemarkerCfg.getTemplate(htmlTmp);
			template.setEncoding("UTF-8");
			// 合并数据模型与模板
			template.process(data, out); // 将合并后的数据和模板写入到流中，这里使用的字符流
			out.flush();
			return out.toString();
		} catch (Exception e) {
			e.printStackTrace();
		} finally {
			try {
				out.close();
			} catch (IOException ex) {
				ex.printStackTrace();
			}
		}
		return null;
	}

	public static void createPdf(String content, String dest)
			throws IOException, DocumentException, com.lowagie.text.DocumentException {
		ITextRenderer render = new ITextRenderer();
		ITextFontResolver fontResolver = render.getFontResolver();
		fontResolver.addFont(FONT, BaseFont.IDENTITY_H, BaseFont.NOT_EMBEDDED);
		// 解析html生成pdf
		render.setDocumentFromString(content);
		// 解决图片相对路径的问题
		render.getSharedContext().setBaseURL(LOGO_PATH);
		render.layout();
		render.createPDF(new FileOutputStream(dest));
	}
}
```

运行结果

<div align=center><img width="800" height="200" src="../../../../images/2017-11-13/iText/5.png" algin="center"/>

</div>

在某些场景下，HTML中的静态资源是在本地，我们可以使用render.getSharedContext().setBaseURL()加载文件资源,注意资源URL需要使用文件协议 “file://”。

**对于生成的pdf页面大小，可以用css的@page属性设置。**

# PDF转图片

在某些场景中，我们可能只需要返回图片格式的电子凭证，我们可以使用Jpedal组件，把PDF转成图片。

添加依赖

```xml
<!-- https://mvnrepository.com/artifact/org.jpedal/jpedal-lgpl -->
<dependency>
    <groupId>org.jpedal</groupId>
    <artifactId>jpedal-lgpl</artifactId>
    <version>4.74b27</version>
</dependency>
```

测试代码：JavaToPdfImgHtmlFreeMarker

```java
package com.rainbowhorse.test.flyingsaucer;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.StringWriter;
import java.io.Writer;
import java.util.HashMap;
import java.util.Map;

import javax.imageio.ImageIO;

import org.jpedal.PdfDecoder;
import org.jpedal.exception.PdfException;
import org.jpedal.fonts.FontMappings;
import org.xhtmlrenderer.pdf.ITextFontResolver;
import org.xhtmlrenderer.pdf.ITextRenderer;

import com.itextpdf.text.DocumentException;
import com.itextpdf.text.pdf.BaseFont;
import com.rainbowhorse.test.util.PathUtil;

import freemarker.template.Configuration;
import freemarker.template.Template;

/**
 * Jpedal把pdf转成图片 
 * ClassName: JavaToPdfImgHtmlFreeMarker
 * @Description: TODO
 * @author max
 * @date 2017年11月13日
 */
public class JavaToPdfImgHtmlFreeMarker {

	private static final String DEST = "target/HelloWorld_CN_HTML_FREEMARKER_FS_IMG.png";
	private static final String HTML = "template_freemarker_fs.html";
	private static final String FONT = "simhei.ttf";
	private static final String LOGO_PATH = "file://" + PathUtil.getCurrentPath() + "/logo.png";
	private static final String IMG_EXT = "png";

	private static Configuration freemarkerCfg = null;

	static {
		freemarkerCfg = new Configuration();
		// freemarker的模板目录
		try {
			freemarkerCfg.setDirectoryForTemplateLoading(new File(PathUtil.getCurrentPath()));
		} catch (IOException e) {
			e.printStackTrace();
		}
	}

	public static void main(String[] args) throws IOException, DocumentException, com.lowagie.text.DocumentException {
		Map<String, Object> data = new HashMap<String, Object>(16);
		data.put("name", "rainbowhorse");

		String content = JavaToPdfImgHtmlFreeMarker.freeMarkerRender(data, HTML);
		ByteArrayOutputStream pdfStream = JavaToPdfImgHtmlFreeMarker.createPdf(content);
		ByteArrayOutputStream imgSteam = JavaToPdfImgHtmlFreeMarker.pdfToImg(pdfStream.toByteArray(), 2, 1, IMG_EXT);

		FileOutputStream fileStream = new FileOutputStream(new File(DEST));
		fileStream.write(imgSteam.toByteArray());
		fileStream.close();

	}

	/**
	 * freemarker渲染html
	 */
	public static String freeMarkerRender(Map<String, Object> data, String htmlTmp) {
		Writer out = new StringWriter();
		try {
			// 获取模板,并设置编码方式
			Template template = freemarkerCfg.getTemplate(htmlTmp);
			template.setEncoding("UTF-8");
			// 合并数据模型与模板
			template.process(data, out); // 将合并后的数据和模板写入到流中，这里使用的字符流
			out.flush();
			return out.toString();
		} catch (Exception e) {
			e.printStackTrace();
		} finally {
			try {
				out.close();
			} catch (IOException ex) {
				ex.printStackTrace();
			}
		}
		return null;
	}

	/**
	 * 根据模板生成pdf文件流
	 */
	public static ByteArrayOutputStream createPdf(String content) {
		ByteArrayOutputStream outStream = new ByteArrayOutputStream();
		ITextRenderer render = new ITextRenderer();
		ITextFontResolver fontResolver = render.getFontResolver();
		try {
			fontResolver.addFont(FONT, BaseFont.IDENTITY_H, BaseFont.NOT_EMBEDDED);
		} catch (com.lowagie.text.DocumentException e) {
			e.printStackTrace();
		} catch (IOException e) {
			e.printStackTrace();
		}
		// 解析html生成pdf
		render.setDocumentFromString(content);
		// 解决图片相对路径的问题
		render.getSharedContext().setBaseURL(LOGO_PATH);
		render.layout();
		try {
			render.createPDF(outStream);
			return outStream;
		} catch (com.lowagie.text.DocumentException e) {
			e.printStackTrace();
		} finally {
			try {
				outStream.close();
			} catch (IOException e) {
				e.printStackTrace();
			}
		}
		return null;
	}

	/**
	 * 根据pdf二进制文件 生成图片文件
	 *
	 * @param bytes
	 *            pdf二进制
	 * @param scaling
	 *            清晰度
	 * @param pageNum
	 *            页数
	 */
	public static ByteArrayOutputStream pdfToImg(byte[] bytes, float scaling, int pageNum, String formatName) {
		// 推荐的方法打开PdfDecoder
		PdfDecoder pdfDecoder = new PdfDecoder(true);
		FontMappings.setFontReplacements();
		// 修改图片的清晰度
		pdfDecoder.scaling = scaling;
		ByteArrayOutputStream out = new ByteArrayOutputStream();
		try {
			// 打开pdf文件，生成PdfDecoder对象
			pdfDecoder.openPdfArray(bytes); // bytes is byte[] array with PDF
			// 获取第pageNum页的pdf
			BufferedImage img = pdfDecoder.getPageAsImage(pageNum);

			ImageIO.write(img, formatName, out);
		} catch (PdfException e) {
			e.printStackTrace();
		} catch (IOException e) {
			e.printStackTrace();
		}
		return out;
	}
}
```

输出结果

<div align=center><img width="800" height="200" src="../../../../images/2017-11-13/iText/6.png" algin="center"/>

</div>

Jpedal支持将指定页PDF生成图片，pdfDecoder.scaling设置图片的分辨率(不同分辨率下文件大小不同) ，支持多种图片格式，具体更多可自行研究。

# 总结

对于电子凭证的技术方案，总结如下:

1. HTML模板+model数据，通过freemarker进行渲染，便于维护和修改。
2. 渲染后的HTML流，可通过Flying Saucer组件生成HTML文件流，或者生成HTML后再转成jpg文件流。
3. 在Web项目中，对应的文件流，可以通过ContentType设置，在线查看/下载，不需通过附件服务。