import { createStackNavigator, TransitionPresets } from '@react-navigation/stack'
import React from 'react'

import WebSearchProviderSettingsScreen from '@/screens/settings/websearch/WebSearchProviderSettingsScreen'
import WebSearchSettingsScreen from '@/screens/settings/websearch/WebSearchSettingsScreen'

export type WebSearchStackParamList = {
  WebSearchSettingsScreen: undefined
  WebSearchProviderSettingsScreen: { providerId: string }
}

const Stack = createStackNavigator<WebSearchStackParamList>()

export default function WebSearchStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureResponseDistance: 9999,
        ...TransitionPresets.SlideFromRightIOS
      }}>
      <Stack.Screen name="WebSearchSettingsScreen" component={WebSearchSettingsScreen} />
      <Stack.Screen name="WebSearchProviderSettingsScreen" component={WebSearchProviderSettingsScreen} />
    </Stack.Navigator>
  )
}
