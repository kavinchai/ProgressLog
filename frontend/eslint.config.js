import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";

export default [
	{ ignores: ["dist", "build", "coverage", "node_modules"] },
	js.configs.recommended,
	{
		files: ["**/*.{js,jsx}"],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: "module",
			globals: { ...globals.browser, ...globals.node },
			parserOptions: {
				ecmaFeatures: { jsx: true },
			},
		},
		settings: { react: { version: "detect" } },
		plugins: {
			react,
			"react-hooks": reactHooks,
			"react-refresh": reactRefresh,
		},
		rules: {
			...react.configs.recommended.rules,
			...react.configs["jsx-runtime"].rules,
			...reactHooks.configs.recommended.rules,
			"react/prop-types": "off",
			"react/no-unescaped-entities": "off",
			"no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
			"react-refresh/only-export-components": [
				"warn",
				{ allowConstantExport: true },
			],
		},
	},
	{
		files: ["**/*.test.{js,jsx}", "src/test/**"],
		languageOptions: {
			globals: {
				describe: "readonly",
				it: "readonly",
				test: "readonly",
				expect: "readonly",
				vi: "readonly",
				beforeEach: "readonly",
				afterEach: "readonly",
				beforeAll: "readonly",
				afterAll: "readonly",
			},
		},
	},
	prettier,
];
