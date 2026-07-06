import { createStackNavigator, TransitionPresets } from '@react-navigation/stack'
import React from 'react'

import AssistantDetailScreen from '@/screens/assistant/AssistantDetailScreen'
import AssistantSettingsScreen from '@/screens/settings/assistant/AssistantSettingsScreen'

export type AssistantSettingsStackParamList = {
  AssistantSettingsScreen: undefined
  AssistantDetailScreen: { assistantId: string; tab?: string }
}

const Stack = createStackNavigator<AssistantSettingsStackParamList>()

export default function AssistantSettingsStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureResponseDistance: 9999,
        ...TransitionPresets.SlideFromRightIOS
      }}>
      <Stack.Screen name="AssistantSettingsScreen" component={AssistantSettingsScreen} />
      <Stack.Screen name="AssistantDetailScreen" component={AssistantDetailScreen} />
    </Stack.Navigator>
  )
}
