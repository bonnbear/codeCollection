# Vue 3 + TypeScript 实战手册

这是一份给前端开发者准备的 Vue 3 + TypeScript 实战手册。

它不追求把所有 TS 语法讲全，而是聚焦一个更实用的目标：

> 让你能在 Vue 3 项目里稳定地写 TS，尤其是组件、接口层、表单、表格、状态和工具函数这些高频场景。

如果你已经会 JavaScript，也写过 Vue 3，那么这份手册最适合你的阅读方式不是“按定义背诵”，而是边看边把里面的类型模式迁移到真实项目里。

---

## 1. 学 Vue 3 + TS，到底在学什么

很多人以为“Vue 3 + TS”就是：

- 在变量后面加 `: string`
- 在接口上写几个 `type`
- 把 `.js` 改成 `.ts`

这只是表层。

真正的实战目标是这几件事：

1. 给组件输入和输出建立清晰边界
2. 给接口返回数据建立稳定结构
3. 给表单、表格、配置对象建立可维护的数据模型
4. 让编辑器提示更准，重构更安全
5. 让多人协作时更容易发现数据结构错误

在 Vue 项目里，TS 最有价值的地方通常不是“高级类型炫技”，而是这几个高频区域：

- `props`
- `emits`
- `ref`
- `reactive`
- 接口响应
- 列表和表单数据
- 通用组件
- 工具函数

---

## 2. 最重要的心法

先记住一句话：

> 在 Vue 里写 TypeScript，本质是在给“组件边界”和“业务数据”建模。

所以正确顺序通常不是：

先写组件逻辑 -> 最后补几个类型

而是：

先想清楚数据长什么样 -> 再写组件 -> 再让逻辑跟着类型约束走

这会让你从“写完再补漏洞”，变成“写的时候就不容易出漏洞”。

---

## 3. Vue 3 项目里最常见的 TS 使用场景

你几乎每天都会遇到这些：

1. 给组件 `props` 写类型
2. 给组件 `emits` 写类型
3. 给 `ref` 和 `reactive` 写类型
4. 给接口层写 `ApiResponse<T>`
5. 给表单对象写类型
6. 给表格数据和列配置写类型
7. 给状态枚举写联合类型
8. 给工具函数写泛型

如果把这些掌握了，Vue 3 项目里的 TS 基本就进入实用阶段了。

---

## 4. 组件里的基础类型写法

这一节先从最常用的组件内数据开始。

### 4.1 普通变量

```ts
const title: string = '用户管理'
const count: number = 0
const loading: boolean = false
```

很多时候其实不需要全写，因为 TS 会推断：

```ts
const title = '用户管理'
const count = 0
const loading = false
```

经验原则：

- 本地简单变量，优先交给推断
- 公共结构、函数边界、组件边界，优先显式标注

### 4.2 对象类型

```ts
type User = {
  id: number
  name: string
  phone?: string
  role: 'admin' | 'editor' | 'visitor'
}
```

这里有几个高频点：

- `phone?` 表示可选属性
- `role` 用字面量联合类型约束枚举值
- 业务对象优先先建模，再进组件

### 4.3 数组类型

```ts
const userList: User[] = []
```

或者：

```ts
const userList = ref<User[]>([])
```

---

## 5. `ref` 和 `reactive` 怎么写类型

这是 Vue 3 + TS 最常见的实战问题之一。

### 5.1 `ref` 基础写法

```ts
import { ref } from 'vue'

const keyword = ref<string>('')
const page = ref<number>(1)
const loading = ref<boolean>(false)
```

如果初始值已经足够明确，也可以不写：

```ts
const keyword = ref('')
const page = ref(1)
const loading = ref(false)
```

### 5.2 `ref` 处理空值

很多真实项目里，数据一开始为空，拿到接口后才赋值。

```ts
type UserDetail = {
  id: number
  name: string
  email: string
}

const userDetail = ref<UserDetail | null>(null)
```

为什么这里要写 `| null`？

因为真实状态就是：

- 初始阶段没有详情数据
- 请求回来之后才有数据

类型应该反映真实业务状态，而不是假装“一开始就一定有”。

### 5.3 `reactive` 写法

```ts
import { reactive } from 'vue'

type SearchForm = {
  keyword: string
  status: 'all' | 'enabled' | 'disabled'
  page: number
  pageSize: number
}

const searchForm = reactive<SearchForm>({
  keyword: '',
  status: 'all',
  page: 1,
  pageSize: 10
})
```

### 5.4 `ref` 和 `reactive` 的实战建议

