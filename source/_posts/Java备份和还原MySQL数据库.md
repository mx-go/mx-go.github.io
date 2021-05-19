---
title: Java备份和还原MySQL数据库
date: 2017-09-24 17:43:10
tags: [java, mysql]
categories: 数据库
cover: ../../../../images/2017-9-21/MySQLbackUpAndRestore/mysql-index.png
---

# 引言

​	在项目中经常会用到Java程序备份和还原MySQL数据库的内容，都是大同小异，但程序也会出现各种各样的问题（运行时异常，乱码等）。实现上都是用Runtime执行MySQL的命令行工具，然后读写IO流数据；也有可能是由于使用Java的Runtime来实现备份还原功能，而由于大家的运行时环境有差异才导致代码运行不成功。在这里记录一下自己使用的工具和方法。<div align=center><img width="700" height="300" src="../../../../images/2017-9-21/MySQLbackUpAndRestore/mysql-index.png" algin="center"/>

</div><!-- more -->

# 使用MySQL自带工具

## 备份

备份使用MySQL的`mysqldump`命令来实现，示例代码

```java
	  final static Logger logger = LoggerFactory.getLogger(MySQLDatabaseBackupAndRestore.class);

    /**
     * Java代码实现MySQL数据库导出
     *
     * @param hostIP       MySQL数据库所在服务器地址IP
     * @param userName     进入数据库所需要的用户名
     * @param password     进入数据库所需要的密码
     * @param savePath     数据库导出文件保存路径
     * @param fileName     数据库导出文件文件名
     * @param databaseName 要导出的数据库名
     * @return 返回true表示导出成功，否则返回false。
     * @author maxu
     */
    public static boolean backUpDatabase(String hostIP, String userName, String password, String databaseName, String savePath, String fileName) throws InterruptedException {
        File saveFile = new File(savePath);
        if (!saveFile.exists()) {// 如果目录不存在
            saveFile.mkdirs();// 创建文件夹
        }
        if (!savePath.endsWith(File.separator)) {
            savePath = savePath + File.separator;
        }

        PrintWriter printWriter = null;
        BufferedReader bufferedReader = null;
        try {
            printWriter = new PrintWriter(new OutputStreamWriter(new FileOutputStream(savePath + fileName), "utf8"));
            Process process = Runtime.getRuntime().exec(" D:\\DevTools\\MySQL\\MySQL5.7\\bin\\mysqldump.exe -h" + hostIP + " -u" + userName + " -p" + password + " --set-charset=UTF8 " + databaseName);
            InputStreamReader inputStreamReader = new InputStreamReader(process.getInputStream(), "utf8");
            bufferedReader = new BufferedReader(inputStreamReader);
            String line;
            while ((line = bufferedReader.readLine()) != null) {
                printWriter.println(line);
            }
            printWriter.flush();
            if (process.waitFor() == 0) {//0 表示线程正常终止。
                logger.info("数据库已备份到——>>" + savePath);
                return true;
            }
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            try {
                if (bufferedReader != null) {
                    bufferedReader.close();
                }
                if (printWriter != null) {
                    printWriter.close();
                }
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
        return false;
    }
```

## 还原

```java
  
   final static Logger logger = LoggerFactory.getLogger(MySQLDatabaseBackupAndRestore.class);  
	
   /**
     * Java代码实现MySQL数据库还原
     *
     * @param hostIP       MySQL数据库所在服务器地址IP
     * @param userName     进入数据库所需要的用户名
     * @param password     进入数据库所需要的密码
     * @param path         需要还原数据库文件的路径
     * @param fileName     需要还原数据库文件的名称
     * @param databaseName 需要还原的数据库名称
     * @return 返回true表示还原成功，否则返回false。
     */
    public static boolean restoreDatabase(String hostIP, String userName, String password, String databaseName, String path, String fileName) throws InterruptedException {

        OutputStream out = null;
        BufferedReader br = null;
        PrintStream ps = null;
        try {
            // 调用mysql的cmd:cmd命令在后台执行，没有命令窗口出现或者一闪而过的情况
            Process process = Runtime.getRuntime().exec("cmd /c start /b  D:\\DevTools\\MySQL\\MySQL5.7\\bin\\mysql -h" + hostIP + " -u" + userName + " -p" + password + " --default-character-set=utf8 " + databaseName);
            out = process.getOutputStream();//控制台的输入信息作为输出流
            StringBuffer sb = new StringBuffer("");
            br = new BufferedReader(new InputStreamReader(new FileInputStream(path + fileName), "utf8"));
            String outStr;
            String line;
            while ((line = br.readLine()) != null) {
                sb.append(line + "\r\n");
            }
            outStr = sb.toString();

            ps = new PrintStream(out, true, "utf8");
            ps.write(outStr.getBytes());
//            OutputStreamWriter writer = new OutputStreamWriter(out, "utf8");
//            writer.write(outStr);
            // 注：这里如果用缓冲方式写入文件的话，会导致中文乱码，用flush()方法则可以避免
//            writer.flush();
//            writer.close();
            if (process.waitFor() == 0) {   //0 表示线程正常终止。
               return true;
            }
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        } finally {
            try {
                if (ps != null) {
                    ps.close();
                }
                if (br != null) {
                    br.close();
                }
                if (out != null){
                    out.close();
                }
            } catch (IOException e1) {
                e1.printStackTrace();
            }
        }
        return false;
}
```

