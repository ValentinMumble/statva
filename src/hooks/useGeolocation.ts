import {useCallback, useEffect, useState} from 'react';

const useGeolocation = (options?: PositionOptions) => {
  const [position, setPosition] = useState<GeolocationPosition>();

  const fetchPosition = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      position => setPosition(position),
      error => console.error(error),
      options
    );
  }, [options]);

  useEffect(() => {
    fetchPosition();
  }, [fetchPosition]);

  return [[position?.coords.latitude, position?.coords.longitude], fetchPosition] as const;
};

export {useGeolocation};
