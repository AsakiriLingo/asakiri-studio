import { resolve } from "node:path";
import process from "node:process";
import { validateExampleCourse } from "./example-course-validator.mjs";

const courseRoot = resolve(process.cwd(), "examples/courses/japanese-starter");
const result = await validateExampleCourse(courseRoot);

if (result.errors.length > 0) {
  console.error("Example course validation failed:\n");
  result.errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  const { assets, collections, lessons, placeholderAssets, records } = result.summary;
  console.log(
    `Example course passed: ${collections} collection, ${records} records, ${assets} assets (${placeholderAssets} placeholders), ${lessons} lessons.`,
  );
}
