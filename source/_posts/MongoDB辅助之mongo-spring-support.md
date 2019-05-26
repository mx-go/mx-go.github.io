---
title: MongoDB辅助之mongo-spring-support
date: 2019-04-05 11:57:23
tags: [java,MongoDB,tips]
categories: 工具
img: ../../../../images/2019/4-6/mongo-spring-support.jpg
---

# 引言

在开发中经常使用到**MongoDB**，每个项目使用各不相同，既繁琐又好不管理。这里封装了一套MongoDB类似于Mybatis的ORM增强版工具，和Spring无缝结合，只需要简单的配置就可以实现强大的功能。同时扩展了MongoDB的Datastore功能，加了一些自定义方法。其原理离不开之前所说的FactoryBean。<div align=center><img width="220" height="220" src="../../../../images/2019/4-6/mongo-spring-support.jpg" algin="center"/></div><!-- more -->

源码放在了我的GitHub上：<https://github.com/mx-go/mongo-spring-support>

源码中有详细使用注释，其原理就是实现FactoryBean生成代理对象并对原本的Datastore进行增强。

在这里记录下使用方法。

# MongoDB数据库及集合

以下测试在MongoDB的TEST库中，其中有两个集合student、student_1。student_1可以用来测试同库中，根据后缀来切换集合，相当与分表。

<div align=center><img width="700" height="220" src="../../../../images/2019/4-6/Mongo-ext1.jpg" algin="center"/></div>

<div align=center><img width="700" height="220" src="../../../../images/2019/4-6/Mongo-ext2.jpg" algin="center"/></div>

# 引入Maven坐标

```xml
<dependency>
    <groupId>com.github.mx-go</groupId>
    <artifactId>mongo-spring-support</artifactId>
    <version>1.0.0</version>
</dependency>
```

# 配置管理

