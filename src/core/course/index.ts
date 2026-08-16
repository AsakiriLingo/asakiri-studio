export type { PortableValue, Binding, RenderFragment, AcceptedValue } from "@core/course/binding";
export type { AssetKind, AssetAvailability, Asset } from "@core/course/media";
export { SUPPORTED_MEDIA_EXTENSIONS, mediaTypeForFile, labelForFile } from "@core/course/media";
export type {
  FieldKind,
  FieldCardinality,
  FieldDefinition,
  Collection,
  RecordFieldItem,
  RecordFieldValue,
  RecordColumn,
  RecordPresentation,
  ContentRecord,
} from "@core/course/content";
export type { TiptapMark, TiptapNode, TiptapDocument } from "@core/course/document";
export type { CompositionBlockType, CompositionBlock, Composition } from "@core/course/composition";
export type {
  ExerciseType,
  ChoiceOption,
  NormalizationRules,
  BlankAnswer,
  BlankSegment,
  SelectedOptionsEvaluation,
  OrderedTokensEvaluation,
  MatchedPairsEvaluation,
  FilledBlanksEvaluation,
  TypedAnswerEvaluation,
  SpokenResponseEvaluation,
  Evaluation,
  ExerciseSettings,
  ExerciseFeedback,
  ExercisePresentation,
  MultipleChoiceExercise,
  MatchPairsExercise,
  FillBlankExercise,
  WordOrderExercise,
  ListeningExercise,
  SpeakingExercise,
  Exercise,
} from "@core/course/exercise";
export { createDefaultExercise } from "@core/course/exercise-defaults";
export type { PartContent, Part, Lesson } from "@core/course/lesson";
export type {
  CourseProject,
  Contributor,
  FundingLink,
  Sponsor,
  OutlineSection,
  Course,
  CourseSources,
  LoadedCourse,
} from "@core/course/course";
export { partSourceKey, contributorRoles } from "@core/course/course";
export type { CourseFileReader } from "@core/course/parse-course";
export {
  parseCourse,
  parseCourseWithSources,
  parseExercise,
  CourseParseError,
} from "@core/course/parse-course";
export type { ResolvedValue, BindingResolver } from "@core/course/resolve-binding";
export { createBindingResolver } from "@core/course/resolve-binding";
export {
  COURSE_FORMAT,
  COURSE_FORMAT_VERSION,
  CourseFormatError,
  readFormatVersion,
  stampFormat,
  withFormatFirst,
} from "@core/course/format";
export type { CourseFileKind } from "@core/course/format";
export { migrateFile, MIGRATIONS } from "@core/course/migrations";
export type { MigrationOutcome, MigrationStep } from "@core/course/migrations";
export { isLocaleMap, localesOf, resolveLocalized, withLocale } from "@core/course/localized";
export type { LocaleMap, LocalizedText } from "@core/course/localized";
