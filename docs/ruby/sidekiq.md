# 分享之sidekiq

看过sidekiq源码的都说好。
架构明确，注释又多，而且基本都是短方法，阅读起来比较流畅。
真的挺好的。

```ruby
# launcher.rb
def heartbeat
  results = Sidekiq::CLI::PROCTITLES.map {|x| x.(self, to_data) }
  results.compact!
  $0 = results.join(' ')

  ❤
end

# sidekiq.rb
def self.❨╯°□°❩╯︵┻━┻
  puts "Calm down, yo."
end
```

## 注意点
一个后台任务的处理，无非就是把相关的参数存起来慢慢执行。几个点需要注意：
- 尽可能简单的参数。（考虑内存大小）
- 可能会失败重试，是否幂等。
- 是否涉及到并发。

这几个都是需要时刻考虑的地方。

## 处理过程
### 几个概念
1. Scheduled  poller => `Sidekiq::Scheduled::Poller`（拉取`retry：重试` 跟`schedule：延时`集合的任务推入队列）
2. worker manager => `Sidekiq::Manager`（管理多个处理的任务队列的Processor）

### 大致的思路
* 客户端将相关任务推入队列
* `Sidekiq::Scheduled::Poller`  拉取  `retry：重试` 跟`schedule：延时`集合的任务推入队列
* 启动多个Processor处理队列任务

```ruby
class HardWorker
  include Sidekiq::Worker
  def perform(name, count)
    # do something
  end
end

HardWorker.perform_async('bob', 5) # 异步
HardWorker.perform_in(5.minutes, 'bob', 5) # 延时异步
```

## 几个套路
看源码的时候，发现里面涉及了很多不错的点。

### 处理延时任务
`perform_async` 与 `perform_in`的调用差不用，只是背后处理的时候，`perform_in` 会 加多一个 `at`参数。

perform_in对应的格式是：
```ruby
item = { 'class' => HardWorker, 'args' => args, 'at' => ts }
```

perform_async对应的格式是：
```ruby
item = { 'class' => HardWorker, 'args' => args }
```

然后调用`Sidekiq::Client.new(pool).push(item)`，在push根据有没有`at`字段来做出不同的处理。

> 如果有`at`参数，加入到一个叫做`schedule`的集合中，等待 `Sidekiq::Scheduled::Poller` 拉取 再推入相应的队列当中，再等待`Processor`的处理。

> 如果没有，则直接推入相应的队列当中，再等待`Processor`的处理。

```ruby
def atomic_push(conn, payloads)
  if payloads.first['at']  # ==> here
    conn.zadd('schedule', payloads.map do |hash|
      at = hash.delete('at').to_s
      [at, Sidekiq.dump_json(hash)]
    end)
  else              # ==> here
    q = payloads.first['queue']
    now = Time.now.to_f
    to_push = payloads.map do |entry|
      entry['enqueued_at'] = now
      Sidekiq.dump_json(entry)
    end
    conn.sadd('queues', q)
    conn.lpush("queue:#{q}", to_push)
  end
end
```

### 策略模式
sidekiq中，多处会提供自定义的能力。

* Poller拉取器 拉取任务后 推入队列的策略
```ruby
class Enq
  def enqueue_jobs(now=Time.now.to_f.to_s, sorted_sets=SETS)
    ...
  end
end

class Poller
  def initialize
    @enq = (Sidekiq.options[:scheduled_enq] || Sidekiq::Scheduled::Enq).new
  end
end

# @enq.enqueue_jobs
```

Poller拉取器 拉取 `retry：重试` 跟`schedule：延时`集合的任务推入相关队列。默认是使用`Sidekiq::Scheduled::Enq`策略，每次使用一个时间作为score，在集合中获取匹配的第一个元素推入相关队列。
可以自行修改推入队列的方式。

* Processor获取任务的策略
```ruby
class Processor
  def initialize(mgr)
    ...
    @strategy = (mgr.options[:fetch] || Sidekiq::BasicFetch).new(mgr.options)
  end
end

# work = @strategy.retrieve_work
```

每个Processor取出一个任务时，通过`@strategy = (mgr.options[:fetch] || Sidekiq::BasicFetch).new(mgr.options)` 这个策略来获取，优先级的处理就是在这块处理的。
如果不传入新的获取任务策略，则使用`Sidekiq::BasicFetch`当做默认策略。

### 权重 —— 优先级
在sidekiq中，各个队列可以通过配置权重，实现优先级。
写在启动参数中：
```ruby
# 格式 => sidekiq -q 队列名,权重
sidekiq -q critical,2 -q default
```

