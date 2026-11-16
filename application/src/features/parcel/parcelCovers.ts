import type { ImageSourcePropType } from 'react-native';

const covers: ImageSourcePropType[] = [
  require('../../../assets/images/parcel-covers/field-1.jpg'),
  require('../../../assets/images/parcel-covers/field-2.jpg'),
  require('../../../assets/images/parcel-covers/field-3.jpg'),
];

/** The parcel's random-looking cover stays the same because it is keyed by id. */
export function parcelCoverFor(id: string): ImageSourcePropType {
  let hash = 7;
  for (let index = 0; index < id.length; index += 1) {
    hash = (Math.imul(hash, 31) + id.charCodeAt(index)) >>> 0;
  }
  return covers[hash % covers.length];
}
