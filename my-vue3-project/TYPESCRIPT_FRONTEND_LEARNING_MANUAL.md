# TypeScript 前端学习手册

这是一份给已经会 JavaScript 的前端开发者准备的 TypeScript 学习手册。

核心思路不是“从零再学一门语言”，而是把你的思维从“只关注运行逻辑”逐步迁移到“同时关注数据结构、函数约束和类型安全”。

你学 TypeScript，不是为了写复杂的类型体操，而是为了做到这几件事：

- 更早发现 bug
- 让函数和组件更可维护
- 让多人协作时提示更准确
- 让中大型前端项目更稳定

---

## 1. 先建立正确认知

### 1.1 TypeScript 到底是什么

TypeScript 可以理解成：

1. JavaScript 的超集
2. 一套静态类型检查系统
3. 一套工程化编译配置能力

它的运行时本质仍然是 JavaScript。类型主要在开发和编译阶段起作用，真正运行到浏览器或 Node.js 时，类型信息会被擦除。

```ts
function add(a: number, b: number): number {
  return a + b
}
```

上面这段代码在编译后，本质仍然会变成普通 JavaScript 函数。`number` 不会在运行时存在，但它会在你写代码时帮你拦住很多错误。

### 1.2 你真正要学会什么

学 TS 的重点不是记语法，而是学会下面这件事：

> 在写代码之前，先把“数据长什么样、函数接收什么、返回什么”表达清楚。

这也是为什么前端开发者学 TS 时，最有效的路径不是先钻高级类型，而是先学：

- 基本类型
- 对象和函数建模
- 联合类型
- 缩小 Narrowing
- 泛型
- 工程配置
- 项目实战

---

## 2. 学习总路线

整套学习分成 6 个阶段：

### 阶段 0：用 JS 视角理解 TS

目标：知道 TS 和 JS 的关系，理解类型在什么时候生效。

### 阶段 1：掌握 TS 基础语法

目标：会写基本类型、对象类型、数组类型、函数类型。

### 阶段 2：掌握日常业务建模

目标：会写联合类型、对象结构、接口响应、表单和配置对象类型。

### 阶段 3：掌握泛型与推断

目标：从“会写类型”走向“会设计可复用类型”。

### 阶段 4：掌握工程化能力

目标：会理解 `tsconfig.json`、模块、声明文件和第三方库类型。

### 阶段 5：掌握前端项目落地

目标：能把 TS 稳妥地用进 Vue / React / Node 项目。

### 阶段 6：掌握高级类型

目标：能看懂和编写中高级类型定义，但不过度炫技。

---

## 3. 阶段 0：先从 JS 思维迁移到类型思维

### 3.1 这一阶段要解决什么问题

很多人学 TS 的第一道坎不是语法，而是误解：

- 误以为 TS 会改变 JS 的运行机制
- 误以为 TS 是“更复杂的 JS”
- 误以为学 TS 就是背类型写法

实际上，TS 更像是给 JS 加了一层“开发期安全网”。

### 3.2 第一批要改写的 JS 代码

不要一开始搞复杂项目。先把你已经熟悉的 JS 用“不改逻辑、只补类型”的方式改写。

#### 示例 1：普通函数

```ts
function formatPrice(price: number): string {
  return `¥${price.toFixed(2)}`
}
```

#### 示例 2：对象数组

```ts
type User = {
  id: number
  name: string
  isAdmin: boolean
}

const users: User[] = [
  { id: 1, name: 'Alice', isAdmin: true },
  { id: 2, name: 'Bob', isAdmin: false }
]
```

#### 示例 3：异步请求函数

```ts
type User = {
  id: number
  name: string
}

async function fetchUsers(): Promise<User[]> {
  const res = await fetch('/api/users')
  return res.json()
}
```

### 3.3 这一阶段的过关标准

你应该能回答：

- TS 和 JS 的关系是什么
- 类型检查主要发生在什么时候
- 为什么 TS 能提前发现 bug

---

## 4. 阶段 1：基础语法与基本类型

### 4.1 基本类型

```ts
let username: string = 'tom'
let age: number = 18
let isOnline: boolean = true
let emptyValue: null = null
let notAssigned: undefined = undefined
```

### 4.2 数组和元组

```ts
const ids: number[] = [1, 2, 3]
const names: Array<string> = ['a', 'b', 'c']

const userInfo: [string, number] = ['Tom', 18]
```

### 4.3 对象类型

```ts
type Product = {
  id: number
  title: string
  price: number
  desc?: string
  readonly createdAt: string
}
```

这里有三个高频点：

- `desc?` 表示可选属性
- `readonly` 表示只读属性
- 对象类型是前端开发里最常见的类型写法

