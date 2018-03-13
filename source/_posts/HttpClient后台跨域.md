---
title: HttpClient后台跨域
date: 2018-01-20 09:48:24
tags: [java,tips]
categories: technology
---

# 引言

跨域可以说是一个经常遇到的问题，最近在联调一个身份证识别接口，该接口由python语言编写，Java语言调用，刚开始采用了CORS（Cross-Origin Resource Sharing）跨域，在IE8上一直出现兼容性问题，固定的思维容易出现错误，自己一直想着前端Ajax跨域而忽略了后台HttpClient的跨域，最后还是用HttpClient顺利解决问题，避免了浏览器跨域带来的兼容性问题。<div align=center><img width="700" height="200" src="http://on937g0jc.bkt.clouddn.com/2018-01-20/HTTPClient.png" algin="center"/></div><!-- more -->

# HttpClient VS Jsonp

之前的博客有说过Jsonp的跨域方式，**jsonp的核心则是动态添加`<script>`标签来调用服务器提供的js脚本**。相比于HttpClient，Jsonp有两个很大的缺点：

1、它只能发送get请求，如果发送post请求会造成无法解析获取不到数据的问题。

2、如果返回的数据没有经过配置相应的编码文件来处理，拿到的数据可能会是一堆乱码。

问题总是能解决，HttpClient则没那么多约束，HttpClient封装了http协议的jar包，基本的请求方法get、post、put、 delete都能实现，当然得在web.xml文件中配置相应的filter拦截器拦截请求后再设好编码，一般返回的参数都是Json字符串，而我们只需要导入Jackson或者fastJson或者别的jar包来解析这对象把他转换成你所需要的数据即可。

# 整合Spring

## 添加依赖

```xml
<dependency>
	<groupId>org.apache.httpcomponents</groupId>
	<artifactId>httpclient</artifactId>
	<version>4.5.2</version>
</dependency>
```

## 封装方法

新建HttpClientUtil工具类

```java
public class HttpClientUtil {

	public static String doGet(String url, Map<String, String> param) {

		// 创建Httpclient对象
		CloseableHttpClient httpclient = HttpClients.createDefault();

		String resultString = "";
		CloseableHttpResponse response = null;
		try {
			// 创建uri
			URIBuilder builder = new URIBuilder(url);
			if (param != null) {
				for (String key : param.keySet()) {
					builder.addParameter(key, param.get(key));
				}
			}
			URI uri = builder.build();

			// 创建http GET请求
			HttpGet httpGet = new HttpGet(uri);

			// 执行请求
			response = httpclient.execute(httpGet);
			// 判断返回状态是否为200
			if (response.getStatusLine().getStatusCode() == 200) {
				resultString = EntityUtils.toString(response.getEntity(), "UTF-8");
			}
		} catch (Exception e) {
			e.printStackTrace();
		} finally {
			try {
				if (response != null) {
					response.close();
				}
				httpclient.close();
			} catch (IOException e) {
				e.printStackTrace();
			}
		}
		return resultString;
	}

	public static String doGet(String url) {
		return doGet(url, null);
	}

	public static String doPost(String url, Map<String, String> param) {
		// 创建Httpclient对象
		CloseableHttpClient httpClient = HttpClients.createDefault();
		CloseableHttpResponse response = null;
		String resultString = "";
		try {
			// 创建Http Post请求
			HttpPost httpPost = new HttpPost(url);
			// 创建参数列表
			if (param != null) {
				List<NameValuePair> paramList = new ArrayList<>();
				for (String key : param.keySet()) {
					paramList.add(new BasicNameValuePair(key, param.get(key)));
				}
				// 模拟表单
				UrlEncodedFormEntity entity = new UrlEncodedFormEntity(paramList);
				httpPost.setEntity(entity);
			}
			// 执行http请求
			response = httpClient.execute(httpPost);
			resultString = EntityUtils.toString(response.getEntity(), "utf-8");
		} catch (Exception e) {
			e.printStackTrace();
		} finally {
			try {
				response.close();
			} catch (IOException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
		}

		return resultString;
	}

	public static String doPost(String url) {
		return doPost(url, null);
	}
	
	public static String doPostJson(String url, String json) {
		// 创建Httpclient对象
		CloseableHttpClient httpClient = HttpClients.createDefault();
		CloseableHttpResponse response = null;
		String resultString = "";
		try {
			// 创建Http Post请求
			HttpPost httpPost = new HttpPost(url);
			// 创建请求内容
			StringEntity entity = new StringEntity(json, ContentType.APPLICATION_JSON);
			httpPost.setEntity(entity);
			// 执行http请求
			response = httpClient.execute(httpPost);
			resultString = EntityUtils.toString(response.getEntity(), "utf-8");
		} catch (Exception e) {
			e.printStackTrace();
		} finally {
			try {
				response.close();
			} catch (IOException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
		}

		return resultString;
	}
}
```