测试

```java
public static void main(String[] args){

        //数据库备份
        /*try {
            if (backUpDatabase("localhost", "root", "root", "taotao", "D:/", "taotao.sql")) {
                logger.info("数据库成功备份！！");
            } else {
                logger.info("数据库备份失败！！");
            }
        } catch (InterruptedException e) {
            e.printStackTrace();
        }*/
        //数据库恢复
        try {
            if (restoreDatabase("localhost", "root", "root", "taotao", "D:/", "taotao.sql")) {
                logger.info("数据库恢复成功！！");
            } else {
                logger.info("数据库恢复失败！！");
            }
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }
```

代码下载点击：[*下载*](../../../../images/2017-9-21/MySQLbackUpAndRestore/MySQLDatabaseBackupAndRestore.java)

# Windows下bat命令

工作环境 Windows Server 2003 ，`MySQL`安装目录 D:\DevTools\MySQL ,

`WinRAR` 安装目录 C:\Program Files\WinRAR\WinRAR.exe 

备份数据存储的路径为 D:\\数据备份，好了下面开始写`DOS批处理命令`了。代码如下:

```python
color 9
rem ---------------------数据库备份开始-----------------------
@echo off

set "Ymd=%DATE:~0,4%%DATE:~5,2%%DATE:~8,2%%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%" 
REM 日期格式：20170924200727 
md "D:\%ymd%" 
"D:\DevTools\MySQL\MySQL5.7\bin\mysqldump.exe" --opt -Q taotao -uroot -proot > D:\%Ymd%\taotao.sql
REM ..... 这里可以添加更多的命令，要看你有多少个数据库，其中 -Q 后面是数据库名称 -p紧跟后面是密码
REM echo Winrar loading... 
REM  "C:\Program Files\WinRAR\WinRAR.exe" a -ep1 -r -o+ -m5 -df "D:\数据备份\%Ymd%.rar" "D:\数据备份\%Ymd%" 
@echo on
rem ---------------------数据库备份完成-----------------------

pause
```

把上面的命令保存为 *backup.bat* ，双击运行，就开始备份数据了。 

第 一句是建立一个变量 %Ymd% ，通过 %date% 这个系统变量得到日期，%date:~,4% 表示取日期的前面4个字符就是年份，%%date:~5,2% 表示取日期第5个字符开始的2个字符就是月份，%date:~8,2% 这个就是日期号数，如 2017-09-24 这个日期最后得到的结果是 20170924 

第二句就是使用变量 %Ymd% 的值建立一个空的文件夹。 

第三句开始就是使用MySQL的命令对数据库mysql进行备份，并存储在 D:\数据备份\%ymd% 这个文件夹下面，这里可以有很多类似的命令，备份多个数据库。 

最后就是使用 WinRAR 对备份的数据进行压缩，并存储为以 %Ymd% 变量值建立的RAR文件名，同时删除备份的 %Ymd% 目录。 

如果你想让系统自动定期备份，就可以通过系统的任务计划定期执行这个命令。

但是用windows下bat命令备份有一个致命缺点：**备份时数据库会暂时断开。(30M断开5s左右)**

# 总结

第二种方式的缺点太致命：**备份时数据库会暂时断开**。

所以第一种方式将会是我们在开发中首选的方式，因为第二种方式的缺点对用户体验的影响太大了。