也可以写在配置文件中：
```ruby
# sidekiq.yml

:queues:
  - [critical, 2]
  - default

# 启动
sidekiq -C sidekiq.yml
```

> Note：只要有一个队列配置了权重，那么整个sidekiq处理任务的时候，将不再按照队列声明的顺序来执行。

如果想要按顺序来处理，不要指定权重即可：
```ruby
sidekiq -q critical -q default -q low
```

如果想要各个队列随机平等处理，则配置权重都为1：
```ruby
sidekiq -q critical,1 -q default,1 -q low,1
```

为什么会是这样？ sidekiq内部是如何处理的？
下面来看看，会发现思路的也是很简单的。

sidekiq启动时，会解析传入的参数 — — 要么是带在命令行，要么是写在配置文件，就是开头说的那两种方式。
```ruby
# cli.rb
def parse_queue(opts, q, weight=nil)
  [weight.to_i, 1].max.times do
    (opts[:queues] ||= []) << q
  end
  opts[:strict] = false if weight.to_i > 0
end
```

生成两个参数：
* opts[:queues]
根据权重构造queue_name数组。
```ruby
sidekiq -q critical,3 -q default,2 -q low,1

opts[:queues] => [critical, critical, critical, default, default, low]
```

* opts[:strict]
队列是否按顺序。
如果其中有一个队列有权重配置，则 `opts[:strict] = false`

在弹出任务的时候，会传入这些参数。
```ruby
# fetch.rb
class BasicFetch
  def initialize(options)
    @strictly_ordered_queues = !!options[:strict]
    @queues = options[:queues].map { |q| "queue:#{q}" }
    if @strictly_ordered_queues
      @queues = @queues.uniq
      @queues << TIMEOUT
    end
  end

  def retrieve_work
    work = Sidekiq.redis { |conn| conn.brpop(*queues_cmd) }
    UnitOfWork.new(*work) if work
  end

  # Creating the Redis#brpop command takes into account any
  # configured queue weights. By default Redis#brpop returns
  # data from the first queue that has pending elements. We
  # recreate the queue command each time we invoke Redis#brpop
  # to honor weights and avoid queue starvation.
  def queues_cmd
    if @strictly_ordered_queues
      @queues
    else
      queues = @queues.shuffle.uniq
      queues << TIMEOUT
      queues
    end
  end
end
```

当配有权重时，会先打乱再去重。
> queues = @queues.shuffle.uniq
> 权重大的，排在前面的概率大，率先执行的概率也就大。

然后配合redis的`brpop`：
> redis.brpop(queue1, queue2, time_out)
> 可以给定一组列表 queue_a， queue_b， queue_c，在加上一个超时时间。
> 会依次检查列表，直到找到一个元素 或者 超时 或者 一直阻塞着（没有设置超时时间）。
>
> sidekiq配合Redis 使用起来十分方便。

这就是sidekiq处理优先级的方式。

### 中间件
客户端推进一个任务时，会经过一些参数格式化（如生成对应的入队列格式，添加任务的自定义id等 ）。
sidekiq允许自定义一些入队列前的操作，通过中间件来实现。比如：`添加入队列前的参数` 或者 `根据条件，过滤掉任务，阻止任务入队列` 等等。

中间件可以分两种
* 全局的：直接Sidekiq的config添加。
```ruby
Sidekiq.configure_server do |config|
  config.client_middleware do |chain|
    chain.add MyClientMiddleware
  end
end
```

* 局部的：针对当个client添加。
```ruby
client = Sidekiq::Client.new
client.middleware do |chain|
  chain.use MyClientMiddleware
end
client.push('class' => 'SomeWorker', 'args' => [1,2,3])
```
每个client走过的中间件是 `全局的 + 局部的`。

如何实现？
```ruby
# client.rb
module Sidekiq
  class Client
    def middleware(&block)
      @chain ||= Sidekiq.client_middleware # 先将全局的加进来~
      if block_given? # 这里添加局部中间件的处理
        @chain = @chain.dup
        yield @chain
      end
      @chain # chain存了该client相关的中间件
    end
  end
end
```

创建一个`Client实例`时，该`client`已经将所有需要的中间件存在一个chain里面等待调用。
而执行中间件的调用时，通过一个精简的递归就将所有中间件执行。

调用的时候：
```ruby
# client.rb
middleware.invoke(worker_class, item, queue, @redis_pool) do
  item
end
```

