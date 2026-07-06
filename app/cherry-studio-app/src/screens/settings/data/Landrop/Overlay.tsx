import { Canvas, DiffRect, rect, rrect } from '@shopify/react-native-skia'
import React from 'react'
import { Dimensions, StyleSheet } from 'react-native'

const { width, height } = Dimensions.get('window')

const innerDimension = 200
const offsetY = 100
// 为顶部图标和文本留出空间，假设它们占用约20px的高度
const topOffset = 20

const outer = rrect(rect(14, topOffset + 15, width - 28, height - topOffset), 0, 0)
const inner = rrect(
  rect(width / 2 - innerDimension / 2, height / 2 - innerDimension / 2 - offsetY, innerDimension, innerDimension),
  50,
  50
)

export const Overlay = () => {
  return (
    <Canvas style={[StyleSheet.absoluteFillObject, { top: topOffset }]}>
      <DiffRect inner={inner} outer={outer} color="black" opacity={0.5} />
    </Canvas>
  )
}
