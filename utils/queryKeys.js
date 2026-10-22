// utils/queryKeys.js
// Single source of truth for query cache keys.
export const qk = {
  equipment: (filters) => ['equipment', filters],
  equipmentDetail: (id) => ['equipment', 'detail', id],
  produce: (filters) => ['produce', filters],
  produceDetail: (id) => ['produce', 'detail', id],
  problems: (filters) => ['problems', filters],
  problemDetail: (id) => ['problems', 'detail', id],
  labourers: (filters) => ['labourers', filters],
  contractors: (filters) => ['contractors', filters],
  fertilizerShops: (filters) => ['fertilizerShops', filters],
  myBookings: () => ['bookings', 'mine'],
  myAds: () => ['ads', 'mine'],
  dashboard: () => ['dashboard'],
  session: () => ['session'],
  weather: (lat, lng) => ['weather', lat, lng],
};
