---
title: TypeScript泛型
date: 2026-02-20
wikiLinks:

---

# TypeScript泛型：提升代码复用性与类型安全

## 一、引言

在现代前端开发中，TypeScript 已经成为构建大型、可维护应用的首选语言。其强大的类型系统不仅能在开发阶段捕获潜在错误，还能提供卓越的代码智能提示。而在 TypeScript 的类型系统中，**泛型**无疑是最强大、最核心的特性之一。

### 为什么需要泛型？

想象一下，你需要编写一个函数，它能够返回传入的任何类型的值。在没有泛型的情况下，你可能会这样写：

```typescript
function identity(value: any): any {
    return value;
}

const result = identity(42); // result 的类型是 any
```

这里使用了 `any` 类型，虽然代码能运行，但我们完全失去了类型安全。编译器不知道 `result` 的具体类型，后续操作中很容易出现类型错误。

### 泛型的核心价值

泛型允许我们创建可重用的组件，这些组件能够处理多种类型，同时保持完整的类型信息。它实现了：
- **类型安全**：在编译时捕获类型错误
- **代码复用**：编写一次，适用于多种类型
- **抽象能力**：创建灵活且类型安全的抽象层

本文将从基础概念出发，逐步深入，帮助你全面掌握 TypeScript 泛型的各个方面，并学会在实际项目中有效应用。

## 二、泛型基础概念

### 什么是泛型？

泛型（Generics）是程序设计语言的一种特性，它允许在定义函数、接口或类时**不预先指定具体的类型**，而在使用时再指定类型。这种特性被称为**参数化类型**。

### 泛型与 any 的本质区别

让我们通过对比来理解两者的差异：

```typescript
// 使用 any - 失去类型安全
function identityAny(value: any): any {
    return value;
}

const strAny = identityAny("hello");
strAny.toFixed(2); // 编译时不会报错，但运行时会出错！

// 使用泛型 - 保持类型安全
function identity<T>(value: T): T {
    return value;
}

const str = identity("hello");
str.toFixed(2); // 编译时报错：Property 'toFixed' does not exist on type 'string'

const num = identity(42);
num.toFixed(2); // 正确：num 是 number 类型
```

### 第一个泛型示例

```typescript
// T 是类型参数，可以理解为类型的占位符
function echo<T>(arg: T): T {
    return arg;
}

// 使用时明确指定类型
let output1 = echo<string>("Hello");
// 或让 TypeScript 自动推断
let output2 = echo(42); // output2 被推断为 number 类型

console.log(output1); // "Hello"
console.log(output2); // 42
```

在这个例子中，`T` 是一个类型变量，它在函数被调用时被具体的类型替换。

## 三、泛型函数详解

### 基本语法与声明

泛型函数的基本语法是在函数名后面添加 `<T>`，其中 `T` 可以是任何有效的标识符：

```typescript
// 单个类型参数
function logAndReturn<T>(value: T): T {
    console.log(value);
    return value;
}

// 多个类型参数
function pair<T, U>(first: T, second: U): [T, U] {
    return [first, second];
}

const result = pair("age", 25); // result 类型为 [string, number]
```

### 类型推断

TypeScript 编译器非常智能，它通常能根据传入的参数自动推断泛型类型：

```typescript
function createArray<T>(length: number, value: T): T[] {
    return Array(length).fill(value);
}

// 自动推断 T 为 string
const stringArray = createArray(3, "hello");
// 自动推断 T 为 number
const numberArray = createArray(3, 42);
```

### 多个类型参数

当函数需要处理多个可能不同的类型时，可以使用多个类型参数：

```typescript
function merge<T, U>(obj1: T, obj2: U): T & U {
    return { ...obj1, ...obj2 };
}

const user = { name: "Alice" };
const job = { title: "Developer" };

const merged = merge(user, job);
// merged 类型为 { name: string } & { title: string }
```

### 泛型约束

有时我们需要限制泛型参数的类型范围，这时可以使用 `extends` 关键字：

```typescript
// 约束 T 必须包含 length 属性
interface Lengthwise {
    length: number;
}

function logLength<T extends Lengthwise>(arg: T): T {
    console.log(arg.length);
    return arg;
}

logLength("hello"); // 正确：字符串有 length 属性
logLength([1, 2, 3]); // 正确：数组有 length 属性
logLength(42); // 错误：数字没有 length 属性
```

更复杂的约束示例：

```typescript
// 约束 U 必须是 T 的键之一
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key];
}

const person = { name: "Alice", age: 30 };
getProperty(person, "name"); // 正确
getProperty(person, "gender"); // 错误：'gender' 不是 person 的键
```

## 四、泛型接口与泛型类

### 泛型接口

泛型接口允许我们创建可重用的接口模板：

```typescript
// 基本泛型接口
interface Response<T> {
    success: boolean;
    data: T;
    message?: string;
}

// 使用泛型接口
const userResponse: Response<User> = {
    success: true,
    data: { id: 1, name: "Alice" }
};

const listResponse: Response<User[]> = {
    success: true,
    data: [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" }
    ]
};

// 泛型函数接口
interface Transformer<T, U> {
    (input: T): U;
}

const stringToNumber: Transformer<string, number> = 
    (str) => parseFloat(str);
```

