import { AndroidHaptics, impactAsync, ImpactFeedbackStyle, performAndroidHapticsAsync } from 'expo-haptics'
import { Platform } from 'react-native'

export function haptic(type: ImpactFeedbackStyle = ImpactFeedbackStyle.Medium): void {
  if (Platform.OS === 'ios') {
    impactAsync(type)
  } else if (Platform.OS === 'android') {
    if (type === ImpactFeedbackStyle.Light) {
      performAndroidHapticsAsync(AndroidHaptics.Keyboard_Tap)
    } else if (type === ImpactFeedbackStyle.Medium) {
      performAndroidHapticsAsync(AndroidHaptics.Confirm)
    } else if (type === ImpactFeedbackStyle.Heavy) {
      performAndroidHapticsAsync(AndroidHaptics.Reject)
    } else if (type === ImpactFeedbackStyle.Rigid) {
      performAndroidHapticsAsync(AndroidHaptics.Long_Press)
    } else if (type === ImpactFeedbackStyle.Soft) {
      performAndroidHapticsAsync(AndroidHaptics.Virtual_Key_Release)
    } else {
      performAndroidHapticsAsync(AndroidHaptics.Virtual_Key)
    }
  }
}