可以先记这个简单原则：

- 基本类型、可能整体替换的值，常用 `ref`
- 结构稳定的表单对象、查询对象，常用 `reactive`

但不要把它当成绝对规则，核心还是看业务是否需要“整体替换”。

---

## 6. Props 怎么写类型

组件类型边界最重要的一层就是 `props`。

### 6.1 基础思路

先定义结构，再给组件用。

```ts
type UserCardProps = {
  name: string
  age?: number
  status: 'online' | 'offline'
}
```

### 6.2 在 Vue 3 里使用

如果你用的是 `script setup`，常见写法是：

```ts
type UserCardProps = {
  name: string
  age?: number
  status: 'online' | 'offline'
}

const props = defineProps<UserCardProps>()
```

### 6.3 带默认值时的思路

如果某些值有默认值，你需要分清楚两件事：

1. 调用组件的人可不可以不传
2. 组件内部最终拿到的一定是不是有值

对外可不传，那它就是可选属性。

```ts
type ButtonProps = {
  text: string
  type?: 'primary' | 'default' | 'danger'
  disabled?: boolean
}
```

### 6.4 什么情况下 props 最值得约束

高优先级是这些：

- 状态值
- 配置项
- 回调函数
- 列表数据
- 表单 schema
- 组件模式值，比如 `size`、`type`、`variant`

因为这些地方一旦写错，运行时 bug 很常见。

---

## 7. Emits 怎么写类型

Vue 组件不只是接收 `props`，还会向外抛事件。事件如果不写类型，很容易出现这些问题：

- 事件名写错
- 事件参数结构不一致
- 父组件不知道事件到底会带什么

### 7.1 基础写法

```ts
type SubmitPayload = {
  id: number
  name: string
}

const emit = defineEmits<{
  submit: [payload: SubmitPayload]
  cancel: []
}>()
```

使用时：

```ts
emit('submit', {
  id: 1,
  name: 'Tom'
})

emit('cancel')
```

### 7.2 为什么 emits 值得认真写

因为它本质上是在定义“组件对外 API”。

如果一个组件对外暴露了很多事件，但事件名和参数都没有明确约束，后续重构会非常痛苦。

---

## 8. `computed`、`watch`、事件函数怎么写

### 8.1 `computed`

```ts
const userCount = computed<number>(() => userList.value.length)
```

多数情况下也可以不手写泛型，因为 TS 能推断：

```ts
const userCount = computed(() => userList.value.length)
```

### 8.2 事件处理函数

```ts
function handleDelete(id: number): void {
  console.log('delete', id)
}
```

### 8.3 异步函数

```ts
async function loadUsers(): Promise<void> {
  loading.value = true

  try {
    const res = await fetchUserList({
      page: 1,
      pageSize: 10
    })
    userList.value = res.data.list
  } finally {
    loading.value = false
  }
}
```

经验上，组件里的异步函数返回值很适合显式写成 `Promise<void>` 或具体结果类型。

---

## 9. 接口层是 Vue + TS 最该先建模的地方

如果你只想先做一件最划算的事，那就是先把接口层类型化。

### 9.1 统一响应结构

```ts
type ApiResponse<T> = {
  code: number
  message: string
  data: T
}
```

### 9.2 列表分页结构

```ts
type PageResult<T> = {
  list: T[]
  total: number
  page: number
  pageSize: number
}
```

### 9.3 业务对象

```ts
type User = {
  id: number
  name: string
  email: string
  status: 'enabled' | 'disabled'
  createdAt: string
}
```

### 9.4 请求参数

```ts
type UserListParams = {
  page: number
  pageSize: number
  keyword?: string
  status?: 'enabled' | 'disabled'
}
```

### 9.5 最终接口类型

```ts
type UserListResponse = ApiResponse<PageResult<User>>
```

### 9.6 示例：请求函数

```ts
async function fetchUserList(params: UserListParams): Promise<UserListResponse> {
  const res = await axios.get('/api/users', { params })
  return res.data
}
```

这套模式非常值得优先在项目里建立，因为它会立刻影响：

- 接口调用提示
- 列表赋值安全性
- 表单回填
- 表格列渲染
- 错误排查效率

---

## 10. 表单类型怎么建

表单是 Vue 项目里最典型、最值得类型化的地方。

### 10.1 表单对象类型

```ts
type UserForm = {
  name: string
  email: string
  age: number | null
  role: 'admin' | 'editor' | 'visitor'
  enabled: boolean
}

const formData = reactive<UserForm>({
  name: '',
  email: '',
  age: null,
  role: 'visitor',
  enabled: true
})
```

