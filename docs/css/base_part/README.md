
# CSS基础部分

### vh单位

```css
/*
vh stands for view-port height, 1vh is 1% of screen height.

100vw === 100% of the width of the viewport.
100vh === 100% of the height of the viewport.
*/

.demo {
  height: 100vh;
}
```

[html - Make a div 100% height of the browser window - Stack Overflow](https://stackoverflow.com/questions/1575141/make-a-div-100-height-of-the-browser-window)

### height: 100% Vs height: auto

- height: 100% => 根据父元素的高度来决定
- height: auto => 包含的子元素多高就多高

注意：padding + margin

```css
  html,body{
    height: 100%;
  }
```

[difference between css height : 100% vs height : auto - Stack Overflow](https://stackoverflow.com/questions/15943009/difference-between-css-height-100-vs-height-auto)

### 浏览器如何计算高度 + 宽度

- 宽度：自动扩展
- 高度：只是简单往下堆

[如何让 height:100%; 起作用 – WEB骇客](http://www.webhek.com/post/css-100-percent-height.html)

### margin坍塌问题
