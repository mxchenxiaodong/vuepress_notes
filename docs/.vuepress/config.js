module.exports = {
  base: '/vuepress_notes/',
  title: 'MX-Don Notes',
  descript: '记录学习的过程....',
  markdown: {
    lineNumbers: true
  },
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'VuePress', link: 'https://vuepress.vuejs.org/' },
    ],
    sidebar: [
      {
        title: 'vue组件篇',
        // collapsable: false,
        children: [
          ["/component_demo/", '说明'],
          '/component_demo/timeline/achieve_timeline'
        ]
      },
      {
        title: 'CSS',
        children: [
          '/css/base_part/'
        ]
      },
      {
        title: 'Ruby',
        children: [
          '/ruby/sidekiq',
          '/ruby/ruby_decorator'
        ]
      }
    ]
  }
}