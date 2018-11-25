# Python装饰器 与 Ruby实现

## Python中的装饰器
装饰器是Python中一个很重要的特性。有两个好处：
- DRY
- 组合更方便

创建了一个函数，然后想为其添加性能监控，计数，加日志等额外的功能，便可以使用装饰器（性能监控装饰器， 计数装饰器，加日志装饰器），而且，这些装饰器也可以供别的有需要的函数使用，且可以自由组合。

关键点：
- Python中函数也是一个`对象`。a_function_to_decorate是对象引用，a_function_to_decorate()是执行。
- 装饰器本身也就一个函数而已。
- 装饰器函数在脚本载入的时候就执行了，相当于对原有函数的重写。
- 可以在函数中定义另一个函数，供使用或者返回，存在于函数内部。

```python
def my_shiny_new_decorator(a_function_to_decorate):
    def wrapper():
        print("Before the function runs")
        a_function_to_decorate()
        print("After the function runs")

	  return wrapper

@my_shiny_new_decorator
def a_stand_alone_function():
    print("I am a stand alone function, don't you dare modify me")


# 相当于方法重写
a_stand_alone_function = my_shiny_new_decorator(a_stand_alone_function)
a_stand_alone_function()

# @只是Python添加的一个语法糖

```

NOTE:
上面只是简单装饰器，复杂一点的装饰器还可以接收参数。可以思考一下如何处理？

---

## Ruby实现Python中类似的装饰器
### Ruby与Python的几个不同点
```ruby
class Person
  def talk
    def hehe
      p "hehe..."
    end

    p "talking..."
  end
end

person = Person.new
person.talk
person.talk()

person_b = Person.new
person_b.hehe
```

- 方法调用时，有没有括号是一样的。Ruby 中的methods并不是一个对象。
- 定义了`hehe`，其实变成了实例方法，对于Person类的实例都可见。

### 实现
那么对于Ruby来讲，我该如何去实现Python类似的装饰器呢？

实现的思路：
- 当加载一个脚本Ruby文件时，是一行一行执行，可以使用类宏的方式。
- 本质上，添加装饰器，就是重写用户定义的methods。
- 怎么做到自动重写？配合Ruby中一些钩子方法即可。

#### 使用 lambda or Proc
一开始我想，我可以使用 `lambda or Proc` 来代替内部函数的定义， 并将其返回。

```python
def my_shiny_new_decorator(a_function_to_decorate):
    def wrapper():
        print("Before the function runs")
        a_function_to_decorate()
        print("After the function runs")

    return wrapper
```

可以替换成：

```ruby
def my_shiny_new_decorator(a_function_to_decorate)
  wrapper = Proc.new do
    print("Before the function runs")
    a_function_to_decorate()
    print("After the function runs")
  end

  return wrapper
end

def a_stand_alone_function()
  ...
end
```

但是，这样一来，要调用方法的时候，得变成`a_stand_alone_function.call()` ，这样就改变了原有使用方法。不太好。

#### 那就换种方式呗。
在装饰器方法里，接收一个block，用来表示原始方法，大概的格式如下：
```ruby
class Myclass
  extend MyDecorator

  # 这是装饰器
  def my_shiny_new_decorator
    p "Before the function runs"
    yield
    p "After the function runs"
  end

  wrap :my_shiny_new_decorator
  def a_stand_alone_function() # 这是原始方法
    p "I am a stand alone function, don't you dare modify me"
  end
end
```

现在的主要任务是如何实现 MyDecorator 模块的内容。
- `wrap :my_shiny_new_decorator`，Ruby脚本是按顺序执行的，这个类宏可以考虑使用一个栈的结构来实现，将`my_shiny_new_decorator`压进栈，再弹出，这样便可以保持顺序。

- `使用define_methond`来重新定义方法，把原有方法嵌入装饰器方法中。

