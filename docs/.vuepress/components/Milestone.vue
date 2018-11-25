<template>
  <Timeline pending>
    <TimelineItem v-bind:color='choose_dot_color()' v-for="item in milestoneList" :key="item.id">
      <span class="title"> {{ item.title }}</span>
      <p class="content">
        {{ item.content }}
      </p>

      <div class="self-tag-group">
        <span v-for="tag in item.tags" class="self-tag">
          {{ tag }}
        </span>
      </div>
    </TimelineItem>

    <!-- 自定义末节点 -->
    <TimelineItem>
      <!-- <div slot='dot'>😍</div> -->
      <!-- <span slot='dot'>😍</span> -->
      <a href="#">查看更多</a>
    </TimelineItem>
  </Timeline>
</template>

<script>
import Timeline  from './Timeline'
import TimelineItem  from './TimelineItem'

const DotUseColor = ['blue', 'red', 'green']
const DotUseColorLength = DotUseColor.length

const TagUseType = ['', 'success', 'info', 'warning', 'danger']
const TagUseTypeLength = TagUseType.length

const TimeInterval = 86400 // seconds

export default {
  name: 'Milestone',
  components: {
    Timeline,
    TimelineItem
  },
  data () {
    return {
      milestoneList: [{
        id: 1,
        title: '......',
        created_at: '2018-11-10',
        content: 'something here....watching movie...watching movie...watching movie...watching movie...watching movie...watching movie...watching movie...',
        tags: ['Life', 'Movie']
      },{
        id: 2,
        title: '重要',
        created_at: '2018-11-11',
        content: '我们命中注定要失去所爱之人，不然我们怎么知道他们在我们生命中有多重要。',
        tags: ['Time', 'Life']
      },{
        id: 3,
        title: '武林外传',
        created_at: '2018-11-15',
        content: '电影也应该尽量不直接言及悲伤和寂寞，而要把那份悲伤和寂寞表现出来。借助观众的想象力，让他们参与到电影中来。',
        tags: ['Life', 'Movie']
      },{
        id: 4,
        title: '狗日的天天喊吃鸡',
        created_at: '2018-11-25',
        content: '1、在野外被打了，要立马根据枪声/火光/子弹着弹点反方向找掩体，最好不要原地趴下，趴下了80%都会死。2、野外对枪(敌我都躲树后)，最好不要趴下，趴下会让你在垂直上的可射击角度变小。3、跳伞时候离目标点还有100米左右就可以改用垂直下降了(就是头朝下)，自动开伞后就可以飘到目标点了。5、在有得选择的情况下，不要背两把同类型的枪，比如背了一把Scar(自动步枪)，看到地上有ump9(冲锋枪)和ak(自动步枪)，认为ak(自动步枪)比较厉害再背了一把ak。当然，游戏是人玩的，总有例外，要是有8倍也可以背一把ak当狙击枪用。6、不建议萌新在非楼宇/巷战的情况下，使用自动步枪的自动模式。7、个人认为的萌新最强套装是满配M416/scar+S12K。',
        tags: ['Life', 'Game']
      }],
      now_date: Date.now()
    }
  },
  methods: {
    compute_day_ago: function (time) {
      let day_ago = null
      if (!!time) {
        let many_second = (this.now_date - new Date(time)) / 1000
        day_ago = Math.floor((many_second / TimeInterval))
      }

      return day_ago
    },
    day_ago_show: function (time) {
      let day_ago = this.compute_day_ago(time)

      return day_ago ? `${day_ago}天前` : ''
    },
    random_value: function (len) {
      return Math.floor(Math.random() * len)
    },
    choose_dot_color: function () {
      // 随机选择tail颜色
      return DotUseColor[this.random_value(DotUseColorLength)]
    },
    choose_tag_type: function () {
      // 随机选择tag颜色
      return TagUseType[this.random_value(TagUseTypeLength)]
    }
  }
}
</script>

<style lang="scss" scoped>
  .title {
    font-weight: bold;
    font-size: 16px;
  }

  .content {
    font-size: 14px;
    padding: 0 5px 5px 0px;
    line-height: 30px;
  }

  .self-tag-group {
    // margin: 15px 0 0 0;
  }
  .self-tag {
    margin-right: 5px;
    font-size: 12px;
    background-color: rgba(103,194,58,.1);
    border-color: rgba(103,194,58,.2);
    color: #67c23a;
    border-radius: 4px;
    display: inline-block;
    padding: 0 10px;
  }

  .plain {
    color: #67c23a;
    background: #f0f9eb;
    border-color: #c2e7b0;
    padding: 8px;
  }

  a {
    text-decoration: none;
  }
</style>
