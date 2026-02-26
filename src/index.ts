#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { Command } from "commander";
import OpenAI from "openai";

const CONFIG_PATH = path.join(os.homedir(), ".qow.json");

function getApiKey(): string | undefined {
	if (fs.existsSync(CONFIG_PATH)) {
		try {
			const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
			if (config.apiKey) return config.apiKey;
		} catch {
			// Ignore parse errors, fallback to env
		}
	}
	return process.env.OPENROUTER_API_KEY;
}

// OpenRouter configuration
function createClient() {
	const apiKey = getApiKey();
	if (!apiKey) return null;

	return new OpenAI({
		baseURL: "https://openrouter.ai/api/v1",
		apiKey,
		defaultHeaders: {
			"HTTP-Referer": "https://github.com/yourusername/qow", // Optional
			"X-Title": "qow CLI", // Optional
		},
	});
}

const loadingSentences = [
	"Generating magic…",
	"Consulting the ancient scrolls…",
	"Waking up the hamsters…",
	"Computing optimal approach…",
	"Brewing command potion…",
	"Translating thoughts to shell…",
	"Summoning shell daemons…",
	"Asking the internet…",
];

function lerp(start: number, end: number, t: number) {
	return Math.floor(start + (end - start) * t);
}

async function getCommand(request: string) {
	const text =
		loadingSentences[Math.floor(Math.random() * loadingSentences.length)];
	let frame = 0;
	const startTime = Date.now();

	const handleKey = (key: Buffer) => {
		// 3 is ctrl+c, 27 is escape
		if (key[0] === 3 || key[0] === 27) {
			process.stderr.write("\r\x1b[K");
			process.exit(0);
		}
	};

	if (process.stdin.isTTY) {
		process.stdin.setRawMode(true);
		process.stdin.resume();
		process.stdin.on("data", handleKey);
	}

	const timer = setInterval(() => {
		const elapsed = Math.floor((Date.now() - startTime) / 1000);
		const waveWidth = 5;
		let output = chalk.gray("· ");
		const maxPos = text.length + waveWidth * 2;
		// using continuous frame progression for ultra-smoothness
		const pos = ((frame / 1.5) % maxPos) - waveWidth;

		for (let i = 0; i < text.length; i++) {
			const char = text[i];
			const dist = Math.abs(i - pos);

			if (dist >= waveWidth) {
				output += chalk.whiteBright(char);
			} else {
				// Smooth color interpolation
				const t = (dist / waveWidth) ** 1.2;
				const colorVal = lerp(60, 255, t);
				output += chalk.rgb(colorVal, colorVal, colorVal)(char);
			}
		}

		if (process.stdout.isTTY) {
			process.stderr.write(
				`\r\x1b[K  ${output} ${chalk.gray(`(${elapsed}s • esc to interrupt)`)}`,
			);
		}
		frame++;
	}, 30); // 30ms for 33 FPS butter smooth transitions

	try {
		const client = createClient();
		if (!client) throw new Error("NO_API_KEY");

		const completion = await client.chat.completions.create({
			model: "openai/gpt-oss-120b",
			messages: [
				{
					role: "system",
					content: `You are a strict CLI generator. 
          Rules:
          1. Return ONLY the shell command. 
          2. No markdown, no backticks, no explanations.
          3. If you are unsure or the request is impossible, return "ERROR: <reason>".
          4. Use reasoning to double-check syntax against modern man pages.`,
				},
				{ role: "user", content: request },
			],
			// OpenRouter passes this to the underlying model
			// @ts-expect-error
			include_reasoning: true,
		});

		return completion.choices[0].message.content?.trim();
	} finally {
		clearInterval(timer);
		if (process.stdin.isTTY) {
			process.stdin.off("data", handleKey);
			process.stdin.setRawMode(false);
			process.stdin.pause();
		}
		if (process.stdout.isTTY) {
			process.stderr.write("\r\x1b[K"); // clear the loading line
		}
	}
}

const program = new Command();
program.name("qow").description("Natural language to CLI commands");

program
	.argument("[task...]", "what you want to do")
	.option("-s, --setup", "Configure your OpenRouter API key")
	.action(async (taskChunks: string[], options: { setup?: boolean }) => {
		if (options.setup) {
			p.intro(chalk.bgCyan.black(" qow setup "));

			p.note(
				"To use qow, you need a free OpenRouter API key.\n" +
					"Get yours here: " +
					chalk.cyan.underline("https://openrouter.ai/keys"),
			);

			const apiKey = await p.text({
				message: "Paste your OpenRouter API key:",
				placeholder: "sk-or-v1-...",
				validate(value) {
					if (!value) return "Please enter an API key.";
				},
			});

			if (p.isCancel(apiKey)) {
				p.cancel("Setup cancelled.");
				process.exit(0);
			}

			try {
				fs.writeFileSync(CONFIG_PATH, JSON.stringify({ apiKey }, null, 2), {
					mode: 0o600,
				});
				p.outro(chalk.green("✔ API key saved successfully to ~/.qow.json"));
			} catch (_err) {
				p.outro(chalk.red("Failed to save configuration file."));
			}
			return;
		}

		if (!taskChunks || taskChunks.length === 0) {
			program.help();
			return;
		}

		const apiKey = getApiKey();
		if (!apiKey) {
			console.error(chalk.red("\n  ✘ No OpenRouter API key found."));
			console.log(
				chalk.gray(`  Please run `) +
					chalk.cyan("qow --setup") +
					chalk.gray(` to configure it.\n`),
			);
			process.exit(1);
		}

		const task = taskChunks.join(" ");

		try {
			const result = await getCommand(task);

			// Clear the loading line
			if (process.stdout.isTTY) {
				process.stderr.write("\r\x1b[K");
			}

			if (result?.startsWith("ERROR")) {
				console.error(chalk.red(result));
			} else {
				console.log(chalk.bold(result));
			}
		} catch (err) {
			// Clear the loading line on error
			if (process.stdout.isTTY) {
				process.stderr.write("\r\x1b[K");
			}

			if (err instanceof Error && err.message === "NO_API_KEY") {
				console.error(chalk.red("\n  ✘ No OpenRouter API key found."));
				console.log(
					chalk.gray(`  Please run `) +
						chalk.cyan("qow --setup") +
						chalk.gray(` to configure it.\n`),
				);
			} else {
				console.error(
					chalk.red(
						"\n  Failed to fetch command. Check your API key or network connection.",
					),
				);
			}
		}
	});

program.parse();
