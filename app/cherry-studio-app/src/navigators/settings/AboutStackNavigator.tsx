import { createStackNavigator, TransitionPresets } from '@react-navigation/stack'
import React from 'react'

import AboutScreen from '@/screens/settings/about/AboutScreen'
import PersonalScreen from '@/screens/settings/personal/PersonalScreen'

export type AboutStackParamList = {
  PersonalScreen: undefined
  AboutScreen: undefined
}

const Stack = createStackNavigator<AboutStackParamList>()

export default function AboutStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureResponseDistance: 9999,
        ...TransitionPresets.SlideFromRightIOS
      }}>
      <Stack.Screen name="PersonalScreen" component={PersonalScreen} />
      <Stack.Screen name="AboutScreen" component={AboutScreen} />
    </Stack.Navigator>
  )
}