## 单元测试

```java
public class HttpClientTest {

	@Test
	public void doGet() throws Exception {
		//创建一个httpclient对象
		CloseableHttpClient httpClient = HttpClients.createDefault();
		//创建一个GET对象
		HttpGet get = new HttpGet("http://www.sogou.com");
		//执行请求
		CloseableHttpResponse response = httpClient.execute(get);
		//取响应的结果
		int statusCode = response.getStatusLine().getStatusCode();
		System.out.println(statusCode);
		HttpEntity entity = response.getEntity();
		String string = EntityUtils.toString(entity, "utf-8");
		System.out.println(string);
		//关闭httpclient
		response.close();
		httpClient.close();
	}
	
	@Test
	public void doGetWithParam() throws Exception{
		//创建一个httpclient对象
		CloseableHttpClient httpClient = HttpClients.createDefault();
		//创建一个uri对象
		URIBuilder uriBuilder = new URIBuilder("http://www.sogou.com/web");
		uriBuilder.addParameter("query", "花千骨");
		HttpGet get = new HttpGet(uriBuilder.build());
		//执行请求
		CloseableHttpResponse response = httpClient.execute(get);
		//取响应的结果
		int statusCode = response.getStatusLine().getStatusCode();
		System.out.println(statusCode);
		HttpEntity entity = response.getEntity();
		String string = EntityUtils.toString(entity, "utf-8");
		System.out.println(string);
		//关闭httpclient
		response.close();
		httpClient.close();
	}
	
	@Test
	public void doPost() throws Exception {
		CloseableHttpClient httpClient = HttpClients.createDefault();

		//创建一个post对象
		HttpPost post = new HttpPost("http://localhost:8082/httpclient/post.action");
		//执行post请求
		CloseableHttpResponse response = httpClient.execute(post);
		String string = EntityUtils.toString(response.getEntity());
		System.out.println(string);
		response.close();
		httpClient.close();
		
	}
	
	@Test
	public void doPostWithParam() throws Exception{
		CloseableHttpClient httpClient = HttpClients.createDefault();
	 
		//创建一个post对象  
		HttpPost post = new HttpPost("http://localhost:8082/httpclient/post.action");
		//创建一个Entity。模拟一个表单
		List<NameValuePair> kvList = new ArrayList<>();
		kvList.add(new BasicNameValuePair("username", "张三"));
		kvList.add(new BasicNameValuePair("password", "123"));
		
		//包装成一个Entity对象 
		StringEntity entity = new UrlEncodedFormEntity(kvList, "utf-8");
		//设置请求的内容 
		post.setEntity(entity);
		
		//执行post请求
		CloseableHttpResponse response = httpClient.execute(post);
		String string = EntityUtils.toString(response.getEntity());
		System.out.println(string);
		response.close();
		httpClient.close();
	}
}
```

## 项目实例

```java
/**
 * 订单处理Service
 * <p>Title: OrderServiceImpl</p>
 * <p>Description: </p>
 * @version 1.0
 */
@Service
public class OrderServiceImpl implements OrderService {
	
	@Value("${ORDER_BASE_URL}")
	private String ORDER_BASE_URL;
	@Value("${ORDER_CREATE_URL}")
	private String ORDER_CREATE_URL;
	
	@Override
	public String createOrder(Order order) {
		//调用order的服务提交订单。
		String json = HttpClientUtil.doPostJson(ORDER_BASE_URL + ORDER_CREATE_URL, JsonUtils.objectToJson(order));
		//把json转换成taotaoResult
		TaotaoResult taotaoResult = TaotaoResult.format(json);
		if (taotaoResult.getStatus() == 200) {
			Object orderId = taotaoResult.getData();
			return orderId.toString();
		}
		return "";
	}
}
```

# 总结

HttpClient与Jsonp能够轻易的解决跨域问题，从而得到自己想要的数据(来自不同IP，协议，端口)，唯一的不同点是，HttpClient是在后台Java代码中进行跨域访问，而Jsonp是在前台js中进行跨域访问。跨域还有一级跨域，二级跨域，更多内容值得研究。