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
    title: "コースはあなたのコンピューターに保存されます。",
    introduction:
      "コースのリポジトリを開いて編集を始めましょう。コンテンツとメディアはプロジェクト内に保存され、自由に持ち運べます。",
    openProjectTitle: "プロジェクトを開く",
    openProjectDescription: "1つのコースリポジトリを含むフォルダーを選択してください。",
    chooseFolder: "フォルダーを選択",
    openingFolder: "開いています…",
    dialogTitle: "コースプロジェクトを開く",
    unsupported:
      "ローカルフォルダーを利用するには、最新のChromiumブラウザーまたはデスクトップアプリが必要です。",
    errors: {
      permissionDenied: "フォルダーへのアクセスが拒否されました。",
      unknown: "プロジェクトを開けませんでした。",
      unsupported: "このブラウザーではローカルプロジェクトフォルダーを利用できません。",
    },
    ready: "準備完了",
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
