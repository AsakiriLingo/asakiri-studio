export function projectRelativePathSegments(relativePath: string): readonly string[] {
  const segments = relativePath.split("/");
  if (
    relativePath.includes("\\") ||
    segments.length === 0 ||
    segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")
  ) {
    throw new Error(`Invalid project-relative path: ${relativePath}`);
  }

  return segments;
}
