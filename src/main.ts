import type { ToastContainerOptions } from 'vue3-toastify'
import { createApp } from 'vue'
import Vue3Toastify from 'vue3-toastify'
import App from './App.vue'
import './style.css'
import 'vue3-toastify/dist/index.css'

createApp(App).use(Vue3Toastify, { autoClose: 5000 } as ToastContainerOptions).mount('#app')
