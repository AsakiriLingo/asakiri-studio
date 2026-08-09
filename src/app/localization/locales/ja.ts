import type { AppMessages } from "@app/localization/messages";

export const jaMessages = {
  content: {
    collectionsLabel: "コンテンツコレクション",
    recordCount: (count: number) => `${String(count)} 件`,
    empty: {
      title: "コンテンツがまだありません",
      description: "このプロジェクトのコンテンツコレクションがここに表示されます。",
    },
  },
  themeToggle: {
    switchToDark: "ダークモードに切り替える",
    switchToLight: "ライトモードに切り替える",
  },
  projectHub: {
    title: "コース",
    introduction: "既存のコースフォルダーを開くか、このコンピューターに新しいコースを作成します。",
    startTitle: "はじめる",
    chooseFolder: "コースを開く",
    openingFolder: "開いています…",
    dialogTitle: "コースプロジェクトを開く",
    errors: {
      permissionDenied: "フォルダーへのアクセスが拒否されました。",
      unknown: "プロジェクトを開けませんでした。",
    },
    ready: "準備完了",
    create: {
      title: "コースを作成",
      description:
        "新しいコースを始めます。Studioがプロジェクトフォルダーを作成し、Gitを初期化します。",
      openButton: "新しいコース",
      nameLabel: "コース名",
      namePlaceholder: "例：はじめての日本語",
      createButton: "作成",
      cancelButton: "キャンセル",
      creating: "作成しています…",
      dialogTitle: "コースの保存先を選択",
      errors: {
        alreadyExists: "同じ名前のフォルダーがすでに存在します。",
        invalidName: "有効なコース名を入力してください。",
        permissionDenied: "フォルダーへの書き込みが拒否されました。",
        unknown: "コースを作成できませんでした。",
      },
    },
  },
  workspace: {
    navigationLabel: "プロジェクトワークスペース",
    backToProjects: "プロジェクト一覧に戻る",
    areas: {
      content: "コンテンツ",
      media: "メディア",
      lessons: "レッスン",
    },
    emptyStates: {
      content: {
        title: "コンテンツ",
        description: "再利用できるプロジェクトコンテンツがここに表示されます。",
      },
      media: {
        title: "メディア",
        description: "プロジェクトの音声、画像、動画がここに表示されます。",
      },
      lessons: {
        title: "レッスン",
        description: "コースのレッスンとその内容がここに表示されます。",
      },
    },
    contentActions: {
      createContent: "コンテンツを作成",
    },
    mediaActions: {
      importMedia: "メディアを読み込む",
    },
    outline: {
      empty: "このコースのアウトラインにはまだレッスンがありません。",
      lessonTypes: {
        "rich-text": "読み物",
        "rich-media": "メディア",
        exercise: "練習問題",
      },
    },
    openStates: {
      validating: "プロジェクトを確認しています…",
      invalidTitle: "このプロジェクトを開けませんでした。",
      invalidReasons: {
        unreadable:
          "このプロジェクトのコンテンツを読み込めませんでした。プロジェクト一覧に戻ってもう一度開いてください。",
        unknown:
          "プロジェクトを開く際に問題が発生しました。プロジェクト一覧に戻ってもう一度お試しください。",
      },
    },
  },
} satisfies AppMessages;
