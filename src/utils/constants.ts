export const VITE_CACHE_DIR = 'partial-prebundle';

export const ASSET_EXTENSIONS = [
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp',
  'woff', 'woff2', 'ttf', 'eot', 'otf',
  'mp4', 'webm', 'mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a',
  'txt', 'xml', 'json', 'yaml', 'yml', 'toml', 'ini',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'
];
export const generateAssetLoaders = () => {
  return ASSET_EXTENSIONS.reduce((loaders, ext) => {
    loaders[`.${ext}`] = 'file';
    return loaders;
  }, {} as Record<string, 'file'>);
};