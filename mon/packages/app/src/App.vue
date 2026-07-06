<template>
  <div>
    <h1>App</h1>
    <Button>Click me</Button>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { Button } from '@vue3-monorepo/ui'

export default defineComponent({
  name: 'App',
  components: {
    Button
  }
})
</script>