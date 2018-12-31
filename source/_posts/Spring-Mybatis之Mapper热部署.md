---
title: Spring+Mybatis之Mapper热部署
date: 2017-09-15 16:52:07
tags: [java,tips,mybatis]
categories: 工具
---

# 引言

​	Spring+Mybatis经常用，在项目中最痛苦的就是修改mapper文件的时候需要重启一下项目，每修改一次就需要重启一次项目。项目小还好，如果项目大，重启一次项目简直是要命。所以，去网上查资料看有没有办法让mybatis热部署，每次更新mapper文件不需要重启项目。

​	功夫不负有心人，终于找到了，这玩意只要发现mapper文件被修改，就会重新加载被修改的mapper文件。且**只加载被修改的mapper文件**！这个可省事了，效率又高，简直爽到爆。<div align=center><img width="700" height="300" src="../../../../images/2017-9-15/mybatis-mapper/relationship-with-mybatis.png" algin="center"/></div><!-- more -->

# 创建MapperRefresh刷新类

在src下创建一个util包，包下面创建一个类，类名为：**MapperRefresh**

<div align=center><img width="700" height="300" src="../../../../images/2017-9-15/mybatis-mapper/refresh.png" algin="center"/>

</div>

代码为下面的一串，注意修改下**mybatis-refresh.properties** 的路径。

