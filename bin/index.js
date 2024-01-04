#! /usr/bin/env node
import { intro, outro, text, isCancel, cancel, select, spinner, multiselect, } from "@clack/prompts";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
intro(`create-my-app`);
const s = spinner();
const name = await text({
    message: "Project name ?",
    placeholder: "./myapp",
    validate(value) {
        if (value.length === 0)
            return `Value is required!`;
        if (existsSync(value))
            return `${value} already exist`;
    },
});
if (isCancel(name)) {
    cancel("Operation cancelled. name");
    process.exit(0);
}
let pm = await select({
    message: "npm or pnpm",
    options: [
        { value: "npm", label: "npm" },
        { value: "pnpm", label: "pnpm", hint: "good choice" },
    ],
});
if (isCancel(pm)) {
    cancel("Operation cancelled. pm");
    process.exit(0);
}
const fw = await select({
    message: "Astro or Next",
    options: [
        { value: "next", label: "NextJS" },
        { value: "astro", label: "Astro" },
    ],
});
if (isCancel(fw)) {
    cancel("Operation cancelled.");
    process.exit(0);
}
await starter(name);
if (fw === "astro")
    await getAdd(name);
async function starter(name) {
    let command = [""];
    if (fw === "next") {
        command = [
            "create-next-app@latest",
            `${name}`,
            "--ts",
            "--tailwind",
            "--eslint",
            "--app",
            `--use-${pm}`,
            "--import-alias",
            "--no-src-dir",
        ];
        if (pm === "pnpm")
            command.unshift("dlx");
        if (pm === "npm")
            pm = "npx";
    }
    if (fw === "astro")
        command = [
            "create",
            "astro@latest",
            `${name}`,
            "--",
            "--template",
            "basics",
            "--install",
            "--no-git",
            "--skip-houston",
            "--typescript",
            "strict",
        ];
    return new Promise((resolve, reject) => {
        try {
            let ok = spawn(`${pm}`, command, {
                timeout: 70000,
            });
            ok.on("spawn", () => {
                s.start(`Installing ${fw} via ${pm}`);
            });
            ok.on("close", (code, signal) => {
                if (code !== 0) {
                    if (signal == "SIGTERM") {
                        cancel(`Timeout`);
                        reject();
                    }
                    cancel(`An error occur code ${code}`);
                    reject();
                }
                s.stop(`${fw} Installed`);
                process.on("SIGINT", (signal) => {
                    cancel("Operation cancelled. astro");
                    reject();
                });
                resolve(true);
            });
            ok.on("error", (err) => {
                console.log("error message " + err.message);
                reject();
            });
        }
        catch (err) {
            console.log("big error");
            reject();
        }
    });
}
async function getAdd(name) {
    const ss = spinner();
    const additionalTools = await multiselect({
        message: "Select additional integration.",
        options: [
            { value: "react", label: "React" },
            { value: "vercel", label: "Vercel" },
            { value: "tailwind", label: "Tailwind" },
            { value: "sitemap", label: "Sitemap" },
            { value: "mdx", label: "MDX" },
        ],
        required: false,
    });
    if (isCancel(additionalTools)) {
        cancel("Operation cancelled.");
        process.exit(0);
    }
    let px = pm;
    for (let integration of additionalTools) {
        await new Promise((resolve, reject) => {
            try {
                if (pm === "npm")
                    px = "npx";
                let ok = spawn(`${pm}`, ["astro", "add", `${integration}`, "--y"], {
                    cwd: name,
                    timeout: 70000,
                });
                process.on("SIGINT", () => {
                    console.log("CTRL-C");
                });
                ok.on("spawn", () => {
                    ss.start(`Installing ${integration} `);
                });
                ok.on("close", (code, signal) => {
                    if (code !== 0) {
                        if (signal == "SIGTERM") {
                            cancel(`Timeout`);
                            process.exit(1);
                        }
                        cancel(`An error occur code ${code}`);
                        process.exit(1);
                    }
                    ss.stop(`${integration} Installed`);
                    resolve(true);
                });
                ok.on("error", (err) => {
                    console.log("error message" + err.message);
                    reject();
                    process.exit(1);
                });
            }
            catch (err) {
                console.log("big error");
                process.exit(1);
            }
        });
    }
}
outro(`Done ✅`);