### 4.4 特殊类型

#### `any`

```ts
let value: any = 123
value = 'hello'
value.foo.bar()
```

`any` 几乎等于放弃类型检查。

#### `unknown`

```ts
let result: unknown = 'hello'

if (typeof result === 'string') {
  console.log(result.toUpperCase())
}
```

`unknown` 更安全，因为你必须先判断它是什么，再去使用。

#### `void` 和 `never`

```ts
function logMessage(message: string): void {
  console.log(message)
}

function throwError(message: string): never {
  throw new Error(message)
}
```

### 4.5 `type` 和 `interface`

#### `type`

```ts
type Status = 'loading' | 'success' | 'error'
```

#### `interface`

```ts
interface User {
  id: number
  name: string
}
```

实战记忆法：

- 描述对象结构时，`type` 和 `interface` 都可以
- 需要联合类型、交叉类型、类型运算时，更常用 `type`
- 偏接口扩展风格时，常见 `interface`

### 4.6 本阶段练习

试着自己写出这些类型：

- `User`
- `Order`
- `LoginParams`
- `Promise<User[]>`
- `Record<string, number>`

---

## 5. 阶段 2：函数、联合类型、对象建模

这一阶段是日常开发的核心。

### 5.1 函数类型

```ts
function sum(a: number, b: number): number {
  return a + b
}

function greet(name: string, prefix = 'Hi'): string {
  return `${prefix}, ${name}`
}

function joinLabels(...labels: string[]): string {
  return labels.join(' / ')
}
```

### 5.2 联合类型和字面量类型

```ts
type Status = 'loading' | 'success' | 'error'

function getStatusText(status: Status): string {
  if (status === 'loading') return '加载中'
  if (status === 'success') return '成功'
  return '失败'
}
```

字面量类型很适合用来约束业务状态、组件模式、接口枚举值。

### 5.3 类型缩小 Narrowing

TS 的强大之处之一，就是它会根据代码分支自动缩小类型。

```ts
function printId(id: string | number) {
  if (typeof id === 'string') {
    console.log(id.toUpperCase())
  } else {
    console.log(id.toFixed(0))
  }
}
```

#### `in` 缩小

```ts
type Cat = { meow: () => void }
type Dog = { bark: () => void }

function speak(animal: Cat | Dog) {
  if ('meow' in animal) {
    animal.meow()
  } else {
    animal.bark()
  }
}
```

#### 自定义类型守卫

```ts
type User = { id: number; name: string }

function isUser(value: unknown): value is User {
  return typeof value === 'object' && value !== null && 'id' in value && 'name' in value
}
```

### 5.4 对象建模

```ts
type UserProfile = {
  id: number
  name: string
  contact?: {
    phone?: string
    email?: string
  }
  tags: string[]
}
```

### 5.5 `Record` 和字典对象

```ts
type StatusMap = Record<string, string>

const statusTextMap: StatusMap = {
  pending: '待处理',
  done: '已完成'
}
```

### 5.6 业务示例：接口响应

```ts
type ApiResponse<T> = {
  code: number
  message: string
  data: T
}

type User = {
  id: number
  name: string
}

type UserListResponse = ApiResponse<User[]>
```

### 5.7 本阶段练习

- 给 `fetchUserList(params)` 写类型
- 给 `formData` 写对象类型
- 给 `tableColumns` 写数组元素类型
- 给“订单状态”写联合类型

---

## 6. 阶段 3：类型推断、泛型、复用能力

### 6.1 先理解推断

不是所有地方都要手写类型。

```ts
const title = 'TypeScript'
```

上面这句通常不需要再写 `: string`，因为 TS 已经能推断出来。

真正建议显式标注的地方通常是：

- 函数参数
- 函数返回值
- 公共类型
- 对外暴露的 API
- 容易歧义的数据结构

### 6.2 泛型是什么

泛型解决的问题是：让同一套逻辑能适配不同类型，同时保持类型安全。

```ts
function getFirst<T>(list: T[]): T | undefined {
  return list[0]
}

const n = getFirst([1, 2, 3])
const s = getFirst(['a', 'b', 'c'])
```

### 6.3 泛型在前端里最常见的用法

#### 通用接口响应

```ts
type ApiResponse<T> = {
  code: number
  message: string
  data: T
}
```

#### 通用分页结构

```ts
type PageResult<T> = {
  list: T[]
  total: number
  page: number
  pageSize: number
}

type PagedResponse<T> = ApiResponse<PageResult<T>>
```

#### 通用取值函数

```ts
function getValue<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}

const user = { id: 1, name: 'Tom' }
const name = getValue(user, 'name')
```

### 6.4 `keyof`、`typeof`、索引访问类型

