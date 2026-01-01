import React from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

const ImageCarousel = () => {
  const [emblaRef] = useEmblaCarousel(
    { loop: true },
    [Autoplay({ delay: 5000, stopOnInteraction: false })]
  );

  // Placeholder images - can be replaced via admin panel later
  const images = [
    'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&h=800&fit=crop',
  ];

  return (
    <div className="embla" ref={emblaRef} data-testid="carousel">
      <div className="embla__container">
        {images.map((image, index) => (
          <div className="embla__slide" key={index}>
            <img 
              src={image} 
              alt={`Slide ${index + 1}`}
              className="carousel-image"
              data-testid={`carousel-image-${index}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImageCarousel;