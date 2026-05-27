export interface Sound {
  id: string;
  name: string;
  filename: string;
  category: string;
  shortcut?: string;
  isImported?: boolean;
  groupId?: string;
}

export interface Group {
  id: string;
  name: string;
  color: string;
  soundIds: string[];
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export const categories: Category[] = [
  { id: 'local', name: '本地音效', icon: '🎵', color: '#0cf' },
  { id: 'online', name: '在线获取', icon: '🌐', color: '#0e5' },
  { id: 'favorite', name: '收藏', icon: '⭐', color: '#fc0' },
];

export const sounds: Sound[] = [];