### 泛型类

泛型类允许在类级别使用类型参数：

```typescript
class Stack<T> {
    private items: T[] = [];
    
    push(item: T): void {
        this.items.push(item);
    }
    
    pop(): T | undefined {
        return this.items.pop();
    }
    
    peek(): T | undefined {
        return this.items[this.items.length - 1];
    }
    
    isEmpty(): boolean {
        return this.items.length === 0;
    }
}

// 使用泛型类
const numberStack = new Stack<number>();
numberStack.push(1);
numberStack.push(2);
console.log(numberStack.pop()); // 2

const stringStack = new Stack<string>();
stringStack.push("hello");
stringStack.push("world");
```

### 静态成员与泛型的注意事项

重要：**泛型类型参数不能在静态成员中使用**，因为静态成员属于类本身，而不是类的实例。

```typescript
class Container<T> {
    // 实例属性 - 可以使用 T
    value: T;
    
    constructor(value: T) {
        this.value = value;
    }
    
    // 实例方法 - 可以使用 T
    getValue(): T {
        return this.value;
    }
    
    // 静态方法 - 不能使用类的泛型参数 T
    // static create<U>(value: U): Container<U> {  // 正确：使用新的泛型参数
    static create(value: any): Container<any> {  // 简化示例
        return new Container(value);
    }
}
```

### 实际案例：构建可复用的数据容器

```typescript
interface Identifiable {
    id: number | string;
}

class Repository<T extends Identifiable> {
    private items: Map<T['id'], T> = new Map();
    
    add(item: T): void {
        this.items.set(item.id, item);
    }
    
    get(id: T['id']): T | undefined {
        return this.items.get(id);
    }
    
    getAll(): T[] {
        return Array.from(this.items.values());
    }
    
    update(id: T['id'], updates: Partial<T>): boolean {
        const item = this.items.get(id);
        if (!item) return false;
        
        this.items.set(id, { ...item, ...updates });
        return true;
    }
}

// 使用示例
interface Product extends Identifiable {
    id: number;
    name: string;
    price: number;
}

const productRepo = new Repository<Product>();
productRepo.add({ id: 1, name: "Laptop", price: 999 });
productRepo.add({ id: 2, name: "Mouse", price: 25 });

console.log(productRepo.get(1)); // 获取 ID 为 1 的产品
```

## 五、高级泛型技巧

### 泛型约束与条件类型

条件类型允许我们根据条件选择不同的类型：

```typescript
// 基础条件类型
type IsString<T> = T extends string ? true : false;

type A = IsString<string>; // true
type B = IsString<number>; // false

// 提取数组元素类型
type ElementType<T> = T extends (infer U)[] ? U : never;

type StrArrayElement = ElementType<string[]>; // string
type NumArrayElement = ElementType<number[]>; // number

// 提取函数返回类型
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

type FuncReturn = ReturnType<() => string>; // string
```

### 使用 keyof 进行类型映射

`keyof` 操作符可以获取类型的所有键，结合泛型可以实现强大的类型安全操作：

```typescript
// 将对象的所有属性变为可选
type Partial<T> = {
    [P in keyof T]?: T[P];
};

// 将对象的所有属性变为只读
type Readonly<T> = {
    readonly [P in keyof T]: T[P];
};

// 实际使用
interface User {
    id: number;
    name: string;
    email: string;
}

type PartialUser = Partial<User>;
// 等价于 { id?: number; name?: string; email?: string; }

type ReadonlyUser = Readonly<User>;
// 等价于 { readonly id: number; readonly name: string; readonly email: string; }
```

### 泛型默认值

TypeScript 4.0+ 支持为泛型参数提供默认值，这提高了 API 的友好度：

```typescript
// 带有默认值的泛型接口
interface PaginatedResponse<T = any> {
    data: T[];
    page: number;
    total: number;
    pageSize: number;
}

// 使用默认值
const response1: PaginatedResponse = {
    data: [1, 2, 3],
    page: 1,
    total: 100,
    pageSize: 10
};

// 指定具体类型
const response2: PaginatedResponse<User> = {
    data: [{ id: 1, name: "Alice" }],
    page: 1,
    total: 1,
    pageSize: 10
};

// 带有默认值的泛型函数
function createContainer<T = string>(value: T): { value: T } {
    return { value };
}

const container1 = createContainer("hello"); // T 推断为 string
const container2 = createContainer(42); // T 推断为 number
const container3 = createContainer(); // T 使用默认值 string，但需要传参
```

### 泛型与联合类型、交叉类型的结合

