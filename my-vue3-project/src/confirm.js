// utils/confirm.js
import { createApp } from 'vue'
import ConfirmComponent from './Confirm.vue'

function Confirm(options = {}) {
  return new Promise((resolve, reject) => {
    // 创建一个挂载容器
    const mountNode = document.createElement('div')
    document.body.appendChild(mountNode)

    // 创建实例并挂载
    const app = createApp(ConfirmComponent, {
      ...options,
      onConfirm: () => {
        resolve()
        destroyConfirm()
      },
      onCancel: () => {
        reject()
        destroyConfirm()
      }
    })

    // 挂载组件
    app.mount(mountNode)

    // 清理函数
    function destroyConfirm() {
      app.unmount()
      mountNode.remove()
    }
  })
}

// 便捷方法
Confirm.confirm = (content, title = '提示', options = {}) => {
  return Confirm({
    content,
    title,
    ...options
  })
}

export default Confirm