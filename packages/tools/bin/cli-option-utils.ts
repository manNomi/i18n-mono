export function isTranslationImportSourceOption(option: string): boolean {
  return (
    option === "--translation-import-source" ||
    option === "--library" ||
    option === "--lib"
  );
}

export function readRequiredOptionValue(
  args: string[],
  index: number,
  option: string
): string {
  const value = args[index + 1];

  if (!value || value.startsWith("-")) {
    console.error(`Missing value for option: ${option}`);
    process.exit(1);
  }

  return value;
}
