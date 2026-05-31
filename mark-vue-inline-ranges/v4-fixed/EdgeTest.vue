<template>
  <!-- L1: template open tag -->
  <div class="container">
    <!-- L3: normal div -->
    <p>Hello {{ name }}</p>

    <!-- L5: mustache interpolation -->
    <span>{{ message.length > 0
      ? 'yes'
      : 'no'
    }}</span>

    <!-- L10: multi-line HTML attribute value -->
    <div :class="[
      'foo',
      'bar',
      isActive ? 'active' : ''
    ]">
      inner text
    </div>

    <!-- L19: multi-line attribute continued -->
    <input
      type="text"
      :value="val"
      @click="handleClick"
      placeholder="type here"
    />

    <!-- L27: normal element after multi-line attr -->
    <button @click="submit">Submit</button>

    <!-- L29: v-if / v-else adjacency risk -->
    <div v-if="showA">Content A</div>
    <!-- L31: v-else next line -->
    <div v-else>Content B</div>

    <!-- L33: Transition component -->
    <Transition name="fade">
      <div key="a" v-if="ok">Fade</div>
    </Transition>

    <!-- L38: slot -->
    <slot name="header">Default header</slot>

    <!-- L40: nested template v-if -->
    <template v-if="canShow">
      <div>Nested content</div>
    </template>

    <!-- L44: self-closing -->
    <img src="/logo.png" alt="logo" />

    <!-- L46: inline complete tag -->
    <strong>Bold text</strong>

    <!-- L48: HTML comment inside template -->
    <!-- this is an existing comment -->

    <!-- L51: raw text area -->
    <textarea>v-if should not parse this</textarea>

    <!-- L53: multi-line HTML comment -->
    <!--
      This is a
      multi-line comment
      that spans several lines
    -->

    <!-- L60: after multi-line comment -->
    <footer>Footer</footer>
  </div>
</template>

<script setup>
// L65: script open tag
import { ref, computed } from 'vue'

// L67: normal statement
const name = ref('World')
const message = ref('hello')
const isActive = ref(true)
const showA = ref(true)
const ok = ref(true)
const canShow = ref(true)

// L73: empty line below

// L75: multi-line string
const longText = `This is a template
  literal that spans
  multiple lines
  here`

// L81: after template literal
const short = 'single'

/* L84: multi-line block comment start
   this is inside
   a block comment
   should be skipped
*/

// L89: after block comment
const x = 1

/*
 * Another block
 * comment here
 */

// L96: after second block comment
const obj = {
  a: 1,
  b: 2,
  c: 3
}

// L103: after object
const arr = [
  'one',
  'two',
  'three'
]

// L110: after array

/// <reference types="vite/client" />
//# sourceMappingURL=app.js.map

// L114: special directive lines above

// L116: arrow function with JSX-like
const fn = () => {
  return null
}

// L120: destructuring
const { foo, bar } = someObj
const [first, ...rest] = items

// L124: import/export
export default {
  name: 'EdgeTest'
}

// L129: already marked line
const existing = 42 //EdgeTest.vue|range:99-100|random:12345678

// L131: already data-marked -->
</script>

<style scoped>
/* L135: style open tag */
.container {
  padding: 16px;
  color: #333;
}

/* L140: normal rule */
p {
  margin: 8px 0;
}

/* L144: multi-line value */
.button {
  background: linear-gradient(
    to bottom,
    #fff,
    #000
  );
  border-radius: 4px;
}

/* L153: after multi-line value */
span {
  font-weight: bold;
}

/*
 * Multi-line CSS
 * comment block
 * skip these
 */

/* L163: after css block comment */
.footer {
  border-top: 1px solid #eee;
}

/* L167: already CSS marked */
h1 { color: red; } /*EdgeTest.vue|range:167-168|random:87654321*/
</style>

<!-- L171: custom i18n block below -->
<i18n lang="json">
{
  "en": {
    "hello": "Hello"
  }
}
</i18n>
