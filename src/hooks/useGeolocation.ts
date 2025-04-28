import {useEffect, useState} from 'react';

const useGeolocation = (options?: PositionOptions) => {
  const [position, setPosition] = useState<GeolocationPosition>();

  const fetchPosition = () => {
    navigator.geolocation.getCurrentPosition(
      position => setPosition(position),
      error => console.error(error),
      options
    );
  };

  useEffect(() => {
    fetchPosition();
  }, [options]);

  return [[position?.coords.latitude, position?.coords.longitude], fetchPosition] as const;
};

export {useGeolocation};
