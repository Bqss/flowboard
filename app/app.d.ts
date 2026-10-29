// See https://svelte.dev/docs/kit/types#app.d.ts

declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }

  const __FLOWBOARD_VERSION__: string;
  const __FLOWBOARD_PRODUCTION__: boolean;
}

export {};
