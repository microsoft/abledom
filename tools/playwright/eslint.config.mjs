import rootConfig from "../../eslint.config.mjs";

// Override parserOptions.project to use local tsconfig.eslint.json
export default rootConfig.map((config) => {
  if (config.languageOptions?.parserOptions?.project) {
    return {
      ...config,
      languageOptions: {
        ...config.languageOptions,
        parserOptions: {
          ...config.languageOptions.parserOptions,
          project: "tsconfig.eslint.json",
        },
      },
    };
  }
  return config;
});