```ruby
module MyDecorator
  # 钩子方法
  def method_added(method_name)
    unless decorator_methods.empty?
      decorator_method = decorator_methods.pop

      # 使用alias_method生成一个别名指向。
      new_method_name = "#{method_name}_without_decorator"
      alias_method(new_method_name, method_name)

      # 重写原来的方法
      define_method(method_name) do
        method(decorator_method).call do
          method(new_method_name).call
        end
      end
    end
  end

  def wrap(decorator)
    @decorator_methods << decorator
  end

  # 一个栈,用来存装饰方法
  def decorator_methods
    @decorator_methods ||= []
  end
end

Myclass.new.a_stand_alone_function
# "Before the function runs"
# "I am a stand alone function, don't you dare modify me"
# "After the function runs"
```

#### Python中，如何使装饰器可以接收参数？

在上面说了：
```python
@my_shiny_new_decorator
def a_stand_alone_function():
    pass

# 相当于方法重写
a_stand_alone_function = my_shiny_new_decorator(a_stand_alone_function)
```

需要实现的功能：
```python
@my_shiny_new_decorator(decorator_args1, decorator_args2)
def a_stand_alone_function():
    print("I am a stand alone function, don't you dare modify me")

# 相当于
a_stand_alone_function = my_shiny_new_decorator(decorator_args1, decorator_args2)(a_stand_alone_function)

# 上面说明啥？
说明my_shiny_new_decorator(decorator_args1, decorator_args2)返回一个 `接收一个function作为参数的函数` => 这不就是相当于原先的my_shiny_new_decorator？也就是说，需要新建一个函数，将原先my_shiny_new_decorator定为内部函数返回出来。
```

下面我们通过修改一些命名，来更加清晰地说明：
```python

def decorator_maker_with_arguments(decorator_args1, decorator_args2):
    print("args1....{}".format(decorator_args1))
    print("args2....{}".format(decorator_args2))

    # 原先的装饰器变为内部函数了
    def my_shiny_new_decorator(a_function_to_decorate):
        def wrapper():
            print("Before the function runs")
            a_function_to_decorate()
            print("After the function runs")
        return wrapper

    # 返回内部函数
    return my_shiny_new_decorator

@decorator_maker_with_arguments("red", "blue")
def a_stand_alone_function():
    print("I am a stand alone function, don't you dare modify me")

a_stand_alone_function()

# ouput
# args1....red
# args2....blue
# Before the function runs
# I am a stand alone function, don't you dare modify me
# After the function runs
```

#### 关于闭包
无论是Python ，还是Ruby关于装饰器的实现，都涉及到一个很重要的基础，那就是`闭包`。

什么叫做`闭包`?
> 简单来说，就是程序运行时，所带的一组相关绑定，可以穿越作用域。

#### 题外话：
- method(:my_method_name)，可以根据方法名获取到对应的方法来实现执行。
```ruby
ef dd(a, b)
  p a + b
end

haha = method(:dd)
haha.call(1, 2) # 3
```

## 参考文档
alias vs alias_method
- [Rails: alias 与 alias_method 的区别](http://lazybios.com/2015/11/alias-vs-aliasmethod/)

闭包:
- [What is the difference between a block, a proc, and a lambda in ruby? - Build, Break, Learn.]

block:
- [Mastering ruby blocks in less than 5 minutes - Mix & Go](https://mixandgo.com/blog/mastering-ruby-blocks-in-less-than-5-minutes)

method:
- [Ruby中的method方法 - 简书](https://www.jianshu.com/p/9b62743a22f7)

装饰器
- [Ruby 实现装饰器模式 - 简书](https://www.jianshu.com/p/4ad9111e71fc)
- [Python修饰器的函数式编程 | | 酷 壳 - CoolShell](https://coolshell.cn/articles/11265.html)
https://taizilongxu.gitbooks.io/stackoverflow-about-python/content/3/README.html

### GitHub上一些类似的实现

- [ruby_decorators/decorators.rb at master · wycats/ruby_decorators · GitHub](https://github.com/wycats/ruby_decorators/blob/master/decorators.rb) -- 这个是简单版
- [GitHub - fredwu/ruby_decorators: Ruby method decorators inspired by Python.](https://github.com/fredwu/ruby_decorators)
- [GitHub - michaelfairley/method_decorators: Python’s method decorators for Ruby](https://github.com/michaelfairley/method_decorators) -- 这个较为完整的版本
