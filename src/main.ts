import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { locale } from './lib/i18n/index.svelte'

document.documentElement.lang = locale()

const target = document.getElementById('app')
if (!target) throw new Error('#app introuvable')

export default mount(App, { target })