在Spring中配置MongoDB的*server*地址、*dbName*等信息，可以配置更多参数，见[MongoConfiguration](https://github.com/mx-go/mongo-spring-support/blob/master/src/main/java/com/github/mongo/support/mongo/MongoConfiguration.java)类中属性。jar包中已包含*mongo-java-driver*和*morphia*。

```xml
<context:component-scan base-package="com.rainbowhorse.demo"/>

<!--生成代理对象，增强原方法，自定义方法-->
    <bean id="datastoreExt" class="com.github.mongo.support.mongo.MongoDataStoreFactoryBean">
        <property name="configuration" ref="configuration"/>
    </bean>
    <!--配置属性。可以配置更多属性，详细看MongoConfiguration类-->
    <bean id="configuration" class="com.github.mongo.support.mongo.MongoConfiguration">
        <!--数据库连接-->
        <property name="servers" value="mongodb://root:root@localhost:27017/TEST"/>
        <!--数据库名称-->
        <property name="dbName" value="TEST"/>
        <!--对应实体所在路径-->
        <property name="mapPackage" value="com.rainbowhorse.demo.mongo"/>
    </bean>
```

# 简单使用范例

## 简单模式

```java
@Service
class UserService {
  @Autowired
  DatastoreExt datastoreExt;

  public void save(User user) {
    datastore.save(user);
  }
}
```

## 单实例多库

```java
@Service
class UserService {
  @Autowired
  DatastoreExt datastoreExt;

  public void save(User user) {
    datastore.use("user_db").save(user);
  }
}

@Service
class BlogService {
  @Autowired
  DatastoreExt datastoreExt;

  public void save(Blog blog) {
    datastore.use("blog_db").save(blog);
  }
}
```

## 表名添加前缀或者后缀

```java
@Service
class UserService {
  @Autowired
  DatastoreExt datastoreExt;

  public void save(User user) {
    // user对象会保存到db01.2017_user的表中
    datastore.getDatastoreByPrefix("db01", "2017").save(user);
  }
}

@Service
class BlogService {
  @Autowired
  DatastoreExt datastoreExt;

  public void save(Blog blog) {
    // blog对象会保存到db02.blog_2017的表中
    datastore.getDatastoreBySuffix("db02", "2017").save(blog);
  }
}
```

# 集合实体类StudentDO

MongoDB是文档型数据库，借助*morphia*可以把集合映射到到Java中的Bean。

```java
import lombok.Data;
import org.mongodb.morphia.annotations.Entity;
import org.mongodb.morphia.annotations.Id;
import java.io.Serializable;

/**
 * value中存储集合名字
 */
@Data
@Entity(value = "student", noClassnameStored = true)
public class StudentDO implements Serializable {

    private static final long serialVersionUID = 2997596487756179430L;
    /**
     * 对应mongo中的_id
     */
    @Id
    private String id;
    private Integer age;
    private String name;
    private Integer score;
    private String sex;
}
```

# 接口及实现类

## 接口StudentDAO

接口继承*mongo-support*中的**[BaseDao](https://github.com/mx-go/mongo-spring-support/blob/master/src/main/java/com/github/mongo/support/dao/BaseDao.java)**，可以实现更多方法的调用。

```java
public interface StudentDAO extends BaseDao<StudentDO> {
    /**
     * 查询
     */
    List<StudentDO> getByScore(Integer score);

    /**
     * 更新age
     */
    int updateAge(String id, Integer age);

    /**
     * 通过name增加score
     *
     * @return 更新结果
     */
    int incrScoreByName(StudentDO tenantQuotaDO);

    /**
     * 分页查询
     *
     * @return
     */
    List<StudentDO> getScoreAndPage(StudentDO studentDO, Pager<StudentDO> pager);
    
    int getStudentCounts(StudentDO tenantQuotaDO);
}
```

## 接口实现类StudentDAOImpl

继承**[BaseDaoImpl](<https://github.com/mx-go/mongo-spring-support/blob/master/src/main/java/com/github/mongo/support/dao/BaseDaoImpl.java>)**，其中实现基础方法。

```java
@Repository
public class StudentDAOImpl extends BaseDaoImpl<StudentDO> implements StudentDAO {

    @Autowired
    public StudentDAOImpl(DatastoreExt datastoreExt) {
        super(datastoreExt, StudentDO.class);
    }

    @Override
    public List<StudentDO> getByScore(Integer score) {
        Query<StudentDO> query = createQuery();
        query.criteria("score").equal(score);
        return query.asList();
    }

    @Override
    public int updateAge(String id, Integer age) {

        Query<StudentDO> query = createQuery();
        query.field("_id").equal(new ObjectId(id));

        final UpdateOperations<StudentDO> update = createUpdateOperations();
        update.set("age", age);

        return getDatastore().update(query, update).getUpdatedCount();
    }

    @Override
    public List<StudentDO> getScoreAndPage(StudentDO studentDO, Pager<StudentDO> pager) {
        return queryList(studentDO, pager.offset(), pager.getPageSize());
    }

    @Override
    public int getStudentCounts(StudentDO studentDO) {
        return (int) queryCount(studentDO);
    }

    @Override
    public int incrScoreByName(StudentDO studentDO) {
        Query<StudentDO> query = createQuery(studentDO);
        UpdateOperations<StudentDO> updateOperation = createUpdateOperations().inc("score", 1);
        return getDatastore().update(query, updateOperation).getUpdatedCount();
    }
}
```

# 单元测试

```java
		@Autowired
    private StudentDAO studentDAO;

		@Test
    public void test() {

        List<StudentDO> name1 = studentDAO.getByScore(88);
        System.out.println(name1.size());

        StudentDO studentDO = new StudentDO();
        studentDO.setName("max10");
        System.out.println(studentDAO.incrScoreByName(studentDO));

        StudentDO studentDO1 = new StudentDO();
        studentDO1.setScore(88);
        Pager<StudentDO> pager = new Pager<>();
        pager.setPageSize(2);
        pager.setCurrentPage(2);
        List<StudentDO> scoreAndPage = studentDAO.getScoreAndPage(studentDO1, pager);
        System.out.println(scoreAndPage);

        System.out.println(studentDAO.getStudentCounts(new StudentDO()));

        int age = studentDAO.updateAge("5ca6b118a03b9e0e7f5bb33c", 20);
        System.out.println(age);
    }

		/**
     * 测试扩展动态切换集合
     */
    @Test
    public void TestDatastore() {
        DatastoreExt datastore = datastoreExt.getDatastoreBySuffix("TEST", "1");

        studentDAO = new StudentDAOImpl(datastore);

        List<StudentDO> name1 = studentDAO.getByScore(66);
        System.out.println(name1);
    }
```

