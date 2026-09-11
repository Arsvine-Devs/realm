import type { FriendLink } from '@/shared/types';
import {
  findSourceItem,
  legacyAssetReference,
  sourceManifests,
} from '@/features/assets/contracts/source-manifest';

const arningSource = findSourceItem(sourceManifests.friendLinks, 'arning');
const mayRainSource = findSourceItem(sourceManifests.friendLinks, 'may-rain');

// ============================================================
// Friend Links
// ============================================================
export const friendLinksData: FriendLink[] = [
  {
    id: '吲哚乙酸',
    name: '吲哚乙酸',
    description: 'Botanical Soul | Rooted in Green',
    url: 'https://steamcommunity.com/profiles/76561198794923959',
    avatar:
      'https://avatars.fastly.steamstatic.com/8a3f577639b1337be04680d0da6966c0c855f192_full.jpg',
  },
  {
    id: 'LoyalTY',
    name: 'LoyalTY',
    description: 'Safe Sweetie Sleepier Stanza Symbolic',
    url: 'https://steamcommunity.com/profiles/76561199874766647',
    avatar:
      'https://shared.fastly.steamstatic.com/community_assets/images/items/1332180/0f1db15dec8e1d1a3ad8802f38879cb282445ff7.gif',
  },
  {
    id: 'Yuki_Official',
    name: 'Yuki_Official',
    description: '咱深爱着大家',
    url: 'https://steamcommunity.com/profiles/76561198839060049',
    avatar:
      'https://shared.fastly.steamstatic.com/community_assets/images/items/1372280/d036f6a9a3d65c5c6cb7b25f52eb5e8a881c474d.gif',
  },
  {
    id: 'CY1二乃天外飞仙',
    name: 'CY1二乃天外飞仙',
    description: '我真的不是紫毛控',
    url: 'https://steamcommunity.com/profiles/76561199837991110',
    avatar:
      'https://avatars.fastly.steamstatic.com/3e5e7c5da4fe573703b5edc1ea27f85e0687371c_full.jpg',
  },
  {
    id: arningSource.runtimeId,
    name: arningSource.title,
    description: arningSource.description,
    url: arningSource.url,
    avatar: legacyAssetReference(arningSource.avatar),
  },
  {
    id: mayRainSource.runtimeId,
    name: mayRainSource.title,
    description: mayRainSource.description,
    url: mayRainSource.url,
    avatar: legacyAssetReference(mayRainSource.avatar),
  },
  {
    id: 'Lyric_Epic',
    name: 'Lyric Epic',
    description: 'VEX_VRC Player | Producer | MUG | Designer',
    url: 'https://ch-lyricepic.github.io/',
    avatar: 'https://avatars.githubusercontent.com/u/56753198?v=4',
  },
  {
    id: 'Slouchwind',
    name: 'Slouchwind',
    description: '告鸟院院长 |  Blue Archive & Phigros & Minecraft',
    url: 'https://slouchwind.vercel.app',
    avatar: 'https://avatars.githubusercontent.com/u/81954768?v=4',
  },
  {
    id: 'NekoMoe',
    name: 'NekoMoe',
    description: 'Scratcher • CSSer | 动画 & 漫画 & 轻小说宅',
    url: 'https://nekomoe.tw/',
    avatar: 'https://avatars.githubusercontent.com/u/82699919?v=4',
  },
];
