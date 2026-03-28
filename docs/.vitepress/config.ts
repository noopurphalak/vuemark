import { defineConfig } from "vitepress";

export default defineConfig({
  title: "compmark",
  description: "Auto-generate Markdown documentation from Vue 3 SFCs",
  base: "/compmark-vue/",
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Features", link: "/features/props-emits" },
      { text: "Examples", link: "/examples/basic-component" },
    ],
    sidebar: {
      "/guide/": [
        { text: "Getting Started", link: "/guide/getting-started" },
        { text: "Configuration", link: "/guide/configuration" },
        { text: "CLI Reference", link: "/guide/cli-reference" },
        { text: "Supported Syntax", link: "/guide/supported-syntax" },
      ],
      "/features/": [
        { text: "Props & Emits", link: "/features/props-emits" },
        { text: "Slots & Expose", link: "/features/slots-expose" },
        { text: "Composables", link: "/features/composables" },
        { text: "Refs & Computed", link: "/features/refs-computed" },
        { text: "JSDoc Tags", link: "/features/jsdoc-tags" },
        { text: "Options API", link: "/features/options-api" },
        { text: "Imported Types", link: "/features/imported-types" },
      ],
      "/examples/": [
        { text: "Basic Component", link: "/examples/basic-component" },
        { text: "Monorepo Setup", link: "/examples/monorepo-setup" },
        { text: "Config File", link: "/examples/config-file" },
      ],
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/noopurphalak/compmark-vue" },
    ],
  },
});