### 10.2 为什么表单特别适合用联合类型

比如状态、角色、类型值，都适合直接限制死：

```ts
type Role = 'admin' | 'editor' | 'visitor'
```

好处是：

- 组件里不会随手塞入非法值
- 选项值和接口值更统一
- 重构时更容易发现不一致

### 10.3 编辑态和创建态

真实项目里，经常会出现：

- 新建时部分字段为空
- 编辑时从后端拉回完整数据

这时不要偷懒全写成 `any`，而是明确状态差异。

```ts
type UserFormDraft = {
  name: string
  email: string
  age: number | null
}
```

如果确实存在“拿到前为空”的情况，可以用：

```ts
const currentEditId = ref<number | null>(null)
```

---

## 11. 表格和列表怎么写类型

表格是后台系统里 TS 价值很高的区域。

### 11.1 列表数据

```ts
type TableRow = {
  id: number
  name: string
  status: 'enabled' | 'disabled'
  createdAt: string
}

const tableData = ref<TableRow[]>([])
```

### 11.2 表格列配置

如果你自己封装表格列配置，很适合用泛型。

```ts
type TableColumn<T> = {
  key: keyof T
  title: string
  width?: number
}
```

```ts
const columns: TableColumn<TableRow>[] = [
  { key: 'name', title: '姓名' },
  { key: 'status', title: '状态' },
  { key: 'createdAt', title: '创建时间', width: 180 }
]
```

这样最大的好处是：当你写错字段名时，编辑器会直接报错。

---

## 12. 状态值、模式值、配置值，优先用联合类型

Vue 项目里经常会出现这类值：

- tab 类型
- dialog 模式
- loading 状态
- 角色值
- 订单状态
- 主题类型

这些特别适合用字面量联合类型，而不是裸字符串。

```ts
type DialogMode = 'create' | 'edit' | 'detail'

const dialogMode = ref<DialogMode>('create')
```

```ts
type LoadStatus = 'idle' | 'loading' | 'success' | 'error'

const loadStatus = ref<LoadStatus>('idle')
```

这种写法会比“满项目都是字符串常量”稳定很多。

---

## 13. 工具函数怎么写得更像样

前端项目里，很多通用函数其实很适合用 TS 提升复用性。

### 13.1 根据 key 取值

```ts
function getValue<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}
```

### 13.2 按 id 建字典

```ts
function mapById<T extends { id: number | string }>(list: T[]): Record<string, T> {
  return list.reduce((acc, item) => {
    acc[String(item.id)] = item
    return acc
  }, {} as Record<string, T>)
}
```

### 13.3 通用请求封装

```ts
type RequestState<T> = {
  loading: boolean
  data: T | null
  error: string | null
}
```

这里的重点不只是“写泛型”，而是把状态真实建模出来。

---

## 14. 在 Vue 项目里，什么时候该显式写类型

这件事很多人容易走极端。

一种极端是完全不写，另一种极端是到处都写。

更实用的原则是：

### 推荐显式写类型的地方

- `props`
- `emits`
- 公共对象结构
- 接口响应
- 请求参数
- 返回值不明显的函数
- `ref<T | null>`
- 泛型工具函数

### 通常可以交给推断的地方

- 简单局部变量
- 一眼就能看出类型的常量
- 简单 `computed`
- 很短的组件内部中间变量

目标不是“类型写满”，而是“该约束的地方有约束”。

---

## 15. Vue 3 + TS 最常见的几个坑

### 坑 1：把所有空状态都忽略掉

比如接口详情页一开始肯定没数据，但代码里却把它写成永远存在：

```ts
const detail = ref<UserDetail>({} as UserDetail)
```

这种写法短期看省事，长期看很容易埋雷。

更稳妥的做法通常是：

```ts
const detail = ref<UserDetail | null>(null)
```

### 坑 2：组件事件没有类型

这样父组件就会越来越难维护，不知道事件名是否正确、参数结构是否统一。

### 坑 3：接口层没有统一响应模型

结果是每个页面自己猜 `res.data` 长什么样，久而久之项目会非常混乱。

### 坑 4：到处 `any`

尤其是在表单、表格和请求结果里大量用 `any`，TS 的收益会迅速下降。

### 坑 5：状态值全用裸字符串

像 `'loading'`、`'success'`、`'edit'`、`'create'` 这种值，如果散落在项目里，会越来越难维护。

---

## 16. 一个完整的小型页面建模示例