```java
package com.talkweb.nets.netsTestLib.data.util;

import java.io.File;  
import java.io.FileInputStream;  
import java.io.FileNotFoundException;  
import java.io.InputStream;  
import java.lang.reflect.Field;  
import java.util.ArrayList;  
import java.util.HashMap;  
import java.util.List;  
import java.util.Map;  
import java.util.Properties;  
import java.util.Set;  

import org.apache.commons.lang3.StringUtils;  
import org.apache.ibatis.builder.xml.XMLMapperBuilder;  
import org.apache.ibatis.executor.ErrorContext;  
import org.apache.ibatis.session.Configuration;  
import org.apache.log4j.Logger;  
import org.springframework.core.NestedIOException;  
import org.springframework.core.io.Resource;  

import com.google.common.collect.Sets;  

/** 
 * 刷新MyBatis Mapper XML 线程 
 * @author ThinkGem 这个是原著的作者，我只是直接拿来用了，原著莫怪
 * @version 2016-5-29 
 */  
public class MapperRefresh implements java.lang.Runnable {  

    public static Logger log = Logger.getLogger(MapperRefresh.class);  

    private static String filename = "mybatis-refresh.properties";  //注意修改路径
    private static Properties prop = new Properties();  

    private static boolean enabled;         // 是否启用Mapper刷新线程功能  
    private static boolean refresh;         // 刷新启用后，是否启动了刷新线程  

    private Set<String> location;         // Mapper实际资源路径  

    private Resource[] mapperLocations;     // Mapper资源路径  
    private Configuration configuration;        // MyBatis配置对象  

    private Long beforeTime = 0L;           // 上一次刷新时间  
    private static int delaySeconds;        // 延迟刷新秒数  
    private static int sleepSeconds;        // 休眠时间  
    private static String mappingPath;      // xml文件夹匹配字符串，需要根据需要修改  

    static {  

        try {  
            prop.load(MapperRefresh.class.getResourceAsStream(filename));  
        } catch (Exception e) {  
            e.printStackTrace();  
            System.out.println("Load mybatis-refresh “"+filename+"” file error.");  
        }  

        enabled = "true".equalsIgnoreCase(getPropString("enabled"));  

        delaySeconds = getPropInt("delaySeconds");  
        sleepSeconds = getPropInt("sleepSeconds");  
        mappingPath = getPropString("mappingPath");  

        delaySeconds = delaySeconds == 0 ? 50 : delaySeconds;  
        sleepSeconds = sleepSeconds == 0 ? 3 : sleepSeconds;  
        mappingPath = StringUtils.isBlank(mappingPath) ? "mappings" : mappingPath;  

        log.debug("[enabled] " + enabled);  
        log.debug("[delaySeconds] " + delaySeconds);  
        log.debug("[sleepSeconds] " + sleepSeconds);  
        log.debug("[mappingPath] " + mappingPath);  
    }  

    public static boolean isRefresh() {  
        return refresh;  
    }  

    public MapperRefresh(Resource[] mapperLocations, Configuration configuration) {  
        this.mapperLocations = mapperLocations;  
        this.configuration = configuration;  
    }  

    @Override  
    public void run() {  

        beforeTime = System.currentTimeMillis();  

        log.debug("[location] " + location);  
        log.debug("[configuration] " + configuration);  

        if (enabled) {  
            // 启动刷新线程  
            final MapperRefresh runnable = this;  
            new Thread(new java.lang.Runnable() {  
                @Override  
                public void run() {  

                    if (location == null){  
                        location = Sets.newHashSet();  
                        log.debug("MapperLocation's length:" + mapperLocations.length);  
                        for (Resource mapperLocation : mapperLocations) {  
                            String s = mapperLocation.toString().replaceAll("\\\\", "/");  
                            s = s.substring("file [".length(), s.lastIndexOf(mappingPath) + mappingPath.length());  
                            if (!location.contains(s)) {  
                                location.add(s);  
                                log.debug("Location:" + s);  
                            }  
                        }  
                        log.debug("Locarion's size:" + location.size());  
                    }  

                    try {  
                        Thread.sleep(delaySeconds * 1000);  
                    } catch (InterruptedException e2) {  
                        e2.printStackTrace();  
                    }  
                    refresh = true;  

                    System.out.println("========= Enabled refresh mybatis mapper =========");  

                    while (true) {  
                        try {  
                            for (String s : location) {  
                                runnable.refresh(s, beforeTime);  
                            }  
                        } catch (Exception e1) {  
                            e1.printStackTrace();  
                        }  
                        try {  
                            Thread.sleep(sleepSeconds * 1000);  
                        } catch (InterruptedException e) {  
                            e.printStackTrace();  
                        }  

                    }  
                }  
            }, "MyBatis-Mapper-Refresh").start();  
        }  
    }  

    /** 
     * 执行刷新 
     * @param filePath 刷新目录 
     * @param beforeTime 上次刷新时间 
     * @throws NestedIOException 解析异常 
     * @throws FileNotFoundException 文件未找到 
     * @author ThinkGem 
     */  
    @SuppressWarnings({ "rawtypes", "unchecked" })  
    private void refresh(String filePath, Long beforeTime) throws Exception {  

        // 本次刷新时间  
        Long refrehTime = System.currentTimeMillis();  

        // 获取需要刷新的Mapper文件列表  
        List<File> fileList = this.getRefreshFile(new File(filePath), beforeTime);  
        if (fileList.size() > 0) {  
            log.debug("Refresh file: " + fileList.size());  
        }  
        for (int i = 0; i < fileList.size(); i++) {  
            InputStream inputStream = new FileInputStream(fileList.get(i));  
            String resource = fileList.get(i).getAbsolutePath();  
            try {  

                // 清理原有资源，更新为自己的StrictMap方便，增量重新加载  
                String[] mapFieldNames = new String[]{  
                    "mappedStatements", "caches",  
                    "resultMaps", "parameterMaps",  
                    "keyGenerators", "sqlFragments"  
                };  
                for (String fieldName : mapFieldNames){  
                    Field field = configuration.getClass().getDeclaredField(fieldName);  
                    field.setAccessible(true);  
                    Map map = ((Map)field.get(configuration));  
                    if (!(map instanceof StrictMap)){  
                        Map newMap = new StrictMap(StringUtils.capitalize(fieldName) + "collection");  
                        for (Object key : map.keySet()){  
                            try {  
                                newMap.put(key, map.get(key));  
                            }catch(IllegalArgumentException ex){  
                                newMap.put(key, ex.getMessage());  
                            }  
                        }  
                        field.set(configuration, newMap);  
                    }  
                }  

                // 清理已加载的资源标识，方便让它重新加载。  
                Field loadedResourcesField = configuration.getClass().getDeclaredField("loadedResources");  
                loadedResourcesField.setAccessible(true);  
                Set loadedResourcesSet = ((Set)loadedResourcesField.get(configuration));  
                loadedResourcesSet.remove(resource);  

                //重新编译加载资源文件。  
                XMLMapperBuilder xmlMapperBuilder = new XMLMapperBuilder(inputStream, configuration,   
                        resource, configuration.getSqlFragments());  
                xmlMapperBuilder.parse();  
            } catch (Exception e) {  
                throw new NestedIOException("Failed to parse mapping resource: '" + resource + "'", e);  
            } finally {  
                ErrorContext.instance().reset();  
            }  
            System.out.println("Refresh file: " + mappingPath + StringUtils.substringAfterLast(fileList.get(i).getAbsolutePath(), mappingPath));  
            if (log.isDebugEnabled()) {  
                log.debug("Refresh file: " + fileList.get(i).getAbsolutePath());  
                log.debug("Refresh filename: " + fileList.get(i).getName());  
            }  
        }  
        // 如果刷新了文件，则修改刷新时间，否则不修改  
        if (fileList.size() > 0) {  
            this.beforeTime = refrehTime;  
        }  
    }  

    /** 
     * 获取需要刷新的文件列表 
     * @param dir 目录 
     * @param beforeTime 上次刷新时间 
     * @return 刷新文件列表 
     */  
    private List<File> getRefreshFile(File dir, Long beforeTime) {  
        List<File> fileList = new ArrayList<File>();  

        File[] files = dir.listFiles();  
        if (files != null) {  
            for (int i = 0; i < files.length; i++) {  
                File file = files[i];  
                if (file.isDirectory()) {  
                    fileList.addAll(this.getRefreshFile(file, beforeTime));  
                } else if (file.isFile()) {  
                    if (this.checkFile(file, beforeTime)) {  
                        fileList.add(file);  
                    }  
                } else {  
                    System.out.println("Error file." + file.getName());  
                }  
            }  
        }  
        return fileList;  
    }  

    /** 
     * 判断文件是否需要刷新 
     * @param file 文件 
     * @param beforeTime 上次刷新时间 
     * @return 需要刷新返回true，否则返回false 
     */  
    private boolean checkFile(File file, Long beforeTime) {  
        if (file.lastModified() > beforeTime) {  
            return true;  
        }  
        return false;  
    }  

    /** 
     * 获取整数属性 
     * @param key 
     * @return 
     */  
    private static int getPropInt(String key) {  
        int i = 0;  
        try {  
            i = Integer.parseInt(getPropString(key));  
        } catch (Exception e) {  
        }  
        return i;  
    }  

    /** 
     * 获取字符串属性 
     * @param key 
     * @return 
     */  
    private static String getPropString(String key) {  
        return prop == null ? null : prop.getProperty(key);  
    }  

    /** 
     * 重写 org.apache.ibatis.session.Configuration.StrictMap 类 
     * 来自 MyBatis3.4.0版本，修改 put 方法，允许反复 put更新。 
     */  
    public static class StrictMap<V> extends HashMap<String, V> {  

        private static final long serialVersionUID = -4950446264854982944L;  
        private String name;  

        public StrictMap(String name, int initialCapacity, float loadFactor) {  
            super(initialCapacity, loadFactor);  
            this.name = name;  
        }  

        public StrictMap(String name, int initialCapacity) {  
            super(initialCapacity);  
            this.name = name;  
        }  

        public StrictMap(String name) {  
            super();  
            this.name = name;  
        }  

        public StrictMap(String name, Map<String, ? extends V> m) {  
            super(m);  
            this.name = name;  
        }  

        @SuppressWarnings("unchecked")  
        public V put(String key, V value) {  
            // ThinkGem 如果现在状态为刷新，则刷新(先删除后添加)  
            if (MapperRefresh.isRefresh()) {  
                remove(key);  
                MapperRefresh.log.debug("refresh key:" + key.substring(key.lastIndexOf(".") + 1));  
            }  
            // ThinkGem end  
            if (containsKey(key)) {  
                throw new IllegalArgumentException(name + " already contains value for " + key);  
            }  
            if (key.contains(".")) {  
                final String shortKey = getShortName(key);  
                if (super.get(shortKey) == null) {  
                    super.put(shortKey, value);  
                } else {  
                    super.put(shortKey, (V) new Ambiguity(shortKey));  
                }  
            }  
            return super.put(key, value);  
        }  

        public V get(Object key) {  
            V value = super.get(key);  
            if (value == null) {  
                throw new IllegalArgumentException(name + " does not contain value for " + key);  
            }  
            if (value instanceof Ambiguity) {  
                throw new IllegalArgumentException(((Ambiguity) value).getSubject() + " is ambiguous in " + name  
                        + " (try using the full name including the namespace, or rename one of the entries)");  
            }  
            return value;  
        }  

        private String getShortName(String key) {  
            final String[] keyparts = key.split("\\.");  
            return keyparts[keyparts.length - 1];  
        }  

        protected static class Ambiguity {  
            private String subject;  

            public Ambiguity(String subject) {  
                this.subject = subject;  
            }  

            public String getSubject() {  
                return subject;  
            }  
        }  
    }  
}
```

