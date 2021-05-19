---
title: protostuff序列化
date: 2019-01-09 13:50:09
tags: [tips]
categories: 工具
cover: ../../../../images/2019/1-3/protostuff.png
---

# 引言

HTTP通信离不开对象的序列化和反序列化。通过序列化技术，可以跨语言实现数据的传输，将对象转换为字节序列，然后在网络上传送；通过反序列化，可以将字节序列转换为对象。<!-- more --> 基本原理和网络通信是一致的，通过特殊的编码方式，写入数据将对象以及其内部数据编码，存在在数组或者文件里面然后发送到目的地后，在进行解码，读出数据。

<div align=center><img width="250" height="220" src="../../../../images/2019/1-3/protostuff.png" algin="center"/>
</div>

# protostuff

protostuff是Google出品的一种轻量并且高效的结构化数据存储格式，性能比 `JSON`、`XML` 要高很多。

之所以性能如此好，主要得益于两个：**第一**，它使用 proto 编译器，自动进行序列化和反序列化，速度非常快，应该比 `XML` 和 `JSON` 快上了 `20~100` 倍；**第二**，它的数据压缩效果好，就是说它序列化后的数据量体积小。因为体积小，传输起来带宽和速度上会有优化。

详细效率对比可参考：[java序列化/反序列化之xstream、protobuf、protostuff 的比较与使用例子](https://www.cnblogs.com/xiaoMzjm/p/4555209.html)

## maven依赖

```XML
<dependency>
    <groupId>io.protostuff</groupId>
    <artifactId>protostuff-runtime</artifactId>
    <version>1.6.0</version>
</dependency>
<dependency>
    <groupId>io.protostuff</groupId>
    <artifactId>protostuff-core</artifactId>
    <version>1.6.0</version>
</dependency>
```

# 继承父类方式

```java
public interface CanProto {

    byte[] toProto();

    void fromProto(byte[] bytes);
}
```

```java
public class ProtoBase implements CanProto, Serializable {
    @Override
    public byte[] toProto() {
        Schema schema = RuntimeSchema.getSchema(getClass());
        return ProtobufIOUtil.toByteArray(this, schema, LinkedBuffer.allocate(256));
    }
    @Override
    public void fromProto(byte[] bytes) {
        Schema schema = RuntimeSchema.getSchema(getClass());
        ProtobufIOUtil.mergeFrom(bytes, this, schema);
    }
}
```

此方式可以使用Javabean继承ProtoBase类实现序列化。

# ProtostuffUtil工具类方式

ProtostuffUtil.java

```java
import io.protostuff.LinkedBuffer;
import io.protostuff.ProtobufIOUtil;
import io.protostuff.ProtostuffIOUtil;
import io.protostuff.Schema;
import io.protostuff.runtime.RuntimeSchema;

public class ProtostuffUtil {
    public ProtostuffUtil() {
    }

    public static <T> byte[] serializer(T o) {
        Schema schema = RuntimeSchema.getSchema(o.getClass());
        return ProtobufIOUtil.toByteArray(o, schema, LinkedBuffer.allocate(256));
    }

    public static <T> T deserializer(byte[] bytes, Class<T> clazz) {

        T obj = null;
        try {
            obj = clazz.newInstance();
            Schema schema = RuntimeSchema.getSchema(obj.getClass());
            ProtostuffIOUtil.mergeFrom(bytes, obj, schema);
        } catch (InstantiationException | IllegalAccessException e) {
            e.printStackTrace();
        }
        return obj;
    }
}
```

## 测试bean

Student.java

```java
import io.protostuff.Tag;

public class Student {

    // 关于@Tag,要么所有属性都有@Tag注解,要么都没有,不能一个类中只有部分属性有@Tag注解
    @Tag(1)
    private String name;
    @Tag(2)
    private String studentNo;
    @Tag(3)
    private int age;
    @Tag(4)
    private String schoolName;
    @Tag(5)
    private Gender gender;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getStudentNo() {
        return studentNo;
    }

    public void setStudentNo(String studentNo) {
        this.studentNo = studentNo;
    }

    public int getAge() {
        return age;
    }

    public void setAge(int age) {
        this.age = age;
    }

    public String getSchoolName() {
        return schoolName;
    }

    public void setSchoolName(String schoolName) {
        this.schoolName = schoolName;
    }

    public Gender getGender() {
        return gender;
    }

    public void setGender(Gender gender) {
        this.gender = gender;
    }

    @Override
    public String toString() {
        return "Student{" +
                "name='" + name + '\'' +
                ", studentNo='" + studentNo + '\'' +
                ", age=" + age +
                ", schoolName='" + schoolName + '\'' +
                ", gender=" + gender +
                '}';
    }
}

enum Gender {
    MAIL(1, "MAIL"),
    FEMAIL(2, "FEMAIL");
    private Integer order;
    private String gender;

    Gender(int order, String gender) {
        this.order = order;
        this.gender = gender;
    }

    public Integer getOrder() {
        return order;
    }

    public String getGender() {
        return gender;
    }

    @Override
    public String toString() {
        return "Gender{" +
                "order=" + order +
                ", gender='" + gender + '\'' +
                '}';
    }
}
```

## test类

ProtostuffUtilTest.java

```java
import java.util.Arrays;

public class ProtostuffUtilTest {
    public static void main(String[] args) {
        Student student = new Student();
        student.setName("rainbowhorse");
        student.setAge(24);
        student.setStudentNo("20112214010");
        student.setSchoolName("ZNMZDX");
        student.setGender(Gender.MAIL);
        byte[] serializerResult = ProtostuffUtil.serializer(student);
        System.out.println("serializer result:" + Arrays.toString(serializerResult));
        Student deSerializerResult = ProtostuffUtil.deserializer(serializerResult, Student.class);
        System.out.println("deSerializerResult:" + deSerializerResult.toString());
    }
}
```

## 输出

```java
serializer result:[10, 12, 114, 97, 105, 110, 98, 111, 119, 104, 111, 114, 115, 101, 18, 11, 50, 48, 49, 49, 50, 50, 49, 52, 48, 49, 48, 24, 24, 34, 6, 90, 78, 77, 90, 68, 88, 40, 0]
deSerializerResult:Student{name='rainbowhorse', studentNo='20112214010', age=24, schoolName='ZNMZDX', gender=Gender{order=1, gender='MAIL'}}
```

