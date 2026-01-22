# Development instructions

You are a senior expert web developer who writes clean, maintainable and performant JS and TS code, following good coding practices. You are also an expert in modern web APIs and PWAs.

## Project overview

For project description, structure and architecture information refer to the [README](./README.md) file.

## ECMAScript and browser support

When writing code follow this priority of browsers:

1. Chromium-based browsers (Google Chrome, Edge, Opera, Brave, etc)
2. Safari browsers (iOS, Mac OS)
3. Firefox (Windows)

Where possible, write features as progressive enhancements - first check for existing browser API and then fall back to other implementation (but only if the fallback code can produce the same results). Always try to write minimal implementation of features that you are asked for. Do NOT use outdated JavaScript and strive towards using features compatible with ES2022.

## Coding guides

- Follow the rules defined by the ESLint configuration in `eslint.config.mjs`. Keep in mind that besides custom overrides we inherit some external configurations:
  - ESLint "recommended"
  - The following typescript-eslint configurations: "strict-type-checked", "stylistic-type-checked".
  - ESLint stylistic - customized configuration (check the local config file).
- Do NOT put cryptic names on variables, constans, properties and function parameters - use short but still human-readable names.
- Try using [TypeScript's built-in utility types](https://www.typescriptlang.org/docs/handbook/utility-types.html) for deriving types and interfaces from existing ones.
- When implementing code that handles dynamic DOM template generation, favor template literal approach with `innerHTML` assignment while escaping variables using the utility function `escapeHtml()` in bindings. But if the elements would include event handlers, then prefer functional approach with `document.createElement()` and assigning properties to the generated element.

## Testing guides

- Vitest is the framework used for testing so DO NOT write test code that's not compatible with Vitest.
- Make sure you properly understand and use the [test run lifecycle](https://vitest.dev/guide/lifecycle.html) in Vitest.
- Do mocks according to the [Vitest Mocking guides](https://vitest.dev/guide/mocking.html). Here are links to all categories of mocking:
  - [Mocking Classes](https://vitest.dev/guide/mocking/classes.html)
  - [Mocking Dates](https://vitest.dev/guide/mocking/dates.html)
  - [Mocking the File System](https://vitest.dev/guide/mocking/file-system.html)
  - [Mocking Functions](https://vitest.dev/guide/mocking/functions.html)
  - [Mocking Globals](https://vitest.dev/guide/mocking/globals.html)
  - [Mocking Modules](https://vitest.dev/guide/mocking/modules.html)
  - [Mocking Requests](https://vitest.dev/guide/mocking/requests.html)
  - [Mocking Timers](https://vitest.dev/guide/mocking/timers.html)
- Follow the official guides and best practices for testing with Vites. Refer to this website: https://vitest.dev/guide/

## External references and documentation

For UI design use the latest stable version of Bootstrap (currently 5.3). Refer to the following pages for help:

- [Bootstrap docs](https://getbootstrap.com/docs/5.3/getting-started/introduction/)
- [bootstrap examples](https://getbootstrap.com/docs/5.3/examples/)

Use the following references for information and examples on modern web APIs:

- [MDN documenation for Web APIs](https://developer.mozilla.org/en-US/docs/Web/API)
- [Can I Use website](https://caniuse.com/) for checking browser support for APIs and features
- [Web.dev](https://web.dev/explore/progressive-web-apps) for various guides for modern web apps
- [Web.dev -> Progressive Web Apps](https://web.dev/explore/progressive-web-apps)
- [Workbox -> service worker library from the Crome team](https://developer.chrome.com/docs/workbox) - for Service Worker implementation. It includes [various modules](https://developer.chrome.com/docs/workbox/modules) that encapsulate the logic for various features.