# 重写SqlSessionFactoryBean

MyBatis有几个不太好的地方，是当实体类别名重名的时候，Mapper XML有错误的时候，系统启动时会一直等待无法正常启动（其实是加载失败后又重新加载，进入了死循环），这里重写下SqlSessionFactoryBean.java文件，解决这个问题，在这个文件里也加入启动上面写的线程类：

1、修改实体类重名的时候抛出并打印异常，否则系统会一直递归造成无法启动。 
2、MapperXML有错误的时候抛出并打印异常，否则系统会一直递归造成无法启动。 
3、加入启动MapperRefresh.java线程服务。

思路就是用我们**自己重写的SqlSessionFactoryBean.class替换mybatis-spring-1.2.2.jar中的SqlSessionFactoryBean.class**。

1. 在当前项目下新建一个包：右键 *src > new Package >* *org.mybatis.spring*，创建SqlSessionFactoryBean.java类。

   <div align=center><img width="700" height="300" src="../../../../images/2017-9-15/mybatis-mapper/sqlSessionfactory-java.png" algin="center"/>

   </div>

2. 复制下面一串代码到SqlSessionFactoryBean.java，注意导入`MapperRefresh`正确的包。

   ```java
   package org.mybatis.spring;

   import java.io.IOException;
   import java.sql.SQLException;
   import java.util.Properties;

   import javax.sql.DataSource;

   import org.apache.ibatis.builder.xml.XMLConfigBuilder;
   import org.apache.ibatis.builder.xml.XMLMapperBuilder;
   import org.apache.ibatis.executor.ErrorContext;
   import org.apache.ibatis.logging.Log;
   import org.apache.ibatis.logging.LogFactory;
   import org.apache.ibatis.mapping.DatabaseIdProvider;
   import org.apache.ibatis.mapping.Environment;
   import org.apache.ibatis.plugin.Interceptor;
   import org.apache.ibatis.reflection.factory.ObjectFactory;
   import org.apache.ibatis.reflection.wrapper.ObjectWrapperFactory;
   import org.apache.ibatis.session.Configuration;
   import org.apache.ibatis.session.SqlSessionFactory;
   import org.apache.ibatis.session.SqlSessionFactoryBuilder;
   import org.apache.ibatis.transaction.TransactionFactory;
   import org.apache.ibatis.type.TypeAliasRegistry;
   import org.apache.ibatis.type.TypeHandler;
   import org.apache.ibatis.type.TypeHandlerRegistry;
   import org.mybatis.spring.transaction.SpringManagedTransactionFactory;
   import org.springframework.beans.factory.FactoryBean;
   import org.springframework.beans.factory.InitializingBean;
   import org.springframework.context.ApplicationEvent;
   import org.springframework.context.ApplicationListener;
   import org.springframework.context.event.ContextRefreshedEvent;
   import org.springframework.core.NestedIOException;
   import org.springframework.core.io.Resource;
   import org.springframework.jdbc.datasource.TransactionAwareDataSourceProxy;
   import org.springframework.util.Assert;
   import org.springframework.util.ObjectUtils;
   import org.springframework.util.StringUtils;

   import com.talkweb.nets.netsTestLib.data.util.MapperRefresh;

   public class SqlSessionFactoryBean
           implements FactoryBean<SqlSessionFactory>, InitializingBean, ApplicationListener<ApplicationEvent> {
       private static final Log logger = LogFactory.getLog(SqlSessionFactoryBean.class);
       private Resource configLocation;
       private Resource[] mapperLocations;
       private DataSource dataSource;
       private TransactionFactory transactionFactory;
       private Properties configurationProperties;
       private SqlSessionFactoryBuilder sqlSessionFactoryBuilder = new SqlSessionFactoryBuilder();
       private SqlSessionFactory sqlSessionFactory;
       private String environment = SqlSessionFactoryBean.class.getSimpleName();
       private boolean failFast;
       private Interceptor[] plugins;
       private TypeHandler<?>[] typeHandlers;
       private String typeHandlersPackage;
       private Class<?>[] typeAliases;
       private String typeAliasesPackage;
       private Class<?> typeAliasesSuperType;
       private DatabaseIdProvider databaseIdProvider;
       private ObjectFactory objectFactory;
       private ObjectWrapperFactory objectWrapperFactory;

       public void setObjectFactory(ObjectFactory objectFactory) {
           this.objectFactory = objectFactory;
       }

       public void setObjectWrapperFactory(ObjectWrapperFactory objectWrapperFactory) {
           this.objectWrapperFactory = objectWrapperFactory;
       }

       public DatabaseIdProvider getDatabaseIdProvider() {
           return this.databaseIdProvider;
       }

       public void setDatabaseIdProvider(DatabaseIdProvider databaseIdProvider) {
           this.databaseIdProvider = databaseIdProvider;
       }

       public void setPlugins(Interceptor[] plugins) {
           this.plugins = plugins;
       }

       public void setTypeAliasesPackage(String typeAliasesPackage) {
           this.typeAliasesPackage = typeAliasesPackage;
       }

       public void setTypeAliasesSuperType(Class<?> typeAliasesSuperType) {
           this.typeAliasesSuperType = typeAliasesSuperType;
       }

       public void setTypeHandlersPackage(String typeHandlersPackage) {
           this.typeHandlersPackage = typeHandlersPackage;
       }

       public void setTypeHandlers(TypeHandler<?>[] typeHandlers) {
           this.typeHandlers = typeHandlers;
       }

       public void setTypeAliases(Class<?>[] typeAliases) {
           this.typeAliases = typeAliases;
       }

       public void setFailFast(boolean failFast) {
           this.failFast = failFast;
       }

       public void setConfigLocation(Resource configLocation) {
           this.configLocation = configLocation;
       }

       public void setMapperLocations(Resource[] mapperLocations) {
           this.mapperLocations = mapperLocations;
       }

       public void setConfigurationProperties(Properties sqlSessionFactoryProperties) {
           this.configurationProperties = sqlSessionFactoryProperties;
       }

       public void setDataSource(DataSource dataSource) {
           if ((dataSource instanceof TransactionAwareDataSourceProxy)) {
               this.dataSource = ((TransactionAwareDataSourceProxy) dataSource).getTargetDataSource();
           } else
               this.dataSource = dataSource;
       }

       public void setSqlSessionFactoryBuilder(SqlSessionFactoryBuilder sqlSessionFactoryBuilder) {
           this.sqlSessionFactoryBuilder = sqlSessionFactoryBuilder;
       }

       public void setTransactionFactory(TransactionFactory transactionFactory) {
           this.transactionFactory = transactionFactory;
       }

       public void setEnvironment(String environment) {
           this.environment = environment;
       }

       public void afterPropertiesSet() throws Exception {
           Assert.notNull(this.dataSource, "Property 'dataSource' is required");
           Assert.notNull(this.sqlSessionFactoryBuilder, "Property 'sqlSessionFactoryBuilder' is required");

           this.sqlSessionFactory = buildSqlSessionFactory();
       }

       protected SqlSessionFactory buildSqlSessionFactory() throws IOException {
           XMLConfigBuilder xmlConfigBuilder = null;
           Configuration configuration;
           if (this.configLocation != null) {
               xmlConfigBuilder = new XMLConfigBuilder(this.configLocation.getInputStream(), null,
                       this.configurationProperties);
               configuration = xmlConfigBuilder.getConfiguration();
           } else {
               if (logger.isDebugEnabled()) {
                   logger.debug("Property 'configLocation' not specified, using default MyBatis Configuration");
               }
               configuration = new Configuration();
               configuration.setVariables(this.configurationProperties);
           }

           if (this.objectFactory != null) {
               configuration.setObjectFactory(this.objectFactory);
           }

           if (this.objectWrapperFactory != null) {
               configuration.setObjectWrapperFactory(this.objectWrapperFactory);
           }

           if (StringUtils.hasLength(this.typeAliasesPackage)) {
               String[] typeAliasPackageArray = StringUtils.tokenizeToStringArray(this.typeAliasesPackage, ",; \t\n");

               for (String packageToScan : typeAliasPackageArray) {

                   // 修改处：ThinkGem 修改实体类重名的时候抛出并打印异常，否则系统会一直递归造成无法启动
                   try {
                       configuration.getTypeAliasRegistry().registerAliases(packageToScan,
                               typeAliasesSuperType == null ? Object.class : typeAliasesSuperType);
                   } catch (Exception ex) {
                       logger.error("Scanned package: '" + packageToScan + "' for aliases", ex);
                       throw new NestedIOException("Scanned package: '" + packageToScan + "' for aliases", ex);
                   } finally {
                       ErrorContext.instance().reset();
                   }
                   // 修改处：ThinkGem end

                   if (logger.isDebugEnabled()) {
                       logger.debug("Scanned package: '" + packageToScan + "' for aliases");
                   }
               }
           }

           if (!ObjectUtils.isEmpty(this.typeAliases)) {
               for (Class typeAlias : this.typeAliases) {
                   configuration.getTypeAliasRegistry().registerAlias(typeAlias);
                   if (logger.isDebugEnabled()) {
                       logger.debug("Registered type alias: '" + typeAlias + "'");
                   }
               }
           }

           if (!ObjectUtils.isEmpty(this.plugins)) {
               for (Interceptor plugin : this.plugins) {
                   configuration.addInterceptor(plugin);
                   if (logger.isDebugEnabled()) {
                       logger.debug("Registered plugin: '" + plugin + "'");
                   }
               }
           }

           if (StringUtils.hasLength(this.typeHandlersPackage)) {
               String[] typeHandlersPackageArray = StringUtils.tokenizeToStringArray(this.typeHandlersPackage, ",; \t\n");

               for (String packageToScan : typeHandlersPackageArray) {
                   configuration.getTypeHandlerRegistry().register(packageToScan);
                   if (logger.isDebugEnabled()) {
                       logger.debug("Scanned package: '" + packageToScan + "' for type handlers");
                   }
               }
           }

           if (!ObjectUtils.isEmpty(this.typeHandlers)) {
               for (TypeHandler typeHandler : this.typeHandlers) {
                   configuration.getTypeHandlerRegistry().register(typeHandler);
                   if (logger.isDebugEnabled()) {
                       logger.debug("Registered type handler: '" + typeHandler + "'");
                   }
               }
           }

           if (xmlConfigBuilder != null) {
               try {
                   xmlConfigBuilder.parse();

                   if (logger.isDebugEnabled())
                       logger.debug("Parsed configuration file: '" + this.configLocation + "'");
               } catch (Exception ex) {
                   throw new NestedIOException("Failed to parse config resource: " + this.configLocation, ex);
               } finally {
                   ErrorContext.instance().reset();
               }
           }

           if (this.transactionFactory == null) {
               this.transactionFactory = new SpringManagedTransactionFactory();
           }

           Environment environment = new Environment(this.environment, this.transactionFactory, this.dataSource);
           configuration.setEnvironment(environment);

           if (this.databaseIdProvider != null) {
               try {
                   configuration.setDatabaseId(this.databaseIdProvider.getDatabaseId(this.dataSource));
               } catch (SQLException e) {
                   throw new NestedIOException("Failed getting a databaseId", e);
               }
           }

           if (!ObjectUtils.isEmpty(this.mapperLocations)) {
               for (Resource mapperLocation : this.mapperLocations) {
                   if (mapperLocation == null) {
                       continue;
                   }
                   try {
                       XMLMapperBuilder xmlMapperBuilder = new XMLMapperBuilder(mapperLocation.getInputStream(),
                               configuration, mapperLocation.toString(), configuration.getSqlFragments());

                       xmlMapperBuilder.parse();
                   } catch (Exception e) {

                       // 修改处：ThinkGem MapperXML有错误的时候抛出并打印异常，否则系统会一直递归造成无法启动
                       logger.error("Failed to parse mapping resource: '" + mapperLocation + "'", e);

                       throw new NestedIOException("Failed to parse mapping resource: '" + mapperLocation + "'", e);
                   } finally {
                       ErrorContext.instance().reset();
                   }

                   if (logger.isDebugEnabled()) {
                       logger.debug("Parsed mapper file: '" + mapperLocation + "'");
                   }
               }

               // 修改处：ThinkGem 启动刷新MapperXML定时器（有助于开发者调试）。
               new MapperRefresh(this.mapperLocations, configuration).run();

           } else if (logger.isDebugEnabled()) {
               logger.debug("Property 'mapperLocations' was not specified or no matching resources found");
           }

           return this.sqlSessionFactoryBuilder.build(configuration);
       }

       public SqlSessionFactory getObject() throws Exception {
           if (this.sqlSessionFactory == null) {
               afterPropertiesSet();
           }

           return this.sqlSessionFactory;
       }

       public Class<? extends SqlSessionFactory> getObjectType() {
           return this.sqlSessionFactory == null ? SqlSessionFactory.class : this.sqlSessionFactory.getClass();
       }

       public boolean isSingleton() {
           return true;
       }

       public void onApplicationEvent(ApplicationEvent event) {
           if ((this.failFast) && ((event instanceof ContextRefreshedEvent))) {
               this.sqlSessionFactory.getConfiguration().getMappedStatementNames();
           }
       }
   }
   ```

   3. 接下来我们就需要把这个SqlSessionFactoryBean.java文件编译成class文件，然后再复制到mybatis-spring-1.2.2.jar包里面 。**重新部署当前项目** Servers > Tomcat 8.x > 右键你的项目 Remove deployment 然后再 Add Deployment…你的项目。

   4. 去Tomcat 8的根目录找到对应的SqlSessionFactoryBean.class文件复制出来。

      <div align=center><img width="700" height="300" src="../../../../images/2017-9-15/mybatis-mapper/sqlsessionfactory-class.jpg" algin="center"/>

      </div>

   5. 这里记得检查一下编译过的class文件是否正确，将你编译好的SqlSessionFactoryBean.class文件再次拖入，用[*jd-gui.exe(一款JAVA反编译工具)*](http://pan.baidu.com/s/1skKW2st)比较是不是和上面写的代码对应！！！！

      **检查无误之后，把SqlSessionFactoryBean.class复制到mybatis-spring-1.2.2.jar(是你本地项目中的jar)包中，替换原来的class文件**。

      <div align=center><img width="700" height="300" src="../../../../images/2017-9-15/mybatis-mapper/%E6%9B%BF%E6%8D%A2class%E6%96%87%E4%BB%B6.png" algin="center"/>

      </div>

      ​

      # 创建mybatis-refresh.properties文件

      一切准备就绪，还剩下最后一个属性文件， 创建**mybatis-refresh.properties**文件，记得把文件格式改成**UTF-8**。

      <div align=center><img width="700" height="300" src="../../../../images/2017-9-15/mybatis-mapper/properties%E6%96%87%E4%BB%B6.png" algin="center"/>

      </div>

      **mybatis-refresh.properties文件内容为：**

      ```javascript
      #是否开启刷新线程
      enabled=true
      #延迟启动刷新程序的秒数
      delaySeconds=60  
      #刷新扫描间隔的时长秒数
      sleepSeconds=3
      #扫描Mapper文件的资源路径
      mappingPath=mapper
      ```

      # 测试

      1. 删除org.mybatis.spring包及下面的SqlSessionFactoryBean.java文件。

      2. 启动项目，然后随便修改一个mapper.xml文件，然后稍等片刻，在控制台出现如下输出，就表示你成功啦！**这样就不用重启项目，也能加载到你修改的mapper.xml文件了** 。

         <div align=center><img width="700" height="300" src="../../../../images/2017-9-15/mybatis-mapper/success.png" algin="center"/>

         </div>

      # 注意

      1. 注意各个文件的位置和名称。
      2. 注意**MapperRefresh.java**文件中**mybatis-refresh.properties**的路径。
      3. 注意用jd-gui.exe**检查编译后的SqlSessionFactoryBean.class文件**。