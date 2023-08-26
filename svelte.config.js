import adapter from "@sveltejs/adapter-static";
import preprocess from "svelte-preprocess";

const dev = "production" === "development";

const config = {
  preprocess: preprocess(),
  kit: {
    adapter: adapter(),
  },
};

export default config;