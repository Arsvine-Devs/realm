import type { FriendLink } from '@/shared/types';
import { friendLinkSourceFields } from '@/features/assets/contracts/source-manifest';

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
    description: 'I love you all dearly',
    url: 'https://steamcommunity.com/profiles/76561198839060049',
    avatar:
      'https://shared.fastly.steamstatic.com/community_assets/images/items/1372280/d036f6a9a3d65c5c6cb7b25f52eb5e8a881c474d.gif',
  },
  {
    id: 'CY1二乃天外飞仙',
    name: 'CY1二乃天外飞仙',
    description: "I swear I'm not a purple-hair simp",
    url: 'https://steamcommunity.com/profiles/76561199837991110',
    avatar:
      'https://avatars.fastly.steamstatic.com/3e5e7c5da4fe573703b5edc1ea27f85e0687371c_full.jpg',
  },
  {
    ...friendLinkSourceFields('arning'),
    name: '小宁arning',
    description: 'Shared a lot of photography material with me. Respect.',
  },
  {
    ...friendLinkSourceFields('may-rain'),
    name: '梅莉薇尔·伊芙利特',
    description: 'Maybe I can leave this blank',
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
    description: 'Head of the 告鸟（鹄, Hu） Institute | Blue Archive & Phigros & Minecraft',
    url: 'https://slouchwind.vercel.app',
    avatar: 'https://avatars.githubusercontent.com/u/81954768?v=4',
  },
  {
    id: 'NekoMoe',
    name: 'NekoMoe',
    description: 'Scratcher • CSSer | Animation, manga, and light novel fan',
    url: 'https://nekomoe.tw/',
    avatar: 'https://avatars.githubusercontent.com/u/82699919?v=4',
  },
];