```typescript
// 泛型与联合类型
type Nullable<T> = T | null | undefined;

function safeAccess<T>(obj: T, key: keyof T): Nullable<T[keyof T]> {
    return obj[key] ?? null;
}

// 泛型与交叉类型
function mergeWithDefaults<T, D>(obj: T, defaults: D): T & D {
    return { ...defaults, ...obj };
}

interface BaseConfig {
    timeout: number;
    retries: number;
}

interface UserConfig {
    endpoint: string;
    apiKey?: string;
}

const config = mergeWithDefaults<UserConfig, BaseConfig>(
    { endpoint: "/api/users" },
    { timeout: 5000, retries: 3 }
);
// config 类型为 UserConfig & BaseConfig
```

## 六、泛型在实战中的应用

### 泛型在 React 组件中的应用

```typescript
import React, { useState, useEffect } from 'react';

// 泛型组件 Props
interface ListProps<T> {
    items: T[];
    renderItem: (item: T) => React.ReactNode;
    keyExtractor: (item: T) => string | number;
}

// 泛型函数组件
function GenericList<T>({ 
    items, 
    renderItem, 
    keyExtractor 
}: ListProps<T>) {
    return (
        <div>
            {items.map(item => (
                <div key={keyExtractor(item)}>
                    {renderItem(item)}
                </div>
            ))}
        </div>
    );
}

// 使用示例
interface User {
    id: number;
    name: string;
    email: string;
}

const UserList: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    
    return (
        <GenericList
            items={users}
            renderItem={(user) => (
                <div>
                    <h3>{user.name}</h3>
                    <p>{user.email}</p>
                </div>
            )}
            keyExtractor={(user) => user.id}
        />
    );
};
```

### API 请求层的泛型封装

```typescript
// 基础 API 响应类型
interface ApiResponse<T> {
    data: T;
    status: number;
    message: string;
}

// 分页响应类型
interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

// 泛型 API 客户端
class ApiClient {
    private baseUrl: string;
    
    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }
    
    // 泛型 GET 请求
    async get<T>(endpoint: string): Promise<ApiResponse<T>> {
        const response = await fetch(`${this.baseUrl}${endpoint}`);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Request failed');
        }
        
        return {
            data: result.data,
            status: response.status,
            message: result.message
        };
    }
    
    // 泛型 POST 请求
    async post<T, U>(endpoint: string, data: U): Promise<ApiResponse<T>> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Request failed');
        }
        
        return {
            data: result.data,
            status: response.status,
            message: result.message
        };
    }
}

// 使用示例
interface User {
    id: number;
    name: string;
    email: string;
}

const apiClient = new ApiClient('https://api.example.com');

// 类型安全的 API 调用
async function fetchUsers() {
    try {
        const response = await apiClient.get<PaginatedResponse<User>>('/users');
        console.log(response.data.items); // User[] 类型
        console.log(response.data.total); // number 类型
    } catch (error) {
        console.error('Failed to fetch users:', error);
    }
}
```

### 工具类型中的泛型实现

TypeScript 内置了许多基于泛型的工具类型：

```typescript
// Partial<T> - 所有属性变为可选
interface Todo {
    title: string;
    description: string;
    completed: boolean;
}

type PartialTodo = Partial<Todo>;
// 等价于 { title?: string; description?: string; completed?: boolean; }

// Required<T> - 所有属性变为必需
type RequiredTodo = Required<PartialTodo>;

// Readonly<T> - 所有属性变为只读
type ReadonlyTodo = Readonly<Todo>;

// Pick<T, K> - 从 T 中选取部分属性
type TodoPreview = Pick<Todo, 'title' | 'completed'>;
// 等价于 { title: string; completed: boolean; }

// Omit<T, K> - 从 T 中排除部分属性
type TodoWithoutDescription = Omit<Todo, 'description'>;
// 等价于 { title: string; completed: boolean; }

// Record<K, T> - 构造键类型为 K，值类型为 T 的对象
type PageInfo = Record<'home' | 'about' | 'contact', { title: string; url: string }>;
// 等价于 { home: { title: string; url: string }; about: ...; contact: ...; }

// 自定义工具类型
type Nullable<T> = T | null | undefined;
type Maybe<T> = T | undefined;
type NonEmptyArray<T> = [T, ...T[]];
type AtLeastOne<T, K extends keyof T = keyof T> = 
    Pick<T, K> & Partial<Omit<T, K>>;
```

### 常见设计模式中的泛型应用

#### 工厂模式
```typescript
interface Animal {
    name: string;
    speak(): string;
}

class Dog implements Animal {
    constructor(public name: string) {}
    
    speak(): string {
        return "Woof!";
    }
}

class Cat implements Animal {
    constructor(public name: string) {}
    
    speak(): string {
        return "Meow!";
    }
}

// 泛型工厂函数
function createAnimal<T extends Animal>(
    AnimalClass: new (name: string) => T,
    name: string
): T {
    return new AnimalClass(name);
}

const dog = createAnimal(Dog, "Buddy");
const cat = createAnimal(Cat, "Whiskers");
```

#### 策略模式
```typescript
// 泛型策略接口
interface ValidationStrategy<T> {
    validate(value: T): boolean;
}

// 具体策略实现
class EmailValidation implements ValidationStrategy<string> {
    validate(email: string): boolean {
        return /^[^\s@]+@[