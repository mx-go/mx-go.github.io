package com.sojson.common.timer;


import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.*;

/**
 * MySQL数据库备份
 *
 * @author maxu
 */
public class MySQLDatabaseBackupAndRestore {

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

    /**
     * Java代码实现MySQL数据库还原
     *
     * @param hostIP       MySQL数据库所在服务器地址IP
     * @param userName     进入数据库所需要的用户名
     * @param password     进入数据库所需要的密码
     * @param path         需要还原数据库文件的路径
     * @param fileName     需要还原数据库文件的名称
     * @param databaseName 需要还原的数据库名称
     * @return 返回true表示导出成功，否则返回false。
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
}