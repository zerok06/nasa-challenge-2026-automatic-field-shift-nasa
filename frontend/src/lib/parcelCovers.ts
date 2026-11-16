/** Parcel cover photos — same three images and same id hash as the native app. */
const covers = [
  '/img/parcel-covers/field-1.jpg',
  '/img/parcel-covers/field-2.jpg',
  '/img/parcel-covers/field-3.jpg',
];

/** The parcel's cover stays the same because it is keyed by id. */
export function parcelCoverFor(id: string): string {
  let hash = 7;
  for (let index = 0; index < id.length; index += 1) {
    hash = (Math.imul(hash, 31) + id.charCodeAt(index)) >>> 0;
  }
  return covers[hash % covers.length];
}
