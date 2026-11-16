import React from 'react';

import { Illustration, type IllustrationName } from '@/components/illustrations/Illustration';

const cropIllustrations: Record<string, IllustrationName> = {
  onion: 'crop-onion',
  pumpkin: 'crop-pumpkin',
  chili: 'crop-chili',
  potato: 'crop-potato',
  corn: 'crop-corn',
  quinoa: 'crop-quinoa',
  alfalfa: 'crop-alfalfa',
  bean: 'crop-bean',
};

export function CropThumb({ cropId, size = 40 }: { cropId: string; size?: number }) {
  return <Illustration name={cropIllustrations[cropId] ?? 'success'} size={size} />;
}
