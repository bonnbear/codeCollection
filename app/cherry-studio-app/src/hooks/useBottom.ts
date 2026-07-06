import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export const useBottom = () => {
  const { bottom } = useSafeAreaInsets()
  return Platform.OS === 'ios' ? bottom : bottom + 10
}
