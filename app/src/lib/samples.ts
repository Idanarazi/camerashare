// A sample shoot, so a brand-new user can see what PicMe gives them before their first real one.
// Each scene is a little burst: the person gets guided into place, and the last shot is the keeper.
import type { ImageSource } from 'expo-image';

export type SamplePhoto = { key: string; src: ImageSource; fav: boolean };

export const SAMPLE_PHOTOS: SamplePhoto[] = [
  { key: 'lake-1', src: require('../../assets/samples/lake-1.jpg'), fav: false },
  { key: 'lake-2', src: require('../../assets/samples/lake-2.jpg'), fav: false },
  { key: 'lake-3', src: require('../../assets/samples/lake-3.jpg'), fav: true },
  { key: 'beach-1', src: require('../../assets/samples/beach-1.jpg'), fav: false },
  { key: 'beach-2', src: require('../../assets/samples/beach-2.jpg'), fav: false },
  { key: 'beach-3', src: require('../../assets/samples/beach-3.jpg'), fav: true },
  { key: 'city-1', src: require('../../assets/samples/city-1.jpg'), fav: false },
  { key: 'city-2', src: require('../../assets/samples/city-2.jpg'), fav: false },
  { key: 'city-3', src: require('../../assets/samples/city-3.jpg'), fav: true },
  { key: 'mountain-1', src: require('../../assets/samples/mountain-1.jpg'), fav: false },
  { key: 'mountain-2', src: require('../../assets/samples/mountain-2.jpg'), fav: false },
  { key: 'mountain-3', src: require('../../assets/samples/mountain-3.jpg'), fav: true },
];

// The keepers, used for the animated stack on Home.
export const SAMPLE_COVERS = SAMPLE_PHOTOS.filter((p) => p.fav);
