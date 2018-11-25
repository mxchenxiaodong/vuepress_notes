<template>
  <li :class="itemClass">
    <div :class="tailClass"></div>

    <div :class="headClass" :style="customColor" ref="dot">
      <slot name="dot"></slot>
    </div>

    <div :class="contentClass">
      <slot></slot>
    </div>
  </li>
</template>

<script>
const prefixCls = 'self-timeline';

export default {
  name: 'TimelineItem',
  props: {
    color: {
      type: String,
      default: 'blue'
    }
  },
  data () {
    return {
      dot: false
    }
  },
  mounted () {
    // 是否使用自定义的图标
    // 如果包含了传入的内容，说明是有意图使用自定义的内容
    // 同时默认的图标不需要显示
    this.dot = this.$refs.dot.innerHTML.length ? true : false
  },
  computed: {
    itemClass () {
      return `${prefixCls}-item`;
    },
    tailClass () {
      return `${prefixCls}-item-tail`
    },
    headClass () {
      // 注意: item-head-custom定义时，因为如果要使用变量做key，需要加个中括号
      // 这个与vue没关系

      // 而返回一个数组, 里面包含对象样式，最终全都解析成html的class
      // 这个是vue的用法
      return [
        `${prefixCls}-item-head`,
        {
          [`${prefixCls}-item-head-custom`]: this.dot,
          [`${prefixCls}-item-head-${this.color}`]: !this.dot // 暂时不使用this.headColorShow, 样式有点问题
        }
      ]
    },
    headColorShow () {
      return this.color == 'blue' || this.color == 'green' || this.color == 'red'
    },
    customColor () {
      let style = {}
      if (this.color) {
        if (!this.headColorShow) {
          style = {
            'color': this.color,
            'border-color': this.color
          }
        }
      }

      return style;
    },
    contentClass () {
      return `${prefixCls}-item-content`
    }
  }
}
</script>

<style lang="scss">
  $timeline-prefix-cls: self-timeline;
  $timeline-color: #e8eaec;
  $primary-color: #2d8cf0;
  $error-color:  #ed4014;
  $success-color: #19be6b;

  .#{$timeline-prefix-cls} {
    list-style: none;
    margin: 0;
    padding: 0;

    &-item {
      margin: 0 !important;
      padding: 0 0 12px 0;
      list-style: none;
      position: relative;

      &-tail {
        height: 100%;
        border-left: 1px solid $timeline-color;
        position: absolute;
        left: 7px;
        top: 0;
      }

      &-head {
        width: 13px;
        height: 13px;
        background-color: #fff;
        border-radius: 50%;
        border: 1px solid transparent;
        position: absolute;
        top: 0;

        &-blue {
          border-color: $primary-color;
          color: $primary-color;
        }

        &-red {
          border-color: $error-color;
          color: $error-color;
        }

        &-green {
          border-color: $success-color;
          color: $success-color;
        }
      }

      &-content {
        padding: 1px 1px 0 24px;
        position: relative;
        top: -8px;
      }

      // 注意拼接类名时，使用#{$var_name}
      // 最后一条竖线去掉
      &:last-child {
        .#{$timeline-prefix-cls}-item-tail {
          display: none;
        }
      }
    }

    // 如果指定了pending，则对倒数第二个item做一些处理
    &-pending &-item:nth-last-of-type(2) {
      // tail线变成......
      .#{$timeline-prefix-cls}-item-tail {
        border-left: 1px dotted $timeline-color;
      }

      // 让内容项保证一定的高度，保持美观
      .#{$timeline-prefix-cls}-item-content {
        min-height: 100px;
      }
    }
  }
</style>