#### `keyof`

```ts
type User = {
  id: number
  name: string
}

type UserKeys = keyof User
```

`UserKeys` 的结果是 `'id' | 'name'`。

#### `typeof`

```ts
const config = {
  baseURL: '/api',
  timeout: 5000
}

type Config = typeof config
```

#### 索引访问类型

```ts
type UserName = User['name']
```

### 6.5 本阶段练习

- 写一个 `ApiResponse<T>`
- 写一个 `PageResult<T>`
- 写一个 `getValue<T, K extends keyof T>()`
- 给表格列配置写泛型类型
- 给请求 Hook 写 `TData` 和 `TParams`

---

## 7. 阶段 4：工程化能力

### 7.1 认识 `tsconfig.json`

一个 TS 项目离不开 `tsconfig.json`。

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "strict": true,
    "moduleResolution": "Bundler",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "noEmit": true
  }
}
```

### 7.2 必须理解的配置项

- `target`：编译后的 JS 目标版本
- `module`：模块规范
- `strict`：是否开启严格模式
- `moduleResolution`：模块解析策略
- `baseUrl`：基础路径
- `paths`：路径别名
- `allowJs`：是否允许 JS 文件进入 TS 项目
- `noEmit`：只做类型检查，不输出文件
- `isolatedModules`：适配构建工具的单文件编译能力

### 7.3 为什么 `strict` 很重要

如果不开严格模式，很多本来该暴露的问题会被放过。很多团队“用了 TS 但效果一般”，本质上是类型约束太松。

### 7.4 模块与类型导入

```ts
export type User = {
  id: number
  name: string
}
```

```ts
import type { User } from './types'
```

`import type` 用于只导入类型，不导入运行时代码。

### 7.5 声明文件 `.d.ts`

当一个库没有类型时，你可以补声明。

```ts
declare module 'legacy-lib' {
  export function init(): void
  export function getVersion(): string
}
```

### 7.6 本阶段练习

- 自己写一个最小可用的 `tsconfig.json`
- 给项目配置 `@/` 路径别名
- 给没有类型的 JS 库补一个 `.d.ts`
- 在小项目里打开 `strict`

---

## 8. 阶段 5：前端项目实战

这一阶段最重要。真正掌握 TS，不是在文档里，而是在项目里。

### 8.1 接口层建模

```ts
type ApiResponse<T> = {
  code: number
  message: string
  data: T
}

type User = {
  id: number
  name: string
  role: 'admin' | 'editor' | 'visitor'
}

type UserListParams = {
  page: number
  pageSize: number
  keyword?: string
}

type UserListData = {
  list: User[]
  total: number
}

type UserListResponse = ApiResponse<UserListData>
```

### 8.2 Vue 3 场景

#### Props

```ts
type ButtonProps = {
  type?: 'primary' | 'success' | 'warning'
  disabled?: boolean
  text: string
}
```

#### Emits

```ts
type SubmitPayload = {
  id: number
  name: string
}
```

你在 Vue 里要重点掌握：

- props 类型
- emits 类型
- `ref` 的值类型
- 异步请求返回值类型
- 表单和表格数据结构

### 8.3 状态管理建模

```ts
type UserInfo = {
  id: number
  name: string
  token: string
}

type UserState = {
  userInfo: UserInfo | null
  loading: boolean
}
```

### 8.4 工具函数类型化

```ts
function mapById<T extends { id: number | string }>(list: T[]): Record<string, T> {
  return list.reduce((acc, item) => {
    acc[String(item.id)] = item
    return acc
  }, {} as Record<string, T>)
}
```

### 8.5 复杂业务对象建模

```ts
type OrderStatus = 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled'

type Order = {
  id: string
  amount: number
  status: OrderStatus
  createdAt: string
}
```

### 8.6 这一阶段最推荐的练手项目

#### 项目 1：用户管理后台

练习内容：

- 列表和分页
- 查询参数
- 详情页数据结构
- 编辑表单类型

#### 项目 2：组件配置面板

练习内容：

- 动态表单
- 联合类型
- 配置项建模
- 表单项 schema

#### 项目 3：请求层 / Hooks 封装

练习内容：

- 泛型响应结构
- 错误处理
- 请求参数与返回值约束

---

## 9. 阶段 6：高级类型系统

这一阶段是拔高，不适合一开始就钻。

### 9.1 条件类型

```ts
type IsString<T> = T extends string ? true : false
```

### 9.2 映射类型

```ts
type MyPartial<T> = {
  [K in keyof T]?: T[K]
}
```

### 9.3 常见工具类型

```ts
type User = {
  id: number
  name: string
  age: number
}

