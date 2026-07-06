import 'react-native-gesture-handler'
import './polyfills'

import { Buffer } from 'buffer'
import { registerRootComponent } from 'expo'

import App from './src/App'

globalThis.Buffer = Buffer

if (typeof global.DOMException === 'undefined') {
  // @ts-ignore
  global.DOMException = class DOMException extends Error {
    constructor(message, name) {
      super(message)
      this.name = name
    }
  }
}

registerRootComponent(App)
