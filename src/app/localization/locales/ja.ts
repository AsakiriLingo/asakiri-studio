import type { AppMessages } from "@app/localization/messages";

export const jaMessages = {
  themeToggle: {
    switchToDark: "ダークモードに切り替える",
    switchToLight: "ライトモードに切り替える",
  },
  projectHub: {
    eyebrow: "ローカルファーストのコースエディター",
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
} satisfies AppMessages;
