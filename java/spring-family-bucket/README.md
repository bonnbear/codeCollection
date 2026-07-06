# Spring 全家桶示例项目

这是一个可直接运行的 Spring Boot 示例，集成了常见“全家桶”能力：

- Spring Web (REST API)
- Spring Validation (请求参数校验)
- Spring Data JPA + H2 (数据持久化)
- Spring Security (HTTP Basic 鉴权)
- Spring Cache (默认 simple，可切换 Redis)
- Spring Data Redis (缓存后端可选)
- Spring Boot Actuator (健康检查与指标)
- springdoc OpenAPI + Swagger UI (接口文档)

## 运行环境

- JDK 17+
- Maven 3.9+

## 启动方式

```bash
mvn spring-boot:run
```

启动后可访问：

- Swagger UI: `http://localhost:8080/swagger-ui.html`
- Health: `http://localhost:8080/actuator/health`
- H2 Console: `http://localhost:8080/h2-console`

默认鉴权账号：

- username: `admin`
- password: `admin123`

## 示例 API

```bash
# 查询用户列表
curl -u admin:admin123 http://localhost:8080/api/users

# 新增用户
curl -u admin:admin123 -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","age":28}'
```

## Redis 缓存模式（可选）

默认缓存为内存模式，不依赖 Redis。若本地有 Redis，可启用：

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=redis
```
