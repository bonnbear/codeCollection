import { Dimensions, Platform } from 'react-native'

const { width, height } = Dimensions.get('window')

// screen
const SCREEN_WIDTH = width
const SCREEN_HEIGHT = height

// iPhoneX Xs
const X_WIDTH = 375
const X_HEIGHT = 812

// iPhoneXR XsMax
const XR_WIDTH = 414
const XR_HEIGHT = 896

// 判断是否为 iPhoneX
const iPhoneX =
  Platform.OS === 'ios' &&
  ((SCREEN_HEIGHT === X_HEIGHT && SCREEN_WIDTH === X_WIDTH) || (SCREEN_HEIGHT === X_WIDTH && SCREEN_WIDTH === X_HEIGHT))

// 判断是否为 iPhoneXR 或 iPhone Xs MAX
const iPhoneXR =
  Platform.OS === 'ios' &&
  ((SCREEN_HEIGHT === XR_HEIGHT && SCREEN_WIDTH === XR_WIDTH) ||
    (SCREEN_HEIGHT === XR_WIDTH && SCREEN_WIDTH === XR_HEIGHT))

// 非全面屏手机
const iPhoneSM = Platform.OS === 'ios' && !(iPhoneX || iPhoneXR)
const SmallDevice = height <= 700

const scale = width >= 375 ? 1 : width / 375

export const isMobile = ['ios', 'android', 'armony'].includes(Platform.OS)

export const isAndroid = Platform.OS === 'android'

export const isIOS = Platform.OS === 'ios'

export const benchmarkRatio = width / 375

export const benchmarkHRatio = height / 852

export { height as Height, iPhoneSM, iPhoneX, iPhoneXR, scale, SmallDevice, width as Width }