type UserPreview = Pick<User, 'id' | 'name'>
type UserWithoutAge = Omit<User, 'age'>
type PartialUser = Partial<User>
type ReadonlyUser = Readonly<User>
```

### 9.4 模板字面量类型

```ts
type EventName = `on${string}`
```

### 9.5 `infer`

```ts
type GetReturnType<T> = T extends (...args: any[]) => infer R ? R : never
```

### 9.6 学这一阶段要注意什么

不要一上来沉迷：

- 类型体操题
- 过度封装
- 团队里没人能看懂的复杂类型

高级类型真正的价值是：

- 提升复用性
- 约束 API 一致性
- 减少重复定义

---

## 10. 最推荐的学习顺序

### 第 1 周

- TS 和 JS 的关系
- 基本类型
- 对象类型
- 函数类型
- 数组与元组
- `type` / `interface`

### 第 2 周

- 联合类型
- 字面量类型
- Narrowing
- `unknown` / `never`
- 接口响应建模

### 第 3 周

- 泛型
- `keyof`
- `typeof`
- 索引访问类型
- 工具类型

### 第 4 周

- `tsconfig.json`
- `strict`
- 模块系统
- 路径别名
- 第三方库类型

### 第 5 到 6 周

- 在真实项目里重构请求层
- 给表单和表格补类型
- 给组件 props / emits 补类型
- 给 store 建模

### 第 7 周以后

- 条件类型
- 映射类型
- `infer`
- 高级泛型封装

---

## 11. 最适合前端开发者的学习方法

### 三遍学习法

#### 第一遍：看概念

只解决“这是什么、解决什么问题”。

#### 第二遍：手写 demo

例如：

```ts
function identity<T>(value: T): T {
  return value
}
```

```ts
type ApiResponse<T> = {
  code: number
  message: string
  data: T
}
```

```ts
function getValue<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}
```

#### 第三遍：改真实项目

例如把旧 JS 改造成：

- 类型化接口层
- 类型化组件参数
- 类型化工具函数
- 类型化状态管理

这一步最关键。

---

## 12. 前端开发者最该优先掌握的 12 个点

如果你时间有限，优先把下面这些打透：

1. 基本类型
2. 对象类型
3. 函数类型
4. 联合类型
5. 类型缩小
6. `type` / `interface`
7. 泛型
8. `keyof`
9. `typeof`
10. `Promise<T>`
11. 工具类型
12. `tsconfig + strict`

把这 12 个掌握好，前端 TS 已经能覆盖绝大多数场景。

---

## 13. 学习中最容易踩的坑

### 坑 1：一开始就学高级类型

结果往往是越学越抽象，越学越挫败。

### 坑 2：`any` 用太多

`any` 太多，TS 的保护价值会快速下降。

### 坑 3：只看语法，不改项目

TS 是强实践型技能，不落到真实代码里很难真正掌握。

### 坑 4：到处手写类型，不会利用推断

TS 的优势之一就是类型推断，不需要把每个变量都硬标一遍。

### 坑 5：不会看报错

很多 TS 能力，其实就是：

- 看懂报错
- 找到不一致的地方
- 判断该缩小、约束，还是重构结构

---

## 14. 每天该怎么学

最推荐的节奏是：

> 每天 1 个知识点 + 1 个小 demo + 1 次真实代码改造

### 示例节奏

#### 第一天

- 学：基本类型
- 练：给用户对象和函数参数加类型

#### 第二天

- 学：联合类型
- 练：给状态字段定义 `'loading' | 'success' | 'error'`

#### 第三天

- 学：泛型
- 练：封装 `ApiResponse<T>`

#### 第四天

- 学：`keyof`
- 练：写 `getValue(obj, key)`

#### 第五天

- 学：`tsconfig`
- 练：自己建一个 TS 小项目

---

## 15. 最后的学习建议

如果你已经会 JavaScript，学 TypeScript 最优路径不是：

“先背语法，再做题，再研究高级黑魔法”

而是：

“先理解 TS 的作用，再用它建模业务数据，再把它用进真实项目，最后再学高级抽象”

可以把整条路线记成一句话：

> JS 基础 -> 基础类型 -> 业务建模 -> 泛型与推断 -> 工程化配置 -> 前端项目实战 -> 高级类型拔高

---

## 16. 下一步怎么继续

如果你准备继续往下学，推荐下一步直接做这两件事：

1. 按这份手册先完成阶段 0 到阶段 3
2. 立刻挑一个真实前端项目，把请求层、表单、表格、组件参数逐步类型化

如果你愿意，下一版可以继续扩展成：

- `TypeScript 30 天学习计划`
- `Vue 3 + TypeScript 实战手册`
- `从 JavaScript 项目迁移到 TypeScript 的改造清单`
