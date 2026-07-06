import * as Crypto from 'expo-crypto'
import { MMKV } from 'react-native-mmkv'

/**
 * 异步执行一个函数。
 * @param {() => void} fn 要执行的函数
 * @returns {Promise<void>} 执行结果
 */
export const runAsyncFunction = async (fn: () => void): Promise<void> => {
  await fn()
}

/**
 * 检查对象是否包含特定键。
 * @param {any} obj 输入对象
 * @param {string} key 要检查的键
 * @returns {boolean} 包含该键则返回 true，否则返回 false
 */
export function hasObjectKey(obj: any, key: string): boolean {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }

  return Object.keys(obj).includes(key)
}

export const uuid = () => Crypto.randomUUID()
export const storage = new MMKV()