client.middleware返回一个chain。`chain.invoke`定义如下：
```ruby
# chain.rb
def invoke(*args)
  chain = retrieve.dup
  traverse_chain = lambda do
    if chain.empty?
      yield
    else
      chain.shift.call(*args, &traverse_chain) # 每次弹出最前的middleware并进行递归，这样中间件一层一层嵌套
    end
  end
  traverse_chain.call # 执行
end
```

> NOTE-1：既然都给 lambda命名了，为啥不使用def 定义呢？
> 我想是直接使用闭包，不用将剩余的chain暴露出来。

sidekiq的中间件跟Rack的中间件定义很像：
* 能够响应call
* 接收特定的参数供层级传递

```ruby
class MyClientMiddleware
  def call(worker_class, job, queue, redis_pool)
    # return false/nil to stop the job from going to redis
    return false if queue != 'default'
    job['customer'] = Customer.current_id
    yield
  end
end
```

> NOTE-2：中间件的yield位置很重要，最好位于最后当做返回值。
> 另外提前return可以阻止继续往下层传递，提交跳出chain。

### 时间间隔的利用
每个sidekiq进程启动时，会启动相关的Poller，`initial_wait`加入一个随机时间避免或减少同时请求IO。

```ruby
class Poller
  def start
    @thread ||= safe_thread("scheduler") do
      initial_wait   # ==> here

      while !@done
        enqueue
        wait       # ==> here
      end
      Sidekiq.logger.info("Scheduler exiting...")
    end
  end

  def initial_wait
    # Have all processes sleep between 5-15 seconds.  10 seconds
    # to give time for the heartbeat to register (if the poll interval is going to be calculated by the number
    # of workers), and 5 random seconds to ensure they don't all hit Redis at the same time.
    total = 0
    total += INITIAL_WAIT unless Sidekiq.options[:poll_interval_average]
    total += (5 * rand)

    @sleeper.pop(total)
  rescue Timeout::Error
  end
end
```


在拉取`retry：重试` 跟`schedule：延时`集合的一个任务推入队列之后，就
休眠一段时间。而这时间不是固定的。
```ruby
def wait
   @sleeper.pop(random_poll_interval)
  rescue Timeout::Error
    # expected
  rescue => ex
    # if poll_interval_average hasn't been calculated yet, we can
    # raise an error trying to reach Redis.
    logger.error ex.message
    handle_exception(ex)
    sleep 5
  end
end
```

```ruby
# Calculates a random interval that is ±50% the desired average.
def random_poll_interval
  poll_interval_average * rand + poll_interval_average.to_f / 2
end
```

poll_interval_average => 决定延时任务定期检查的平均时间周期。
直接看这一大段注释也可以很爽！！！！！
```ruby
# We do our best to tune the poll interval to the size of the active Sidekiq
# cluster.  If you have 30 processes and poll every 15 seconds, that means one
# Sidekiq is checking Redis every 0.5 seconds - way too often for most people
# and really bad if the retry or scheduled sets are large.
#
# Instead try to avoid polling more than once every 15 seconds.  If you have
# 30 Sidekiq processes, we'll poll every 30 * 15 or 450 seconds.
# To keep things statistically random, we will sleep a random amount between
# 225 and 675 seconds for each poll or 450 seconds on average.  Otherwise restarting
# all your Sidekiq processes at the same time will lead to them all polling at
# the same time: the thundering herd problem.
#
# We only do this if poll_interval_average is unset (the default).
def poll_interval_average
  Sidekiq.options[:poll_interval_average] ||= scaled_poll_interval
end
```

根据你开启的sidekiq的进程数计算
```ruby
# Calculates an average poll interval based on the number of known Sidekiq processes.
# This minimizes a single point of failure by dispersing check-ins but without taxing
# Redis if you run many Sidekiq processes.
def scaled_poll_interval
  pcount = Sidekiq::ProcessSet.new.size
  pcount = 1 if pcount == 0
  pcount * Sidekiq.options[:average_scheduled_poll_interval]
end
```


### 其它点
当然，还涉及到许多其它的点，后续待跟。像：
* Redis各种数据结构在sidekiq的使用
* 任务如何重试
* 当任务处理一半收到停止信号如何处理
* 一个Processor挂了之后如何处理
* 队列堆积怎么处理
* ……

---

## 参考文档
好文推荐，图文并茂呢，将sidekiq的处理过程讲得很明白~
* [Home · mperham/sidekiq Wiki · GitHub](https://github.com/mperham/sidekiq/wiki)
* [Sidekiq 如何处理异步任务](https://draveness.me/sidekiq)
* [Sidekiq 任务调度流程分析 · Ruby China](https://ruby-china.org/topics/31470)
