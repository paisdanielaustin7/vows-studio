import { notFound } from 'next/navigation';
import { ComponentGalleryClient } from './component-gallery-client';

export const dynamic = 'force-dynamic';

export default function DevComponentsPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <ComponentGalleryClient />;
}
