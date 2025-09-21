import { useState, useEffect } from 'react';
import { 
  getUpdateStatus, 
  onUpdateStatusChange, 
  getRelayStatus, 
  getAllRelayStatus,
  getSensorValue,
  getStatusValue 
} from '../helpers/socketHelper';

/**
 * React hook globaalille updateStatus datalle
 * Päivittyy automaattisesti kun uusi statusUpdate saapuu
 */
export const useUpdateStatus = () => {
  const [status, setStatus] = useState(() => getUpdateStatus());

  useEffect(() => {
    // Kuuntele updateStatus muutoksia
    const unsubscribe = onUpdateStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    // Cleanup
    return unsubscribe;
  }, []);

  return status;
};

/**
 * Hook tietylle rele ID:lle
 */
export const useRelayStatus = (relayId: number) => {
  const [relayStatus, setRelayStatus] = useState(() => getRelayStatus(relayId));

  useEffect(() => {
    const unsubscribe = onUpdateStatusChange(() => {
      setRelayStatus(getRelayStatus(relayId));
    });

    return unsubscribe;
  }, [relayId]);

  return relayStatus;
};

/**
 * Hook kaikille releille
 */
export const useAllRelayStatus = () => {
  const [relayStatuses, setRelayStatuses] = useState(() => getAllRelayStatus());

  useEffect(() => {
    const unsubscribe = onUpdateStatusChange(() => {
      setRelayStatuses(getAllRelayStatus());
    });

    return unsubscribe;
  }, []);

  return relayStatuses;
};

/**
 * Hook tietylle status polulle (esim. "sensors.temp1.value")
 */
export const useStatusValue = (path: string) => {
  const [value, setValue] = useState(() => getStatusValue(path));

  useEffect(() => {
    const unsubscribe = onUpdateStatusChange(() => {
      setValue(getStatusValue(path));
    });

    return unsubscribe;
  }, [path]);

  return value;
};

/**
 * Hook sensori datalle
 */
export const useSensorValue = (sensorType: string, sensorId?: string) => {
  const [sensorValue, setSensorValue] = useState(() => getSensorValue(sensorType, sensorId));

  useEffect(() => {
    const unsubscribe = onUpdateStatusChange(() => {
      setSensorValue(getSensorValue(sensorType, sensorId));
    });

    return unsubscribe;
  }, [sensorType, sensorId]);

  return sensorValue;
};
