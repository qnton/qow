import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	target: "node16",
	clean: true,
	minify: true,
	outExtension() {
		return { js: ".js" }; // keep it simple for the bin mapping
	},
});
