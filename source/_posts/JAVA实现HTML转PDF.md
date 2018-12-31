---
title: JAVA实现HTML转PDF
date: 2017-07-27 13:22:32
tags: [java, tips]
categories: 后端
---

​	最近公司里面有一个任务，在线题卡，就是把客户在线编辑的题卡样式保存下来，然后可以导出为PDF格式。于是上网找了一系列的资料，找到了以下两种方法：

1. 使用`wkhtmltox`
2. 使用`iText+Flying Saucer`

但是还是强烈推荐用第一种方法。<div align=center><img width="450" height="200" src="../../../../images/2017-9-13/additional/html_to_pdf.png" algin="center"/></div><!-- more -->

# 使用wkhtmltox(推荐)

wkhtmltox实现网页转换成图片或PDF

## 命令实现

1. 进入wkhtmltox官网软件下载  ：https://wkhtmltopdf.org/downloads.html
2. 安装完成后进入${home}/bin目录下有两个exe文件，通过名称就可以辨别`wkhtmltoimage.exe`是将HTML转化为image，`wkhtmltopdf.exe`是将HTML转化为PDF文件，这正是我们想要的。

![path](../../../../images/2017-8-27/HtmlToPdf/HtmlToPdf.png)

3. 进入${home}/bin目录下打开cmd输入以下命令验证 

```java
wkhtmltopdf HTML路径 保存路径
如： wkhtmltopdf www.baidu.com d:\test.pdf
```

![command](../../../../images/2017-8-27/HtmlToPdf/command.png)

生成完成后会出现Done。

## 代码实现

JAVA代码中调用wkhtmltopdf生成PDF文件，以下为代码片段

```java
/**
 * HTMLTOPPDF
 * 利用wkhtmltopdf生成PDF
 */
public class HtmlToPDF {
    //wkhtmltopdf.exe安装路径
    public static final String toPdfTool = "E:\\SmallTools\\wkhtmltox\\wkhtmltopdf\\bin\\wkhtmltopdf.exe";
    //需要生成PDF的URL
    public static final String srcPath = "http://www.jianshu.com/p/4d65857ffe5e";

    public static void main(String[] args) throws Exception{
 		//设置纸张大小: A4, Letter, etc.
        String pageSize = "A4";
		//生成后存放路径
        String destPath = "E:\\PDF生成教程及讲解.pdf"; 
        convert(pageSize, destPath);
    }

    public static void convert(String pageSize, String destPath){
        File file = new File(destPath);
        File parent = file.getParentFile();
        if (!parent.exists()){
            parent.mkdirs();
        }
        StringBuilder cmd = new StringBuilder();
        cmd.append(toPdfTool).append(" ");
        cmd.append("--page-size ");
        cmd.append(pageSize).append(" ");
        cmd.append(srcPath).append(" ");
        cmd.append(destPath);

        try {
            Runtime.getRuntime().exec(cmd.toString());
        }catch (IOException e){
            e.printStackTrace();
        }
    }
}
```

详细参数说明可参考：<http://www.jianshu.com/p/4d65857ffe5e>



# 使用iText+Flying Saucer

```
 itext可实现 
 1.可以进行块的创建
 2.表格的使用
 3.设置页面的事件
 4.字体的设置
 5.图片的设置（包含水印）
 6.HTML转化成PDF（支持css,javascript）
 7.表单创建
 8.PDF之间的操作等详细的内容可以查看网站的说明。
```

## Maven配置

```xml
<dependency>
   <groupId>com.itextpdf</groupId>
   <artifactId>itextpdf</artifactId>
   <version>5.8.8</version>
</dependency>
<dependency>
    <groupId>org.xhtmlrenderer</groupId>
    <artifactId>flying-saucer-pdf</artifactId>
    <version>9.1.6</version>
</dependency>
```

## 代码片段

```java
/**
 * 生成pdf，添加生成pdf所使用的字符集.注：这里字符集要和模板中使用的字符集一一致。
 */
public class HtmlToPDF {
    public static void main(String[] args) throws Exception{

        Document document = new Document(PageSize.A4.rotate()); //设置为A4纸大小

        ITextRenderer renderer = new ITextRenderer();
        ITextFontResolver fontResolver = renderer.getFontResolver();
        fontResolver.addFont("D:/simsun.ttc", BaseFont.IDENTITY_H, BaseFont.NOT_EMBEDDED);
        // step 2
        PdfWriter writer = PdfWriter.getInstance(document, new FileOutputStream("D:\\pdf.pdf"));
        // step 3
        document.open();
        // step 4
        XMLWorkerHelper.getInstance().parseXHtml(writer, document,
                new FileInputStream("D:/a.html"));
        //step 5
        document.close();
        System.out.println( "PDF Created!" );
    }
}
```

## 注意事项

1. .输入的HTML页面必须是标准的XHTML页面。页面的顶上必须是这样的格式：

   ```html
   <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">  
   <html xmlns="http://www.w3.org/1999/xhtml"> 
   ```


2. 生成PDF，添加生成PDF所使用的字符集.注：这里字符集要和模板中使用的字符集一一致。 比如:java中使用宋体 renderer.getFontResolver().addFont("C:/Windows/Fonts/simsun.ttc", BaseFont.IDENTITY_H, BaseFont.NOT_EMBEDDED); 那么HTML的body中样式必须加上 style='font-family:SimSun'，要是使用其他字符生成pdf时候，中文就会不显示生成PDF
3. 设置PDF的页面大小模板页面中添加该样式：@page { size: 8.5in 11in; }这时候生成PDF页面正好是A4纸大小
4. 所需的jar包，[下载点我](../../../../images/2017-8-27/HtmlToPdf/flyingsaucer.zip)。核心jar是修改后的



# 比较和总结

## 比较

itext

```
1. java生成PDF大部分都是用itext，itext的确是java开源组件的第一选择。不过itext也有局限，就是要自己写模版，系统中的表单数量有好几百个，为每个表单做一个导出模版不现实。
2. 并且itext中文适配不是很好和换行问题。
3. 且对HTML格式要求严格。
```

wkhtmltopdf

```
1. 生成PDF时会自动根据你在HTML页面中H标签生成树形目录结构。
2. 小巧方便，转换速度快。
3. 跨平台，在Liunx下用，在win下也可以用。
```

## 总结

​	综上比较，wkhtmltopdf是将HTML转为图片或是PDF最好的选择。