---
layout: home
hero:
  name: compmark
  text: Vue Component Documentation Generator
  tagline: Documentation that writes itself
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/noopurphalak/compmark-vue
features:
  - title: Props & Emits
    details: Extracts defineProps (runtime & generic syntax), defineEmits, withDefaults, and all JSDoc annotations.
  - title: Slots & Expose
    details: Parses defineSlots with typed bindings, template slot fallback, and defineExpose.
  - title: Composables
    details: Detects use* pattern composables with variable extraction and cross-file type inference.
  - title: Refs & Computed
    details: Extracts ref(), shallowRef(), reactive(), computed() with type inference from generics and literals.
  - title: Config File
    details: compmark.config.ts with include/exclude globs, aliases, section ordering, and all CLI options.
  - title: Watch Mode
    details: Incremental rebuilds on file changes with stale output cleanup.
  - title: Category Grouping
    details: Use @category to group components in joined output with automatic TOC generation.
  - title: Options API
    details: Full support for export default { props, emits, data(), computed } syntax.
---
