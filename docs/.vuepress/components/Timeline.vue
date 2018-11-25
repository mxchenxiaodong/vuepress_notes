<template>
  <ul :class="forTimeline">
    <slot></slot>
  </ul>
</template>

<script>
  const prefixCls = "self-timeline"

  export default {
    name: "Timeline",
    props: {
      pending: {
        type: Boolean,
        default: false
      }
    },
    computed: {
      // 一开始，为加上timeline类
      // 是否设置pending类
      forTimeline () {
        return [
          prefixCls,
          {
            [`${prefixCls}-pending`]: this.pending
          }
        ]
      }
    }
  }
</script>
