import { createContext, useContext } from "react";
import {
  EMPTY_LIBRARY,
  type LoadAssetPreview,
  type RichEditorLibrary,
} from "@shared/components/rich-editor/library";

export interface RichEditorContextValue {
  readonly library: RichEditorLibrary;
  readonly loadAssetPreview: LoadAssetPreview;
}

const DEFAULT_VALUE: RichEditorContextValue = {
  library: EMPTY_LIBRARY,
  loadAssetPreview: () => Promise.resolve(null),
};

const RichEditorContext = createContext<RichEditorContextValue>(DEFAULT_VALUE);

export const RichEditorProvider = RichEditorContext.Provider;

export function useRichEditorLibrary(): RichEditorLibrary {
  return useContext(RichEditorContext).library;
}

export function useAssetPreview(): LoadAssetPreview {
  return useContext(RichEditorContext).loadAssetPreview;
}
