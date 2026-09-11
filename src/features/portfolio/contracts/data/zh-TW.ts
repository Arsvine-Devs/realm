import type { CopyableToken, Project } from '@/shared/types';
import { portfolioSourceFields } from '@/features/assets/contracts/source-manifest';

export const webProjects: Project[] = [
  {
    ...portfolioSourceFields('arsvine-realm'),
    title: 'Arsvine Realm',
    description: '一個以個人檔案、作品展示與寫作入口為核心的 Next.js 個人站。',
    role: 'Design / Development / Content Architecture',
    year: '2026',
    status: 'shipped',
    highlights: [
      '科幻 HUD 與鷹角式資訊密度',
      '超過 42 種動畫與互動動效',
      '基於 RainMorime 模板深度再開發',
      '多語言內容與分類結構',
      '圖片 CDN 封裝與可複製資訊點',
    ],
    link: '#',
    liveUrl: '',
    articleContent: `Arsvine Realm，也就是本站。它不是單純的作品集頁面，而是一個逐漸成形的個人檔案系統：專案、文章、興趣、旅行、藝術與一些還在發酵的設定，都被收束到同一套介面秩序中。技術上使用 Next.js 建構，部署在 Vercel 上，並透過一套相對輕量的內容結構維護多語言頁面、圖片資源與詳情頁正文。

這個專案最初基於 RainMorime 個人作品集模板再開發，但後續已經加入大量自訂修改。視覺方向上，我希望它有一點科幻 HUD 的冷峻感，也有鷹角式介面那種「資訊很多，但不是亂堆」的秩序感：線條、卡片、動效、標籤與留白都服務於同一個目標——讓頁面像一座可以繼續擴展的檔案終端。

工程上，它並不追求複雜到炫技，而是更重視可維護性。圖片地址透過 CDN 工具函式統一生成，正文中可複製的資訊點則由 copyableTokens 識別，專案、經歷與興趣內容也拆分為獨立資料檔。這樣一來，網站既能作為展示頁，也能慢慢變成個人知識與創作系統的入口。

對我來說，Arsvine Realm 的意義不只是「把東西放到網路上」。它更像是一座長期基地：記錄我正在做什麼、相信什麼、如何設計系統，以及如何把一些零散靈感變成可見的結構。`,
  },
  {
    ...portfolioSourceFields('endfield-planner'),
    title: '終末地卡池模擬及規劃器',
    description:
      '面向《明日方舟：終末地》的抽卡模擬與資源規劃工具，嘗試把玩家直覺轉化為可計算的策略。',
    role: 'Full Stack Developer / System Designer',
    year: '2026',
    status: 'wip',
    highlights: [
      '卡池模擬與資源規劃分離',
      '基於蒙地卡羅模擬給出策略評分',
      '支援往期、當期與未來卡池配置',
      '響應式頁面與深色模式',
      '後續計畫加入資料視覺化與匯入能力',
    ],
    link: '#',
    liveUrl: '',
    articleContent: `這是一個為《明日方舟：終末地》準備的卡池模擬與規劃工具。它的核心目標不是單純復刻「抽一次、十連、出貨」的娛樂模擬，而是幫助玩家回答一個更實際的問題：在資源有限、目標不同、卡池不斷輪換的情況下，怎樣抽才更接近自己的最優策略？

專案分為兩個主要頁面。模擬器頁面負責還原卡池抽取過程，支援配置往期、當期以及未來可能出現的卡池；規劃器頁面則更偏策略分析，玩家可以輸入資源、目標角色、期望保留量等條件，系統透過蒙地卡羅模擬估算不同方案的風險與收益，並給出評分與建議。

後端使用 Python Flask 建構 API，Waitress 作為生產伺服器，負責處理卡池資料、機率計算與規劃邏輯。前端使用原生 JavaScript 和 HTML 實作互動介面，重點保證響應式版面、深色模式與低依賴結構。這個專案並不追求一開始就做成複雜平台，而是先把「可計算、可解釋、可迭代」的核心鏈路跑通。

目前專案仍在開發中，https://endfield.arsvine.com 是預留地址。後續我計畫補充更完整的資料視覺化、使用者資料匯入、方案對比與卡池版本管理。它本質上也是一次系統設計練習：把遊戲裡的不確定性拆成資料、機率、權重與決策，再讓玩家看懂自己的選擇。`,
  },
];

export const gameProjects: Project[] = [];

export const earlyProjects: Project[] = [
  {
    ...portfolioSourceFields('early-projects'),
    title: '早期專案',
    description: '學習過程中留下的各種實驗、半成品與遺產。它們不一定成熟，但構成了最早的技術軌跡。',
    role: 'Student / Explorer',
    year: '201x',
    status: 'archived',
    link: '#',
    articleContent: `早期專案已經很難完整整理了。它們有的是課程作業，有的是一時興起的網頁，有的是遊戲原型、腳本、小工具，也有一些只留下截圖或檔名的半成品。現在回頭看，它們當然粗糙，甚至很多地方稱不上「工程」，但正是這些不穩定的嘗試，把我一步步推向了程式設計、遊戲設計與系統建構。

這些專案橫跨 HTML、CSS、JavaScript、Python、C++、C#、Scratch 和 Unity。那時候更多是在摸索：一個按鈕怎樣回應，一段邏輯怎樣跑起來，一個介面怎樣不那麼難看，一個遊戲機制怎樣從想法變成可操作的東西。

我把它們歸檔在這裡，不是為了證明過去有多厲害，而是為了保留一條軌跡：很多現在看似清晰的偏好，其實都來自早期那些混亂的小實驗。`,
  },
];

export const copyableTokens: CopyableToken[] = [
  { pattern: 'arsvine.com', label: '主站地址' },
  { pattern: 'www.arsvine.com', label: '主站 WWW 地址' },
  { pattern: 'https://endfield.arsvine.com', label: '終末地規劃器地址，尚未上線' },
  { pattern: '2162371684', label: '個人 QQ 號' },
  { pattern: 'Details', label: '查看詳情' },
];
