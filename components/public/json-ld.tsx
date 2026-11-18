import React from 'react';

interface LocalBusinessJsonLdProps {
  studioName?: string;
  telephone?: string;
  email?: string;
  address?: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
  };
}

export function LocalBusinessJsonLd({
  studioName = 'VOWS',
  telephone = '+919820044521',
  email = 'studio@vowsstudio.com',
  address = {
    streetAddress: 'Atelier 4B, Heritage Square, Light House Hill',
    addressLocality: 'Mangalore',
    addressRegion: 'Karnataka',
    postalCode: '575001',
    addressCountry: 'IN',
  },
  aggregateRating = {
    ratingValue: 4.9,
    reviewCount: 48,
  },
}: LocalBusinessJsonLdProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'PhotographyBusiness',
    name: studioName,
    image: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1600&q=80',
    '@id': 'https://vowsstudio.com',
    url: 'https://vowsstudio.com',
    telephone,
    email,
    priceRange: '₹₹₹₹',
    address: {
      '@type': 'PostalAddress',
      streetAddress: address.streetAddress,
      addressLocality: address.addressLocality,
      addressRegion: address.addressRegion,
      postalCode: address.postalCode,
      addressCountry: address.addressCountry,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 12.8703,
      longitude: 74.8436,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '10:00',
        closes: '18:00',
      },
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: aggregateRating.ratingValue,
      reviewCount: aggregateRating.reviewCount,
      bestRating: 5,
      worstRating: 1,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
