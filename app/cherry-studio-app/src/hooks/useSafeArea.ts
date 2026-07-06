import { Platform } from 'react-native'
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context'

export const useSafeArea = () => {
  const edges = useSafeAreaInsets()

  if (Platform.OS === 'android') {
    const { bottom, left, right, top } = edges

    const _bottom = bottom === 0 ? initialWindowMetrics?.insets?.bottom || 0 : bottom
    const _top = top === 0 ? initialWindowMetrics?.insets?.top || 0 : top

    return { left, right, bottom: _bottom, top: _top }
  }

  return edges
}