下面给一个“用户列表页”的简化建模示例。

### 16.1 类型定义

```ts
type UserStatus = 'enabled' | 'disabled'

type User = {
  id: number
  name: string
  email: string
  status: UserStatus
  createdAt: string
}

type UserListParams = {
  page: number
  pageSize: number
  keyword?: string
  status?: UserStatus
}

type PageResult<T> = {
  list: T[]
  total: number
  page: number
  pageSize: number
}

type ApiResponse<T> = {
  code: number
  message: string
  data: T
}

type UserListResponse = ApiResponse<PageResult<User>>
```

### 16.2 页面状态

```ts
const loading = ref(false)
const tableData = ref<User[]>([])
const total = ref(0)

const queryForm = reactive<UserListParams>({
  page: 1,
  pageSize: 10,
  keyword: '',
  status: undefined
})
```

### 16.3 请求函数

```ts
async function fetchUserList(params: UserListParams): Promise<UserListResponse> {
  const res = await axios.get('/api/users', { params })
  return res.data
}
```

### 16.4 加载列表

```ts
async function loadTableData(): Promise<void> {
  loading.value = true

  try {
    const res = await fetchUserList(queryForm)
    tableData.value = res.data.list
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}
```

这套结构的价值在于：

- `queryForm` 的字段不会乱写
- `tableData` 的行结构是稳定的
- `res.data.list` 和 `res.data.total` 都有明确提示
- 后续抽离成 composable 也会更顺

---

## 17. 最适合你的项目改造顺序

如果你要把一个 Vue 3 项目逐步变得更“TS 化”，建议按这个顺序做。

### 第一步：先改接口层

先统一这些：

- `ApiResponse<T>`
- 分页结构
- 常见业务对象
- 请求参数对象

### 第二步：再改页面状态

先给这些补类型：

- 列表数据
- 表单对象
- 详情对象
- 加载状态
- 模式值

### 第三步：再改组件边界

重点处理：

- `props`
- `emits`
- 通用组件配置

### 第四步：最后再处理公共工具和高级抽象

例如：

- 表格列泛型
- 通用 hooks
- 工具函数泛型
- 条件类型和映射类型

这个顺序比“先改一堆高级泛型”有效得多。

---

## 18. 推荐你优先练的 5 个 Vue + TS 场景

### 场景 1：用户管理列表页

练这些：

- 查询表单
- 分页请求
- 表格数据
- 弹窗编辑

### 场景 2：详情页

练这些：

- `ref<T | null>`
- 加载状态
- 接口返回对象
- 条件渲染

### 场景 3：弹窗表单组件

练这些：

- `props`
- `emits`
- 表单类型
- 提交 payload 类型

### 场景 4：通用表格组件

练这些：

- 列配置类型
- 行数据泛型
- 插槽相关数据结构

### 场景 5：请求 Hook / composable

练这些：

- 泛型
- 请求状态建模
- 错误处理

---

## 19. 一套很实用的学习节奏

推荐你按“概念 -> demo -> 项目改造”三步走。

### 第一天

- 学：`ref` 和 `reactive` 类型
- 练：给查询表单和列表数据加类型

### 第二天

- 学：`props` 和 `emits`
- 练：写一个弹窗组件的输入输出类型

### 第三天

- 学：接口层泛型
- 练：封装 `ApiResponse<T>` 和分页结构

### 第四天

- 学：联合类型
- 练：把状态值和模式值收敛成联合类型

### 第五天

- 学：泛型工具函数
- 练：写 `getValue`、`mapById`

### 第六天开始

把这些东西逐步用进真实页面，而不是只写 demo。

---

## 20. 最后的建议

学 Vue 3 + TypeScript，最重要的不是一开始把类型系统学得多深，而是先把这些高频场景打透：

1. `ref`
2. `reactive`
3. `props`
4. `emits`
5. 接口响应
6. 表单对象
7. 表格数据
8. 联合类型状态值
9. 泛型工具函数

只要这几块真的会了，你在真实项目里就已经很能打。

可以把整条实战路径记成一句话：

> 先类型化接口层，再类型化页面状态，再类型化组件边界，最后再做可复用抽象。

---

## 21. 下一步可以继续扩展什么

如果你还想继续往下整理，可以在这份手册基础上继续扩成：

- `Vue 3 + TypeScript 30 天练习计划`
- `Vue 3 组件 Props / Emits 专项手册`
- `后台管理系统 TS 类型建模模板`
- `从 Vue 3 JavaScript 项目迁移到 TypeScript 的改造清单`
